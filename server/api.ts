import express, { Request, Response } from 'express';
import { getPool, executeTransaction } from './db';

const router = express.Router();

// 1. Health check with real database connectivity check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const [rows]: any = await pool.query('SELECT 1 as isAlive');
    if (rows && rows[0]?.isAlive === 1) {
      res.json({
        backend: 'online',
        database: 'online',
        databaseType: 'mysql',
        version: '8.x / MariaDB 10.11',
        timestamp: new Date().toISOString()
      });
      return;
    }
  } catch (err: any) {
    console.error('Database health check failed:', err.message);
    res.status(500).json({
      backend: 'online',
      database: 'offline',
      databaseType: 'mysql',
      error: err.message
    });
    return;
  }

  res.json({ backend: 'online', database: 'unknown' });
});

// 2. Dashboard KPIs calculated directly from MySQL
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  const calculateStats = async (p: any) => {
    const [propRows]: any = await p.query(`
      SELECT 
        COUNT(*) as totalProperties,
        COALESCE(SUM(monthly_expected_rent), 0) as monthlyExpectedRent,
        COALESCE(SUM(total_outstanding_rent), 0) as propOutstanding
      FROM properties
    `);

    const [unitRows]: any = await p.query(`
      SELECT 
        COUNT(*) as totalUnits,
        COALESCE(SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END), 0) as occupiedUnits,
        COALESCE(SUM(CASE WHEN status = 'VACANT' THEN 1 ELSE 0 END), 0) as vacantUnits
      FROM units
    `);

    const [tenantRows]: any = await p.query(`
      SELECT COUNT(*) as activeTenants FROM tenants
    `);

    const [contractRows]: any = await p.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) as activeContracts,
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' AND end_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY) THEN 1 ELSE 0 END), 0) as expiringContractsCount
      FROM contracts
    `);

    const [paymentRows]: any = await p.query(`
      SELECT 
        COALESCE(SUM(amount_paid), 0) as totalCollectedThisMonth,
        COALESCE(SUM(CASE WHEN DATE(collected_at) = CURDATE() THEN amount_paid ELSE 0 END), 0) as todayCollections
      FROM payments
    `);

    const [invoiceRows]: any = await p.query(`
      SELECT COALESCE(SUM(remaining_amount), 0) as outstandingTotal 
      FROM invoices 
      WHERE status != 'PAID'
    `);

    const [waterRows]: any = await p.query(`
      SELECT COALESCE(SUM(net_total_operating_cost), 0) as totalWaterCost FROM water_costs
    `);

    const [elecRows]: any = await p.query(`
      SELECT COALESCE(SUM(total_amount), 0) as totalElecBilled FROM electricity_readings
    `);

    const [depositRows]: any = await p.query(`
      SELECT COALESCE(SUM(deposit_amount - refunded_amount), 0) as totalDepositsHeld FROM deposits WHERE status = 'HELD'
    `);

    const totalUnits = Number(unitRows[0]?.totalUnits || 0);
    const occupiedUnits = Number(unitRows[0]?.occupiedUnits || 0);
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0;

    return {
      totalProperties: Number(propRows[0]?.totalProperties || 0),
      totalUnits,
      occupiedUnits,
      vacantUnits: Number(unitRows[0]?.vacantUnits || 0),
      occupancyRate,
      activeTenants: Number(tenantRows[0]?.activeTenants || 0),
      activeContracts: Number(contractRows[0]?.activeContracts || 0),
      expiringContractsCount: Number(contractRows[0]?.expiringContractsCount || 0),
      monthlyExpectedRent: Number(propRows[0]?.monthlyExpectedRent || 0),
      totalCollectedThisMonth: Number(paymentRows[0]?.totalCollectedThisMonth || 0),
      todayCollections: Number(paymentRows[0]?.todayCollections || 0),
      outstandingTotal: Number(invoiceRows[0]?.outstandingTotal || 0),
      totalWaterOperatingCosts: Number(waterRows[0]?.totalWaterCost || 0),
      electricityBilledTotal: Number(elecRows[0]?.totalElecBilled || 0),
      totalDepositsHeld: Number(depositRows[0]?.totalDepositsHeld || 0),
    };
  };

  try {
    const pool = await getPool();
    const stats = await calculateStats(pool);
    res.json(stats);
  } catch (err: any) {
    console.warn('Dashboard stats initial attempt failed, re-establishing pool:', err.message);
    try {
      const pool = await getPool();
      const stats = await calculateStats(pool);
      res.json(stats);
    } catch (retryErr: any) {
      console.error('Error fetching dashboard stats after retry:', retryErr.message);
      res.json({
        totalProperties: 0,
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyRate: 0,
        activeTenants: 0,
        activeContracts: 0,
        expiringContractsCount: 0,
        monthlyExpectedRent: 0,
        totalCollectedThisMonth: 0,
        todayCollections: 0,
        outstandingTotal: 0,
        totalWaterOperatingCosts: 0,
        electricityBilledTotal: 0,
        totalDepositsHeld: 0,
        isConnecting: true
      });
    }
  }
});

// 3. Properties API
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const search = req.query.search ? `%${req.query.search}%` : null;

    let query = 'SELECT * FROM properties';
    const params: any[] = [];

    if (search) {
      query += ' WHERE name LIKE ? OR code LIKE ? OR city LIKE ? OR district LIKE ?';
      params.push(search, search, search, search);
    }
    query += ' ORDER BY created_at DESC';

    const [rows]: any = await pool.query(query, params);
    const properties = rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      city: r.city,
      district: r.district,
      street: r.street,
      ownerName: r.owner_name,
      ownerPhone: r.owner_phone,
      totalUnits: Number(r.total_units),
      occupiedUnits: Number(r.occupied_units),
      vacantUnits: Number(r.vacant_units),
      monthlyExpectedRent: Number(r.monthly_expected_rent),
      totalOutstandingRent: Number(r.total_outstanding_rent),
      status: 'ACTIVE'
    }));

    res.json(properties);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Units API
router.get('/units', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const propertyId = req.query.propertyId as string;
    const status = req.query.status as string;

    let query = 'SELECT * FROM units WHERE 1=1';
    const params: any[] = [];

    if (propertyId) {
      query += ' AND property_id = ?';
      params.push(propertyId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY unit_number ASC';

    const [rows]: any = await pool.query(query, params);
    const units = rows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      buildingId: r.building_id,
      buildingName: r.building_name,
      floorNumber: r.floor_number,
      unitNumber: r.unit_number,
      type: r.type,
      areaSqm: Number(r.area_sqm),
      status: r.status,
      pricePerCycle: Number(r.price_per_cycle),
      electricityMeterNumber: r.electricity_meter_number,
      waterMeterOrShare: r.water_meter_or_share,
      currentTenantId: r.current_tenant_id,
      currentTenantName: r.current_tenant_name,
      currentContractId: r.current_contract_id
    }));

    res.json(units);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Tenants API
router.get('/tenants', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const search = req.query.search ? `%${req.query.search}%` : null;

    let query = 'SELECT * FROM tenants';
    const params: any[] = [];

    if (search) {
      query += ' WHERE name LIKE ? OR tenant_code LIKE ? OR national_id LIKE ? OR phone LIKE ?';
      params.push(search, search, search, search);
    }
    query += ' ORDER BY created_at DESC';

    const [rows]: any = await pool.query(query, params);
    const tenants = rows.map((r: any) => ({
      id: r.id,
      tenantCode: r.tenant_code,
      name: r.name,
      type: r.type,
      nationalId: r.national_id,
      phone: r.phone,
      email: r.email,
      currentBalance: Number(r.current_balance),
      rentBalance: Number(r.rent_balance),
      waterBalance: Number(r.water_balance),
      electricityBalance: Number(r.electricity_balance),
      depositBalance: Number(r.deposit_balance),
      status: 'ACTIVE'
    }));

    res.json(tenants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Contracts API (with real date overlap check & unit status update)
router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const [rows]: any = await pool.query('SELECT * FROM contracts ORDER BY created_at DESC');
    const contracts = rows.map((r: any) => ({
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
      rentAmount: Number(r.rent_amount),
      paymentCycle: r.payment_cycle,
      depositAmount: Number(r.deposit_amount),
      guaranteePersonName: r.guarantee_person_name,
      guaranteePersonPhone: r.guarantee_person_phone,
      noticePeriodDays: r.notice_period_days,
      status: r.status
    }));
    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/contracts', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      unitId,
      propertyId,
      startDate,
      endDate,
      rentAmount,
      paymentCycle,
      depositAmount,
      guaranteePersonName,
      guaranteePersonPhone,
      noticePeriodDays
    } = req.body;

    // Validation
    if (!tenantId || !unitId || !propertyId || !startDate || !endDate || !rentAmount) {
      res.status(400).json({ error: 'جميع بيانات العقد الأساسية مطلوبة' });
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      res.status(400).json({ error: 'تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية' });
      return;
    }

    const result = await executeTransaction(async (conn) => {
      // 1. Check unit availability and prevent overlap
      const [unitRows]: any = await conn.query('SELECT * FROM units WHERE id = ? FOR UPDATE', [unitId]);
      if (!unitRows.length) throw new Error('الوحدة المحددة غير موجودة');
      const unit = unitRows[0];

      // Check for overlapping active contracts on the same unit
      const [overlapRows]: any = await conn.query(`
        SELECT * FROM contracts 
        WHERE unit_id = ? AND status = 'ACTIVE'
        AND NOT (end_date < ? OR start_date > ?)
      `, [unitId, startDate, endDate]);

      if (overlapRows.length > 0) {
        throw new Error('يوجد عقد إيجار فعال بالفعل لنفس الوحدة في نفس الفترة الزمنية');
      }

      // Fetch tenant and property names
      const [tenantRows]: any = await conn.query('SELECT * FROM tenants WHERE id = ?', [tenantId]);
      if (!tenantRows.length) throw new Error('المستأجر غير موجود');
      const tenant = tenantRows[0];

      const [propRows]: any = await conn.query('SELECT * FROM properties WHERE id = ? FOR UPDATE', [propertyId]);
      if (!propRows.length) throw new Error('العقار غير موجود');
      const property = propRows[0];

      const contractId = `cnt-${Date.now()}`;
      const contractNumber = `CNT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

      // 2. Insert Contract
      await conn.query(`
        INSERT INTO contracts 
        (id, contract_number, tenant_id, tenant_name, property_id, property_name, unit_id, unit_number, start_date, end_date, rent_amount, payment_cycle, deposit_amount, guarantee_person_name, guarantee_person_phone, notice_period_days, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `, [
        contractId, contractNumber, tenant.id, tenant.name, property.id, property.name,
        unit.id, unit.unit_number, startDate, endDate, rentAmount, paymentCycle || 'MONTHLY',
        depositAmount || 0, guaranteePersonName || null, guaranteePersonPhone || null,
        noticePeriodDays || 60
      ]);

      // 3. Update Unit to OCCUPIED
      await conn.query(`
        UPDATE units 
        SET status = 'OCCUPIED', current_tenant_id = ?, current_tenant_name = ?, current_contract_id = ? 
        WHERE id = ?
      `, [tenant.id, tenant.name, contractId, unit.id]);

      // 4. Update Property Occupancy Counts
      await conn.query(`
        UPDATE properties 
        SET occupied_units = occupied_units + 1, vacant_units = GREATEST(0, vacant_units - 1)
        WHERE id = ?
      `, [property.id]);

      // 5. If deposit exists, create isolated deposit entry
      if (depositAmount && Number(depositAmount) > 0) {
        await conn.query(`
          INSERT INTO deposits 
          (id, tenant_id, contract_id, unit_id, deposit_amount, status, received_date, guarantor_name, guarantor_phone, notes)
          VALUES (?, ?, ?, ?, ?, 'HELD', ?, ?, ?, 'تأمين مالي مسترد بموجب العقد الجديد')
        `, [
          `dep-${contractId}`, tenant.id, contractId, unit.id, depositAmount,
          startDate, guaranteePersonName || null, guaranteePersonPhone || null
        ]);

        // Update tenant deposit balance
        await conn.query(`
          UPDATE tenants SET deposit_balance = deposit_balance + ? WHERE id = ?
        `, [depositAmount, tenant.id]);
      }

      // 6. Audit Log
      await conn.query(`
        INSERT INTO audit_logs 
        (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CREATE_CONTRACT', 'CONTRACT', ?, ?)
      `, [
        `aud-${Date.now()}`, contractId,
        `إبرام عقد إيجار رقم ${contractNumber} للوحدة ${unit.unit_number} بمبلغ ${rentAmount} ريال`
      ]);

      return {
        id: contractId,
        contractNumber,
        tenantId: tenant.id,
        tenantName: tenant.name,
        propertyId: property.id,
        propertyName: property.name,
        unitId: unit.id,
        unitNumber: unit.unit_number,
        startDate,
        endDate,
        rentAmount: Number(rentAmount),
        paymentCycle,
        depositAmount: Number(depositAmount || 0),
        status: 'ACTIVE'
      };
    });

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Invoices API
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const tenantId = req.query.tenantId as string;
    const status = req.query.status as string;

    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params: any[] = [];

    if (tenantId) {
      query += ' AND tenant_id = ?';
      params.push(tenantId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY issue_date DESC';

    const [rows]: any = await pool.query(query, params);
    const invoices = rows.map((r: any) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      contractId: r.contract_id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      unitId: r.unit_id,
      unitNumber: r.unit_number,
      accountType: r.account_type,
      periodMonth: r.period_month,
      totalAmount: Number(r.total_amount),
      paidAmount: Number(r.paid_amount),
      remainingAmount: Number(r.remaining_amount),
      issueDate: r.issue_date,
      dueDate: r.due_date,
      status: r.status,
      notes: r.notes
    }));

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. REAL PAYMENT TRANSACTION (Atomic BEGIN ... COMMIT / ROLLBACK)
router.post('/payments', async (req: Request, res: Response) => {
  try {
    const { invoiceId, amountPaid, paymentMethod, collectorId, collectorName, notes } = req.body;

    const amount = Number(amountPaid);
    if (!invoiceId || isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: 'بيانات السداد والمبلغ المدفوع غير صالحة' });
      return;
    }

    const receipt = await executeTransaction(async (conn) => {
      // 1. Lock invoice for update
      const [invRows]: any = await conn.query('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [invoiceId]);
      if (!invRows.length) throw new Error('الفاتورة المطلوبة غير موجودة');
      const invoice = invRows[0];

      if (invoice.status === 'PAID') {
        throw new Error('الفاتورة مسددة بالكامل بالفعل');
      }

      const remainingBefore = Number(invoice.remaining_amount);
      if (amount > remainingBefore) {
        throw new Error(`المبلغ المدفوع (${amount} ريال) أكبر من الرصيد المتبقي بالفاتورة (${remainingBefore} ريال)`);
      }

      // 2. Compute new amounts
      const newPaidAmount = Number(invoice.paid_amount) + amount;
      const newRemaining = remainingBefore - amount;
      const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

      // 3. Update invoice
      await conn.query(`
        UPDATE invoices 
        SET paid_amount = ?, remaining_amount = ?, status = ?
        WHERE id = ?
      `, [newPaidAmount, newRemaining, newStatus, invoice.id]);

      // 4. Update tenant current and specific balances
      await conn.query(`
        UPDATE tenants 
        SET current_balance = GREATEST(0, current_balance - ?)
        WHERE id = ?
      `, [amount, invoice.tenant_id]);

      // 5. Update property outstanding balance
      await conn.query(`
        UPDATE properties 
        SET total_outstanding_rent = GREATEST(0, total_outstanding_rent - ?)
        WHERE id = ?
      `, [amount, invoice.property_id]);

      // 6. Generate payment receipt
      const receiptId = `pay-${Date.now()}`;
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const receiptNumber = `REC-${datePart}-${randomPart}`;

      const qrCodeContent = `SMART-ERP-VERIFIED|RECEIPT:${receiptNumber}|AMOUNT:${amount}|TENANT:${invoice.tenant_name}|DATE:${now.toISOString()}`;

      await conn.query(`
        INSERT INTO payments 
        (id, receipt_number, invoice_id, tenant_id, tenant_name, unit_number, property_name, account_type, amount_paid, payment_method, collector_id, collector_name, collected_at, notes, qr_code_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
      `, [
        receiptId, receiptNumber, invoice.id, invoice.tenant_id, invoice.tenant_name,
        invoice.unit_number, invoice.property_name, invoice.account_type, amount,
        paymentMethod || 'CASH', collectorId || 'usr-1', collectorName || 'م. أحمد الوهاس',
        notes || null, qrCodeContent
      ]);

      // 7. Insert Tenant Ledger Entry (Journal)
      const ledgerId = `ledg-${receiptId}`;
      await conn.query(`
        INSERT INTO tenant_ledger 
        (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id)
        VALUES (?, ?, CURDATE(), ?, ?, 0.00, ?, ?, ?, ?)
      `, [
        ledgerId, invoice.tenant_id, receiptNumber, invoice.account_type,
        amount, newRemaining,
        `سداد ${invoice.account_type === 'RENT' ? 'إيجار' : 'خدمات'} بموجب سند قبض رسمي ${receiptNumber}`,
        collectorId || 'usr-1'
      ]);

      // 8. Audit Log
      await conn.query(`
        INSERT INTO audit_logs 
        (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'COLLECT_PAYMENT', 'PAYMENT', ?, ?)
      `, [
        `aud-${Date.now()}`, collectorId || 'usr-1', collectorName || 'م. أحمد الوهاس',
        receiptId,
        `تحصيل مبلغ ${amount} ريال من ${invoice.tenant_name} للفاتورة ${invoice.invoice_number}`
      ]);

      return {
        receipt: {
          id: receiptId,
          receiptNumber,
          invoiceId: invoice.id,
          tenantId: invoice.tenant_id,
          tenantName: invoice.tenant_name,
          unitNumber: invoice.unit_number,
          propertyName: invoice.property_name,
          accountType: invoice.account_type,
          amountPaid: amount,
          paymentMethod: paymentMethod || 'CASH',
          collectorId: collectorId || 'usr-1',
          collectorName: collectorName || 'م. أحمد الوهاس',
          collectedAt: now.toISOString().replace('T', ' ').slice(0, 19),
          notes,
          qrCodeContent
        },
        updatedInvoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: newStatus
        }
      };
    });

    res.status(201).json(receipt);
  } catch (err: any) {
    console.error('Payment transaction error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// 9. Water Operating Engine API
router.get('/water/costs', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const [rows]: any = await pool.query('SELECT * FROM water_costs ORDER BY created_at DESC LIMIT 10');
    res.json(rows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      periodMonth: r.period_month,
      tankerCount: Number(r.tanker_count),
      tankerUnitPrice: Number(r.tanker_unit_price),
      totalTankerCost: Number(r.total_tanker_cost),
      pumpElectricityCost: Number(r.pump_electricity_cost),
      sewerCost: Number(r.sewer_cost),
      tankMaintenanceCost: Number(r.tank_maintenance_cost),
      cleaningCost: Number(r.cleaning_cost),
      laborCost: Number(r.laborCost || 0),
      otherFees: Number(r.other_fees),
      netTotalOperatingCost: Number(r.net_total_operating_cost),
      distributionMethod: r.distribution_method,
      status: r.status
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/water/costs', async (req: Request, res: Response) => {
  try {
    const {
      propertyId,
      propertyName,
      periodMonth,
      tankerCount,
      tankerUnitPrice,
      pumpElectricityCost,
      sewerCost,
      tankMaintenanceCost,
      cleaningCost,
      laborCost,
      otherFees,
      distributionMethod
    } = req.body;

    const count = Number(tankerCount || 0);
    const unitPrice = Number(tankerUnitPrice || 0);
    const totalTanker = count * unitPrice;
    const pump = Number(pumpElectricityCost || 0);
    const sewer = Number(sewerCost || 0);
    const maintenance = Number(tankMaintenanceCost || 0);
    const clean = Number(cleaningCost || 0);
    const labor = Number(laborCost || 0);
    const other = Number(otherFees || 0);

    const netTotal = totalTanker + pump + sewer + maintenance + clean + labor + other;
    const id = `wat-${Date.now()}`;

    const pool = await getPool();
    await pool.query(`
      INSERT INTO water_costs 
      (id, property_id, property_name, period_month, tanker_count, tanker_unit_price, total_tanker_cost, pump_electricity_cost, sewer_cost, tank_maintenance_cost, cleaning_cost, labor_cost, other_fees, net_total_operating_cost, distribution_method, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CALCULATED')
    `, [
      id, propertyId, propertyName, periodMonth, count, unitPrice, totalTanker,
      pump, sewer, maintenance, clean, labor, other, netTotal, distributionMethod || 'EQUAL'
    ]);

    res.status(201).json({
      id,
      propertyId,
      propertyName,
      periodMonth,
      netTotalOperatingCost: netTotal,
      status: 'CALCULATED'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Electricity Metering Engine API
router.get('/electricity/readings', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const [rows]: any = await pool.query('SELECT * FROM electricity_readings ORDER BY created_at DESC LIMIT 20');
    res.json(rows.map((r: any) => ({
      id: r.id,
      unitId: r.unit_id,
      unitNumber: r.unit_number,
      meterNumber: r.meter_number,
      readingPeriodMonth: r.reading_period_month,
      previousReading: Number(r.previous_reading),
      currentReading: Number(r.current_reading),
      consumptionKwh: Number(r.consumption_kwh),
      ratePerKwh: Number(r.rate_per_kwh),
      totalAmount: Number(r.total_amount),
      readingDate: r.reading_date,
      status: r.status
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/electricity/readings', async (req: Request, res: Response) => {
  try {
    const {
      unitId,
      unitNumber,
      meterNumber,
      readingPeriodMonth,
      previousReading,
      currentReading,
      ratePerKwh,
      readingDate,
      isResetOrReplacement,
      resetReason
    } = req.body;

    const prev = Number(previousReading);
    const curr = Number(currentReading);
    const rate = Number(ratePerKwh || 300);

    if (curr < prev && !isResetOrReplacement) {
      res.status(400).json({
        error: 'قراءة العداد الحالية أقل من السابقة! لا يمكن الحفظ إلا في حالة تصفير أو استبدال العداد مع توضيح السبب.'
      });
      return;
    }

    const consumption = isResetOrReplacement ? curr : Math.max(0, curr - prev);
    const totalAmount = consumption * rate;
    const id = `elec-${Date.now()}`;

    const pool = await getPool();
    await pool.query(`
      INSERT INTO electricity_readings 
      (id, unit_id, unit_number, meter_number, reading_period_month, previous_reading, current_reading, consumption_kwh, rate_per_kwh, total_amount, reading_date, is_reset_or_replacement, reset_reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BILLED')
    `, [
      id, unitId, unitNumber, meterNumber, readingPeriodMonth, prev, curr,
      consumption, rate, totalAmount, readingDate || new Date().toISOString().slice(0, 10),
      isResetOrReplacement ? 1 : 0, resetReason || null
    ]);

    res.status(201).json({
      id,
      consumptionKwh: consumption,
      totalAmount,
      ratePerKwh: rate
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Tenant Real Ledger Statement API (Tabs: Rent, Water, Electricity, Deposits, Unified)
router.get('/tenant-statement/:tenantId', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { tenantId } = req.params;
    const accountType = req.query.accountType as string;

    let query = 'SELECT * FROM tenant_ledger WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (accountType && accountType !== 'ALL') {
      query += ' AND account_type = ?';
      params.push(accountType);
    }
    query += ' ORDER BY date ASC, created_at ASC';

    const [ledgerRows]: any = await pool.query(query, params);
    const [invRows]: any = await pool.query('SELECT * FROM invoices WHERE tenant_id = ? ORDER BY issue_date DESC', [tenantId]);
    const [payRows]: any = await pool.query('SELECT * FROM payments WHERE tenant_id = ? ORDER BY collected_at DESC', [tenantId]);

    res.json({
      ledger: ledgerRows.map((r: any) => ({
        id: r.id,
        date: r.date,
        reference: r.reference,
        accountType: r.account_type,
        debit: Number(r.debit),
        credit: Number(r.credit),
        balanceAfter: Number(r.balance_after),
        description: r.description
      })),
      invoices: invRows.map((r: any) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        accountType: r.account_type,
        periodMonth: r.period_month,
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        remainingAmount: Number(r.remaining_amount),
        status: r.status
      })),
      payments: payRows.map((r: any) => ({
        id: r.id,
        receiptNumber: r.receipt_number,
        accountType: r.account_type,
        amountPaid: Number(r.amount_paid),
        collectedAt: r.collected_at,
        paymentMethod: r.payment_method
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Recent Collections API
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const [rows]: any = await pool.query('SELECT * FROM payments ORDER BY collected_at DESC LIMIT 30');
    const payments = rows.map((r: any) => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      invoiceId: r.invoice_id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      unitNumber: r.unit_number,
      propertyName: r.property_name,
      accountType: r.account_type,
      amountPaid: Number(r.amount_paid),
      paymentMethod: r.payment_method,
      collectorId: r.collector_id,
      collectorName: r.collector_name,
      collectedAt: r.collected_at,
      notes: r.notes,
      qrCodeContent: r.qr_code_content
    }));
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
