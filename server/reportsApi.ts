import { Router, Request, Response } from 'express';
import { getPool } from './db';

const router = Router();

function getUser(req: Request) {
  const userId = (req.headers['x-user-id'] as string) || 'usr-1';
  const userName = (req.headers['x-user-name'] as string) || 'م. أحمد الوهاس';
  const userRole = (req.headers['x-user-role'] as string) || 'SUPER_ADMIN';
  return { userId, userName, userRole };
}

// ============================================================================
// 1. REPORTS DASHBOARD OVERVIEW & KPIS
// ============================================================================
router.get('/reports/dashboard', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();

    // 1. Property and unit counts
    const [propRows]: any = await pool.query(`
      SELECT 
        COUNT(DISTINCT p.id) AS total_properties,
        COUNT(DISTINCT b.id) AS total_buildings,
        COUNT(DISTINCT u.id) AS total_units,
        SUM(CASE WHEN u.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied_units,
        SUM(CASE WHEN u.status = 'VACANT' THEN 1 ELSE 0 END) AS vacant_units,
        SUM(CASE WHEN u.status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance_units,
        SUM(CASE WHEN u.status = 'RESERVED' THEN 1 ELSE 0 END) AS reserved_units
      FROM properties p
      LEFT JOIN buildings b ON p.id = b.property_id
      LEFT JOIN units u ON p.id = u.property_id
    `);
    const pStats = propRows[0] || {};
    const totalUnits = Number(pStats.total_units || 0);
    const occupiedUnits = Number(pStats.occupied_units || 0);
    const vacantUnits = Number(pStats.vacant_units || 0);
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    const vacancyRate = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;

    // 2. Financial totals
    const [finRows]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_invoiced,
        COALESCE(SUM(paid_amount), 0) AS total_collected,
        COALESCE(SUM(total_amount - paid_amount), 0) AS total_outstanding
      FROM invoices
      WHERE status != 'CANCELLED'
    `);
    const fStats = finRows[0] || {};

    // 3. Posted expenses total
    const [expRows]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_posted_expenses,
        COUNT(*) AS total_posted_count
      FROM expenses
      WHERE status = 'POSTED'
    `);
    const expStats = expRows[0] || {};

    // 4. Maintenance stats
    const [mntRows]: any = await pool.query(`
      SELECT 
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status IN ('NEW', 'REVIEW', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS open_requests,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_requests,
        COALESCE(SUM(expected_cost), 0) AS total_estimated_cost,
        COALESCE(SUM(actual_cost), 0) AS total_actual_cost
      FROM maintenance_requests
      WHERE status != 'CANCELLED'
    `);
    const mntStats = mntRows[0] || {};

    // 5. Utilities totals
    const [waterRows]: any = await pool.query(`
      SELECT COALESCE(SUM(net_total_operating_cost), 0) AS total_water_cost FROM water_costs WHERE status != 'CANCELLED'
    `);
    const [elecRows]: any = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total_elec_invoiced FROM electricity_readings WHERE status = 'BILLED'
    `);

    // 6. Monthly financials trend (last 6 months)
    const [monthlyTrend]: any = await pool.query(`
      SELECT 
        DATE_FORMAT(issue_date, '%Y-%m') AS month,
        COALESCE(SUM(total_amount), 0) AS invoiced,
        COALESCE(SUM(paid_amount), 0) AS collected
      FROM invoices
      WHERE status != 'CANCELLED' AND issue_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
      ORDER BY month ASC
    `);

    // Monthly expenses trend
    const [monthlyExpenses]: any = await pool.query(`
      SELECT 
        DATE_FORMAT(expense_date, '%Y-%m') AS month,
        COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE status = 'POSTED' AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
      ORDER BY month ASC
    `);

    // Combine monthly data
    const monthMap: Record<string, { month: string; invoiced: number; collected: number; expenses: number }> = {};
    for (const row of monthlyTrend) {
      monthMap[row.month] = {
        month: row.month,
        invoiced: Number(row.invoiced || 0),
        collected: Number(row.collected || 0),
        expenses: 0
      };
    }
    for (const row of monthlyExpenses) {
      if (!monthMap[row.month]) {
        monthMap[row.month] = { month: row.month, invoiced: 0, collected: 0, expenses: 0 };
      }
      monthMap[row.month].expenses = Number(row.expenses || 0);
    }
    const monthlyFinancials = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    // 7. Expenses by category
    const [catExpRows]: any = await pool.query(`
      SELECT 
        category_name AS categoryName,
        COALESCE(SUM(amount), 0) AS totalAmount,
        COUNT(*) AS count
      FROM expenses
      WHERE status = 'POSTED'
      GROUP BY category_name
      ORDER BY totalAmount DESC
      LIMIT 6
    `);

    // 8. Receivables Aging Buckets
    const [agingRows]: any = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS current,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days1_30,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days31_60,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days61_90,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 91 AND 180 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days91_180,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 181 AND 365 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS days181_365,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 365 THEN (total_amount - paid_amount) ELSE 0 END), 0) AS over365
      FROM invoices
      WHERE status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE') AND (total_amount - paid_amount) > 0
    `);
    const agingStats = agingRows[0] || {};

    res.json({
      properties: {
        totalProperties: Number(pStats.total_properties || 0),
        totalBuildings: Number(pStats.total_buildings || 0),
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits: Number(pStats.maintenance_units || 0),
        reservedUnits: Number(pStats.reserved_units || 0),
        occupancyRate: Number(occupancyRate.toFixed(2)),
        vacancyRate: Number(vacancyRate.toFixed(2))
      },
      financials: {
        totalInvoiced: Number(fStats.total_invoiced || 0),
        totalCollected: Number(fStats.total_collected || 0),
        totalOutstanding: Number(fStats.total_outstanding || 0),
        totalPostedExpenses: Number(expStats.total_posted_expenses || 0),
        postedExpensesCount: Number(expStats.total_posted_count || 0),
        netOperatingIncome: Number(fStats.total_collected || 0) - Number(expStats.total_posted_expenses || 0)
      },
      maintenance: {
        totalRequests: Number(mntStats.total_requests || 0),
        openRequests: Number(mntStats.open_requests || 0),
        completedRequests: Number(mntStats.completed_requests || 0),
        totalEstimatedCost: Number(mntStats.total_estimated_cost || 0),
        totalActualCost: Number(mntStats.total_actual_cost || 0)
      },
      utilities: {
        totalWaterCost: Number(waterRows[0]?.total_water_cost || 0),
        totalElectricityInvoiced: Number(elecRows[0]?.total_elec_invoiced || 0)
      },
      monthlyFinancials,
      expensesByCategory: catExpRows.map((r: any) => ({
        categoryName: r.categoryName,
        totalAmount: Number(r.totalAmount || 0),
        count: Number(r.count || 0)
      })),
      receivablesAgingSummary: {
        current: Number(agingStats.current || 0),
        days1_30: Number(agingStats.days1_30 || 0),
        days31_60: Number(agingStats.days31_60 || 0),
        days61_90: Number(agingStats.days61_90 || 0),
        days91_180: Number(agingStats.days91_180 || 0),
        days181_365: Number(agingStats.days181_365 || 0),
        over365: Number(agingStats.over365 || 0),
        total: Number(fStats.total_outstanding || 0)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 1: PROPERTIES REPORT (تقرير العقارات)
// ============================================================================
router.get('/reports/properties', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { search, type, status } = req.query;

    let query = `
      SELECT 
        p.id, p.code, p.name, p.type, p.city, CONCAT_WS(' - ', p.city, p.district, p.street) AS address, p.status,
        COUNT(DISTINCT b.id) AS building_count,
        COUNT(DISTINCT u.id) AS unit_count,
        SUM(CASE WHEN u.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied_units,
        SUM(CASE WHEN u.status = 'VACANT' THEN 1 ELSE 0 END) AS vacant_units,
        COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.id END) AS active_contracts,
        COALESCE((SELECT SUM(i.total_amount) FROM invoices i WHERE i.property_id = p.id AND i.status != 'CANCELLED'), 0) AS total_invoiced,
        COALESCE((SELECT SUM(i.paid_amount) FROM invoices i WHERE i.property_id = p.id AND i.status != 'CANCELLED'), 0) AS total_collected,
        COALESCE((SELECT SUM(i.total_amount - i.paid_amount) FROM invoices i WHERE i.property_id = p.id AND i.status != 'CANCELLED'), 0) AS total_receivables,
        COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.property_id = p.id AND e.status = 'POSTED'), 0) AS total_expenses
      FROM properties p
      LEFT JOIN buildings b ON p.id = b.property_id
      LEFT JOIN units u ON p.id = u.property_id
      LEFT JOIN contracts c ON u.id = c.unit_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (type && type !== 'ALL') {
      query += ' AND p.type = ?';
      params.push(type);
    }
    if (status && status !== 'ALL') {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.city LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY p.id ORDER BY p.name ASC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => {
      const uCount = Number(r.unit_count || 0);
      const occCount = Number(r.occupied_units || 0);
      const vacCount = Number(r.vacant_units || 0);
      const occRate = uCount > 0 ? (occCount / uCount) * 100 : 0;

      return {
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        city: r.city,
        address: r.address,
        status: r.status,
        buildingCount: Number(r.building_count || 0),
        unitCount: uCount,
        occupiedUnits: occCount,
        vacantUnits: vacCount,
        occupancyRate: Number(occRate.toFixed(2)),
        activeContracts: Number(r.active_contracts || 0),
        totalInvoiced: Number(r.total_invoiced || 0),
        totalCollected: Number(r.total_collected || 0),
        totalReceivables: Number(r.total_receivables || 0),
        totalExpenses: Number(r.total_expenses || 0)
      };
    });

    const summary = {
      totalProperties: items.length,
      totalBuildings: items.reduce((s: number, i: any) => s + i.buildingCount, 0),
      totalUnits: items.reduce((s: number, i: any) => s + i.unitCount, 0),
      totalOccupied: items.reduce((s: number, i: any) => s + i.occupiedUnits, 0),
      totalVacant: items.reduce((s: number, i: any) => s + i.vacantUnits, 0),
      totalActiveContracts: items.reduce((s: number, i: any) => s + i.activeContracts, 0),
      totalReceivables: items.reduce((s: number, i: any) => s + i.totalReceivables, 0),
      totalExpenses: items.reduce((s: number, i: any) => s + i.totalExpenses, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 2: BUILDINGS REPORT (تقرير المباني)
// ============================================================================
router.get('/reports/buildings', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, search } = req.query;

    let query = `
      SELECT 
        b.id, b.code, b.name, b.total_floors, b.status, b.property_id,
        p.name AS property_name, p.code AS property_code,
        COUNT(u.id) AS unit_count,
        SUM(CASE WHEN u.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied_units,
        SUM(CASE WHEN u.status = 'VACANT' THEN 1 ELSE 0 END) AS vacant_units,
        COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.id END) AS active_contracts,
        COALESCE(SUM(u.price_per_cycle), 0) AS total_rent_value,
        COALESCE((SELECT SUM(i.total_amount - i.paid_amount) FROM invoices i JOIN units un ON i.unit_id = un.id WHERE un.building_id = b.id AND i.status != 'CANCELLED'), 0) AS total_receivables,
        COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.building_id = b.id AND e.status = 'POSTED'), 0) AS total_expenses
      FROM buildings b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN units u ON b.id = u.building_id
      LEFT JOIN contracts c ON u.id = c.unit_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND b.property_id = ?';
      params.push(propertyId);
    }
    if (search) {
      query += ' AND (b.name LIKE ? OR b.code LIKE ? OR p.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY b.id ORDER BY p.name ASC, b.name ASC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      code: r.code || r.id,
      name: r.name,
      propertyId: r.property_id,
      propertyName: r.property_name || 'غير محدد',
      totalFloors: Number(r.total_floors || 1),
      status: r.status,
      unitCount: Number(r.unit_count || 0),
      occupiedUnits: Number(r.occupied_units || 0),
      vacantUnits: Number(r.vacant_units || 0),
      activeContracts: Number(r.active_contracts || 0),
      totalRentValue: Number(r.total_rent_value || 0),
      totalReceivables: Number(r.total_receivables || 0),
      totalExpenses: Number(r.total_expenses || 0)
    }));

    const summary = {
      totalBuildings: items.length,
      totalUnits: items.reduce((s: number, i: any) => s + i.unitCount, 0),
      totalOccupied: items.reduce((s: number, i: any) => s + i.occupiedUnits, 0),
      totalVacant: items.reduce((s: number, i: any) => s + i.vacantUnits, 0),
      totalActiveContracts: items.reduce((s: number, i: any) => s + i.activeContracts, 0),
      totalRentValue: items.reduce((s: number, i: any) => s + i.totalRentValue, 0),
      totalReceivables: items.reduce((s: number, i: any) => s + i.totalReceivables, 0),
      totalExpenses: items.reduce((s: number, i: any) => s + i.totalExpenses, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 3: UNITS REPORT (تقرير الوحدات والمحلات)
// ============================================================================
router.get('/reports/units', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, buildingId, type, status, search } = req.query;

    let query = `
      SELECT 
        u.id, u.unit_number, u.unit_code, u.type, u.floor_number, u.floor_name,
        u.area_sqm, u.status, u.price_per_cycle, u.property_id, u.building_id,
        p.name AS property_name, b.name AS building_name,
        c.id AS contract_id, c.contract_number, c.status AS contract_status,
        t.id AS tenant_id, t.name AS tenant_name, t.phone AS tenant_phone,
        COALESCE((SELECT SUM(i.total_amount - i.paid_amount) FROM invoices i WHERE i.unit_id = u.id AND i.status != 'CANCELLED'), 0) AS outstanding_balance
      FROM units u
      LEFT JOIN properties p ON u.property_id = p.id
      LEFT JOIN buildings b ON u.building_id = b.id
      LEFT JOIN contracts c ON (u.current_contract_id = c.id OR (c.unit_id = u.id AND c.status = 'ACTIVE'))
      LEFT JOIN tenants t ON (u.current_tenant_id = t.id OR c.tenant_id = t.id)
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND u.property_id = ?';
      params.push(propertyId);
    }
    if (buildingId && buildingId !== 'ALL') {
      query += ' AND u.building_id = ?';
      params.push(buildingId);
    }
    if (type && type !== 'ALL') {
      query += ' AND u.type = ?';
      params.push(type);
    }
    if (status && status !== 'ALL') {
      query += ' AND u.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (u.unit_number LIKE ? OR u.unit_code LIKE ? OR t.name LIKE ? OR p.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.name ASC, u.floor_number ASC, u.unit_number ASC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      unitNumber: r.unit_number,
      unitCode: r.unit_code || r.unit_number,
      type: r.type,
      floorNumber: Number(r.floor_number || 0),
      floorName: r.floor_name || `الدور ${r.floor_number || 0}`,
      areaSqm: Number(r.area_sqm || 0),
      status: r.status,
      pricePerCycle: Number(r.price_per_cycle || 0),
      propertyId: r.property_id,
      propertyName: r.property_name || 'غير محدد',
      buildingId: r.building_id,
      buildingName: r.building_name || 'المبنى الرئيسي',
      contractId: r.contract_id,
      contractNumber: r.contract_number,
      contractStatus: r.contract_status,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      tenantPhone: r.tenant_phone,
      outstandingBalance: Number(r.outstanding_balance || 0)
    }));

    const summary = {
      totalUnits: items.length,
      occupiedCount: items.filter((i: any) => i.status === 'OCCUPIED').length,
      vacantCount: items.filter((i: any) => i.status === 'VACANT').length,
      maintenanceCount: items.filter((i: any) => i.status === 'MAINTENANCE').length,
      reservedCount: items.filter((i: any) => i.status === 'RESERVED').length,
      totalRentValue: items.reduce((s: number, i: any) => s + i.pricePerCycle, 0),
      totalOutstanding: items.reduce((s: number, i: any) => s + i.outstandingBalance, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 4: OCCUPANCY REPORT (تقرير إشغال الوحدات)
// ============================================================================
router.get('/reports/occupancy', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId } = req.query;

    let propCondition = '';
    const params: any[] = [];
    if (propertyId && propertyId !== 'ALL') {
      propCondition = ' WHERE p.id = ?';
      params.push(propertyId);
    }

    // 1. Overall stats
    const [overallRows]: any = await pool.query(`
      SELECT 
        COUNT(u.id) AS total_units,
        SUM(CASE WHEN u.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied_units,
        SUM(CASE WHEN u.status = 'VACANT' THEN 1 ELSE 0 END) AS vacant_units,
        SUM(CASE WHEN u.status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance_units,
        SUM(CASE WHEN u.status = 'RESERVED' THEN 1 ELSE 0 END) AS reserved_units,
        COALESCE(SUM(u.price_per_cycle), 0) AS total_potential_rent,
        COALESCE(SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.price_per_cycle ELSE 0 END), 0) AS occupied_rent_value
      FROM units u
      JOIN properties p ON u.property_id = p.id
      ${propCondition}
    `, params);
    const ov = overallRows[0] || {};
    const totalUnits = Number(ov.total_units || 0);
    const occupiedUnits = Number(ov.occupied_units || 0);
    const vacantUnits = Number(ov.vacant_units || 0);
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    const vacancyRate = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;

    // 2. By Property breakdown
    const [byPropRows]: any = await pool.query(`
      SELECT 
        p.id, p.name AS property_name, p.code AS property_code,
        COUNT(u.id) AS total_units,
        SUM(CASE WHEN u.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied_units,
        SUM(CASE WHEN u.status = 'VACANT' THEN 1 ELSE 0 END) AS vacant_units,
        SUM(CASE WHEN u.status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance_units,
        COALESCE(SUM(u.price_per_cycle), 0) AS potential_rent,
        COALESCE(SUM(CASE WHEN u.status = 'OCCUPIED' THEN u.price_per_cycle ELSE 0 END), 0) AS active_rent
      FROM properties p
      LEFT JOIN units u ON p.id = u.property_id
      ${propCondition}
      GROUP BY p.id
      ORDER BY p.name ASC
    `, params);

    // 3. By Unit Type breakdown
    const [byTypeRows]: any = await pool.query(`
      SELECT 
        u.type AS unit_type,
        COUNT(u.id) AS total_units,
        SUM(CASE WHEN u.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied_units,
        SUM(CASE WHEN u.status = 'VACANT' THEN 1 ELSE 0 END) AS vacant_units,
        COALESCE(SUM(u.price_per_cycle), 0) AS total_rent
      FROM units u
      JOIN properties p ON u.property_id = p.id
      ${propCondition}
      GROUP BY u.type
      ORDER BY total_units DESC
    `, params);

    res.json({
      overall: {
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits: Number(ov.maintenance_units || 0),
        reservedUnits: Number(ov.reserved_units || 0),
        occupancyRate: Number(occupancyRate.toFixed(2)),
        vacancyRate: Number(vacancyRate.toFixed(2)),
        totalPotentialRent: Number(ov.total_potential_rent || 0),
        occupiedRentValue: Number(ov.occupied_rent_value || 0)
      },
      byProperty: byPropRows.map((r: any) => {
        const pTotal = Number(r.total_units || 0);
        const pOcc = Number(r.occupied_units || 0);
        return {
          id: r.id,
          name: r.property_name,
          code: r.property_code,
          totalUnits: pTotal,
          occupiedUnits: pOcc,
          vacantUnits: Number(r.vacant_units || 0),
          maintenanceUnits: Number(r.maintenance_units || 0),
          occupancyRate: pTotal > 0 ? Number(((pOcc / pTotal) * 100).toFixed(2)) : 0,
          potentialRent: Number(r.potential_rent || 0),
          activeRent: Number(r.active_rent || 0)
        };
      }),
      byType: byTypeRows.map((r: any) => {
        const tTotal = Number(r.total_units || 0);
        const tOcc = Number(r.occupied_units || 0);
        return {
          type: r.unit_type,
          totalUnits: tTotal,
          occupiedUnits: tOcc,
          vacantUnits: Number(r.vacant_units || 0),
          occupancyRate: tTotal > 0 ? Number(((tOcc / tTotal) * 100).toFixed(2)) : 0,
          totalRent: Number(r.total_rent || 0)
        };
      })
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 5: TENANTS REPORT (تقرير المستأجرين)
// ============================================================================
router.get('/reports/tenants', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, status, search, dateFrom, dateTo } = req.query;

    let query = `
      SELECT 
        t.id, t.tenant_code, t.name, t.type, t.national_id, t.phone, t.secondary_phone,
        t.status, t.current_balance, t.rent_balance, t.water_balance, t.electricity_balance,
        c.contract_number, c.start_date, c.end_date, c.rent_amount, c.payment_cycle, c.status AS contract_status,
        u.unit_number, p.name AS property_name,
        COALESCE((SELECT SUM(total_amount) FROM invoices WHERE tenant_id = t.id AND status != 'CANCELLED'), 0) AS total_invoiced,
        COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE tenant_id = t.id AND status != 'CANCELLED'), 0) AS total_paid,
        COALESCE((SELECT SUM(total_amount - paid_amount) FROM invoices WHERE tenant_id = t.id AND status != 'CANCELLED'), 0) AS outstanding
      FROM tenants t
      LEFT JOIN contracts c ON (c.tenant_id = t.id AND c.status = 'ACTIVE')
      LEFT JOIN units u ON c.unit_id = u.id
      LEFT JOIN properties p ON c.property_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND c.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'ALL') {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (t.name LIKE ? OR t.tenant_code LIKE ? OR t.phone LIKE ? OR t.national_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (dateFrom) {
      query += ' AND t.created_at >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND t.created_at <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY t.name ASC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      tenantCode: r.tenant_code,
      name: r.name,
      type: r.type,
      nationalId: r.national_id,
      phone: r.phone,
      secondaryPhone: r.secondary_phone,
      status: r.status,
      unitNumber: r.unit_number || 'غير محدد',
      propertyName: r.property_name || 'غير محدد',
      contractNumber: r.contract_number || 'لا يوجد عقد نشط',
      contractStartDate: r.start_date,
      contractEndDate: r.end_date,
      rentAmount: Number(r.rent_amount || 0),
      paymentCycle: r.payment_cycle,
      contractStatus: r.contract_status,
      totalInvoiced: Number(r.total_invoiced || 0),
      totalPaid: Number(r.total_paid || 0),
      outstanding: Number(r.outstanding || 0),
      currentBalance: Number(r.current_balance || 0)
    }));

    const summary = {
      totalTenants: items.length,
      activeCount: items.filter((i: any) => i.status === 'ACTIVE').length,
      totalInvoiced: items.reduce((s: number, i: any) => s + i.totalInvoiced, 0),
      totalPaid: items.reduce((s: number, i: any) => s + i.totalPaid, 0),
      totalOutstanding: items.reduce((s: number, i: any) => s + i.outstanding, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 6: CONTRACTS REPORT (تقرير العقود والضمانات)
// ============================================================================
router.get('/reports/contracts', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, status, dateFrom, dateTo, search } = req.query;

    let query = `
      SELECT 
        c.id, c.contract_number, c.tenant_id, c.tenant_name, c.property_id, c.property_name,
        c.unit_id, c.unit_number, c.start_date, c.end_date, c.rent_amount, c.payment_cycle,
        c.deposit_amount, c.guarantee_person_name, c.guarantee_person_phone, c.notice_period_days,
        c.status, c.renewal_count, c.created_at,
        COALESCE((SELECT SUM(i.total_amount) FROM invoices i WHERE i.contract_id = c.id AND i.status != 'CANCELLED'), 0) AS total_invoiced,
        COALESCE((SELECT SUM(i.paid_amount) FROM invoices i WHERE i.contract_id = c.id AND i.status != 'CANCELLED'), 0) AS total_paid,
        COALESCE((SELECT SUM(i.total_amount - i.paid_amount) FROM invoices i WHERE i.contract_id = c.id AND i.status != 'CANCELLED'), 0) AS outstanding
      FROM contracts c
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND c.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'ALL') {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (dateFrom) {
      query += ' AND c.start_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND c.end_date <= ?';
      params.push(dateTo);
    }
    if (search) {
      query += ' AND (c.contract_number LIKE ? OR c.tenant_name LIKE ? OR c.unit_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY c.created_at DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      contractNumber: r.contract_number,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      propertyId: r.property_id,
      propertyName: r.property_name,
      unitId: r.unit_id,
      unitNumber: r.unit_number,
      startDate: r.start_date,
      endDate: r.end_date,
      rentAmount: Number(r.rent_amount || 0),
      paymentCycle: r.payment_cycle,
      depositAmount: Number(r.deposit_amount || 0),
      guaranteePersonName: r.guarantee_person_name,
      guaranteePersonPhone: r.guarantee_person_phone,
      noticePeriodDays: Number(r.notice_period_days || 60),
      status: r.status,
      renewalCount: Number(r.renewal_count || 0),
      totalInvoiced: Number(r.total_invoiced || 0),
      totalPaid: Number(r.total_paid || 0),
      outstanding: Number(r.outstanding || 0)
    }));

    const summary = {
      totalContracts: items.length,
      activeCount: items.filter((i: any) => i.status === 'ACTIVE').length,
      expiredCount: items.filter((i: any) => i.status === 'EXPIRED').length,
      terminatedCount: items.filter((i: any) => i.status === 'TERMINATED').length,
      totalRentValue: items.reduce((s: number, i: any) => s + i.rentAmount, 0),
      totalDeposits: items.reduce((s: number, i: any) => s + i.depositAmount, 0),
      totalOutstanding: items.reduce((s: number, i: any) => s + i.outstanding, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 7: RENT BILLING REPORT (تقرير فوترة الإيجارات)
// ============================================================================
router.get('/reports/rent-billing', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, unitId, tenantId, status, dateFrom, dateTo, search } = req.query;

    let query = `
      SELECT 
        i.id, i.invoice_number, i.tenant_id, i.tenant_name, i.contract_id,
        i.property_id, i.property_name, i.unit_id, i.unit_number, i.account_type,
        i.period_month, i.total_amount, i.paid_amount, i.remaining_amount,
        i.issue_date, i.due_date, i.status, i.base_rent, i.additional_charges, i.discount
      FROM invoices i
      WHERE i.account_type = 'RENT'
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND i.property_id = ?';
      params.push(propertyId);
    }
    if (unitId && unitId !== 'ALL') {
      query += ' AND i.unit_id = ?';
      params.push(unitId);
    }
    if (tenantId && tenantId !== 'ALL') {
      query += ' AND i.tenant_id = ?';
      params.push(tenantId);
    }
    if (status && status !== 'ALL') {
      query += ' AND i.status = ?';
      params.push(status);
    }
    if (dateFrom) {
      query += ' AND i.issue_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND i.issue_date <= ?';
      params.push(dateTo);
    }
    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR i.tenant_name LIKE ? OR i.unit_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY i.issue_date DESC, i.id DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      contractId: r.contract_id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      unitId: r.unit_id,
      unitNumber: r.unit_number,
      periodMonth: r.period_month,
      totalAmount: Number(r.total_amount || 0),
      paidAmount: Number(r.paid_amount || 0),
      remainingAmount: Number(r.remaining_amount || 0),
      issueDate: r.issue_date,
      dueDate: r.due_date,
      status: r.status,
      baseRent: Number(r.base_rent || 0),
      additionalCharges: Number(r.additional_charges || 0),
      discount: Number(r.discount || 0)
    }));

    const summary = {
      totalInvoices: items.length,
      totalAmount: items.reduce((s: number, i: any) => s + i.totalAmount, 0),
      totalPaid: items.reduce((s: number, i: any) => s + i.paidAmount, 0),
      totalRemaining: items.reduce((s: number, i: any) => s + i.remainingAmount, 0),
      paidCount: items.filter((i: any) => i.status === 'PAID').length,
      partialCount: items.filter((i: any) => i.status === 'PARTIALLY_PAID').length,
      unpaidCount: items.filter((i: any) => i.status === 'UNPAID').length,
      overdueCount: items.filter((i: any) => i.status === 'OVERDUE').length
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 8: RECEIVABLES REPORT (تقرير الذمم المدينة)
// ============================================================================
router.get('/reports/receivables', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, tenantId, minBalance, search } = req.query;

    let query = `
      SELECT 
        t.id AS tenant_id, t.tenant_code, t.name AS tenant_name, t.phone AS tenant_phone,
        p.name AS property_name, u.unit_number,
        COALESCE(SUM(i.total_amount), 0) AS total_invoiced,
        COALESCE(SUM(i.paid_amount), 0) AS total_paid,
        COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS outstanding,
        (SELECT MAX(p_pay.collected_at) FROM payments p_pay WHERE p_pay.tenant_id = t.id AND p_pay.status = 'COMPLETED') AS last_payment_date,
        (SELECT p_sub.amount_paid FROM payments p_sub WHERE p_sub.tenant_id = t.id AND p_sub.status = 'COMPLETED' ORDER BY p_sub.collected_at DESC LIMIT 1) AS last_payment_amount,
        MAX(DATEDIFF(CURDATE(), i.due_date)) AS max_overdue_days
      FROM tenants t
      LEFT JOIN contracts c ON (c.tenant_id = t.id AND c.status = 'ACTIVE')
      LEFT JOIN units u ON c.unit_id = u.id
      LEFT JOIN properties p ON c.property_id = p.id
      LEFT JOIN invoices i ON (i.tenant_id = t.id AND i.status != 'CANCELLED')
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND c.property_id = ?';
      params.push(propertyId);
    }
    if (tenantId && tenantId !== 'ALL') {
      query += ' AND t.id = ?';
      params.push(tenantId);
    }
    if (search) {
      query += ' AND (t.name LIKE ? OR t.tenant_code LIKE ? OR t.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY t.id';

    if (minBalance) {
      query += ' HAVING outstanding >= ?';
      params.push(Number(minBalance));
    } else {
      query += ' HAVING outstanding > 0';
    }

    query += ' ORDER BY outstanding DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => {
      const maxDays = Number(r.max_overdue_days || 0);
      let agingCategory = 'حالي';
      if (maxDays > 365) agingCategory = 'أكثر من سنة';
      else if (maxDays > 180) agingCategory = '181–365 يوم';
      else if (maxDays > 90) agingCategory = '91–180 يوم';
      else if (maxDays > 60) agingCategory = '61–90 يوم';
      else if (maxDays > 30) agingCategory = '31–60 يوم';
      else if (maxDays > 0) agingCategory = '1–30 يوم';

      return {
        tenantId: r.tenant_id,
        tenantCode: r.tenant_code,
        tenantName: r.tenant_name,
        tenantPhone: r.tenant_phone,
        propertyName: r.property_name || 'غير محدد',
        unitNumber: r.unit_number || 'غير محدد',
        totalInvoiced: Number(r.total_invoiced || 0),
        totalPaid: Number(r.total_paid || 0),
        outstanding: Number(r.outstanding || 0),
        lastPaymentDate: r.last_payment_date,
        lastPaymentAmount: Number(r.last_payment_amount || 0),
        maxOverdueDays: maxDays,
        agingCategory
      };
    });

    const summary = {
      tenantsWithBalanceCount: items.length,
      totalInvoiced: items.reduce((s: number, i: any) => s + i.totalInvoiced, 0),
      totalPaid: items.reduce((s: number, i: any) => s + i.totalPaid, 0),
      totalOutstanding: items.reduce((s: number, i: any) => s + i.outstanding, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 9: RECEIVABLE AGING (تقرير أعمار الديون)
// ============================================================================
router.get('/reports/receivable-aging', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, tenantId } = req.query;

    let filterSql = " WHERE i.status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE') AND (i.total_amount - i.paid_amount) > 0";
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      filterSql += ' AND i.property_id = ?';
      params.push(propertyId);
    }
    if (tenantId && tenantId !== 'ALL') {
      filterSql += ' AND i.tenant_id = ?';
      params.push(tenantId);
    }

    const [rows]: any = await pool.query(`
      SELECT 
        t.id AS tenant_id, t.name AS tenant_name, t.tenant_code, t.phone AS tenant_phone,
        p.name AS property_name, u.unit_number,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) <= 0 THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0) AS bucket_current,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 1 AND 30 THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0) AS bucket_1_30,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 31 AND 60 THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0) AS bucket_31_60,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 61 AND 90 THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0) AS bucket_61_90,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 91 AND 180 THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0) AS bucket_91_180,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 181 AND 365 THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0) AS bucket_181_365,
        COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), i.due_date) > 365 THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0) AS bucket_over_365,
        COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS total_balance
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN properties p ON i.property_id = p.id
      LEFT JOIN units u ON i.unit_id = u.id
      ${filterSql}
      GROUP BY t.id
      ORDER BY total_balance DESC
    `, params);

    const items = rows.map((r: any) => ({
      tenantId: r.tenant_id,
      tenantCode: r.tenant_code,
      tenantName: r.tenant_name,
      tenantPhone: r.tenant_phone,
      propertyName: r.property_name || 'غير محدد',
      unitNumber: r.unit_number || 'غير محدد',
      current: Number(r.bucket_current || 0),
      days1_30: Number(r.bucket_1_30 || 0),
      days31_60: Number(r.bucket_31_60 || 0),
      days61_90: Number(r.bucket_61_90 || 0),
      days91_180: Number(r.bucket_91_180 || 0),
      days181_365: Number(r.bucket_181_365 || 0),
      over365: Number(r.bucket_over_365 || 0),
      totalBalance: Number(r.total_balance || 0)
    }));

    const summary = {
      totalTenants: items.length,
      current: items.reduce((s: number, i: any) => s + i.current, 0),
      days1_30: items.reduce((s: number, i: any) => s + i.days1_30, 0),
      days31_60: items.reduce((s: number, i: any) => s + i.days31_60, 0),
      days61_90: items.reduce((s: number, i: any) => s + i.days61_90, 0),
      days91_180: items.reduce((s: number, i: any) => s + i.days91_180, 0),
      days181_365: items.reduce((s: number, i: any) => s + i.days181_365, 0),
      over365: items.reduce((s: number, i: any) => s + i.over365, 0),
      grandTotal: items.reduce((s: number, i: any) => s + i.totalBalance, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 10: COLLECTIONS REPORT (تقرير التحصيلات)
// ============================================================================
router.get('/reports/collections', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, tenantId, paymentMethod, cashBoxId, status, dateFrom, dateTo, search } = req.query;

    let query = `
      SELECT 
        p.id, p.receipt_number, p.invoice_id, p.tenant_id, p.tenant_name,
        p.unit_number, p.property_name, p.account_type, p.amount_paid,
        p.payment_method, p.collector_name, p.collected_at, p.center_name,
        p.cash_box_id, p.cash_box_name, p.status, p.notes,
        inv.invoice_number, inv.period_month
      FROM payments p
      LEFT JOIN invoices inv ON p.invoice_id = inv.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND (p.property_id = ? OR inv.property_id = ?)';
      params.push(propertyId, propertyId);
    }
    if (tenantId && tenantId !== 'ALL') {
      query += ' AND p.tenant_id = ?';
      params.push(tenantId);
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      query += ' AND p.payment_method = ?';
      params.push(paymentMethod);
    }
    if (cashBoxId && cashBoxId !== 'ALL') {
      query += ' AND p.cash_box_id = ?';
      params.push(cashBoxId);
    }
    if (status && status !== 'ALL') {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (dateFrom) {
      query += ' AND DATE(p.collected_at) >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND DATE(p.collected_at) <= ?';
      params.push(dateTo);
    }
    if (search) {
      query += ' AND (p.receipt_number LIKE ? OR p.tenant_name LIKE ? OR inv.invoice_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.collected_at DESC, p.id DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      invoiceId: r.invoice_id,
      invoiceNumber: r.invoice_number || 'غير محدد',
      periodMonth: r.period_month || '',
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      unitNumber: r.unit_number || 'غير محدد',
      propertyName: r.property_name || 'غير محدد',
      accountType: r.account_type,
      amountPaid: Number(r.amount_paid || 0),
      paymentMethod: r.payment_method,
      collectorName: r.collector_name || 'أمين الصندوق',
      collectedAt: r.collected_at,
      centerName: r.center_name || 'المركز الرئيسي',
      cashBoxId: r.cash_box_id,
      cashBoxName: r.cash_box_name || 'الصندوق الرئيسي',
      status: r.status,
      notes: r.notes
    }));

    const summary = {
      totalReceipts: items.length,
      totalAmount: items.reduce((s: number, i: any) => s + (i.status === 'COMPLETED' ? i.amountPaid : 0), 0),
      cashTotal: items.reduce((s: number, i: any) => s + (i.status === 'COMPLETED' && i.paymentMethod === 'CASH' ? i.amountPaid : 0), 0),
      bankTotal: items.reduce((s: number, i: any) => s + (i.status === 'COMPLETED' && (i.paymentMethod === 'BANK_TRANSFER' || i.paymentMethod === 'CHECK') ? i.amountPaid : 0), 0),
      cancelledTotal: items.reduce((s: number, i: any) => s + (i.status === 'CANCELLED' ? i.amountPaid : 0), 0),
      reversedTotal: items.reduce((s: number, i: any) => s + (i.status === 'REVERSED' ? i.amountPaid : 0), 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 11: CASH BOX REPORT (تقرير الصناديق والخزائن)
// ============================================================================
router.get('/reports/cash-boxes', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { status, centerId } = req.query;

    let query = `
      SELECT 
        cb.id, cb.code, cb.name, cb.center_id, cb.center_name, cb.currency,
        cb.opening_balance, cb.current_balance, cb.status, cb.cashier_name,
        COALESCE((SELECT SUM(amount_paid) FROM payments p WHERE p.cash_box_id = cb.id AND p.status = 'COMPLETED'), 0) AS total_cash_in,
        COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.cash_box_id = cb.id AND e.status = 'POSTED'), 0) AS total_cash_out
      FROM cash_boxes cb
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      query += ' AND cb.status = ?';
      params.push(status);
    }
    if (centerId && centerId !== 'ALL') {
      query += ' AND cb.center_id = ?';
      params.push(centerId);
    }

    query += ' ORDER BY cb.name ASC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => {
      const openBal = Number(r.opening_balance || 0);
      const cashIn = Number(r.total_cash_in || 0);
      const cashOut = Number(r.total_cash_out || 0);
      const netCalculated = openBal + cashIn - cashOut;

      return {
        id: r.id,
        code: r.code,
        name: r.name,
        centerId: r.center_id,
        centerName: r.center_name || 'مركز التحصيل الرئيسي',
        cashierName: r.cashier_name || 'أمين الصندوق',
        currency: r.currency || 'YER',
        openingBalance: openBal,
        currentBalance: Number(r.current_balance || 0),
        totalCashIn: cashIn,
        totalCashOut: cashOut,
        netCalculatedBalance: netCalculated,
        status: r.status
      };
    });

    const summary = {
      totalBoxes: items.length,
      totalOpening: items.reduce((s: number, i: any) => s + i.openingBalance, 0),
      totalCashIn: items.reduce((s: number, i: any) => s + i.totalCashIn, 0),
      totalCashOut: items.reduce((s: number, i: any) => s + i.totalCashOut, 0),
      totalCurrentBalance: items.reduce((s: number, i: any) => s + i.currentBalance, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 12: EXPENSES REPORT (تقرير المصروفات)
// ============================================================================
router.get('/reports/expenses', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, buildingId, categoryId, status, paymentMethod, dateFrom, dateTo, search } = req.query;

    let query = `
      SELECT 
        e.id, e.expense_number, e.expense_date, e.category_id, e.category_name,
        e.account_code, e.description, e.amount, e.currency, e.payment_method,
        e.cash_box_name, e.bank_name, e.property_id, e.property_name,
        e.building_name, e.unit_number, e.vendor_name, e.status,
        e.approved_by, e.approved_at, e.posted_by, e.posted_at, e.created_by
      FROM expenses e
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND e.property_id = ?';
      params.push(propertyId);
    }
    if (buildingId && buildingId !== 'ALL') {
      query += ' AND e.building_id = ?';
      params.push(buildingId);
    }
    if (categoryId && categoryId !== 'ALL') {
      query += ' AND e.category_id = ?';
      params.push(categoryId);
    }
    if (status && status !== 'ALL') {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      query += ' AND e.payment_method = ?';
      params.push(paymentMethod);
    }
    if (dateFrom) {
      query += ' AND e.expense_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND e.expense_date <= ?';
      params.push(dateTo);
    }
    if (search) {
      query += ' AND (e.expense_number LIKE ? OR e.description LIKE ? OR e.vendor_name LIKE ? OR e.property_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY e.expense_date DESC, e.id DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      expenseNumber: r.expense_number,
      expenseDate: r.expense_date,
      categoryId: r.category_id,
      categoryName: r.category_name,
      accountCode: r.account_code || '5101',
      description: r.description,
      amount: Number(r.amount || 0),
      currency: r.currency || 'YER',
      paymentMethod: r.payment_method,
      cashBoxName: r.cash_box_name,
      bankName: r.bank_name,
      propertyId: r.property_id,
      propertyName: r.property_name || 'مصروف عام',
      buildingName: r.building_name || '',
      unitNumber: r.unit_number || '',
      vendorName: r.vendor_name || 'غير محدد',
      status: r.status,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      postedBy: r.posted_by,
      postedAt: r.posted_at
    }));

    const summary = {
      totalCount: items.length,
      totalAmount: items.reduce((s: number, i: any) => s + i.amount, 0),
      postedTotal: items.reduce((s: number, i: any) => s + (i.status === 'POSTED' ? i.amount : 0), 0),
      approvedTotal: items.reduce((s: number, i: any) => s + (i.status === 'APPROVED' ? i.amount : 0), 0),
      draftTotal: items.reduce((s: number, i: any) => s + (i.status === 'DRAFT' ? i.amount : 0), 0),
      cancelledTotal: items.reduce((s: number, i: any) => s + (i.status === 'CANCELLED' ? i.amount : 0), 0),
      reversedTotal: items.reduce((s: number, i: any) => s + (i.status === 'REVERSED' ? i.amount : 0), 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 13: MAINTENANCE REPORT (تقرير الصيانة)
// ============================================================================
router.get('/reports/maintenance', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, vendorId, priority, status, dateFrom, dateTo, search } = req.query;

    let query = `
      SELECT 
        m.id, m.maintenance_number, m.request_date, m.property_id, m.property_name,
        m.building_name, m.unit_number, m.tenant_name, m.category_name,
        m.requester_name, m.requester_phone, m.problem_description, m.priority,
        m.vendor_name, m.assigned_to, m.expected_cost, m.actual_cost,
        m.start_date, m.completion_date, m.status, m.notes, m.expense_id,
        exp.expense_number AS linked_expense_number, exp.status AS linked_expense_status
      FROM maintenance_requests m
      LEFT JOIN expenses exp ON m.expense_id = exp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND m.property_id = ?';
      params.push(propertyId);
    }
    if (vendorId && vendorId !== 'ALL') {
      query += ' AND m.vendor_id = ?';
      params.push(vendorId);
    }
    if (priority && priority !== 'ALL') {
      query += ' AND m.priority = ?';
      params.push(priority);
    }
    if (status && status !== 'ALL') {
      query += ' AND m.status = ?';
      params.push(status);
    }
    if (dateFrom) {
      query += ' AND m.request_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND m.request_date <= ?';
      params.push(dateTo);
    }
    if (search) {
      query += ' AND (m.maintenance_number LIKE ? OR m.problem_description LIKE ? OR m.requester_name LIKE ? OR m.vendor_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY m.request_date DESC, m.id DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      maintenanceNumber: r.maintenance_number,
      requestDate: r.request_date,
      propertyName: r.property_name || 'غير محدد',
      buildingName: r.building_name || '',
      unitNumber: r.unit_number || '',
      tenantName: r.tenant_name || '',
      categoryName: r.category_name || 'صيانة عامة',
      requesterName: r.requester_name,
      requesterPhone: r.requester_phone,
      problemDescription: r.problem_description,
      priority: r.priority,
      vendorName: r.vendor_name || 'غير محدد',
      assignedTo: r.assigned_to,
      expectedCost: Number(r.expected_cost || 0),
      actualCost: Number(r.actual_cost || 0),
      startDate: r.start_date,
      completionDate: r.completion_date,
      status: r.status,
      linkedExpenseNumber: r.linked_expense_number,
      linkedExpenseStatus: r.linked_expense_status
    }));

    const summary = {
      totalRequests: items.length,
      completedCount: items.filter((i: any) => i.status === 'COMPLETED').length,
      inProgressCount: items.filter((i: any) => i.status === 'IN_PROGRESS').length,
      reviewCount: items.filter((i: any) => i.status === 'REVIEW' || i.status === 'NEW').length,
      cancelledCount: items.filter((i: any) => i.status === 'CANCELLED').length,
      totalExpectedCost: items.reduce((s: number, i: any) => s + i.expectedCost, 0),
      totalActualCost: items.reduce((s: number, i: any) => s + i.actualCost, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 14: WATER REPORT (تقرير المياه)
// ============================================================================
router.get('/reports/water', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, status, year } = req.query;

    let query = `
      SELECT 
        wc.id, wc.property_id, wc.property_name, wc.period_month,
        wc.tanker_count, wc.tanker_unit_price, wc.total_tanker_cost,
        wc.pump_electricity_cost, wc.sewer_cost, wc.tank_maintenance_cost,
        wc.cleaning_cost, wc.labor_cost, wc.treatment_cost, wc.other_fees,
        wc.net_total_operating_cost, wc.total_distributed_amount, wc.difference_amount,
        wc.distribution_method, wc.status, wc.posted_at, wc.posted_by, wc.created_at
      FROM water_costs wc
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND wc.property_id = ?';
      params.push(propertyId);
    }
    if (status && status !== 'ALL') {
      query += ' AND wc.status = ?';
      params.push(status);
    }
    if (year) {
      query += ' AND wc.period_month LIKE ?';
      params.push(`${year}-%`);
    }

    query += ' ORDER BY wc.period_month DESC, wc.id DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      periodMonth: r.period_month,
      tankerCount: Number(r.tanker_count || 0),
      tankerUnitPrice: Number(r.tanker_unit_price || 0),
      totalTankerCost: Number(r.total_tanker_cost || 0),
      pumpElectricityCost: Number(r.pump_electricity_cost || 0),
      sewerCost: Number(r.sewer_cost || 0),
      tankMaintenanceCost: Number(r.tank_maintenance_cost || 0),
      cleaningCost: Number(r.cleaning_cost || 0),
      laborCost: Number(r.labor_cost || 0),
      otherFees: Number(r.other_fees || 0),
      netTotalOperatingCost: Number(r.net_total_operating_cost || 0),
      totalDistributedAmount: Number(r.total_distributed_amount || 0),
      distributionMethod: r.distribution_method,
      status: r.status,
      postedAt: r.posted_at,
      postedBy: r.posted_by
    }));

    const summary = {
      totalPeriods: items.length,
      totalOperatingCost: items.reduce((s: number, i: any) => s + i.netTotalOperatingCost, 0),
      totalTankers: items.reduce((s: number, i: any) => s + i.tankerCount, 0),
      totalTankerCost: items.reduce((s: number, i: any) => s + i.totalTankerCost, 0),
      totalPumpCost: items.reduce((s: number, i: any) => s + i.pumpElectricityCost, 0),
      totalDistributed: items.reduce((s: number, i: any) => s + i.totalDistributedAmount, 0)
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 15: ELECTRICITY REPORT (تقرير الكهرباء)
// ============================================================================
router.get('/reports/electricity', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, meterNumber, status, periodMonth } = req.query;

    let query = `
      SELECT 
        er.id, er.meter_number, er.unit_number, er.reading_period_month,
        er.previous_reading, er.current_reading, er.consumption_kwh, er.rate_per_kwh,
        er.total_amount, er.reading_date, er.status, er.invoice_number, er.recorded_by,
        p.name AS property_name
      FROM electricity_readings er
      LEFT JOIN properties p ON er.property_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND er.property_id = ?';
      params.push(propertyId);
    }
    if (meterNumber) {
      query += ' AND er.meter_number LIKE ?';
      params.push(`%${meterNumber}%`);
    }
    if (status && status !== 'ALL') {
      query += ' AND er.status = ?';
      params.push(status);
    }
    if (periodMonth) {
      query += ' AND er.reading_period_month = ?';
      params.push(periodMonth);
    }

    query += ' ORDER BY er.reading_date DESC, er.id DESC';

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      meterNumber: r.meter_number,
      unitNumber: r.unit_number,
      propertyName: r.property_name || 'غير محدد',
      readingPeriodMonth: r.reading_period_month,
      readingDate: r.reading_date,
      previousReading: Number(r.previous_reading || 0),
      currentReading: Number(r.current_reading || 0),
      consumptionKwh: Number(r.consumption_kwh || 0),
      ratePerKwh: Number(r.rate_per_kwh || 0),
      totalAmount: Number(r.total_amount || 0),
      status: r.status,
      invoiceNumber: r.invoice_number,
      recordedBy: r.recorded_by
    }));

    const summary = {
      totalReadings: items.length,
      totalConsumptionKwh: items.reduce((s: number, i: any) => s + i.consumptionKwh, 0),
      totalAmount: items.reduce((s: number, i: any) => s + i.totalAmount, 0),
      billedCount: items.filter((i: any) => i.status === 'BILLED').length,
      unbilledCount: items.filter((i: any) => i.status === 'UNBILLED').length
    };

    res.json({ items, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 16: GENERAL LEDGER REPORT (دفتر الأستاذ العام)
// ============================================================================
router.get('/reports/general-ledger', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { 
      accountType, sourceModule, status, reference, 
      propertyId, tenantId, dateFrom, dateTo, search,
      page = 1, limit = 200 
    } = req.query;

    let query = `
      SELECT 
        l.*,
        t.name AS tenant_name, t.tenant_code,
        COALESCE(l.property_name, p.name) AS live_property_name,
        COALESCE(l.unit_number, u.unit_number) AS live_unit_number
      FROM tenant_ledger l
      LEFT JOIN tenants t ON l.tenant_id = t.id
      LEFT JOIN properties p ON l.property_id = p.id
      LEFT JOIN units u ON l.unit_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (accountType && accountType !== 'ALL') {
      query += ' AND l.account_type = ?';
      params.push(accountType);
    }
    if (sourceModule && sourceModule !== 'ALL') {
      query += ' AND l.source_module = ?';
      params.push(sourceModule);
    }
    if (status && status !== 'ALL') {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (propertyId && propertyId !== 'ALL') {
      query += ' AND l.property_id = ?';
      params.push(propertyId);
    }
    if (tenantId && tenantId !== 'ALL') {
      query += ' AND l.tenant_id = ?';
      params.push(tenantId);
    }
    if (reference) {
      query += ' AND l.reference LIKE ?';
      params.push(`%${reference}%`);
    }
    if (dateFrom) {
      query += ' AND l.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND l.date <= ?';
      params.push(dateTo);
    }
    if (search) {
      query += ' AND (l.reference LIKE ? OR l.description LIKE ? OR t.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countQuery = `
      SELECT 
        COUNT(*) AS total_count,
        COALESCE(SUM(debit), 0) AS total_debits,
        COALESCE(SUM(credit), 0) AS total_credits
      FROM (${query}) AS sub
    `;
    const [totRows]: any = await pool.query(countQuery, params);
    const summary = {
      totalCount: Number(totRows[0]?.total_count || 0),
      totalDebits: Number(totRows[0]?.total_debits || 0),
      totalCredits: Number(totRows[0]?.total_credits || 0),
      netBalance: Number(totRows[0]?.total_debits || 0) - Number(totRows[0]?.total_credits || 0)
    };

    const numLimit = Math.min(Number(limit) || 100, 1000);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * numLimit;

    query += ' ORDER BY l.date DESC, l.id DESC LIMIT ? OFFSET ?';
    params.push(numLimit, offset);

    const [rows]: any = await pool.query(query, params);

    let runningBalance = summary.netBalance;
    const items = rows.map((r: any) => {
      const entry = {
        id: r.id,
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
        reference: r.reference,
        accountType: r.account_type,
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0),
        runningBalance: Number(r.balance_after || 0),
        description: r.description,
        sourceModule: r.source_module,
        status: r.status,
        propertyId: r.property_id,
        propertyName: r.live_property_name || 'عام / غير مخصص',
        unitNumber: r.live_unit_number || '-',
        tenantId: r.tenant_id,
        tenantName: r.tenant_name || '-',
        tenantCode: r.tenant_code || '-'
      };
      return entry;
    });

    res.json({
      summary,
      page: Number(page) || 1,
      limit: numLimit,
      items
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// REPORT 18: TRIAL BALANCE REPORT (ميزان المراجعة)
// ============================================================================
router.get('/reports/trial-balance', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { dateFrom, dateTo } = req.query;

    // Fetch account balances directly from the canonical balances logic
    // 1. Cash Boxes (1101)
    const [cashBoxes]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(opening_balance), 0) AS total_opening,
        COALESCE(SUM(current_balance), 0) AS total_current
      FROM cash_boxes
      WHERE status = 'ACTIVE'
    `);
    const [cashCollections]: any = await pool.query(`
      SELECT COALESCE(SUM(amount_paid), 0) AS total_collected
      FROM payments
      WHERE status = 'COMPLETED' AND payment_method = 'CASH'
    `);
    const [cashExpenses]: any = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_cash_expenses
      FROM expenses
      WHERE status = 'POSTED' AND payment_method = 'CASH'
    `);
    const cashOpening = Number(cashBoxes[0]?.total_opening || 0);
    const cashIn = Number(cashCollections[0]?.total_collected || 0);
    const cashOut = Number(cashExpenses[0]?.total_cash_expenses || 0);
    const cashCurrent = Number(cashBoxes[0]?.total_current || 0);

    // 2. Tenant Rent Receivables (1201)
    const [rentInvoices]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS invoiced,
        COALESCE(SUM(paid_amount), 0) AS paid,
        COALESCE(SUM(total_amount - paid_amount), 0) AS balance
      FROM invoices
      WHERE status != 'CANCELLED' AND account_type = 'RENT'
    `);
    const rentInvoiced = Number(rentInvoices[0]?.invoiced || 0);
    const rentPaid = Number(rentInvoices[0]?.paid || 0);
    const rentBalance = Number(rentInvoices[0]?.balance || 0);

    // 3. Electricity Receivables (1202)
    const [elecInvoices]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS invoiced,
        COALESCE(SUM(paid_amount), 0) AS paid,
        COALESCE(SUM(total_amount - paid_amount), 0) AS balance
      FROM invoices
      WHERE status != 'CANCELLED' AND account_type = 'ELECTRICITY'
    `);
    const elecInvoiced = Number(elecInvoices[0]?.invoiced || 0);
    const elecPaid = Number(elecInvoices[0]?.paid || 0);
    const elecBalance = Number(elecInvoices[0]?.balance || 0);

    // 4. Water Receivables (1203)
    const [waterInvoices]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS invoiced,
        COALESCE(SUM(paid_amount), 0) AS paid,
        COALESCE(SUM(total_amount - paid_amount), 0) AS balance
      FROM invoices
      WHERE status != 'CANCELLED' AND account_type = 'WATER'
    `);
    const waterInvoiced = Number(waterInvoices[0]?.invoiced || 0);
    const waterPaid = Number(waterInvoices[0]?.paid || 0);
    const waterBalance = Number(waterInvoices[0]?.balance || 0);

    // 5. Tenant Guarantees & Deposits (2101)
    const [deposits]: any = await pool.query(`
      SELECT COALESCE(SUM(deposit_amount), 0) AS total_deposits
      FROM contracts
      WHERE status IN ('ACTIVE', 'PENDING_APPROVAL')
    `);
    const totalDeposits = Number(deposits[0]?.total_deposits || 0);

    // 6. Rental Revenues (4101)
    const totalRentRevenue = rentInvoiced;

    // 7. Electricity Revenues (4201)
    const totalElecRevenue = elecInvoiced;

    // 8. Water Revenues (4301)
    const totalWaterRevenue = waterInvoiced;

    // 9. Operating & Maintenance Expenses (5101)
    const [postedExp]: any = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_posted
      FROM expenses
      WHERE status = 'POSTED'
    `);
    const totalExpenses = Number(postedExp[0]?.total_posted || 0);

    const accounts = [
      {
        accountCode: '1101',
        accountName: 'الصناديق والخزائن النقدية',
        category: 'أصول متداولة (نقدية)',
        nature: 'DEBIT',
        openingBalance: cashOpening,
        debitTotal: cashIn,
        creditTotal: cashOut,
        closingBalance: cashCurrent,
        debitBalance: Math.max(cashCurrent, 0),
        creditBalance: cashCurrent < 0 ? Math.abs(cashCurrent) : 0,
        notes: 'الرصيد الفعلي في الخزائن والصناديق'
      },
      {
        accountCode: '1201',
        accountName: 'ذمم مستأجري عقود الإيجار',
        category: 'أصول متداولة (ذمم مدينة)',
        nature: 'DEBIT',
        openingBalance: 0,
        debitTotal: rentInvoiced,
        creditTotal: rentPaid,
        closingBalance: rentBalance,
        debitBalance: Math.max(rentBalance, 0),
        creditBalance: rentBalance < 0 ? Math.abs(rentBalance) : 0,
        notes: 'صافي مستحقات فواتير الإيجارات'
      },
      {
        accountCode: '1202',
        accountName: 'ذمم مشتركي استهلاك الكهرباء',
        category: 'أصول متداولة (ذمم مدينة)',
        nature: 'DEBIT',
        openingBalance: 0,
        debitTotal: elecInvoiced,
        creditTotal: elecPaid,
        closingBalance: elecBalance,
        debitBalance: Math.max(elecBalance, 0),
        creditBalance: elecBalance < 0 ? Math.abs(elecBalance) : 0,
        notes: 'صافي مستحقات فواتير الكهرباء'
      },
      {
        accountCode: '1203',
        accountName: 'ذمم مستهلكي خدمات المياه المشتركة',
        category: 'أصول متداولة (ذمم مدينة)',
        nature: 'DEBIT',
        openingBalance: 0,
        debitTotal: waterInvoiced,
        creditTotal: waterPaid,
        closingBalance: waterBalance,
        debitBalance: Math.max(waterBalance, 0),
        creditBalance: waterBalance < 0 ? Math.abs(waterBalance) : 0,
        notes: 'صافي مستحقات فواتير وتكاليف المياه'
      },
      {
        accountCode: '2101',
        accountName: 'أمانات وتأمينات المستأجرين المحتجزة',
        category: 'التزامات متداولة (أمانات)',
        nature: 'CREDIT',
        openingBalance: 0,
        debitTotal: 0,
        creditTotal: totalDeposits,
        closingBalance: totalDeposits,
        debitBalance: 0,
        creditBalance: totalDeposits,
        notes: 'الضمانات والتأمينات النقدية المحتجزة'
      },
      {
        accountCode: '4101',
        accountName: 'إيرادات الإيجارات المستحقة',
        category: 'إيرادات النشاط العقاري',
        nature: 'CREDIT',
        openingBalance: 0,
        debitTotal: 0,
        creditTotal: totalRentRevenue,
        closingBalance: totalRentRevenue,
        debitBalance: 0,
        creditBalance: totalRentRevenue,
        notes: 'إجمالي الفواتير الصادرة للإيجارات الدورية'
      },
      {
        accountCode: '4201',
        accountName: 'إيرادات خدمات واستهلاك الكهرباء',
        category: 'إيرادات خدمات المرافق',
        nature: 'CREDIT',
        openingBalance: 0,
        debitTotal: 0,
        creditTotal: totalElecRevenue,
        closingBalance: totalElecRevenue,
        debitBalance: 0,
        creditBalance: totalElecRevenue,
        notes: 'إجمالي فواتير الكهرباء الصادرة'
      },
      {
        accountCode: '4301',
        accountName: 'إيرادات توزيع تكاليف المياه والتشغيل',
        category: 'إيرادات خدمات المرافق',
        nature: 'CREDIT',
        openingBalance: 0,
        debitTotal: 0,
        creditTotal: totalWaterRevenue,
        closingBalance: totalWaterRevenue,
        debitBalance: 0,
        creditBalance: totalWaterRevenue,
        notes: 'إجمالي فواتير المياه الموزعة الصادرة'
      },
      {
        accountCode: '5101',
        accountName: 'مصروفات التشغيل والصيانة والإصلاحات',
        category: 'مصروفات تشغيلية (تكاليف)',
        nature: 'DEBIT',
        openingBalance: 0,
        debitTotal: totalExpenses,
        creditTotal: 0,
        closingBalance: totalExpenses,
        debitBalance: totalExpenses,
        creditBalance: 0,
        notes: 'إجمالي المصروفات التشغيلية وسندات الصيانة المرحلة'
      }
    ];

    const totalDebits = accounts.reduce((sum, a) => sum + (a.debitBalance || 0), 0);
    const totalCredits = accounts.reduce((sum, a) => sum + (a.creditBalance || 0), 0);
    const difference = Math.abs(totalDebits - totalCredits);
    const isBalanced = difference < 0.01;

    res.json({
      accounts,
      totals: {
        totalDebits,
        totalCredits,
        difference,
        isBalanced
      },
      architectureNotes: {
        isDoubleEntryComplete: false,
        explanation: 'يعمل النظام حالياً بهيكلية دفاتر أستاذ فرعية للذمم المدينة والصناديق (Sub-Ledger Architecture) ومطابقة أرصدة المستأجرين والفواتير بنسبة 100%. تعرض هذه الشاشة الأرصدة التحليلية لمطابقة الذمم والتحصيلات والمصروفات بدقة محاسبية من واقع قاعدة البيانات الفعلية.'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
