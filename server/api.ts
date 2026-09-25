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

// 3. Properties API (Complete CRUD & Status Management)
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const search = req.query.search ? `%${req.query.search}%` : null;
    const type = req.query.type as string;
    const status = req.query.status as string;

    let query = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as real_total_units,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'OCCUPIED') as real_occupied_units,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'VACANT') as real_vacant_units,
        (SELECT COUNT(*) FROM buildings b WHERE b.property_id = p.id) as total_buildings,
        (SELECT COALESCE(SUM(c.rent_amount), 0) FROM contracts c WHERE c.property_id = p.id AND c.status = 'ACTIVE') as active_monthly_rent
      FROM properties p
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.city LIKE ? OR p.district LIKE ? OR p.street LIKE ? OR p.owner_name LIKE ?)';
      params.push(search, search, search, search, search, search);
    }
    if (type && type !== 'ALL') {
      query += ' AND p.type = ?';
      params.push(type);
    }
    if (status && status !== 'ALL') {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows]: any = await pool.query(query, params);
    const properties = rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      ownershipType: r.ownership_type || 'SOLE',
      city: r.city,
      district: r.district,
      street: r.street,
      ownerName: r.owner_name,
      ownerPhone: r.owner_phone,
      totalUnits: Number(r.real_total_units ?? r.total_units),
      occupiedUnits: Number(r.real_occupied_units ?? r.occupied_units),
      vacantUnits: Number(r.real_vacant_units ?? r.vacant_units),
      totalBuildings: Number(r.total_buildings || 0),
      monthlyExpectedRent: Number(r.active_monthly_rent > 0 ? r.active_monthly_rent : r.monthly_expected_rent),
      totalOutstandingRent: Number(r.total_outstanding_rent || 0),
      totalAreaSqm: Number(r.total_area_sqm || 0),
      status: r.status || 'ACTIVE',
      description: r.description || '',
      notes: r.notes || '',
      createdAt: r.created_at
    }));

    res.json(properties);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/properties/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [propRows]: any = await pool.query(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as real_total_units,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'OCCUPIED') as real_occupied_units,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'VACANT') as real_vacant_units,
        (SELECT COUNT(*) FROM buildings b WHERE b.property_id = p.id) as total_buildings,
        (SELECT COALESCE(SUM(c.rent_amount), 0) FROM contracts c WHERE c.property_id = p.id AND c.status = 'ACTIVE') as active_monthly_rent
      FROM properties p 
      WHERE p.id = ?
    `, [id]);

    if (!propRows.length) {
      res.status(404).json({ error: 'العقار غير موجود' });
      return;
    }

    const r = propRows[0];

    // Fetch related buildings
    const [bldRows]: any = await pool.query('SELECT * FROM buildings WHERE property_id = ? ORDER BY name ASC', [id]);
    
    // Fetch related units
    const [unitRows]: any = await pool.query('SELECT * FROM units WHERE property_id = ? ORDER BY unit_number ASC', [id]);

    res.json({
      property: {
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        ownershipType: r.ownership_type || 'SOLE',
        city: r.city,
        district: r.district,
        street: r.street,
        ownerName: r.owner_name,
        ownerPhone: r.owner_phone,
        totalUnits: Number(r.real_total_units ?? r.total_units),
        occupiedUnits: Number(r.real_occupied_units ?? r.occupied_units),
        vacantUnits: Number(r.real_vacant_units ?? r.vacant_units),
        totalBuildings: Number(r.total_buildings || 0),
        monthlyExpectedRent: Number(r.active_monthly_rent > 0 ? r.active_monthly_rent : r.monthly_expected_rent),
        totalOutstandingRent: Number(r.total_outstanding_rent || 0),
        totalAreaSqm: Number(r.total_area_sqm || 0),
        status: r.status || 'ACTIVE',
        description: r.description || '',
        notes: r.notes || '',
        createdAt: r.created_at
      },
      buildings: bldRows.map((b: any) => ({
        id: b.id,
        propertyId: b.property_id,
        code: b.code || '',
        name: b.name,
        totalFloors: Number(b.total_floors),
        status: b.status || 'ACTIVE',
        description: b.description || '',
        notes: b.notes || '',
        createdAt: b.created_at
      })),
      units: unitRows.map((u: any) => ({
        id: u.id,
        propertyId: u.property_id,
        buildingId: u.building_id,
        buildingName: u.building_name,
        floorNumber: u.floor_number,
        floorName: u.floor_name || `الطابق ${u.floor_number}`,
        unitCode: u.unit_code || u.unit_number,
        unitNumber: u.unit_number,
        type: u.type,
        areaSqm: Number(u.area_sqm),
        status: u.status,
        pricePerCycle: Number(u.price_per_cycle),
        electricityMeterNumber: u.electricity_meter_number,
        waterMeterOrShare: u.water_meter_or_share,
        ownerName: u.owner_name || '',
        currentTenantId: u.current_tenant_id,
        currentTenantName: u.current_tenant_name,
        currentContractId: u.current_contract_id
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/properties', async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      type,
      ownershipType,
      city,
      district,
      street,
      ownerName,
      ownerPhone,
      totalAreaSqm,
      description,
      notes,
      status
    } = req.body;

    if (!name || !code || !type || !city || !district || !street || !ownerName) {
      res.status(400).json({ error: 'يرجى استيفاء جميع الحقول الإلزامية للعقار (الاسم، الرمز، النوع، المدينة، الحي، الشارع، والمالك)' });
      return;
    }

    const pool = await getPool();

    // Check code uniqueness
    const [existing]: any = await pool.query('SELECT id FROM properties WHERE code = ?', [code.trim()]);
    if (existing.length > 0) {
      res.status(400).json({ error: `رمز العقار (${code}) مستخدم مسبقاً، يرجى اختيار رمز فريد` });
      return;
    }

    const propertyId = `prop-${Date.now()}`;
    const cleanCode = code.trim().toUpperCase();

    await pool.query(`
      INSERT INTO properties 
      (id, code, name, type, ownership_type, city, district, street, owner_name, owner_phone, total_units, occupied_units, vacant_units, monthly_expected_rent, total_outstanding_rent, total_area_sqm, status, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0.00, 0.00, ?, ?, ?, ?)
    `, [
      propertyId,
      cleanCode,
      name.trim(),
      type,
      ownershipType || 'SOLE',
      city.trim(),
      district.trim(),
      street.trim(),
      ownerName.trim(),
      ownerPhone ? ownerPhone.trim() : '',
      Number(totalAreaSqm || 0),
      status || 'ACTIVE',
      description || null,
      notes || null
    ]);

    // Also auto-create a default building for this property if needed
    const defaultBuildingId = `bld-${Date.now()}`;
    await pool.query(`
      INSERT INTO buildings (id, property_id, code, name, total_floors, status, description)
      VALUES (?, ?, ?, ?, ?, 'ACTIVE', 'المبنى الرئيسي')
    `, [defaultBuildingId, propertyId, `${cleanCode}-B1`, 'المبنى الرئيسي', 1]);

    // Audit Log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CREATE_PROPERTY', 'PROPERTY', ?, ?)
    `, [
      `aud-${Date.now()}`,
      propertyId,
      `إضافة عقار جديد: ${name.trim()} (رمز: ${cleanCode}) في ${city.trim()} - ${district.trim()}`
    ]);

    res.status(201).json({
      id: propertyId,
      code: cleanCode,
      name: name.trim(),
      type,
      ownershipType: ownershipType || 'SOLE',
      city: city.trim(),
      district: district.trim(),
      street: street.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone || '',
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      totalBuildings: 1,
      monthlyExpectedRent: 0,
      totalOutstandingRent: 0,
      totalAreaSqm: Number(totalAreaSqm || 0),
      status: status || 'ACTIVE',
      description: description || '',
      notes: notes || '',
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error creating property:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/properties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      type,
      ownershipType,
      city,
      district,
      street,
      ownerName,
      ownerPhone,
      totalAreaSqm,
      description,
      notes,
      status
    } = req.body;

    if (!name || !code || !type || !city || !district || !street || !ownerName) {
      res.status(400).json({ error: 'يرجى استيفاء جميع الحقول الإلزامية للعقار' });
      return;
    }

    const pool = await getPool();

    // Verify property exists
    const [existingProp]: any = await pool.query('SELECT * FROM properties WHERE id = ?', [id]);
    if (!existingProp.length) {
      res.status(404).json({ error: 'العقار غير موجود' });
      return;
    }

    // Verify code uniqueness if changed
    const cleanCode = code.trim().toUpperCase();
    const [codeMatch]: any = await pool.query('SELECT id FROM properties WHERE code = ? AND id != ?', [cleanCode, id]);
    if (codeMatch.length > 0) {
      res.status(400).json({ error: `رمز العقار (${code}) مستخدم مسبقاً لعقار آخر` });
      return;
    }

    await pool.query(`
      UPDATE properties SET
        code = ?,
        name = ?,
        type = ?,
        ownership_type = ?,
        city = ?,
        district = ?,
        street = ?,
        owner_name = ?,
        owner_phone = ?,
        total_area_sqm = ?,
        status = ?,
        description = ?,
        notes = ?
      WHERE id = ?
    `, [
      cleanCode,
      name.trim(),
      type,
      ownershipType || 'SOLE',
      city.trim(),
      district.trim(),
      street.trim(),
      ownerName.trim(),
      ownerPhone ? ownerPhone.trim() : '',
      Number(totalAreaSqm || 0),
      status || 'ACTIVE',
      description || null,
      notes || null,
      id
    ]);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'UPDATE_PROPERTY', 'PROPERTY', ?, ?)
    `, [
      `aud-${Date.now()}`,
      id,
      `تعديل بيانات العقار: ${name.trim()} (رمز: ${cleanCode})`
    ]);

    res.json({
      id,
      code: cleanCode,
      name: name.trim(),
      type,
      ownershipType: ownershipType || 'SOLE',
      city: city.trim(),
      district: district.trim(),
      street: street.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone || '',
      status: status || 'ACTIVE',
      totalAreaSqm: Number(totalAreaSqm || 0),
      description: description || '',
      notes: notes || ''
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/properties/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      res.status(400).json({ error: 'حالة العقار يجب أن تكون ACTIVE أو INACTIVE' });
      return;
    }

    const pool = await getPool();
    const [existing]: any = await pool.query('SELECT name FROM properties WHERE id = ?', [id]);
    if (!existing.length) {
      res.status(404).json({ error: 'العقار غير موجود' });
      return;
    }

    await pool.query('UPDATE properties SET status = ? WHERE id = ?', [status, id]);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CHANGE_PROPERTY_STATUS', 'PROPERTY', ?, ?)
    `, [
      `aud-${Date.now()}`,
      id,
      `تغيير حالة العقار ${existing[0].name} إلى ${status === 'ACTIVE' ? 'نشط' : 'معطل'}`
    ]);

    res.json({ id, status, message: 'تم تحديث حالة العقار بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/properties/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    // Check if property has units
    const [units]: any = await pool.query('SELECT COUNT(*) as count FROM units WHERE property_id = ?', [id]);
    if (units[0]?.count > 0) {
      res.status(400).json({ error: `لا يمكن حذف هذا العقار لوجود ${units[0].count} وحدة مسجلة تحته. يرجى حذف الوحدات أو نقلها أولاً.` });
      return;
    }

    // Check if property has contracts
    const [contracts]: any = await pool.query('SELECT COUNT(*) as count FROM contracts WHERE property_id = ?', [id]);
    if (contracts[0]?.count > 0) {
      res.status(400).json({ error: `لا يمكن حذف هذا العقار لوجود ${contracts[0].count} عقداً تاريخياً أو فعالاً مرتبطاً به حفاظاً على السجلات المالية.` });
      return;
    }

    // Delete buildings under this property
    await pool.query('DELETE FROM buildings WHERE property_id = ?', [id]);
    await pool.query('DELETE FROM properties WHERE id = ?', [id]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'DELETE_PROPERTY', 'PROPERTY', ?, ?)
    `, [`aud-${Date.now()}`, id, `حذف العقار رقم ${id}`]);

    res.json({ success: true, message: 'تم حذف العقار بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.1 Buildings API
router.get('/buildings', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const propertyId = req.query.propertyId as string;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let query = `
      SELECT 
        b.*,
        p.name as property_name,
        p.code as property_code,
        (SELECT COUNT(*) FROM units u WHERE u.building_id = b.id) as units_count,
        (SELECT COUNT(*) FROM units u WHERE u.building_id = b.id AND u.status = 'OCCUPIED') as occupied_units_count
      FROM buildings b
      JOIN properties p ON p.id = b.property_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId) {
      query += ' AND b.property_id = ?';
      params.push(propertyId);
    }
    if (search) {
      query += ' AND (b.name LIKE ? OR b.code LIKE ? OR p.name LIKE ?)';
      params.push(search, search, search);
    }

    query += ' ORDER BY b.created_at ASC';

    const [rows]: any = await pool.query(query, params);
    res.json(rows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      propertyCode: r.property_code,
      code: r.code || '',
      name: r.name,
      totalFloors: Number(r.total_floors),
      unitsCount: Number(r.units_count || 0),
      occupiedUnitsCount: Number(r.occupied_units_count || 0),
      status: r.status || 'ACTIVE',
      description: r.description || '',
      notes: r.notes || '',
      createdAt: r.created_at
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/buildings', async (req: Request, res: Response) => {
  try {
    const { propertyId, code, name, totalFloors, status, description, notes } = req.body;

    if (!propertyId || !name) {
      res.status(400).json({ error: 'العقار واسم المبنى حقول مطلوبة' });
      return;
    }

    const pool = await getPool();
    const [prop]: any = await pool.query('SELECT name, code FROM properties WHERE id = ?', [propertyId]);
    if (!prop.length) {
      res.status(404).json({ error: 'العقار المختار غير موجود' });
      return;
    }

    const buildingId = `bld-${Date.now()}`;
    const cleanCode = code ? code.trim().toUpperCase() : `${prop[0].code}-B${Math.floor(10 + Math.random() * 90)}`;

    await pool.query(`
      INSERT INTO buildings (id, property_id, code, name, total_floors, status, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      buildingId,
      propertyId,
      cleanCode,
      name.trim(),
      Number(totalFloors || 1),
      status || 'ACTIVE',
      description || null,
      notes || null
    ]);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CREATE_BUILDING', 'BUILDING', ?, ?)
    `, [
      `aud-${Date.now()}`,
      buildingId,
      `إضافة مبنى (${name.trim()}) تحت عقار (${prop[0].name})`
    ]);

    res.status(201).json({
      id: buildingId,
      propertyId,
      propertyName: prop[0].name,
      code: cleanCode,
      name: name.trim(),
      totalFloors: Number(totalFloors || 1),
      status: status || 'ACTIVE',
      unitsCount: 0,
      occupiedUnitsCount: 0,
      description: description || '',
      notes: notes || '',
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/buildings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, totalFloors, status, description, notes } = req.body;

    if (!name) {
      res.status(400).json({ error: 'اسم المبنى مطلوب' });
      return;
    }

    const pool = await getPool();
    await pool.query(`
      UPDATE buildings SET
        code = ?,
        name = ?,
        total_floors = ?,
        status = ?,
        description = ?,
        notes = ?
      WHERE id = ?
    `, [
      code ? code.trim().toUpperCase() : null,
      name.trim(),
      Number(totalFloors || 1),
      status || 'ACTIVE',
      description || null,
      notes || null,
      id
    ]);

    res.json({ id, name, totalFloors: Number(totalFloors || 1), status: status || 'ACTIVE', message: 'تم تحديث بيانات المبنى' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/buildings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const [units]: any = await pool.query('SELECT COUNT(*) as count FROM units WHERE building_id = ?', [id]);
    if (units[0]?.count > 0) {
      res.status(400).json({ error: `لا يمكن حذف هذا المبنى لوجود ${units[0].count} وحدة مسجلة داخله. يرجى حذف الوحدات أو نقلها أولاً.` });
      return;
    }

    await pool.query('DELETE FROM buildings WHERE id = ?', [id]);
    res.json({ success: true, message: 'تم حذف المبنى بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to recalculate property units count
async function recalculatePropertyUnits(pool: any, propertyId: string) {
  try {
    const [counts]: any = await pool.query(`
      SELECT 
        COUNT(*) as totalUnits,
        COALESCE(SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END), 0) as occupiedUnits,
        COALESCE(SUM(CASE WHEN status = 'VACANT' THEN 1 ELSE 0 END), 0) as vacantUnits
      FROM units WHERE property_id = ?
    `, [propertyId]);

    const total = Number(counts[0]?.totalUnits || 0);
    const occupied = Number(counts[0]?.occupiedUnits || 0);
    const vacant = Number(counts[0]?.vacantUnits || 0);

    await pool.query(`
      UPDATE properties 
      SET total_units = ?, occupied_units = ?, vacant_units = ? 
      WHERE id = ?
    `, [total, occupied, vacant, propertyId]);
  } catch (err) {
    console.error('Error recalculating property units:', err);
  }
}

// 4. Units API (Complete CRUD, Rentable Spaces & Status Lifecycle)
router.get('/units', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const propertyId = req.query.propertyId as string;
    const buildingId = req.query.buildingId as string;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let query = `
      SELECT 
        u.*,
        p.name as property_name,
        p.code as property_code,
        b.name as bld_name,
        c.contract_number,
        c.start_date as contract_start_date,
        c.end_date as contract_end_date,
        c.rent_amount as contract_rent_amount
      FROM units u
      JOIN properties p ON p.id = u.property_id
      LEFT JOIN buildings b ON b.id = u.building_id
      LEFT JOIN contracts c ON c.id = u.current_contract_id AND c.status = 'ACTIVE'
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
    if (status && status !== 'ALL') {
      query += ' AND u.status = ?';
      params.push(status);
    }
    if (type && type !== 'ALL') {
      query += ' AND u.type = ?';
      params.push(type);
    }
    if (search) {
      query += ' AND (u.unit_number LIKE ? OR u.unit_code LIKE ? OR u.electricity_meter_number LIKE ? OR u.current_tenant_name LIKE ? OR p.name LIKE ?)';
      params.push(search, search, search, search, search);
    }

    query += ' ORDER BY u.property_id ASC, u.floor_number ASC, u.unit_number ASC';

    const [rows]: any = await pool.query(query, params);
    const units = rows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      propertyCode: r.property_code,
      buildingId: r.building_id,
      buildingName: r.bld_name || r.building_name || 'المبنى الرئيسي',
      floorNumber: Number(r.floor_number),
      floorName: r.floor_name || (r.floor_number === 0 ? 'الطابق الأرضي' : `الطابق ${r.floor_number}`),
      unitCode: r.unit_code || r.unit_number,
      unitNumber: r.unit_number,
      type: r.type,
      areaSqm: Number(r.area_sqm),
      status: r.status,
      pricePerCycle: Number(r.price_per_cycle),
      electricityMeterNumber: r.electricity_meter_number || '',
      waterMeterOrShare: r.water_meter_or_share || '',
      ownerName: r.owner_name || '',
      currentTenantId: r.current_tenant_id,
      currentTenantName: r.current_tenant_name,
      currentContractId: r.current_contract_id,
      contractNumber: r.contract_number,
      contractStartDate: r.contract_start_date,
      contractEndDate: r.contract_end_date,
      contractRentAmount: r.contract_rent_amount ? Number(r.contract_rent_amount) : null,
      description: r.description || '',
      notes: r.notes || '',
      createdAt: r.created_at
    }));

    res.json(units);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/units/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [rows]: any = await pool.query(`
      SELECT 
        u.*,
        p.name as property_name,
        p.code as property_code,
        p.city,
        p.district,
        b.name as bld_name,
        c.contract_number,
        c.start_date as contract_start_date,
        c.end_date as contract_end_date,
        c.rent_amount as contract_rent_amount,
        c.payment_cycle as contract_payment_cycle
      FROM units u
      JOIN properties p ON p.id = u.property_id
      LEFT JOIN buildings b ON b.id = u.building_id
      LEFT JOIN contracts c ON c.id = u.current_contract_id
      WHERE u.id = ?
    `, [id]);

    if (!rows.length) {
      res.status(404).json({ error: 'الوحدة غير موجودة' });
      return;
    }

    const r = rows[0];
    res.json({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      propertyCode: r.property_code,
      location: `${r.city} - ${r.district}`,
      buildingId: r.building_id,
      buildingName: r.bld_name || r.building_name || 'المبنى الرئيسي',
      floorNumber: Number(r.floor_number),
      floorName: r.floor_name || (r.floor_number === 0 ? 'الطابق الأرضي' : `الطابق ${r.floor_number}`),
      unitCode: r.unit_code || r.unit_number,
      unitNumber: r.unit_number,
      type: r.type,
      areaSqm: Number(r.area_sqm),
      status: r.status,
      pricePerCycle: Number(r.price_per_cycle),
      electricityMeterNumber: r.electricity_meter_number || '',
      waterMeterOrShare: r.water_meter_or_share || '',
      ownerName: r.owner_name || '',
      currentTenantId: r.current_tenant_id,
      currentTenantName: r.current_tenant_name,
      currentContractId: r.current_contract_id,
      contractNumber: r.contract_number,
      contractStartDate: r.contract_start_date,
      contractEndDate: r.contract_end_date,
      contractRentAmount: r.contract_rent_amount ? Number(r.contract_rent_amount) : null,
      contractPaymentCycle: r.contract_payment_cycle,
      description: r.description || '',
      notes: r.notes || '',
      createdAt: r.created_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/units', async (req: Request, res: Response) => {
  try {
    const {
      propertyId,
      buildingId,
      floorNumber,
      floorName,
      unitCode,
      unitNumber,
      type,
      areaSqm,
      pricePerCycle,
      status,
      electricityMeterNumber,
      waterMeterOrShare,
      ownerName,
      description,
      notes
    } = req.body;

    if (!propertyId || !unitNumber || !type) {
      res.status(400).json({ error: 'العقار ورقم الوحدة ونوع المساحة التأجيرية حقول إلزامية' });
      return;
    }

    const pool = await getPool();

    // Verify property exists
    const [prop]: any = await pool.query('SELECT name, code FROM properties WHERE id = ?', [propertyId]);
    if (!prop.length) {
      res.status(404).json({ error: 'العقار المختار غير موجود' });
      return;
    }

    // Verify building exists if specified
    let buildingName = 'المبنى الرئيسي';
    let bldId = buildingId;
    if (buildingId) {
      const [bld]: any = await pool.query('SELECT name FROM buildings WHERE id = ? AND property_id = ?', [buildingId, propertyId]);
      if (bld.length) {
        buildingName = bld[0].name;
      }
    } else {
      // Find or assign first building under this property
      const [firstBld]: any = await pool.query('SELECT id, name FROM buildings WHERE property_id = ? LIMIT 1', [propertyId]);
      if (firstBld.length) {
        bldId = firstBld[0].id;
        buildingName = firstBld[0].name;
      }
    }

    // Check duplicate unit_number in same property and building
    const [duplicate]: any = await pool.query(`
      SELECT id FROM units 
      WHERE property_id = ? AND unit_number = ? AND (building_id = ? OR building_id IS NULL)
    `, [propertyId, unitNumber.trim(), bldId]);

    if (duplicate.length > 0) {
      res.status(400).json({ error: `رقم الوحدة (${unitNumber}) مسجل مسبقاً في هذا المبنى / العقار` });
      return;
    }

    const unitId = `unit-${Date.now()}`;
    const cleanUnitCode = unitCode ? unitCode.trim().toUpperCase() : `${prop[0].code}-${unitNumber.trim()}`;

    // Disallow setting OCCUPIED directly without an active contract
    let initialStatus = status || 'VACANT';
    if (initialStatus === 'OCCUPIED') {
      initialStatus = 'VACANT';
    }

    await pool.query(`
      INSERT INTO units 
      (id, property_id, building_id, building_name, floor_number, floor_name, unit_code, unit_number, type, area_sqm, status, price_per_cycle, electricity_meter_number, water_meter_or_share, owner_name, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      unitId,
      propertyId,
      bldId || null,
      buildingName,
      Number(floorNumber || 0),
      floorName || (Number(floorNumber || 0) === 0 ? 'الطابق الأرضي' : `الطابق ${floorNumber}`),
      cleanUnitCode,
      unitNumber.trim(),
      type,
      Number(areaSqm || 0),
      initialStatus,
      Number(pricePerCycle || 0),
      electricityMeterNumber ? electricityMeterNumber.trim() : null,
      waterMeterOrShare ? waterMeterOrShare.trim() : null,
      ownerName ? ownerName.trim() : null,
      description || null,
      notes || null
    ]);

    // Recalculate property unit counts
    await recalculatePropertyUnits(pool, propertyId);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CREATE_UNIT', 'UNIT', ?, ?)
    `, [
      `aud-${Date.now()}`,
      unitId,
      `إضافة مساحة/وحدة تأجيرية جديدة: ${unitNumber.trim()} (نوع: ${type}) في ${prop[0].name}`
    ]);

    res.status(201).json({
      id: unitId,
      propertyId,
      propertyName: prop[0].name,
      buildingId: bldId,
      buildingName,
      floorNumber: Number(floorNumber || 0),
      floorName: floorName || (Number(floorNumber || 0) === 0 ? 'الطابق الأرضي' : `الطابق ${floorNumber}`),
      unitCode: cleanUnitCode,
      unitNumber: unitNumber.trim(),
      type,
      areaSqm: Number(areaSqm || 0),
      status: initialStatus,
      pricePerCycle: Number(pricePerCycle || 0),
      electricityMeterNumber: electricityMeterNumber || '',
      waterMeterOrShare: waterMeterOrShare || '',
      ownerName: ownerName || '',
      currentTenantId: null,
      currentTenantName: null,
      currentContractId: null,
      description: description || '',
      notes: notes || '',
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error creating unit:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/units/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      propertyId,
      buildingId,
      floorNumber,
      floorName,
      unitCode,
      unitNumber,
      type,
      areaSqm,
      pricePerCycle,
      status,
      electricityMeterNumber,
      waterMeterOrShare,
      ownerName,
      description,
      notes
    } = req.body;

    if (!unitNumber || !type) {
      res.status(400).json({ error: 'رقم الوحدة ونوعها حقول مطلوبة' });
      return;
    }

    const pool = await getPool();

    // Check unit exists
    const [existingUnit]: any = await pool.query('SELECT * FROM units WHERE id = ?', [id]);
    if (!existingUnit.length) {
      res.status(404).json({ error: 'الوحدة غير موجودة' });
      return;
    }
    const current = existingUnit[0];
    const targetPropertyId = propertyId || current.property_id;

    // Check duplicate unit number if changed
    if (unitNumber.trim() !== current.unit_number || targetPropertyId !== current.property_id) {
      const [dup]: any = await pool.query(`
        SELECT id FROM units 
        WHERE property_id = ? AND unit_number = ? AND id != ?
      `, [targetPropertyId, unitNumber.trim(), id]);
      if (dup.length > 0) {
        res.status(400).json({ error: `رقم الوحدة (${unitNumber}) مستخدم مسبقاً في هذا العقار` });
        return;
      }
    }

    // Business validation: If current unit has an active contract and user tries to switch status to VACANT directly
    let targetStatus = status || current.status;
    if (current.current_contract_id && targetStatus === 'VACANT' && current.status === 'OCCUPIED') {
      const [activeCnt]: any = await pool.query('SELECT contract_number FROM contracts WHERE id = ? AND status = "ACTIVE"', [current.current_contract_id]);
      if (activeCnt.length > 0) {
        res.status(400).json({ 
          error: `لا يمكن تحويل حالة الوحدة إلى (شاغرة) مباشرة لوجود عقد إيجار ساري برقم (${activeCnt[0].contract_number}). يرجى إنهاء العقد أو فسخه أولاً من قسم العقود.` 
        });
        return;
      }
    }

    // Fetch building name
    let buildingName = current.building_name;
    if (buildingId) {
      const [bld]: any = await pool.query('SELECT name FROM buildings WHERE id = ?', [buildingId]);
      if (bld.length) buildingName = bld[0].name;
    }

    await pool.query(`
      UPDATE units SET
        property_id = ?,
        building_id = ?,
        building_name = ?,
        floor_number = ?,
        floor_name = ?,
        unit_code = ?,
        unit_number = ?,
        type = ?,
        area_sqm = ?,
        price_per_cycle = ?,
        status = ?,
        electricity_meter_number = ?,
        water_meter_or_share = ?,
        owner_name = ?,
        description = ?,
        notes = ?
      WHERE id = ?
    `, [
      targetPropertyId,
      buildingId || current.building_id,
      buildingName,
      Number(floorNumber ?? current.floor_number),
      floorName || current.floor_name,
      unitCode ? unitCode.trim().toUpperCase() : current.unit_code,
      unitNumber.trim(),
      type,
      Number(areaSqm ?? current.area_sqm),
      Number(pricePerCycle ?? current.price_per_cycle),
      targetStatus,
      electricityMeterNumber ? electricityMeterNumber.trim() : null,
      waterMeterOrShare ? waterMeterOrShare.trim() : null,
      ownerName ? ownerName.trim() : null,
      description || null,
      notes || null,
      id
    ]);

    // Recalculate counts
    await recalculatePropertyUnits(pool, targetPropertyId);
    if (targetPropertyId !== current.property_id) {
      await recalculatePropertyUnits(pool, current.property_id);
    }

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'UPDATE_UNIT', 'UNIT', ?, ?)
    `, [
      `aud-${Date.now()}`,
      id,
      `تعديل بيانات الوحدة ${unitNumber.trim()}`
    ]);

    res.json({ id, message: 'تم تحديث بيانات الوحدة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/units/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['VACANT', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'INACTIVE'];
    if (!status || !allowed.includes(status)) {
      res.status(400).json({ error: 'حالة الوحدة غير صالحة. الحالات المتاحة: VACANT, RESERVED, MAINTENANCE, INACTIVE' });
      return;
    }

    const pool = await getPool();
    const [unitRows]: any = await pool.query('SELECT * FROM units WHERE id = ?', [id]);
    if (!unitRows.length) {
      res.status(404).json({ error: 'الوحدة غير موجودة' });
      return;
    }
    const unit = unitRows[0];

    // Business check: active contract cannot be made vacant without terminating contract
    if (unit.status === 'OCCUPIED' && status === 'VACANT' && unit.current_contract_id) {
      const [cnt]: any = await pool.query('SELECT contract_number FROM contracts WHERE id = ? AND status = "ACTIVE"', [unit.current_contract_id]);
      if (cnt.length > 0) {
        res.status(400).json({ error: `لا يمكن جعل الوحدة شاغرة لوجود عقد ساري (${cnt[0].contract_number}). قم بإنهاء العقد أولاً.` });
        return;
      }
    }

    await pool.query('UPDATE units SET status = ? WHERE id = ?', [status, id]);
    await recalculatePropertyUnits(pool, unit.property_id);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CHANGE_UNIT_STATUS', 'UNIT', ?, ?)
    `, [
      `aud-${Date.now()}`,
      id,
      `تغيير حالة الوحدة ${unit.unit_number} من ${unit.status} إلى ${status}`
    ]);

    res.json({ id, status, message: 'تم تغيير حالة الوحدة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/units/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const [unitRows]: any = await pool.query('SELECT * FROM units WHERE id = ?', [id]);
    if (!unitRows.length) {
      res.status(404).json({ error: 'الوحدة غير موجودة' });
      return;
    }
    const unit = unitRows[0];

    // Check if unit is occupied
    if (unit.status === 'OCCUPIED') {
      res.status(400).json({ error: 'لا يمكن حذف وحدة مشغولة حالياً بمستأجر' });
      return;
    }

    // Check if unit has any contracts
    const [contracts]: any = await pool.query('SELECT COUNT(*) as count FROM contracts WHERE unit_id = ?', [id]);
    if (contracts[0]?.count > 0) {
      res.status(400).json({ error: `لا يمكن حذف الوحدة لوجود ${contracts[0].count} عقد مسجل مرتبط بها في السجلات التاريخية` });
      return;
    }

    // Check if unit has any unpaid invoices
    const [invoices]: any = await pool.query('SELECT COUNT(*) as count FROM invoices WHERE unit_id = ?', [id]);
    if (invoices[0]?.count > 0) {
      res.status(400).json({ error: 'لا يمكن حذف الوحدة لوجود فواتير مسجلة مرتبطة بها' });
      return;
    }

    await pool.query('DELETE FROM units WHERE id = ?', [id]);
    await recalculatePropertyUnits(pool, unit.property_id);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'DELETE_UNIT', 'UNIT', ?, ?)
    `, [`aud-${Date.now()}`, id, `حذف الوحدة ${unit.unit_number} من العقار ${unit.property_id}`]);

    res.json({ success: true, message: 'تم حذف الوحدة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Tenants API (Complete CRUD, Details Workspace, Multi-Unit Contracts & Financial Overview)
router.get('/tenants', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const search = req.query.search ? `%${req.query.search}%` : null;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const propertyId = req.query.propertyId as string;
    const balanceFilter = req.query.balanceFilter as string; // 'HAS_DEBT', 'ZERO_OR_CREDIT', 'ALL'

    let query = `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM contracts c WHERE c.tenant_id = t.id AND c.status = 'ACTIVE') as active_contracts_count,
        (SELECT COUNT(DISTINCT c.unit_id) FROM contracts c WHERE c.tenant_id = t.id AND c.status = 'ACTIVE') as current_units_count
      FROM tenants t
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (
        t.name LIKE ? OR 
        t.tenant_code LIKE ? OR 
        t.national_id LIKE ? OR 
        t.phone LIKE ? OR 
        t.secondary_phone LIKE ? OR
        t.email LIKE ? OR
        EXISTS (
          SELECT 1 FROM contracts c 
          WHERE c.tenant_id = t.id AND (c.contract_number LIKE ? OR c.unit_number LIKE ? OR c.property_name LIKE ?)
        )
      )`;
      params.push(search, search, search, search, search, search, search, search, search);
    }

    if (type && type !== 'ALL') {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (status && status !== 'ALL') {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND EXISTS (SELECT 1 FROM contracts c WHERE c.tenant_id = t.id AND c.property_id = ? AND c.status = "ACTIVE")';
      params.push(propertyId);
    }

    if (balanceFilter === 'HAS_DEBT') {
      query += ' AND t.current_balance > 0';
    } else if (balanceFilter === 'ZERO_OR_CREDIT') {
      query += ' AND t.current_balance <= 0';
    }

    query += ' ORDER BY t.created_at DESC';

    const [rows]: any = await pool.query(query, params);

    // Fetch active units for these tenants
    const tenantIds = rows.map((r: any) => r.id);
    let tenantUnitsMap: Record<string, any[]> = {};

    if (tenantIds.length > 0) {
      const placeholders = tenantIds.map(() => '?').join(',');
      const [unitsRows]: any = await pool.query(`
        SELECT 
          c.tenant_id,
          c.unit_id,
          c.unit_number,
          c.property_id,
          c.property_name,
          c.contract_number,
          c.rent_amount,
          c.start_date,
          c.end_date,
          u.type as unit_type
        FROM contracts c
        LEFT JOIN units u ON u.id = c.unit_id
        WHERE c.tenant_id IN (${placeholders}) AND c.status = 'ACTIVE'
        ORDER BY c.start_date DESC
      `, tenantIds);

      for (const u of unitsRows) {
        if (!tenantUnitsMap[u.tenant_id]) tenantUnitsMap[u.tenant_id] = [];
        tenantUnitsMap[u.tenant_id].push({
          unitId: u.unit_id,
          unitNumber: u.unit_number,
          propertyId: u.property_id,
          propertyName: u.property_name,
          contractNumber: u.contract_number,
          rentAmount: Number(u.rent_amount),
          startDate: u.start_date,
          endDate: u.end_date,
          unitType: u.unit_type
        });
      }
    }

    const tenants = rows.map((r: any) => ({
      id: r.id,
      tenantCode: r.tenant_code,
      name: r.name,
      type: r.type,
      nationalId: r.national_id,
      phone: r.phone,
      secondaryPhone: r.secondary_phone || '',
      email: r.email || '',
      address: r.address || '',
      status: r.status || 'ACTIVE',
      commercialRecord: r.commercial_record || '',
      notes: r.notes || '',
      currentBalance: Number(r.current_balance || 0),
      rentBalance: Number(r.rent_balance || 0),
      waterBalance: Number(r.water_balance || 0),
      electricityBalance: Number(r.electricity_balance || 0),
      depositBalance: Number(r.deposit_balance || 0),
      activeContractsCount: Number(r.active_contracts_count || 0),
      currentUnitsCount: Number(r.current_units_count || 0),
      currentUnits: tenantUnitsMap[r.id] || [],
      createdAt: r.created_at
    }));

    res.json(tenants);
  } catch (err: any) {
    console.error('Error fetching tenants:', err);
    res.status(500).json({ error: err.message });
  }
});

// Single Tenant Details Workspace
router.get('/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const [tenantRows]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [id]);
    if (!tenantRows.length) {
      res.status(404).json({ error: 'المستأجر غير موجود' });
      return;
    }
    const t = tenantRows[0];

    // Parallel fetch related data: contracts, current units, invoices, receipts, deposits, ledger, documents
    const [
      [contractsRows],
      [invoicesRows],
      [paymentsRows],
      [depositsRows],
      [ledgerRows],
      [documentsRows]
    ]: any = await Promise.all([
      pool.query(`
        SELECT c.*, p.name as property_full_name, u.type as unit_type 
        FROM contracts c
        LEFT JOIN properties p ON p.id = c.property_id
        LEFT JOIN units u ON u.id = c.unit_id
        WHERE c.tenant_id = ?
        ORDER BY c.start_date DESC
      `, [id]),
      pool.query(`
        SELECT * FROM invoices 
        WHERE tenant_id = ? 
        ORDER BY issue_date DESC, created_at DESC 
        LIMIT 50
      `, [id]),
      pool.query(`
        SELECT * FROM payments 
        WHERE tenant_id = ? 
        ORDER BY collected_at DESC, created_at DESC 
        LIMIT 50
      `, [id]),
      pool.query(`
        SELECT * FROM deposits 
        WHERE tenant_id = ? 
        ORDER BY received_date DESC
      `, [id]),
      pool.query(`
        SELECT * FROM tenant_ledger 
        WHERE tenant_id = ? 
        ORDER BY date DESC, created_at DESC 
        LIMIT 100
      `, [id]),
      pool.query(`
        SELECT * FROM tenant_documents 
        WHERE tenant_id = ? 
        ORDER BY created_at DESC
      `, [id])
    ]);

    // Active units extracted from active contracts
    const activeContracts = contractsRows.filter((c: any) => c.status === 'ACTIVE');
    const currentUnits = activeContracts.map((c: any) => ({
      unitId: c.unit_id,
      unitNumber: c.unit_number,
      propertyId: c.property_id,
      propertyName: c.property_name,
      contractId: c.id,
      contractNumber: c.contract_number,
      rentAmount: Number(c.rent_amount),
      startDate: c.start_date,
      endDate: c.end_date,
      unitType: c.unit_type
    }));

    res.json({
      tenant: {
        id: t.id,
        tenantCode: t.tenant_code,
        name: t.name,
        type: t.type,
        nationalId: t.national_id,
        phone: t.phone,
        secondaryPhone: t.secondary_phone || '',
        email: t.email || '',
        address: t.address || '',
        status: t.status || 'ACTIVE',
        commercialRecord: t.commercial_record || '',
        notes: t.notes || '',
        currentBalance: Number(t.current_balance || 0),
        rentBalance: Number(t.rent_balance || 0),
        waterBalance: Number(t.water_balance || 0),
        electricityBalance: Number(t.electricity_balance || 0),
        depositBalance: Number(t.deposit_balance || 0),
        createdAt: t.created_at
      },
      currentUnits,
      contracts: contractsRows.map((c: any) => ({
        id: c.id,
        contractNumber: c.contract_number,
        tenantId: c.tenant_id,
        tenantName: c.tenant_name,
        propertyId: c.property_id,
        propertyName: c.property_name,
        unitId: c.unit_id,
        unitNumber: c.unit_number,
        startDate: c.start_date,
        endDate: c.end_date,
        rentAmount: Number(c.rent_amount),
        paymentCycle: c.payment_cycle,
        depositAmount: Number(c.deposit_amount),
        guaranteePersonName: c.guarantee_person_name,
        guaranteePersonPhone: c.guarantee_person_phone,
        noticePeriodDays: c.notice_period_days,
        status: c.status
      })),
      invoices: invoicesRows.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        tenantId: inv.tenant_id,
        tenantName: inv.tenant_name,
        contractId: inv.contract_id,
        propertyId: inv.property_id,
        propertyName: inv.property_name,
        unitId: inv.unit_id,
        unitNumber: inv.unit_number,
        accountType: inv.account_type,
        periodMonth: inv.period_month,
        totalAmount: Number(inv.total_amount),
        paidAmount: Number(inv.paid_amount),
        remainingAmount: Number(inv.remaining_amount),
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        status: inv.status
      })),
      payments: paymentsRows.map((p: any) => ({
        id: p.id,
        receiptNumber: p.receipt_number,
        invoiceId: p.invoice_id,
        tenantId: p.tenant_id,
        tenantName: p.tenant_name,
        unitNumber: p.unit_number,
        propertyName: p.property_name,
        accountType: p.account_type,
        amountPaid: Number(p.amount_paid),
        paymentMethod: p.payment_method,
        collectorName: p.collector_name,
        collectedAt: p.collected_at
      })),
      deposits: depositsRows.map((d: any) => ({
        id: d.id,
        tenantId: d.tenant_id,
        contractId: d.contract_id,
        unitId: d.unit_id,
        amount: Number(d.deposit_amount),
        status: d.status,
        guarantorName: d.guarantor_name,
        guarantorPhone: d.guarantor_phone,
        receivedDate: d.received_date
      })),
      ledger: ledgerRows.map((l: any) => ({
        id: l.id,
        date: l.date,
        reference: l.reference,
        accountType: l.account_type,
        debit: Number(l.debit),
        credit: Number(l.credit),
        balanceAfter: Number(l.balance_after),
        description: l.description
      })),
      documents: documentsRows.map((d: any) => ({
        id: d.id,
        tenantId: d.tenant_id,
        title: d.title,
        docType: d.doc_type,
        fileName: d.file_name,
        fileSize: d.file_size,
        fileUrl: d.file_url,
        createdAt: d.created_at
      }))
    });
  } catch (err: any) {
    console.error('Error fetching tenant details:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create Tenant
router.post('/tenants', async (req: Request, res: Response) => {
  try {
    const {
      tenantCode,
      name,
      type,
      nationalId,
      phone,
      secondaryPhone,
      email,
      address,
      status,
      commercialRecord,
      notes,
      initialBalance
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'اسم المستأجر أو المنشأة حقل إلزامي' });
      return;
    }
    if (!nationalId || !nationalId.trim()) {
      res.status(400).json({ error: 'الرقم الوطني / رقم الهوية أو السجل التجاري حقل إلزامي' });
      return;
    }
    if (!phone || !phone.trim()) {
      res.status(400).json({ error: 'رقم هاتف المستأجر حقل إلزامي' });
      return;
    }

    const pool = await getPool();

    // Check unique national_id
    const [existingId]: any = await pool.query('SELECT id, name FROM tenants WHERE national_id = ?', [nationalId.trim()]);
    if (existingId.length > 0) {
      res.status(400).json({ error: `رقم الهوية / السجل (${nationalId.trim()}) مسجل مسبقاً للمستأجر (${existingId[0].name})` });
      return;
    }

    // Generate or verify tenant_code
    let cleanCode = tenantCode ? tenantCode.trim().toUpperCase() : '';
    if (!cleanCode) {
      const [countRow]: any = await pool.query('SELECT COUNT(*) as c FROM tenants');
      const nextNum = (countRow[0]?.c || 0) + 1;
      cleanCode = `TEN-${String(nextNum).padStart(4, '0')}`;
    }

    const [existingCode]: any = await pool.query('SELECT id FROM tenants WHERE tenant_code = ?', [cleanCode]);
    if (existingCode.length > 0) {
      cleanCode = `TEN-${Date.now().toString().slice(-4)}`;
    }

    const tenantId = `ten-${Date.now()}`;
    const openingBalance = Number(initialBalance || 0);

    await pool.query(`
      INSERT INTO tenants 
      (id, tenant_code, name, type, national_id, phone, secondary_phone, email, address, status, commercial_record, notes, current_balance, rent_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tenantId,
      cleanCode,
      name.trim(),
      type || 'INDIVIDUAL',
      nationalId.trim(),
      phone.trim(),
      secondaryPhone ? secondaryPhone.trim() : null,
      email ? email.trim() : null,
      address ? address.trim() : null,
      status || 'ACTIVE',
      commercialRecord ? commercialRecord.trim() : null,
      notes || null,
      openingBalance,
      openingBalance
    ]);

    // If opening balance > 0, insert ledger entry
    if (openingBalance > 0) {
      await pool.query(`
        INSERT INTO tenant_ledger 
        (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id)
        VALUES (?, ?, CURDATE(), ?, 'RENT', ?, 0.00, ?, 'رصيد مرحل افتتاحي عند إضافة المستأجر', 'usr-1')
      `, [
        `ledg-${Date.now()}`,
        tenantId,
        `OB-${cleanCode}`,
        openingBalance,
        openingBalance
      ]);
    }

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CREATE_TENANT', 'TENANT', ?, ?)
    `, [
      `aud-${Date.now()}`,
      tenantId,
      `تسجيل مستأجر جديد: ${name.trim()} (رمز: ${cleanCode}، هوية: ${nationalId.trim()})`
    ]);

    res.status(201).json({
      id: tenantId,
      tenantCode: cleanCode,
      name: name.trim(),
      type: type || 'INDIVIDUAL',
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone ? secondaryPhone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      status: status || 'ACTIVE',
      commercialRecord: commercialRecord || '',
      notes: notes || '',
      currentBalance: openingBalance,
      rentBalance: openingBalance,
      waterBalance: 0,
      electricityBalance: 0,
      depositBalance: 0,
      activeContractsCount: 0,
      currentUnitsCount: 0,
      currentUnits: [],
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error creating tenant:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Tenant
router.put('/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      nationalId,
      phone,
      secondaryPhone,
      email,
      address,
      status,
      commercialRecord,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'اسم المستأجر حقل مطلوب' });
      return;
    }
    if (!nationalId || !nationalId.trim()) {
      res.status(400).json({ error: 'رقم الهوية / السجل التجاري حقل مطلوب' });
      return;
    }

    const pool = await getPool();

    // Verify tenant exists
    const [existing]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [id]);
    if (!existing.length) {
      res.status(404).json({ error: 'المستأجر غير موجود' });
      return;
    }

    // Check national_id uniqueness with other tenants
    const [duplicateId]: any = await pool.query('SELECT id, name FROM tenants WHERE national_id = ? AND id != ?', [nationalId.trim(), id]);
    if (duplicateId.length > 0) {
      res.status(400).json({ error: `رقم الهوية (${nationalId.trim()}) مستخدم مسبقاً لمستأجر آخر (${duplicateId[0].name})` });
      return;
    }

    await pool.query(`
      UPDATE tenants SET
        name = ?,
        type = ?,
        national_id = ?,
        phone = ?,
        secondary_phone = ?,
        email = ?,
        address = ?,
        status = ?,
        commercial_record = ?,
        notes = ?
      WHERE id = ?
    `, [
      name.trim(),
      type || 'INDIVIDUAL',
      nationalId.trim(),
      phone.trim(),
      secondaryPhone ? secondaryPhone.trim() : null,
      email ? email.trim() : null,
      address ? address.trim() : null,
      status || 'ACTIVE',
      commercialRecord ? commercialRecord.trim() : null,
      notes || null,
      id
    ]);

    // Also update tenant_name in active contracts and active units for consistency
    await pool.query('UPDATE contracts SET tenant_name = ? WHERE tenant_id = ?', [name.trim(), id]);
    await pool.query('UPDATE units SET current_tenant_name = ? WHERE current_tenant_id = ?', [name.trim(), id]);

    // Audit log
    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'UPDATE_TENANT', 'TENANT', ?, ?)
    `, [
      `aud-${Date.now()}`,
      id,
      `تعديل بيانات المستأجر: ${name.trim()} (رمز: ${existing[0].tenant_code})`
    ]);

    res.json({
      id,
      tenantCode: existing[0].tenant_code,
      name: name.trim(),
      type: type || 'INDIVIDUAL',
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone ? secondaryPhone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      status: status || 'ACTIVE',
      commercialRecord: commercialRecord || '',
      notes: notes || '',
      currentBalance: Number(existing[0].current_balance),
      message: 'تم تحديث بيانات المستأجر بنجاح'
    });
  } catch (err: any) {
    console.error('Error updating tenant:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Tenant (guarded)
router.delete('/tenants/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const [existing]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [id]);
    if (!existing.length) {
      res.status(404).json({ error: 'المستأجر غير موجود' });
      return;
    }
    const tenant = existing[0];

    // Check active contracts
    const [contracts]: any = await pool.query('SELECT COUNT(*) as count FROM contracts WHERE tenant_id = ? AND status = "ACTIVE"', [id]);
    if (contracts[0]?.count > 0) {
      res.status(400).json({ error: `لا يمكن حذف المستأجر لوجود ${contracts[0].count} عقود فعالة نشطة باسمه. يرجى إنهاء العقود أولاً.` });
      return;
    }

    // Check outstanding balance
    if (Number(tenant.current_balance) > 0) {
      res.status(400).json({ error: `لا يمكن حذف المستأجر لوجود مديونية مستحقة بذمته قدرها ${Number(tenant.current_balance).toLocaleString()} ريال.` });
      return;
    }

    // Check unpaid invoices
    const [unpaidInvoices]: any = await pool.query('SELECT COUNT(*) as count FROM invoices WHERE tenant_id = ? AND status IN ("UNPAID", "PARTIAL")', [id]);
    if (unpaidInvoices[0]?.count > 0) {
      res.status(400).json({ error: `لا يمكن حذف المستأجر لوجود ${unpaidInvoices[0].count} فواتير مستحقة غير مسددة.` });
      return;
    }

    // Delete documents & tenant record
    await pool.query('DELETE FROM tenant_documents WHERE tenant_id = ?', [id]);
    await pool.query('DELETE FROM tenants WHERE id = ?', [id]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'DELETE_TENANT', 'TENANT', ?, ?)
    `, [`aud-${Date.now()}`, id, `حذف سجل المستأجر: ${tenant.name} (${tenant.tenant_code})`]);

    res.json({ success: true, message: 'تم حذف المستأجر بنجاح' });
  } catch (err: any) {
    console.error('Error deleting tenant:', err);
    res.status(500).json({ error: err.message });
  }
});

// Tenant Documents API
router.post('/tenants/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, docType, fileName, fileSize, fileUrl } = req.body;

    if (!title || !fileUrl) {
      res.status(400).json({ error: 'عنوان المستند والملف حقول مطلوبة' });
      return;
    }

    const pool = await getPool();
    const [tenant]: any = await pool.query('SELECT name FROM tenants WHERE id = ?', [id]);
    if (!tenant.length) {
      res.status(404).json({ error: 'المستأجر غير موجود' });
      return;
    }

    const docId = `doc-${Date.now()}`;
    await pool.query(`
      INSERT INTO tenant_documents 
      (id, tenant_id, title, doc_type, file_name, file_size, file_url, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'usr-1')
    `, [
      docId,
      id,
      title.trim(),
      docType || 'ID_CARD',
      fileName || 'document.pdf',
      Number(fileSize || 0),
      fileUrl
    ]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'UPLOAD_TENANT_DOCUMENT', 'TENANT', ?, ?)
    `, [`aud-${Date.now()}`, id, `إرفاق مستند جديد (${title.trim()}) للمستأجر ${tenant[0].name}`]);

    res.status(201).json({
      id: docId,
      tenantId: id,
      title: title.trim(),
      docType: docType || 'ID_CARD',
      fileName: fileName || 'document.pdf',
      fileSize: Number(fileSize || 0),
      fileUrl,
      createdAt: new Date().toISOString(),
      message: 'تم حفظ وتوثيق المستند بنجاح في قاعدة البيانات'
    });
  } catch (err: any) {
    console.error('Error uploading document:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tenants/:id/documents/:docId', async (req: Request, res: Response) => {
  try {
    const { id, docId } = req.params;
    const pool = await getPool();

    const [doc]: any = await pool.query('SELECT title FROM tenant_documents WHERE id = ? AND tenant_id = ?', [docId, id]);
    if (!doc.length) {
      res.status(404).json({ error: 'المستند غير موجود' });
      return;
    }

    await pool.query('DELETE FROM tenant_documents WHERE id = ? AND tenant_id = ?', [docId, id]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'DELETE_TENANT_DOCUMENT', 'TENANT', ?, ?)
    `, [`aud-${Date.now()}`, id, `حذف المستند (${doc[0].title})`]);

    res.json({ success: true, message: 'تم حذف المستند بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5.5 Property Owners API (Real CRUD, Linked Properties & Portfolio Overview)
router.get('/owners', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const search = req.query.search ? `%${req.query.search}%` : null;
    const status = req.query.status as string;

    let query = `
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM properties p WHERE p.owner_name = o.name) as properties_count,
        (SELECT COALESCE(SUM(p.total_units), 0) FROM properties p WHERE p.owner_name = o.name) as units_count,
        (SELECT COALESCE(SUM(p.monthly_expected_rent), 0) FROM properties p WHERE p.owner_name = o.name) as monthly_expected_rent
      FROM owners o
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ' AND (o.name LIKE ? OR o.owner_code LIKE ? OR o.phone LIKE ? OR o.national_id LIKE ?)';
      params.push(search, search, search, search);
    }
    if (status && status !== 'ALL') {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const [rows]: any = await pool.query(query, params);
    res.json(rows.map((r: any) => ({
      id: r.id,
      ownerCode: r.owner_code,
      name: r.name,
      nationalId: r.national_id || '',
      phone: r.phone,
      secondaryPhone: r.secondary_phone || '',
      email: r.email || '',
      address: r.address || '',
      status: r.status || 'ACTIVE',
      notes: r.notes || '',
      propertiesCount: Number(r.properties_count || 0),
      unitsCount: Number(r.units_count || 0),
      monthlyExpectedRent: Number(r.monthly_expected_rent || 0),
      createdAt: r.created_at
    })));
  } catch (err: any) {
    console.error('Error fetching owners:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/owners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const [ownerRows]: any = await pool.query('SELECT * FROM owners WHERE id = ?', [id]);
    if (!ownerRows.length) {
      res.status(404).json({ error: 'المالك غير موجود' });
      return;
    }
    const o = ownerRows[0];

    // Fetch owned properties
    const [properties]: any = await pool.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as units_count,
        (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'OCCUPIED') as occupied_units_count
      FROM properties p 
      WHERE p.owner_name = ?
      ORDER BY p.name ASC
    `, [o.name]);

    res.json({
      owner: {
        id: o.id,
        ownerCode: o.owner_code,
        name: o.name,
        nationalId: o.national_id || '',
        phone: o.phone,
        secondaryPhone: o.secondary_phone || '',
        email: o.email || '',
        address: o.address || '',
        status: o.status || 'ACTIVE',
        notes: o.notes || '',
        createdAt: o.created_at
      },
      properties: properties.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        city: p.city,
        district: p.district,
        street: p.street,
        totalUnits: Number(p.units_count || p.total_units || 0),
        occupiedUnits: Number(p.occupied_units_count || p.occupied_units || 0),
        monthlyExpectedRent: Number(p.monthly_expected_rent || 0),
        totalOutstandingRent: Number(p.total_outstanding_rent || 0),
        status: p.status || 'ACTIVE'
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/owners', async (req: Request, res: Response) => {
  try {
    const { ownerCode, name, nationalId, phone, secondaryPhone, email, address, status, notes } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: 'اسم المالك ورقم هاتفه حقول مطلوبة' });
      return;
    }

    const pool = await getPool();

    // Check code uniqueness
    let cleanCode = ownerCode ? ownerCode.trim().toUpperCase() : '';
    if (!cleanCode) {
      const [countRow]: any = await pool.query('SELECT COUNT(*) as c FROM owners');
      cleanCode = `OWN-${String((countRow[0]?.c || 0) + 1).padStart(3, '0')}`;
    }

    const [existingCode]: any = await pool.query('SELECT id FROM owners WHERE owner_code = ?', [cleanCode]);
    if (existingCode.length > 0) {
      cleanCode = `OWN-${Date.now().toString().slice(-4)}`;
    }

    const ownerId = `own-${Date.now()}`;
    await pool.query(`
      INSERT INTO owners 
      (id, owner_code, name, national_id, phone, secondary_phone, email, address, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ownerId,
      cleanCode,
      name.trim(),
      nationalId ? nationalId.trim() : null,
      phone.trim(),
      secondaryPhone ? secondaryPhone.trim() : null,
      email ? email.trim() : null,
      address ? address.trim() : null,
      status || 'ACTIVE',
      notes || null
    ]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CREATE_OWNER', 'OWNER', ?, ?)
    `, [`aud-${Date.now()}`, ownerId, `إضافة مالك عقار جديد: ${name.trim()} (${cleanCode})`]);

    res.status(201).json({
      id: ownerId,
      ownerCode: cleanCode,
      name: name.trim(),
      nationalId: nationalId ? nationalId.trim() : '',
      phone: phone.trim(),
      secondaryPhone: secondaryPhone ? secondaryPhone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      status: status || 'ACTIVE',
      notes: notes || '',
      propertiesCount: 0,
      unitsCount: 0,
      monthlyExpectedRent: 0,
      createdAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/owners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, nationalId, phone, secondaryPhone, email, address, status, notes } = req.body;

    if (!name || !phone) {
      res.status(400).json({ error: 'اسم المالك ورقم هاتفه حقول مطلوبة' });
      return;
    }

    const pool = await getPool();
    const [existing]: any = await pool.query('SELECT * FROM owners WHERE id = ?', [id]);
    if (!existing.length) {
      res.status(404).json({ error: 'المالك غير موجود' });
      return;
    }

    const oldName = existing[0].name;

    await pool.query(`
      UPDATE owners SET
        name = ?,
        national_id = ?,
        phone = ?,
        secondary_phone = ?,
        email = ?,
        address = ?,
        status = ?,
        notes = ?
      WHERE id = ?
    `, [
      name.trim(),
      nationalId ? nationalId.trim() : null,
      phone.trim(),
      secondaryPhone ? secondaryPhone.trim() : null,
      email ? email.trim() : null,
      address ? address.trim() : null,
      status || 'ACTIVE',
      notes || null,
      id
    ]);

    // If owner name changed, sync with properties
    if (oldName !== name.trim()) {
      await pool.query('UPDATE properties SET owner_name = ?, owner_phone = ? WHERE owner_name = ?', [name.trim(), phone.trim(), oldName]);
    }

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'UPDATE_OWNER', 'OWNER', ?, ?)
    `, [`aud-${Date.now()}`, id, `تعديل بيانات المالك: ${name.trim()}`]);

    res.json({
      id,
      ownerCode: existing[0].owner_code,
      name: name.trim(),
      nationalId: nationalId ? nationalId.trim() : '',
      phone: phone.trim(),
      secondaryPhone: secondaryPhone ? secondaryPhone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      status: status || 'ACTIVE',
      notes: notes || '',
      message: 'تم تحديث بيانات المالك بنجاح'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/owners/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    const [existing]: any = await pool.query('SELECT * FROM owners WHERE id = ?', [id]);
    if (!existing.length) {
      res.status(404).json({ error: 'المالك غير موجود' });
      return;
    }

    const owner = existing[0];

    // Check linked properties
    const [linkedProps]: any = await pool.query('SELECT COUNT(*) as count FROM properties WHERE owner_name = ?', [owner.name]);
    if (linkedProps[0]?.count > 0) {
      res.status(400).json({ error: `لا يمكن حذف هذا المالك لوجود ${linkedProps[0].count} عقارات مسجلة باسمه. قم بتعيين مالك آخر للعقارات أولاً.` });
      return;
    }

    await pool.query('DELETE FROM owners WHERE id = ?', [id]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'DELETE_OWNER', 'OWNER', ?, ?)
    `, [`aud-${Date.now()}`, id, `حذف المالك: ${owner.name}`]);

    res.json({ success: true, message: 'تم حذف المالك بنجاح' });
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

// 6.1 Get single contract by ID with associated invoices, payments, and deposits
router.get('/contracts/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const contractId = req.params.id;

    const [cntRows]: any = await pool.query('SELECT * FROM contracts WHERE id = ?', [contractId]);
    if (!cntRows.length) {
      res.status(404).json({ error: 'العقد غير موجود' });
      return;
    }
    const r = cntRows[0];
    const contract = {
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
      status: r.status,
      createdAt: r.created_at
    };

    // Associated tenant details
    const [tenantRows]: any = await pool.query('SELECT * FROM tenants WHERE id = ?', [contract.tenantId]);
    const tenant = tenantRows[0] || null;

    // Associated unit details
    const [unitRows]: any = await pool.query('SELECT * FROM units WHERE id = ?', [contract.unitId]);
    const unit = unitRows[0] || null;

    // Associated invoices
    const [invoices]: any = await pool.query(
      'SELECT * FROM invoices WHERE tenant_id = ? AND unit_id = ? ORDER BY issue_date DESC',
      [contract.tenantId, contract.unitId]
    );

    // Associated deposit record
    const [deposits]: any = await pool.query(
      'SELECT * FROM deposits WHERE contract_id = ? OR (tenant_id = ? AND unit_id = ?)',
      [contract.id, contract.tenantId, contract.unitId]
    );

    res.json({
      contract,
      tenant: tenant ? {
        id: tenant.id,
        tenantCode: tenant.tenant_code,
        name: tenant.name,
        phone: tenant.phone,
        nationalId: tenant.national_id,
        currentBalance: Number(tenant.current_balance || 0),
        rentBalance: Number(tenant.rent_balance || 0),
        waterBalance: Number(tenant.water_balance || 0),
        electricityBalance: Number(tenant.electricity_balance || 0)
      } : null,
      unit: unit ? {
        id: unit.id,
        unitNumber: unit.unit_number,
        floor: unit.floor,
        type: unit.type,
        annualRent: Number(unit.annual_rent || 0),
        status: unit.status
      } : null,
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        type: inv.type,
        period: inv.period,
        totalAmount: Number(inv.total_amount),
        paidAmount: Number(inv.paid_amount),
        remainingAmount: Number(inv.remaining_amount),
        status: inv.status,
        dueDate: inv.due_date
      })),
      deposits: deposits.map((d: any) => ({
        id: d.id,
        depositAmount: Number(d.deposit_amount),
        status: d.status,
        refundedAmount: Number(d.refunded_amount || 0),
        guarantorName: d.guarantor_name,
        guarantorPhone: d.guarantor_phone,
        receivedDate: d.received_date,
        notes: d.notes
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6.2 Renew Contract
router.post('/contracts/:id/renew', async (req: Request, res: Response) => {
  try {
    const contractId = req.params.id;
    const { newEndDate, newRentAmount, paymentCycle, notes } = req.body;

    if (!newEndDate) {
      res.status(400).json({ error: 'تاريخ انتهاء التجديد مطلوب' });
      return;
    }

    const result = await executeTransaction(async (conn) => {
      const [cntRows]: any = await conn.query('SELECT * FROM contracts WHERE id = ? FOR UPDATE', [contractId]);
      if (!cntRows.length) throw new Error('العقد غير موجود');
      const contract = cntRows[0];

      if (new Date(newEndDate) <= new Date(contract.end_date)) {
        throw new Error('تاريخ انتهاء التجديد يجب أن يكون بعد تاريخ نهاية العقد الحالي');
      }

      // Check for overlapping active contracts on the same unit (excluding this contract itself)
      const [overlapRows]: any = await conn.query(`
        SELECT * FROM contracts 
        WHERE unit_id = ? AND status = 'ACTIVE' AND id != ?
        AND NOT (end_date < ? OR start_date > ?)
      `, [contract.unit_id, contractId, contract.start_date, newEndDate]);

      if (overlapRows.length > 0) {
        throw new Error('يوجد عقد إيجار فعال آخر لنفس الوحدة يتعارض مع فترة التجديد المحددة');
      }

      const updatedRent = newRentAmount ? Number(newRentAmount) : Number(contract.rent_amount);
      const updatedCycle = paymentCycle || contract.payment_cycle;
      const originalEndDate = contract.original_end_date || contract.end_date;
      const renewalNotes = notes ? `${contract.notes ? contract.notes + ' | ' : ''}تجديد: ${notes}` : contract.notes;

      // Update contract preserving original_end_date and incrementing renewal_count
      await conn.query(`
        UPDATE contracts 
        SET end_date = ?, 
            rent_amount = ?, 
            payment_cycle = ?, 
            status = 'ACTIVE',
            original_end_date = COALESCE(original_end_date, ?),
            renewal_count = renewal_count + 1,
            notes = ?
        WHERE id = ?
      `, [newEndDate, updatedRent, updatedCycle, originalEndDate, renewalNotes, contractId]);

      // If rent changed, update unit price_per_cycle
      if (newRentAmount) {
        await conn.query(`
          UPDATE units 
          SET price_per_cycle = ? 
          WHERE id = ?
        `, [updatedRent, contract.unit_id]);
      }

      // Log Audit
      await conn.query(`
        INSERT INTO audit_logs 
        (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'RENEW_CONTRACT', 'CONTRACT', ?, ?)
      `, [
        `aud-${Date.now()}`, contractId,
        `تجديد العقد رقم ${contract.contract_number} حتى تاريخ ${newEndDate} بقيمة إيجار ${updatedRent} ريال (السابق: ${contract.rent_amount} ريال حتى ${contract.end_date}) ${notes ? `- ${notes}` : ''}`
      ]);

      return {
        id: contractId,
        contractNumber: contract.contract_number,
        startDate: contract.start_date,
        endDate: newEndDate,
        rentAmount: updatedRent,
        paymentCycle: updatedCycle,
        renewalCount: Number(contract.renewal_count || 0) + 1,
        originalEndDate: originalEndDate,
        status: 'ACTIVE',
        message: `تم تجديد العقد ${contract.contract_number} بنجاح حتى ${newEndDate}`
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6.3 Terminate Contract and Vacate Unit
router.post('/contracts/:id/terminate', async (req: Request, res: Response) => {
  try {
    const contractId = req.params.id;
    const { terminationDate, refundDeposit, deductFromDeposit, reason, notes } = req.body;

    const result = await executeTransaction(async (conn) => {
      const [cntRows]: any = await conn.query('SELECT * FROM contracts WHERE id = ? FOR UPDATE', [contractId]);
      if (!cntRows.length) throw new Error('العقد غير موجود');
      const contract = cntRows[0];

      // 1. Mark contract as TERMINATED
      await conn.query(`
        UPDATE contracts 
        SET status = 'TERMINATED' 
        WHERE id = ?
      `, [contractId]);

      // 2. Mark Unit as VACANT and clear current tenant link
      await conn.query(`
        UPDATE units 
        SET status = 'VACANT', current_tenant_id = NULL, current_tenant_name = NULL, current_contract_id = NULL 
        WHERE id = ?
      `, [contract.unit_id]);

      // 3. Update Property Occupancy Counts
      await conn.query(`
        UPDATE properties 
        SET occupied_units = GREATEST(0, occupied_units - 1), vacant_units = vacant_units + 1 
        WHERE id = ?
      `, [contract.property_id]);

      // 4. Handle Deposit settlement if specified
      if (refundDeposit || deductFromDeposit) {
        const depositRefund = Number(refundDeposit || 0);
        const depositDeduct = Number(deductFromDeposit || 0);

        await conn.query(`
          UPDATE deposits 
          SET status = CASE WHEN ? > 0 AND ? = 0 THEN 'REFUNDED' ELSE 'APPLIED_TO_DAMAGES' END,
              refunded_amount = refunded_amount + ?,
              notes = CONCAT(COALESCE(notes, ''), ' | تسوية إنهاء العقد: خصم ', ?, ' ريال، واسترداد ', ?, ' ريال')
          WHERE contract_id = ?
        `, [depositRefund, depositDeduct, depositRefund, depositDeduct, depositRefund, contractId]);

        // Adjust tenant deposit balance
        const totalSettled = depositRefund + depositDeduct;
        await conn.query(`
          UPDATE tenants 
          SET deposit_balance = GREATEST(0, deposit_balance - ?) 
          WHERE id = ?
        `, [totalSettled, contract.tenant_id]);
      }

      // 5. Audit Log
      await conn.query(`
        INSERT INTO audit_logs 
        (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'TERMINATE_CONTRACT', 'CONTRACT', ?, ?)
      `, [
        `aud-${Date.now()}`, contractId,
        `إنهاء وإخلاء العقد رقم ${contract.contract_number} للوحدة ${contract.unit_number}. السبب: ${reason || 'إنهاء رضائي'} ${notes ? `- ${notes}` : ''}`
      ]);

      return {
        id: contractId,
        contractNumber: contract.contract_number,
        unitId: contract.unit_id,
        unitNumber: contract.unit_number,
        status: 'TERMINATED',
        message: `تم إنهاء العقد ${contract.contract_number} وإخلاء الوحدة بنجاح`
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6.4 Deposits API (Held guarantees list)
router.get('/deposits', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const [rows]: any = await pool.query(`
      SELECT 
        d.*,
        t.name as tenant_name,
        t.phone as tenant_phone,
        t.tenant_code,
        u.unit_number,
        p.name as property_name,
        c.contract_number
      FROM deposits d
      LEFT JOIN tenants t ON d.tenant_id = t.id
      LEFT JOIN units u ON d.unit_id = u.id
      LEFT JOIN properties p ON u.property_id = p.id
      LEFT JOIN contracts c ON d.contract_id = c.id
      ORDER BY d.created_at DESC
    `);

    const deposits = rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name || 'غير محدد',
      tenantCode: r.tenant_code || '',
      tenantPhone: r.tenant_phone || '',
      contractId: r.contract_id,
      contractNumber: r.contract_number || '-',
      unitId: r.unit_id,
      unitNumber: r.unit_number || '-',
      propertyName: r.property_name || '-',
      amount: Number(r.deposit_amount),
      status: r.status,
      refundedAmount: Number(r.refunded_amount || 0),
      balance: Number(r.deposit_amount) - Number(r.refunded_amount || 0),
      guarantorName: r.guarantor_name || '-',
      guarantorPhone: r.guarantor_phone || '-',
      receivedDate: r.received_date,
      notes: r.notes || ''
    }));

    res.json(deposits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6.5 Refund or settle deposit
router.post('/deposits/:id/refund', async (req: Request, res: Response) => {
  try {
    const depositId = req.params.id;
    const { refundAmount, deductAmount, reason, notes } = req.body;

    const result = await executeTransaction(async (conn) => {
      const [rows]: any = await conn.query('SELECT * FROM deposits WHERE id = ? FOR UPDATE', [depositId]);
      if (!rows.length) throw new Error('سجل التأمين غير موجود');
      const deposit = rows[0];

      const currentBalance = Number(deposit.deposit_amount) - Number(deposit.refunded_amount || 0);
      const refund = Number(refundAmount || 0);
      const deduct = Number(deductAmount || 0);
      const totalAction = refund + deduct;

      if (totalAction <= 0) throw new Error('يرجى تحديد مبلغ للاسترداد أو الخصم');
      if (totalAction > currentBalance) throw new Error(`المبلغ الإجمالي (${totalAction}) يتجاوز رصيد التأمين المحتجز (${currentBalance})`);

      const newRefunded = Number(deposit.refunded_amount || 0) + refund;
      const isFull = (newRefunded + deduct) >= Number(deposit.deposit_amount);

      await conn.query(`
        UPDATE deposits 
        SET refunded_amount = ?,
            status = ?,
            notes = CONCAT(COALESCE(notes, ''), ' | إجراء تسوية: استرداد ', ?, ' وخصم ', ?, ' - ', ?)
        WHERE id = ?
      `, [
        newRefunded,
        isFull ? (deduct > 0 && refund === 0 ? 'APPLIED_TO_DAMAGES' : 'REFUNDED') : 'PARTIALLY_REFUNDED',
        refund,
        deduct,
        reason || 'تسوية تأمين',
        depositId
      ]);

      // Deduct from tenant deposit_balance
      await conn.query(`
        UPDATE tenants 
        SET deposit_balance = GREATEST(0, deposit_balance - ?) 
        WHERE id = ?
      `, [totalAction, deposit.tenant_id]);

      // Audit Log
      await conn.query(`
        INSERT INTO audit_logs 
        (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'SETTLE_DEPOSIT', 'DEPOSIT', ?, ?)
      `, [
        `aud-${Date.now()}`, depositId,
        `تسوية أمانة تأمين: استرداد ${refund} ريال وخصم ${deduct} ريال للسبب: ${reason || 'طلب مستأجر'}`
      ]);

      return {
        id: depositId,
        status: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        remainingBalance: currentBalance - totalAction,
        message: 'تمت معالجة تسوية التأمين بنجاح'
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Invoices API (Rent Billing, Utility Billing, Unified Billing)

// 7.1 Invoices KPI Summary Stats
router.get('/invoices/stats/summary', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const accountType = req.query.accountType as string || 'RENT';

    const [summaryRows]: any = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) as total_billed,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN paid_amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN remaining_amount ELSE 0 END), 0) as total_remaining,
        COALESCE(COUNT(CASE WHEN status != 'CANCELLED' THEN 1 END), 0) as total_count,
        COALESCE(COUNT(CASE WHEN status != 'CANCELLED' AND status = 'PAID' THEN 1 END), 0) as paid_count,
        COALESCE(COUNT(CASE WHEN status != 'CANCELLED' AND (status = 'PARTIAL' OR status = 'PARTIALLY_PAID') THEN 1 END), 0) as partial_count,
        COALESCE(COUNT(CASE WHEN status != 'CANCELLED' AND status != 'PAID' AND due_date < CURDATE() THEN 1 END), 0) as overdue_count,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' AND status != 'PAID' AND due_date < CURDATE() THEN remaining_amount ELSE 0 END), 0) as overdue_amount
      FROM invoices
      WHERE account_type = ?
    `, [accountType]);

    const stats = summaryRows[0] || {};
    res.json({
      totalBilled: Number(stats.total_billed),
      totalPaid: Number(stats.total_paid),
      totalRemaining: Number(stats.total_remaining),
      totalCount: Number(stats.total_count),
      paidCount: Number(stats.paid_count),
      partialCount: Number(stats.partial_count),
      overdueCount: Number(stats.overdue_count),
      overdueAmount: Number(stats.overdue_amount),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7.2 Invoices List with Advanced Search and Filtering
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { 
      tenantId, 
      propertyId, 
      unitId, 
      contractId, 
      status, 
      accountType, 
      periodMonth, 
      search,
      overdueOnly
    } = req.query as any;

    let query = `
      SELECT 
        i.*,
        c.contract_number,
        t.phone as tenant_phone,
        t.tenant_code,
        DATEDIFF(CURDATE(), i.due_date) as days_overdue_raw
      FROM invoices i
      LEFT JOIN contracts c ON i.contract_id = c.id
      LEFT JOIN tenants t ON i.tenant_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (accountType && accountType !== 'ALL') {
      query += ' AND i.account_type = ?';
      params.push(accountType);
    }
    if (tenantId) {
      query += ' AND i.tenant_id = ?';
      params.push(tenantId);
    }
    if (propertyId && propertyId !== 'ALL') {
      query += ' AND i.property_id = ?';
      params.push(propertyId);
    }
    if (unitId && unitId !== 'ALL') {
      query += ' AND i.unit_id = ?';
      params.push(unitId);
    }
    if (contractId) {
      query += ' AND i.contract_id = ?';
      params.push(contractId);
    }
    if (periodMonth && periodMonth !== 'ALL') {
      query += ' AND i.period_month = ?';
      params.push(periodMonth);
    }

    if (overdueOnly === 'true' || status === 'OVERDUE') {
      query += ` AND i.status != 'CANCELLED' AND i.status != 'PAID' AND i.due_date < CURDATE()`;
    } else if (status && status !== 'ALL') {
      if (status === 'UNPAID' || status === 'ISSUED') {
        query += ` AND (i.status = 'UNPAID' OR i.status = 'ISSUED') AND (i.due_date >= CURDATE() OR i.paid_amount > 0)`;
      } else if (status === 'PARTIAL' || status === 'PARTIALLY_PAID') {
        query += ` AND (i.status = 'PARTIAL' OR i.status = 'PARTIALLY_PAID')`;
      } else {
        query += ' AND i.status = ?';
        params.push(status);
      }
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query += ` AND (
        i.invoice_number LIKE ? OR 
        i.tenant_name LIKE ? OR 
        i.unit_number LIKE ? OR 
        i.property_name LIKE ? OR 
        c.contract_number LIKE ? OR
        t.phone LIKE ? OR
        t.tenant_code LIKE ?
      )`;
      params.push(q, q, q, q, q, q, q);
    }

    query += ' ORDER BY i.issue_date DESC, i.created_at DESC';

    const [rows]: any = await pool.query(query, params);
    const invoices = rows.map((r: any) => {
      const isPastDue = r.status !== 'PAID' && r.status !== 'CANCELLED' && new Date(r.due_date) < new Date();
      const effectiveStatus = r.status === 'CANCELLED' ? 'CANCELLED' :
                              r.status === 'PAID' ? 'PAID' :
                              isPastDue ? 'OVERDUE' :
                              (Number(r.paid_amount) > 0 ? 'PARTIAL' : 'ISSUED');

      return {
        id: r.id,
        invoiceNumber: r.invoice_number,
        type: r.account_type || 'RENT',
        accountType: r.account_type || 'RENT',
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        tenantPhone: r.tenant_phone || '',
        tenantCode: r.tenant_code || '',
        contractId: r.contract_id,
        contractNumber: r.contract_number || '-',
        propertyId: r.property_id,
        propertyName: r.property_name,
        unitId: r.unit_id,
        unitNumber: r.unit_number,
        period: r.period_month,
        periodMonth: r.period_month,
        billingPeriodStart: r.billing_period_start || null,
        billingPeriodEnd: r.billing_period_end || null,
        baseRent: Number(r.base_rent || r.total_amount),
        additionalCharges: Number(r.additional_charges || 0),
        discount: Number(r.discount || 0),
        penalty: 0,
        subtotal: Number(r.base_rent || r.total_amount) + Number(r.additional_charges || 0),
        previousBalance: 0,
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        remainingAmount: Number(r.remaining_amount),
        issueDate: r.issue_date ? (r.issue_date instanceof Date ? r.issue_date.toISOString().split('T')[0] : String(r.issue_date).split('T')[0]) : '',
        dueDate: r.due_date ? (r.due_date instanceof Date ? r.due_date.toISOString().split('T')[0] : String(r.due_date).split('T')[0]) : '',
        status: effectiveStatus,
        rawStatus: r.status,
        daysOverdue: isPastDue ? Math.max(0, Number(r.days_overdue_raw || 0)) : 0,
        notes: r.notes || '',
        cancelledBy: r.cancelled_by || null,
        cancelledAt: r.cancelled_at || null,
        cancellationReason: r.cancellation_reason || null,
        createdAt: r.created_at
      };
    });

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7.3 Get Single Invoice Details (including payment receipts and tenant info)
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const invoiceId = req.params.id;

    const [rows]: any = await pool.query(`
      SELECT 
        i.*,
        c.contract_number,
        c.rent_amount as contract_rent,
        c.payment_cycle,
        c.start_date as contract_start_date,
        c.end_date as contract_end_date,
        t.phone as tenant_phone,
        t.national_id as tenant_national_id,
        t.tenant_code,
        t.current_balance as tenant_current_balance,
        t.rent_balance as tenant_rent_balance,
        CONCAT_WS(' - ', p.city, p.district, p.street) as property_address,
        DATEDIFF(CURDATE(), i.due_date) as days_overdue_raw
      FROM invoices i
      LEFT JOIN contracts c ON i.contract_id = c.id
      LEFT JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN properties p ON i.property_id = p.id
      WHERE i.id = ?
    `, [invoiceId]);

    if (!rows.length) {
      res.status(404).json({ error: 'الفاتورة غير موجودة' });
      return;
    }

    const r = rows[0];
    const isPastDue = r.status !== 'PAID' && r.status !== 'CANCELLED' && new Date(r.due_date) < new Date();
    const effectiveStatus = r.status === 'CANCELLED' ? 'CANCELLED' :
                            r.status === 'PAID' ? 'PAID' :
                            isPastDue ? 'OVERDUE' :
                            (Number(r.paid_amount) > 0 ? 'PARTIAL' : 'ISSUED');

    // Get payments for this invoice
    const [payments]: any = await pool.query(`
      SELECT * FROM payments 
      WHERE invoice_id = ? 
      ORDER BY collected_at DESC
    `, [invoiceId]);

    res.json({
      invoice: {
        id: r.id,
        invoiceNumber: r.invoice_number,
        type: r.account_type || 'RENT',
        accountType: r.account_type || 'RENT',
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        tenantPhone: r.tenant_phone || '',
        tenantCode: r.tenant_code || '',
        contractId: r.contract_id,
        contractNumber: r.contract_number || '-',
        contractRent: Number(r.contract_rent || 0),
        paymentCycle: r.payment_cycle || 'MONTHLY',
        propertyId: r.property_id,
        propertyName: r.property_name,
        propertyAddress: r.property_address || '',
        unitId: r.unit_id,
        unitNumber: r.unit_number,
        period: r.period_month,
        periodMonth: r.period_month,
        billingPeriodStart: r.billing_period_start || null,
        billingPeriodEnd: r.billing_period_end || null,
        baseRent: Number(r.base_rent || r.total_amount),
        additionalCharges: Number(r.additional_charges || 0),
        discount: Number(r.discount || 0),
        subtotal: Number(r.base_rent || r.total_amount) + Number(r.additional_charges || 0),
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        remainingAmount: Number(r.remaining_amount),
        issueDate: r.issue_date ? (r.issue_date instanceof Date ? r.issue_date.toISOString().split('T')[0] : String(r.issue_date).split('T')[0]) : '',
        dueDate: r.due_date ? (r.due_date instanceof Date ? r.due_date.toISOString().split('T')[0] : String(r.due_date).split('T')[0]) : '',
        status: effectiveStatus,
        rawStatus: r.status,
        daysOverdue: isPastDue ? Math.max(0, Number(r.days_overdue_raw || 0)) : 0,
        notes: r.notes || '',
        cancelledBy: r.cancelled_by || null,
        cancelledAt: r.cancelled_at || null,
        cancellationReason: r.cancellation_reason || null,
        createdAt: r.created_at
      },
      tenant: {
        id: r.tenant_id,
        name: r.tenant_name,
        phone: r.tenant_phone,
        code: r.tenant_code,
        currentBalance: Number(r.tenant_current_balance || 0),
        rentBalance: Number(r.tenant_rent_balance || 0)
      },
      payments: payments.map((p: any) => ({
        id: p.id,
        receiptNumber: p.receipt_number,
        amountPaid: Number(p.amount_paid),
        paymentMethod: p.payment_method,
        collectorName: p.collector_name,
        collectedAt: p.collected_at,
        notes: p.notes,
        qrCodeContent: p.qr_code_content
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7.4 Create New Rent Invoice from Contract (Atomic Database Transaction)
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const { 
      contractId, 
      periodMonth, 
      billingPeriodStart, 
      billingPeriodEnd, 
      baseRent, 
      additionalCharges, 
      discount, 
      dueDate, 
      notes 
    } = req.body;

    if (!contractId || !periodMonth || !dueDate) {
      res.status(400).json({ error: 'العقد، شهر الفاتورة، وتاريخ الاستحقاق حقول إلزامية' });
      return;
    }

    const result = await executeTransaction(async (conn) => {
      // 1. Fetch active contract
      const [cntRows]: any = await conn.query('SELECT * FROM contracts WHERE id = ? FOR UPDATE', [contractId]);
      if (!cntRows.length) throw new Error('عقد الإيجار المحدد غير موجود');
      const contract = cntRows[0];

      if (contract.status !== 'ACTIVE') {
        throw new Error('لا يمكن إصدار فاتورة لعقد إيجار غير فعال (منتهٍ أو مفسوخ)');
      }

      // 2. Prevent duplicate rent invoice for same contract + billing period
      const [dupRows]: any = await conn.query(`
        SELECT id, invoice_number FROM invoices 
        WHERE contract_id = ? AND period_month = ? AND account_type = 'RENT' AND status != 'CANCELLED'
      `, [contractId, periodMonth]);

      if (dupRows.length > 0) {
        throw new Error(`توجد فاتورة إيجار صادرة بالفعل لهذا العقد عن الفترة (${periodMonth}) برقم ${dupRows[0].invoice_number}`);
      }

      // 3. Strict backend financial calculation with Decimal(18,2) precision
      const rent = Number(baseRent !== undefined && baseRent !== null ? baseRent : contract.rent_amount);
      const addCharges = Math.max(0, Number(additionalCharges || 0));
      const disc = Math.max(0, Number(discount || 0));
      const totalAmount = Math.max(0, rent + addCharges - disc);

      if (totalAmount <= 0) {
        throw new Error('إجمالي قيمة الفاتورة يجب أن يكون أكبر من الصفر');
      }

      // 4. Generate unique invoice number
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '').slice(2);
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${datePart}-${randomPart}`;
      const invoiceId = `inv-${Date.now()}`;

      const issueDate = now.toISOString().split('T')[0];

      // 5. Insert invoice
      await conn.query(`
        INSERT INTO invoices 
        (id, invoice_number, tenant_id, tenant_name, contract_id, property_id, property_name, unit_id, unit_number, account_type, period_month, base_rent, additional_charges, discount, total_amount, paid_amount, remaining_amount, issue_date, due_date, billing_period_start, billing_period_end, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RENT', ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, 'UNPAID', ?)
      `, [
        invoiceId,
        invoiceNumber,
        contract.tenant_id,
        contract.tenant_name,
        contract.id,
        contract.property_id,
        contract.property_name,
        contract.unit_id,
        contract.unit_number,
        periodMonth,
        rent,
        addCharges,
        disc,
        totalAmount,
        totalAmount, // remaining_amount
        issueDate,
        dueDate,
        billingPeriodStart || null,
        billingPeriodEnd || null,
        notes || null
      ]);

      // 6. Update tenant balance
      await conn.query(`
        UPDATE tenants 
        SET current_balance = current_balance + ?, 
            rent_balance = rent_balance + ? 
        WHERE id = ?
      `, [totalAmount, totalAmount, contract.tenant_id]);

      // 7. Update property outstanding balance
      await conn.query(`
        UPDATE properties 
        SET total_outstanding_rent = total_outstanding_rent + ? 
        WHERE id = ?
      `, [totalAmount, contract.property_id]);

      // 8. Add Debit entry to Tenant Ledger
      const ledgerId = `ledg-${invoiceId}`;
      await conn.query(`
        INSERT INTO tenant_ledger 
        (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id)
        VALUES (?, ?, ?, ?, 'RENT', ?, 0.00, (SELECT current_balance FROM tenants WHERE id = ?), ?, 'usr-1')
      `, [
        ledgerId,
        contract.tenant_id,
        issueDate,
        invoiceNumber,
        totalAmount,
        contract.tenant_id,
        `فاتورة إيجار شهرية ${periodMonth} - وحدة ${contract.unit_number} (${contract.property_name})`
      ]);

      // 9. Audit Log
      await conn.query(`
        INSERT INTO audit_logs 
        (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CREATE_INVOICE', 'INVOICE', ?, ?)
      `, [
        `aud-${Date.now()}`,
        invoiceId,
        `إصدار فاتورة إيجار رقم ${invoiceNumber} بمبلغ ${totalAmount} ريال عن فترة ${periodMonth} للمستأجر ${contract.tenant_name}`
      ]);

      return {
        id: invoiceId,
        invoiceNumber,
        totalAmount,
        remainingAmount: totalAmount,
        status: 'ISSUED',
        message: `تم إصدار فاتورة الإيجار رقم ${invoiceNumber} بنجاح`
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7.5 Edit Invoice (Only allowed if no payment has been made yet)
router.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const { additionalCharges, discount, dueDate, notes } = req.body;

    const result = await executeTransaction(async (conn) => {
      const [invRows]: any = await conn.query('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [invoiceId]);
      if (!invRows.length) throw new Error('الفاتورة غير موجودة');
      const invoice = invRows[0];

      if (invoice.status === 'CANCELLED') {
        throw new Error('لا يمكن تعديل فاتورة ملغاة');
      }

      if (Number(invoice.paid_amount) > 0) {
        throw new Error('لا يمكن تعديل بنود فاتورة تم سداد دفعات مالية منها بالفعل');
      }

      const baseRent = Number(invoice.base_rent || invoice.total_amount);
      const newAddCharges = additionalCharges !== undefined ? Math.max(0, Number(additionalCharges)) : Number(invoice.additional_charges || 0);
      const newDiscount = discount !== undefined ? Math.max(0, Number(discount)) : Number(invoice.discount || 0);
      const newTotal = Math.max(0, baseRent + newAddCharges - newDiscount);
      const delta = newTotal - Number(invoice.total_amount);

      // Update invoice
      await conn.query(`
        UPDATE invoices 
        SET additional_charges = ?, 
            discount = ?, 
            total_amount = ?, 
            remaining_amount = ?, 
            due_date = ?, 
            notes = ?
        WHERE id = ?
      `, [
        newAddCharges, 
        newDiscount, 
        newTotal, 
        newTotal, 
        dueDate || invoice.due_date, 
        notes !== undefined ? notes : invoice.notes, 
        invoiceId
      ]);

      // Update tenant balance by delta difference
      if (delta !== 0) {
        await conn.query(`
          UPDATE tenants 
          SET current_balance = GREATEST(0, current_balance + ?),
              rent_balance = GREATEST(0, rent_balance + ?)
          WHERE id = ?
        `, [delta, delta, invoice.tenant_id]);

        await conn.query(`
          UPDATE properties 
          SET total_outstanding_rent = GREATEST(0, total_outstanding_rent + ?)
          WHERE id = ?
        `, [delta, invoice.property_id]);

        // Audit Log
        await conn.query(`
          INSERT INTO audit_logs 
          (id, user_id, user_name, action, entity, entity_id, details)
          VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'EDIT_INVOICE', 'INVOICE', ?, ?)
        `, [
          `aud-${Date.now()}`,
          invoiceId,
          `تعديل الفاتورة ${invoice.invoice_number}: المبلغ الجديد ${newTotal} ريال (فارق: ${delta} ريال)`
        ]);
      }

      return {
        id: invoiceId,
        invoiceNumber: invoice.invoice_number,
        totalAmount: newTotal,
        remainingAmount: newTotal,
        message: 'تم تحديث بيانات الفاتورة بنجاح'
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7.6 Cancel Invoice (Safe Reversal with Audit Trail - No Hard Delete)
router.post('/invoices/:id/cancel', async (req: Request, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const { cancellationReason } = req.body;

    if (!cancellationReason) {
      res.status(400).json({ error: 'سبب إلغاء الفاتورة حقل إلزامي' });
      return;
    }

    const result = await executeTransaction(async (conn) => {
      const [invRows]: any = await conn.query('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [invoiceId]);
      if (!invRows.length) throw new Error('الفاتورة غير موجودة');
      const invoice = invRows[0];

      if (invoice.status === 'CANCELLED') {
        throw new Error('الفاتورة ملغاة بالفعل مسبقاً');
      }

      if (Number(invoice.paid_amount) > 0) {
        throw new Error(`لا يمكن إلغاء هذه الفاتورة نظراً لوجود مبالغ مسددة منها (${invoice.paid_amount} ريال)`);
      }

      const totalToReverse = Number(invoice.total_amount);

      // Update invoice to CANCELLED
      await conn.query(`
        UPDATE invoices 
        SET status = 'CANCELLED',
            remaining_amount = 0.00,
            cancelled_by = 'usr-1',
            cancelled_at = NOW(),
            cancellation_reason = ?
        WHERE id = ?
      `, [cancellationReason, invoiceId]);

      // Reverse Tenant Balances
      await conn.query(`
        UPDATE tenants 
        SET current_balance = GREATEST(0, current_balance - ?),
            rent_balance = GREATEST(0, rent_balance - ?)
        WHERE id = ?
      `, [totalToReverse, totalToReverse, invoice.tenant_id]);

      // Reverse Property Outstanding
      await conn.query(`
        UPDATE properties 
        SET total_outstanding_rent = GREATEST(0, total_outstanding_rent - ?)
        WHERE id = ?
      `, [totalToReverse, invoice.property_id]);

      // Tenant Ledger Reversing Entry (Credit)
      const ledgerId = `ledg-rev-${Date.now()}`;
      await conn.query(`
        INSERT INTO tenant_ledger 
        (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id)
        VALUES (?, ?, CURDATE(), ?, 'RENT', 0.00, ?, (SELECT current_balance FROM tenants WHERE id = ?), ?, 'usr-1')
      `, [
        ledgerId,
        invoice.tenant_id,
        `REV-${invoice.invoice_number}`,
        totalToReverse,
        invoice.tenant_id,
        `إلغاء فاتورة إيجار ${invoice.invoice_number}: ${cancellationReason}`
      ]);

      // Audit Log
      await conn.query(`
        INSERT INTO audit_logs 
        (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, 'usr-1', 'م. أحمد الوهاس', 'CANCEL_INVOICE', 'INVOICE', ?, ?)
      `, [
        `aud-${Date.now()}`,
        invoiceId,
        `إلغاء الفاتورة ${invoice.invoice_number} بمبلغ ${totalToReverse} ريال. السبب: ${cancellationReason}`
      ]);

      return {
        id: invoiceId,
        invoiceNumber: invoice.invoice_number,
        status: 'CANCELLED',
        message: `تم إلغاء الفاتورة ${invoice.invoice_number} بنجاح وتسوية الرصيد`
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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

const formatSqlDate = (val: any): string | null => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val).split('T')[0].substring(0, 10);
};

const formatSqlDateTime = (val: any): string | null => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().replace('T', ' ').substring(0, 19);
  return String(val).replace('T', ' ').substring(0, 19);
};

// 9. Water Cost Management Engine API
router.get('/water/periods', async (req: Request, res: Response) => {
  try {
    const { propertyId, status, periodMonth, periodYear, distributionMethod, search } = req.query;
    const pool = await getPool();

    let sql = `
      SELECT 
        w.*,
        p.name as property_name,
        (SELECT COUNT(*) FROM water_tankers wt WHERE wt.period_id = w.id) as tanker_entries_count,
        (SELECT COUNT(*) FROM water_cost_items wci WHERE wci.period_id = w.id) as cost_items_count,
        (SELECT COUNT(*) FROM water_charges wc WHERE wc.period_id = w.id) as charges_count
      FROM water_costs w
      LEFT JOIN properties p ON w.property_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      sql += ' AND w.property_id = ?';
      params.push(propertyId);
    }

    if (status && status !== 'ALL') {
      sql += ' AND w.status = ?';
      params.push(status);
    }

    if (periodMonth && periodMonth !== 'ALL') {
      sql += ' AND w.period_month = ?';
      params.push(periodMonth);
    }

    if (periodYear && periodYear !== 'ALL') {
      sql += ' AND w.period_year = ?';
      params.push(Number(periodYear));
    }

    if (distributionMethod && distributionMethod !== 'ALL') {
      sql += ' AND w.distribution_method = ?';
      params.push(distributionMethod);
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      sql += ' AND (w.period_month LIKE ? OR w.property_name LIKE ? OR p.name LIKE ? OR w.notes LIKE ?)';
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY w.created_at DESC';

    const [rows]: any = await pool.query(sql, params);

    res.json(rows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name || r.name,
      periodMonth: r.period_month,
      periodYear: r.period_year ? Number(r.period_year) : undefined,
      periodStart: formatSqlDate(r.period_start),
      periodEnd: formatSqlDate(r.period_end),
      tankerCount: Number(r.tanker_count || 0),
      tankerUnitPrice: Number(r.tanker_unit_price || 0),
      totalTankerCost: Number(r.total_tanker_cost || 0),
      pumpElectricityCost: Number(r.pump_electricity_cost || 0),
      sewerCost: Number(r.sewer_cost || 0),
      tankMaintenanceCost: Number(r.tank_maintenance_cost || 0),
      cleaningCost: Number(r.cleaning_cost || 0),
      laborCost: Number(r.labor_cost || 0),
      treatmentCost: Number(r.treatment_cost || 0),
      otherFees: Number(r.other_fees || 0),
      netTotalOperatingCost: Number(r.net_total_operating_cost || 0),
      totalDistributedAmount: Number(r.total_distributed_amount || 0),
      differenceAmount: Number(r.difference_amount || 0),
      distributionMethod: r.distribution_method || 'EQUAL',
      status: r.status || 'DRAFT',
      notes: r.notes || '',
      postedAt: formatSqlDateTime(r.posted_at),
      postedBy: r.posted_by || null,
      closedAt: formatSqlDateTime(r.closed_at),
      closedBy: r.closed_by || null,
      createdAt: formatSqlDateTime(r.created_at),
      tankerEntriesCount: Number(r.tanker_entries_count || 0),
      costItemsCount: Number(r.cost_items_count || 0),
      chargesCount: Number(r.charges_count || 0)
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/water/periods/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = await getPool();

    // 1. Fetch period
    const [periodRows]: any = await pool.query(`
      SELECT w.*, p.name as property_name, p.total_units as property_total_units
      FROM water_costs w
      LEFT JOIN properties p ON w.property_id = p.id
      WHERE w.id = ?
    `, [id]);

    if (periodRows.length === 0) {
      return res.status(404).json({ error: 'دورة تكاليف المياه غير موجودة' });
    }

    const r = periodRows[0];

    // 2. Fetch Tankers
    const [tankerRows]: any = await pool.query(`
      SELECT * FROM water_tankers WHERE period_id = ? ORDER BY entry_date ASC, created_at ASC
    `, [id]);

    // 3. Fetch Cost Items
    const [costItemRows]: any = await pool.query(`
      SELECT * FROM water_cost_items WHERE period_id = ? ORDER BY entry_date ASC, created_at ASC
    `, [id]);

    // 4. Fetch Distribution Charges with Unit and Tenant Info
    const [chargeRows]: any = await pool.query(`
      SELECT 
        wc.*,
        u.type as unit_type,
        u.area_sqm as unit_area,
        t.phone as tenant_phone
      FROM water_charges wc
      LEFT JOIN units u ON wc.unit_id = u.id
      LEFT JOIN tenants t ON wc.tenant_id = t.id
      WHERE wc.period_id = ?
      ORDER BY wc.unit_number ASC
    `, [id]);

    res.json({
      period: {
        id: r.id,
        propertyId: r.property_id,
        propertyName: r.property_name || r.name,
        propertyTotalUnits: Number(r.property_total_units || 0),
        periodMonth: r.period_month,
        periodYear: r.period_year ? Number(r.period_year) : undefined,
        periodStart: formatSqlDate(r.period_start),
        periodEnd: formatSqlDate(r.period_end),
        tankerCount: Number(r.tanker_count || 0),
        tankerUnitPrice: Number(r.tanker_unit_price || 0),
        totalTankerCost: Number(r.total_tanker_cost || 0),
        pumpElectricityCost: Number(r.pump_electricity_cost || 0),
        sewerCost: Number(r.sewer_cost || 0),
        tankMaintenanceCost: Number(r.tank_maintenance_cost || 0),
        cleaningCost: Number(r.cleaning_cost || 0),
        laborCost: Number(r.labor_cost || 0),
        treatmentCost: Number(r.treatment_cost || 0),
        otherFees: Number(r.other_fees || 0),
        netTotalOperatingCost: Number(r.net_total_operating_cost || 0),
        totalDistributedAmount: Number(r.total_distributed_amount || 0),
        differenceAmount: Number(r.difference_amount || 0),
        distributionMethod: r.distribution_method || 'EQUAL',
        status: r.status || 'DRAFT',
        notes: r.notes || '',
        postedAt: formatSqlDateTime(r.posted_at),
        postedBy: r.posted_by || null,
        closedAt: formatSqlDateTime(r.closed_at),
        closedBy: r.closed_by || null,
        createdAt: formatSqlDateTime(r.created_at)
      },
      tankers: tankerRows.map((t: any) => ({
        id: t.id,
        periodId: t.period_id,
        propertyId: t.property_id,
        entryDate: formatSqlDate(t.entry_date) || '',
        tankerCount: Number(t.tanker_count),
        costPerTanker: Number(t.cost_per_tanker),
        totalCost: Number(t.total_cost),
        supplierName: t.supplier_name || '',
        tankerNumber: t.tanker_number || '',
        receiptNumber: t.receipt_number || '',
        paymentMethod: t.payment_method || 'CASH',
        notes: t.notes || ''
      })),
      costItems: costItemRows.map((ci: any) => ({
        id: ci.id,
        periodId: ci.period_id,
        propertyId: ci.property_id,
        costCategory: ci.cost_category,
        amount: Number(ci.amount),
        entryDate: formatSqlDate(ci.entry_date) || '',
        referenceNumber: ci.reference_number || '',
        description: ci.description || '',
        notes: ci.notes || ''
      })),
      charges: chargeRows.map((c: any) => ({
        id: c.id,
        periodId: c.period_id,
        propertyId: c.property_id,
        unitId: c.unit_id,
        unitNumber: c.unit_number,
        unitType: c.unit_type || '',
        unitArea: Number(c.unit_area || 0),
        tenantId: c.tenant_id,
        tenantName: c.tenant_name,
        tenantPhone: c.tenant_phone,
        contractId: c.contract_id,
        distributionBasis: c.distribution_basis,
        basisValue: Number(c.basis_value || 0),
        calculatedShare: Number(c.calculated_share || 0),
        finalCharge: Number(c.final_charge || 0),
        isOccupied: Boolean(c.is_occupied),
        status: c.status,
        invoiceId: c.invoice_id,
        notes: c.notes || ''
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new Water Cost Period
router.post('/water/periods', async (req: Request, res: Response) => {
  try {
    const {
      propertyId,
      periodMonth,
      periodYear,
      periodStart,
      periodEnd,
      distributionMethod = 'EQUAL',
      notes
    } = req.body;

    if (!propertyId || !periodMonth) {
      return res.status(400).json({ error: 'العقار وفترة الشهر مطلوبان لإنشاء دورة تكاليف مياه' });
    }

    const pool = await getPool();

    // Verify property exists
    const [propRows]: any = await pool.query('SELECT id, name FROM properties WHERE id = ?', [propertyId]);
    if (propRows.length === 0) {
      return res.status(400).json({ error: 'العقار المحدد غير موجود' });
    }
    const propertyName = propRows[0].name;

    const yearVal = periodYear ? Number(periodYear) : (periodStart ? new Date(periodStart).getFullYear() : new Date().getFullYear());

    // Duplication Check: Prevent duplicate active/posted water periods for the same Property + Month + Year
    const [existing]: any = await pool.query(`
      SELECT id, status FROM water_costs 
      WHERE property_id = ? AND period_month = ? AND (period_year = ? OR period_year IS NULL) AND status != 'CANCELLED'
    `, [propertyId, periodMonth, yearVal]);

    if (existing.length > 0) {
      return res.status(400).json({
        error: `توجد دورة تكاليف مياه مسجلة بالفعل لهذا العقار عن الفترة (${periodMonth} ${yearVal}) برقم ${existing[0].id} وبحالة (${existing[0].status})`
      });
    }

    const id = `wat-${Date.now()}`;

    await pool.query(`
      INSERT INTO water_costs 
      (id, property_id, property_name, period_month, period_year, period_start, period_end, distribution_method, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
    `, [
      id,
      propertyId,
      propertyName,
      periodMonth,
      yearVal,
      periodStart || null,
      periodEnd || null,
      distributionMethod,
      notes || ''
    ]);

    res.status(201).json({
      id,
      propertyId,
      propertyName,
      periodMonth,
      periodYear: yearVal,
      distributionMethod,
      status: 'DRAFT',
      message: 'تم إنشاء دورة تكاليف المياه بنجاح'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update period details
router.put('/water/periods/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      propertyId,
      periodMonth,
      periodYear,
      periodStart,
      periodEnd,
      distributionMethod,
      notes
    } = req.body;
    const pool = await getPool();

    const [rows]: any = await pool.query('SELECT status, property_id FROM water_costs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'دورة تكاليف المياه غير موجودة' });
    }

    if (rows[0].status === 'POSTED' || rows[0].status === 'CLOSED') {
      return res.status(400).json({ error: 'لا يمكن تعديل دورة تكاليف المياه بعد ترحيلها إلى دفاتر الذمم' });
    }

    let propertyName = null;
    if (propertyId) {
      const [propRows]: any = await pool.query('SELECT name FROM properties WHERE id = ?', [propertyId]);
      if (propRows.length > 0) {
        propertyName = propRows[0].name;
      }
    }

    await pool.query(`
      UPDATE water_costs 
      SET 
        property_id = COALESCE(?, property_id),
        property_name = COALESCE(?, property_name),
        period_month = COALESCE(?, period_month),
        period_year = COALESCE(?, period_year),
        period_start = COALESCE(?, period_start),
        period_end = COALESCE(?, period_end),
        distribution_method = COALESCE(?, distribution_method),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `, [
      propertyId || null,
      propertyName || null,
      periodMonth || null,
      periodYear ? Number(periodYear) : null,
      periodStart || null,
      periodEnd || null,
      distributionMethod || null,
      notes || null,
      id
    ]);

    res.json({ message: 'تم تحديث بيانات دورة المياه بنجاح' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Water Period (Draft/Calculated/Cancelled only, with RBAC authorization)
router.delete('/water/periods/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req.headers['x-user-role'] as string) || (req.body?.userRole as string) || 'SUPER_ADMIN';
    const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'usr-1';
    const userName = (req.headers['x-user-name'] as string) || (req.body?.userName as string) || 'م. أحمد الوهاس';

    // Verify permission: Only System Administrator or Property Manager can delete
    const allowedRoles = ['SUPER_ADMIN', 'PROPERTY_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح: حذف دورات التكاليف مقتصر على مدير النظام أو إدارة الأملاك' });
    }

    const result = await executeTransaction(async (conn) => {
      // 1. Check period with lock
      const [periodRows]: any = await conn.query('SELECT * FROM water_costs WHERE id = ? FOR UPDATE', [id]);
      if (periodRows.length === 0) {
        throw new Error('دورة تكاليف المياه غير موجودة');
      }

      const period = periodRows[0];
      if (period.status === 'POSTED' || period.status === 'CLOSED') {
        throw new Error('لا يمكن حذف دورة تكاليف مياه مرحلة أو مغلقة محاسبياً لحماية دفاتر الذمم والحسابات المالية');
      }

      // 2. Check if any invoices are linked to this period
      const [invRows]: any = await conn.query(
        'SELECT COUNT(*) as count FROM invoices WHERE account_type = "WATER" AND period_month = ? AND property_id = ?',
        [period.period_month, period.property_id]
      );
      if (Number(invRows[0]?.count || 0) > 0) {
        throw new Error('لا يمكن حذف دورة المياه لوجود قيود ذمم وفواتير مسجلة مرتبطة بها.');
      }

      // 3. Delete child records atomically
      await conn.query('DELETE FROM water_charges WHERE period_id = ?', [id]);
      await conn.query('DELETE FROM water_cost_items WHERE period_id = ?', [id]);
      await conn.query('DELETE FROM water_tankers WHERE period_id = ?', [id]);
      await conn.query('DELETE FROM water_costs WHERE id = ?', [id]);

      // 4. Record audit log
      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'DELETE_WATER_PERIOD', 'water_costs', ?, ?)
      `, [
        `aud-${Date.now()}`,
        userId,
        userName,
        id,
        JSON.stringify({
          periodMonth: period.period_month,
          periodYear: period.period_year,
          propertyId: period.property_id,
          propertyName: period.property_name,
          deletedBy: userName,
          role: userRole
        })
      ]);

      return {
        success: true,
        message: `تم حذف دورة تكاليف المياه (${period.period_month}) للعقار ${period.property_name} بنجاح`
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Helper to recalculate parent water_costs totals from tankers and cost items
async function recalculateWaterPeriodTotals(pool: any, periodId: string) {
  // 1. Tankers summary
  const [tankerSum]: any = await pool.query(`
    SELECT 
      COALESCE(SUM(tanker_count), 0) as total_tankers,
      COALESCE(SUM(total_cost), 0) as total_tanker_cost
    FROM water_tankers WHERE period_id = ?
  `, [periodId]);

  const totalTankers = Number(tankerSum[0]?.total_tankers || 0);
  const totalTankerCost = Number(tankerSum[0]?.total_tanker_cost || 0);
  const avgUnitPrice = totalTankers > 0 ? totalTankerCost / totalTankers : 0;

  // 2. Cost Items by Category
  const [costSums]: any = await pool.query(`
    SELECT cost_category, COALESCE(SUM(amount), 0) as category_total
    FROM water_cost_items WHERE period_id = ?
    GROUP BY cost_category
  `, [periodId]);

  let pumpCost = 0;
  let sewerCost = 0;
  let maintCost = 0;
  let cleanCost = 0;
  let laborCost = 0;
  let treatCost = 0;
  let otherCost = 0;

  costSums.forEach((cs: any) => {
    const amt = Number(cs.category_total || 0);
    switch (cs.cost_category) {
      case 'PUMP_ELECTRICITY': pumpCost = amt; break;
      case 'SEWER': sewerCost = amt; break;
      case 'MAINTENANCE': maintCost = amt; break;
      case 'CLEANING': cleanCost = amt; break;
      case 'LABOR': laborCost = amt; break;
      case 'TREATMENT': treatCost = amt; break;
      case 'OTHER': otherCost = amt; break;
    }
  });

  const netTotal = totalTankerCost + pumpCost + sewerCost + maintCost + cleanCost + laborCost + treatCost + otherCost;

  await pool.query(`
    UPDATE water_costs 
    SET 
      tanker_count = ?,
      tanker_unit_price = ?,
      total_tanker_cost = ?,
      pump_electricity_cost = ?,
      sewer_cost = ?,
      tank_maintenance_cost = ?,
      cleaning_cost = ?,
      labor_cost = ?,
      treatment_cost = ?,
      other_fees = ?,
      net_total_operating_cost = ?
    WHERE id = ?
  `, [
    totalTankers, avgUnitPrice, totalTankerCost,
    pumpCost, sewerCost, maintCost, cleanCost, laborCost, treatCost, otherCost,
    netTotal, periodId
  ]);

  return { netTotal, totalTankerCost, totalTankers };
}

// Add Tanker Entry
router.post('/water/periods/:id/tankers', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      entryDate,
      tankerCount,
      costPerTanker,
      supplierName,
      tankerNumber,
      receiptNumber,
      paymentMethod = 'CASH',
      notes
    } = req.body;

    const count = Number(tankerCount || 1);
    const unitPrice = Number(costPerTanker || 0);

    if (count <= 0 || unitPrice <= 0) {
      return res.status(400).json({ error: 'عدد الوايتات وسعر الوايت يجب أن يكونا أكبر من الصفر' });
    }

    const pool = await getPool();

    // Check period status
    const [periodRows]: any = await pool.query('SELECT property_id, status FROM water_costs WHERE id = ?', [id]);
    if (periodRows.length === 0) {
      return res.status(404).json({ error: 'دورة تكاليف المياه غير موجودة' });
    }
    if (periodRows[0].status === 'POSTED' || periodRows[0].status === 'CLOSED') {
      return res.status(400).json({ error: 'لا يمكن إضافة وايتات لدورة مياه مرحلة أو مغلقة' });
    }

    const propertyId = periodRows[0].property_id;
    const totalCost = count * unitPrice; // Backend strictly calculates total cost
    const tankerId = `wtk-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const autoReceipt = receiptNumber ? String(receiptNumber).trim() : `WTR-TNK-${Date.now().toString().slice(-6)}`;

    await pool.query(`
      INSERT INTO water_tankers 
      (id, period_id, property_id, entry_date, tanker_count, cost_per_tanker, total_cost, supplier_name, tanker_number, receipt_number, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tankerId,
      id,
      propertyId,
      entryDate || new Date().toISOString().split('T')[0],
      count,
      unitPrice,
      totalCost,
      supplierName ? String(supplierName).trim() : null,
      tankerNumber ? String(tankerNumber).trim() : null,
      autoReceipt,
      paymentMethod,
      notes || ''
    ]);

    // Recalculate parent water_costs
    const totals = await recalculateWaterPeriodTotals(pool, id);

    res.status(201).json({
      id: tankerId,
      periodId: id,
      tankerCount: count,
      costPerTanker: unitPrice,
      totalCost,
      totals,
      message: `تم إضافة ${count} وايت بتكلفة إجمالية ${totalCost.toLocaleString()} ريال بنجاح`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Tanker Entry
router.delete('/water/periods/:periodId/tankers/:tankerId', async (req: Request, res: Response) => {
  try {
    const { periodId, tankerId } = req.params;
    const pool = await getPool();

    const [periodRows]: any = await pool.query('SELECT status FROM water_costs WHERE id = ?', [periodId]);
    if (periodRows.length === 0) return res.status(404).json({ error: 'دورة المياه غير موجودة' });
    if (periodRows[0].status === 'POSTED' || periodRows[0].status === 'CLOSED') {
      return res.status(400).json({ error: 'لا يمكن حذف وايتات من دورة مياه مرحلة أو مغلقة' });
    }

    await pool.query('DELETE FROM water_tankers WHERE id = ? AND period_id = ?', [tankerId, periodId]);
    const totals = await recalculateWaterPeriodTotals(pool, periodId);

    res.json({ message: 'تم حذف الوايت وإعادة احتساب تكاليف الدورة', totals });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Add Other Cost Item
router.post('/water/periods/:id/costs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      costCategory,
      amount,
      entryDate,
      referenceNumber,
      description,
      notes
    } = req.body;

    const amt = Number(amount || 0);
    if (amt <= 0) {
      return res.status(400).json({ error: 'مبلغ التكلفة يجب أن يكون أكبر من الصفر' });
    }

    const validCategories = ['PUMP_ELECTRICITY', 'SEWER', 'MAINTENANCE', 'CLEANING', 'LABOR', 'TREATMENT', 'OTHER'];
    if (!validCategories.includes(costCategory)) {
      return res.status(400).json({ error: 'فئة التكلفة غير صالحة' });
    }

    const pool = await getPool();
    const [periodRows]: any = await pool.query('SELECT property_id, status FROM water_costs WHERE id = ?', [id]);
    if (periodRows.length === 0) return res.status(404).json({ error: 'دورة المياه غير موجودة' });
    if (periodRows[0].status === 'POSTED' || periodRows[0].status === 'CLOSED') {
      return res.status(400).json({ error: 'لا يمكن إضافة تكاليف لدورة مياه مرحلة أو مغلقة' });
    }

    const propertyId = periodRows[0].property_id;
    const costItemId = `wci-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await pool.query(`
      INSERT INTO water_cost_items 
      (id, period_id, property_id, cost_category, amount, entry_date, reference_number, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      costItemId,
      id,
      propertyId,
      costCategory,
      amt,
      entryDate || new Date().toISOString().split('T')[0],
      referenceNumber ? String(referenceNumber).trim() : `WTR-EXP-${Date.now().toString().slice(-6)}`,
      description ? String(description).trim() : 'بند تكلفة مياه تشغيلية',
      notes || ''
    ]);

    const totals = await recalculateWaterPeriodTotals(pool, id);

    res.status(201).json({
      id: costItemId,
      periodId: id,
      costCategory,
      amount: amt,
      totals,
      message: 'تم إضافة بند التكلفة بنجاح'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Cost Item
router.delete('/water/periods/:periodId/costs/:costItemId', async (req: Request, res: Response) => {
  try {
    const { periodId, costItemId } = req.params;
    const pool = await getPool();

    const [periodRows]: any = await pool.query('SELECT status FROM water_costs WHERE id = ?', [periodId]);
    if (periodRows.length === 0) return res.status(404).json({ error: 'دورة المياه غير موجودة' });
    if (periodRows[0].status === 'POSTED' || periodRows[0].status === 'CLOSED') {
      return res.status(400).json({ error: 'لا يمكن حذف بنود من دورة مياه مرحلة أو مغلقة' });
    }

    await pool.query('DELETE FROM water_cost_items WHERE id = ? AND period_id = ?', [costItemId, periodId]);
    const totals = await recalculateWaterPeriodTotals(pool, periodId);

    res.json({ message: 'تم حذف بند التكلفة وإعادة احتساب تكاليف الدورة', totals });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Calculate Water Distribution
router.post('/water/periods/:id/calculate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      distributionMethod,
      includeVacant = false,
      fixedAmountPerUnit,
      customAllocations
    } = req.body;

    const pool = await getPool();

    // 1. Validate period
    const [periodRows]: any = await pool.query('SELECT * FROM water_costs WHERE id = ?', [id]);
    if (periodRows.length === 0) {
      return res.status(404).json({ error: 'دورة تكاليف المياه غير موجودة' });
    }

    const period = periodRows[0];
    if (period.status === 'POSTED' || period.status === 'CLOSED') {
      return res.status(400).json({ error: 'لا يمكن إعادة احتساب دورة مياه تم ترحيلها إلى الذمم' });
    }

    // Refresh totals from tankers and cost items
    const totals = await recalculateWaterPeriodTotals(pool, id);
    const totalWaterCost = totals.netTotal;

    if (totalWaterCost <= 0) {
      return res.status(400).json({ error: 'إجمالي تكلفة المياه للدورة يساوي صفراً. يرجى إضافة وايتات أو تكاليف تشغيلية قبل التوزيع' });
    }

    const selectedMethod = distributionMethod || period.distribution_method || 'EQUAL';

    // 2. Fetch units for this property with active tenant & contract relationship
    const [unitRows]: any = await pool.query(`
      SELECT 
        u.id as unit_id,
        u.unit_number,
        u.type as unit_type,
        u.area_sqm,
        u.status as unit_status,
        c.id as contract_id,
        c.tenant_id,
        c.tenant_name,
        c.status as contract_status
      FROM units u
      LEFT JOIN contracts c ON c.unit_id = u.id AND c.status = 'ACTIVE'
      WHERE u.property_id = ?
      ORDER BY u.unit_number ASC
    `, [period.property_id]);

    if (unitRows.length === 0) {
      return res.status(400).json({ error: 'لا توجد وحدات مسجلة في هذا العقار لتوزيع التكلفة عليها' });
    }

    // Filter participating units
    const participatingUnits = unitRows.filter((u: any) => {
      if (includeVacant) return true;
      return u.unit_status === 'OCCUPIED' || Boolean(u.tenant_id);
    });

    if (participatingUnits.length === 0) {
      return res.status(400).json({ error: 'لا توجد وحدات مشغولة حالياً لتوزيع التكاليف عليها. يمكنك تفعيل خيار شمول الوحدات الشاغرة' });
    }

    const participatingCount = participatingUnits.length;
    let charges: any[] = [];
    let totalDistributed = 0;

    // 3. Calculation based on Distribution Method
    if (selectedMethod === 'EQUAL') {
      // Equal distribution: totalWaterCost / participatingCount
      const baseShare = Math.floor((totalWaterCost / participatingCount) * 100) / 100;
      let distributedSum = 0;

      charges = participatingUnits.map((u: any, idx: number) => {
        let charge = baseShare;
        // Adjust rounding pennies on the last unit so sum equals totalWaterCost exactly
        if (idx === participatingCount - 1) {
          charge = Math.round((totalWaterCost - distributedSum) * 100) / 100;
        }
        distributedSum += charge;
        totalDistributed += charge;

        return {
          id: `wch-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          periodId: id,
          propertyId: period.property_id,
          unitId: u.unit_id,
          unitNumber: u.unit_number,
          tenantId: u.tenant_id || null,
          tenantName: u.tenant_name || (u.unit_status === 'VACANT' ? 'شاغرة (تحت حساب المالك)' : null),
          contractId: u.contract_id || null,
          distributionBasis: 'EQUAL',
          basisValue: 1.00,
          calculatedShare: charge,
          finalCharge: charge,
          isOccupied: u.unit_status === 'OCCUPIED' || Boolean(u.tenant_id),
          status: 'PENDING'
        };
      });
    } else if (selectedMethod === 'AREA') {
      // By Area: proportional to unit area_sqm
      const totalArea = participatingUnits.reduce((acc: number, u: any) => acc + (Number(u.area_sqm) || 1), 0);
      if (totalArea <= 0) {
        return res.status(400).json({ error: 'إجمالي مساحات الوحدات غير صالح لحساب التوزيع النسبي' });
      }

      let distributedSum = 0;
      charges = participatingUnits.map((u: any, idx: number) => {
        const area = Number(u.area_sqm) || 1;
        let charge = Math.round(((area / totalArea) * totalWaterCost) * 100) / 100;
        if (idx === participatingCount - 1) {
          charge = Math.round((totalWaterCost - distributedSum) * 100) / 100;
        }
        distributedSum += charge;
        totalDistributed += charge;

        return {
          id: `wch-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          periodId: id,
          propertyId: period.property_id,
          unitId: u.unit_id,
          unitNumber: u.unit_number,
          tenantId: u.tenant_id || null,
          tenantName: u.tenant_name || (u.unit_status === 'VACANT' ? 'شاغرة (تحت حساب المالك)' : null),
          contractId: u.contract_id || null,
          distributionBasis: 'AREA',
          basisValue: area,
          calculatedShare: charge,
          finalCharge: charge,
          isOccupied: u.unit_status === 'OCCUPIED' || Boolean(u.tenant_id),
          status: 'PENDING'
        };
      });
    } else if (selectedMethod === 'POPULATION') {
      // Population / Occupancy based
      // Each occupied unit has at least 1 occupant share
      const totalOccupants = participatingUnits.reduce((acc: number, u: any) => acc + (u.tenant_id ? 1 : 0), 0) || participatingCount;
      let distributedSum = 0;

      charges = participatingUnits.map((u: any, idx: number) => {
        const occ = u.tenant_id ? 1 : (includeVacant ? 1 : 0);
        let charge = Math.round(((occ / totalOccupants) * totalWaterCost) * 100) / 100;
        if (idx === participatingCount - 1) {
          charge = Math.round((totalWaterCost - distributedSum) * 100) / 100;
        }
        distributedSum += charge;
        totalDistributed += charge;

        return {
          id: `wch-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          periodId: id,
          propertyId: period.property_id,
          unitId: u.unit_id,
          unitNumber: u.unit_number,
          tenantId: u.tenant_id || null,
          tenantName: u.tenant_name || (u.unit_status === 'VACANT' ? 'شاغرة (تحت حساب المالك)' : null),
          contractId: u.contract_id || null,
          distributionBasis: 'POPULATION',
          basisValue: occ,
          calculatedShare: charge,
          finalCharge: charge,
          isOccupied: u.unit_status === 'OCCUPIED' || Boolean(u.tenant_id),
          status: 'PENDING'
        };
      });
    } else if (selectedMethod === 'CONSUMPTION') {
      // Check if water meter readings exist
      return res.status(400).json({
        error: 'لا توجد عدادات مياه فرعية وقراءات استهلاك مسجلة لهذه الوحدات في الفترة الحالية. يرجى استخدام التوزيع المتساوي (Equal) أو حسب المساحة (Area).'
      });
    } else if (selectedMethod === 'FIXED') {
      const fixedAmt = Number(fixedAmountPerUnit || 0);
      if (fixedAmt <= 0) {
        return res.status(400).json({ error: 'يرجى تحديد المبلغ الثابت لكل وحدة' });
      }

      charges = participatingUnits.map((u: any, idx: number) => {
        totalDistributed += fixedAmt;
        return {
          id: `wch-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          periodId: id,
          propertyId: period.property_id,
          unitId: u.unit_id,
          unitNumber: u.unit_number,
          tenantId: u.tenant_id || null,
          tenantName: u.tenant_name || (u.unit_status === 'VACANT' ? 'شاغرة (تحت حساب المالك)' : null),
          contractId: u.contract_id || null,
          distributionBasis: 'FIXED',
          basisValue: 1.00,
          calculatedShare: fixedAmt,
          finalCharge: fixedAmt,
          isOccupied: u.unit_status === 'OCCUPIED' || Boolean(u.tenant_id),
          status: 'PENDING'
        };
      });
    } else if (selectedMethod === 'CUSTOM') {
      const allocations = customAllocations || {};
      let allocSum = 0;

      charges = participatingUnits.map((u: any, idx: number) => {
        const customAmt = Number(allocations[u.unit_id] || 0);
        allocSum += customAmt;
        totalDistributed += customAmt;

        return {
          id: `wch-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          periodId: id,
          propertyId: period.property_id,
          unitId: u.unit_id,
          unitNumber: u.unit_number,
          tenantId: u.tenant_id || null,
          tenantName: u.tenant_name || (u.unit_status === 'VACANT' ? 'شاغرة (تحت حساب المالك)' : null),
          contractId: u.contract_id || null,
          distributionBasis: 'CUSTOM',
          basisValue: 1.00,
          calculatedShare: customAmt,
          finalCharge: customAmt,
          isOccupied: u.unit_status === 'OCCUPIED' || Boolean(u.tenant_id),
          status: 'PENDING'
        };
      });
    }

    const difference = Math.round((totalWaterCost - totalDistributed) * 100) / 100;

    // 4. Save charges in database transaction
    await executeTransaction(async (conn) => {
      // Clear old pending charges for this period
      await conn.query('DELETE FROM water_charges WHERE period_id = ? AND status = "PENDING"', [id]);

      // Insert new charges
      for (const ch of charges) {
        await conn.query(`
          INSERT INTO water_charges 
          (id, period_id, property_id, unit_id, unit_number, tenant_id, tenant_name, contract_id, distribution_basis, basis_value, calculated_share, final_charge, is_occupied, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          ch.id,
          ch.periodId,
          ch.propertyId,
          ch.unitId,
          ch.unitNumber,
          ch.tenantId,
          ch.tenantName,
          ch.contractId,
          ch.distributionBasis,
          ch.basisValue,
          ch.calculatedShare,
          ch.finalCharge,
          ch.isOccupied ? 1 : 0,
          ch.status
        ]);
      }

      // Update period status and totals
      await conn.query(`
        UPDATE water_costs 
        SET 
          distribution_method = ?,
          total_distributed_amount = ?,
          difference_amount = ?,
          status = 'CALCULATED'
        WHERE id = ?
      `, [selectedMethod, totalDistributed, difference, id]);
    });

    res.json({
      periodId: id,
      distributionMethod: selectedMethod,
      totalWaterCost,
      totalDistributed,
      differenceAmount: difference,
      participatingUnitsCount: participatingCount,
      chargesCount: charges.length,
      charges,
      status: 'CALCULATED',
      message: `تم احتساب وتوزيع تكلفة المياه (${totalWaterCost.toLocaleString()} ريال) على ${participatingCount} وحدة بنجاح`
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Official Post to Tenant Ledger: POST /api/water/periods/:id/post
router.post('/water/periods/:id/post', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req.headers['x-user-role'] as string) || (req.body?.userRole as string) || 'SUPER_ADMIN';
    const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'usr-1';
    const userName = (req.headers['x-user-name'] as string) || (req.body?.userName as string) || 'م. أحمد الوهاس';
    const { postedBy = userName, notes } = req.body;

    // Verify permission: Only System Administrator, Property Manager, or Accountant can post to ledger
    const allowedRoles = ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح: ترحيل تكاليف المياه إلى الذمم مقتصر على مدير النظام، مدير الأملاك، أو المحاسب' });
    }

    const result = await executeTransaction(async (conn) => {
      // 1. Validate period with exclusive lock
      const [pRows]: any = await conn.query('SELECT * FROM water_costs WHERE id = ? FOR UPDATE', [id]);
      if (pRows.length === 0) {
        throw new Error('دورة تكاليف المياه غير موجودة');
      }

      const period = pRows[0];
      if (period.status === 'POSTED') {
        throw new Error('هذه الدورة مرحلة مسبقاً إلى دفاتر الذمم ولا يمكن ترحيلها مرة أخرى');
      }
      if (period.status === 'CLOSED') {
        throw new Error('هذه الدورة مغلقة محاسبياً');
      }
      if (period.status === 'CANCELLED') {
        throw new Error('هذه الدورة ملغاة ولا يمكن ترحيلها');
      }

      // 2. Fetch charges with lock
      const [charges]: any = await conn.query('SELECT * FROM water_charges WHERE period_id = ? FOR UPDATE', [id]);
      if (charges.length === 0) {
        throw new Error('لا توجد مبالغ موزعة للترحيل. يرجى احتساب توزيع تكاليف الدورة أولاً');
      }

      const totalDistributed = Number(period.total_distributed_amount || 0);
      const totalCost = Number(period.net_total_operating_cost || 0);

      let postedTenantCount = 0;
      let postedTotalAmount = 0;
      const postingDate = formatSqlDate(period.period_end) || new Date().toISOString().split('T')[0];
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10).replace(/-/g, '').slice(2);

      // 3. Post each charge to tenant invoices and tenant ledger
      for (const charge of charges) {
        const chargeAmount = Number(charge.final_charge || 0);
        if (chargeAmount <= 0) continue;

        if (charge.tenant_id) {
          // Fetch current tenant balance with lock
          const [tRows]: any = await conn.query('SELECT id, name, current_balance, water_balance FROM tenants WHERE id = ? FOR UPDATE', [charge.tenant_id]);
          if (tRows.length > 0) {
            const currentBal = Number(tRows[0].current_balance || 0);
            const waterBal = Number(tRows[0].water_balance || 0);
            const newBal = currentBal + chargeAmount;
            const newWaterBal = waterBal + chargeAmount;

            const randomPart = Math.floor(1000 + Math.random() * 9000);
            const invoiceNumber = `INV-WAT-${datePart}-${randomPart}`;
            const invoiceId = `inv-wat-${period.id}-${charge.id}`;
            const ledgerId = `ledg-wat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const desc = `رسوم مياه وايتات عن فترة ${period.period_month} - وحدة ${charge.unit_number} (${period.property_name})`;

            // A. Create receivable record in invoices table
            await conn.query(`
              INSERT INTO invoices 
              (id, invoice_number, tenant_id, tenant_name, contract_id, property_id, property_name, unit_id, unit_number, account_type, period_month, base_rent, additional_charges, discount, total_amount, paid_amount, remaining_amount, issue_date, due_date, billing_period_start, billing_period_end, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'WATER', ?, 0.00, ?, 0.00, ?, 0.00, ?, ?, ?, ?, ?, 'UNPAID', ?)
            `, [
              invoiceId,
              invoiceNumber,
              charge.tenant_id,
              tRows[0].name || charge.tenant_name || '',
              charge.contract_id || null,
              period.property_id,
              period.property_name,
              charge.unit_id,
              charge.unit_number,
              period.period_month,
              chargeAmount,
              chargeAmount,
              chargeAmount,
              postingDate,
              postingDate,
              formatSqlDate(period.period_start) || postingDate,
              formatSqlDate(period.period_end) || postingDate,
              desc
            ]);

            // B. Insert Debit entry into tenant_ledger
            await conn.query(`
              INSERT INTO tenant_ledger 
              (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id)
              VALUES (?, ?, ?, ?, 'WATER', ?, 0.00, ?, ?, ?)
            `, [
              ledgerId,
              charge.tenant_id,
              postingDate,
              invoiceNumber,
              chargeAmount,
              newBal,
              desc,
              userId
            ]);

            // C. Update tenant balances
            await conn.query(`
              UPDATE tenants 
              SET current_balance = ?, water_balance = ?
              WHERE id = ?
            `, [newBal, newWaterBal, charge.tenant_id]);

            // D. Update property total outstanding
            await conn.query(`
              UPDATE properties 
              SET total_outstanding_rent = total_outstanding_rent + ?
              WHERE id = ?
            `, [chargeAmount, period.property_id]);

            // E. Link charge to invoice and mark as POSTED
            await conn.query('UPDATE water_charges SET status = "POSTED", invoice_id = ? WHERE id = ?', [invoiceId, charge.id]);

            postedTenantCount++;
            postedTotalAmount += chargeAmount;
          }
        } else {
          // If no tenant assigned to unit, mark charge as POSTED without tenant ledger
          await conn.query('UPDATE water_charges SET status = "POSTED" WHERE id = ?', [charge.id]);
        }
      }

      // 4. Update water_costs status to POSTED
      await conn.query(`
        UPDATE water_costs 
        SET 
          status = 'POSTED',
          posted_at = NOW(),
          posted_by = ?,
          notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE notes END
        WHERE id = ?
      `, [postedBy, notes, notes, notes, id]);

      // 5. Audit Log
      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'POST_WATER_PERIOD', 'water_costs', ?, ?)
      `, [
        `aud-${Date.now()}`,
        userId,
        postedBy,
        id,
        JSON.stringify({
          periodMonth: period.period_month,
          propertyId: period.property_id,
          propertyName: period.property_name,
          totalOperatingCost: totalCost,
          totalDistributed,
          postedTenants: postedTenantCount,
          postedAmount: postedTotalAmount,
          postedAt: new Date().toISOString()
        })
      ]);

      return {
        periodId: id,
        periodMonth: period.period_month,
        status: 'POSTED',
        postedTenantsCount: postedTenantCount,
        postedTotalAmount,
        message: `تم ترحيل تكاليف المياه بنجاح إلى ذمم ${postedTenantCount} مستأجراً بإجمالي ${postedTotalAmount.toLocaleString()} ر.ي`
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel unposted Water Period: POST /api/water/periods/:id/cancel
router.post('/water/periods/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req.headers['x-user-role'] as string) || (req.body?.userRole as string) || 'SUPER_ADMIN';
    const userId = (req.headers['x-user-id'] as string) || (req.body?.userId as string) || 'usr-1';
    const userName = (req.headers['x-user-name'] as string) || (req.body?.userName as string) || 'م. أحمد الوهاس';
    const { reason = 'إلغاء دورة المياه' } = req.body;

    // Verify permission: Only System Administrator, Property Manager, or Accountant can cancel
    const allowedRoles = ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مصرح: إلغاء دورات التكاليف مقتصر على مدير النظام، مدير الأملاك، أو المحاسب' });
    }

    const result = await executeTransaction(async (conn) => {
      const [rows]: any = await conn.query('SELECT * FROM water_costs WHERE id = ? FOR UPDATE', [id]);
      if (rows.length === 0) {
        throw new Error('دورة تكاليف المياه غير موجودة');
      }

      const period = rows[0];
      if (period.status === 'POSTED') {
        throw new Error('لا يمكن إلغاء دورة مياه مرحلة رسمياً إلى ذمم المستأجرين لمنع التلاعب المالي وحماية سلامة الدفاتر المحاسبية. يتطلب ذلك تسوية قيود محاسبية عكسية معتمدة.');
      }
      if (period.status === 'CLOSED') {
        throw new Error('لا يمكن إلغاء دورة مياه مغلقة محاسبياً');
      }
      if (period.status === 'CANCELLED') {
        throw new Error('دورة المياه ملغاة بالفعل مسبقاً');
      }

      const cancellationNote = ` [تم الإلغاء بواسطة ${userName} في ${new Date().toISOString().slice(0, 10)} - السبب: ${reason}]`;

      // Update parent period
      await conn.query(`
        UPDATE water_costs 
        SET status = 'CANCELLED', notes = CONCAT(COALESCE(notes, ''), ?)
        WHERE id = ?
      `, [cancellationNote, id]);

      // Update any charges to CANCELLED
      await conn.query('UPDATE water_charges SET status = "CANCELLED" WHERE period_id = ?', [id]);

      // Record in audit log
      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'CANCEL_WATER_PERIOD', 'water_costs', ?, ?)
      `, [
        `aud-${Date.now()}`,
        userId,
        userName,
        id,
        JSON.stringify({
          periodMonth: period.period_month,
          propertyId: period.property_id,
          propertyName: period.property_name,
          reason,
          cancelledBy: userName,
          cancelledAt: new Date().toISOString()
        })
      ]);

      return {
        success: true,
        message: 'تم إلغاء دورة تكاليف المياه بنجاح',
        periodId: id,
        status: 'CANCELLED'
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Water Cost Report API (Basic)
router.get('/water/reports', async (req: Request, res: Response) => {
  try {
    const { propertyId, year } = req.query;
    const pool = await getPool();

    let sql = `
      SELECT 
        w.id,
        w.property_id,
        p.name as property_name,
        w.period_month,
        w.period_year,
        w.tanker_count,
        w.total_tanker_cost,
        w.pump_electricity_cost,
        w.sewer_cost,
        w.tank_maintenance_cost,
        w.cleaning_cost,
        w.labor_cost,
        w.treatment_cost,
        w.other_fees,
        w.net_total_operating_cost,
        w.total_distributed_amount,
        w.difference_amount,
        w.distribution_method,
        w.status,
        w.created_at
      FROM water_costs w
      LEFT JOIN properties p ON w.property_id = p.id
      WHERE w.status != 'CANCELLED'
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      sql += ' AND w.property_id = ?';
      params.push(propertyId);
    }

    if (year) {
      sql += ' AND w.period_year = ?';
      params.push(Number(year));
    }

    sql += ' ORDER BY w.created_at DESC';

    const [rows]: any = await pool.query(sql, params);

    res.json(rows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      periodMonth: r.period_month,
      periodYear: r.period_year ? Number(r.period_year) : undefined,
      tankerCount: Number(r.tanker_count || 0),
      totalTankerCost: Number(r.total_tanker_cost || 0),
      pumpElectricityCost: Number(r.pump_electricity_cost || 0),
      sewerCost: Number(r.sewer_cost || 0),
      tankMaintenanceCost: Number(r.tank_maintenance_cost || 0),
      cleaningCost: Number(r.cleaning_cost || 0),
      laborCost: Number(r.labor_cost || 0),
      treatmentCost: Number(r.treatment_cost || 0),
      otherFees: Number(r.other_fees || 0),
      netTotalOperatingCost: Number(r.net_total_operating_cost || 0),
      totalDistributedAmount: Number(r.total_distributed_amount || 0),
      differenceAmount: Number(r.difference_amount || 0),
      distributionMethod: r.distribution_method,
      status: r.status
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Comprehensive Detailed Water Reports API: GET /api/water/reports/detailed
// Supports: Daily, Monthly, Annual (with monthly breakdown), Date Range, and Detailed Comprehensive
// Avoids Cartesian product inflation by running accurate, distinct subqueries
router.get('/water/reports/detailed', async (req: Request, res: Response) => {
  try {
    const {
      reportType = 'detailed', // daily | monthly | annual | range | detailed
      date,
      month,
      year = new Date().getFullYear(),
      startDate,
      endDate,
      propertyId,
      buildingId,
      unitId,
      tenantId,
      status,
      distributionMethod,
      search
    } = req.query;

    const pool = await getPool();

    // 1. Build Periods Filter SQL
    let periodSql = `
      SELECT 
        w.*,
        p.name as property_name,
        p.code as property_code
      FROM water_costs w
      LEFT JOIN properties p ON w.property_id = p.id
      WHERE 1=1
    `;
    const periodParams: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      periodSql += ' AND w.property_id = ?';
      periodParams.push(propertyId);
    }

    if (status && status !== 'ALL') {
      periodSql += ' AND w.status = ?';
      periodParams.push(status);
    }

    if (distributionMethod && distributionMethod !== 'ALL') {
      periodSql += ' AND w.distribution_method = ?';
      periodParams.push(distributionMethod);
    }

    // Time filtering based on reportType
    if (reportType === 'daily' && date) {
      periodSql += ' AND (w.period_start <= ? AND (w.period_end >= ? OR w.period_end IS NULL))';
      periodParams.push(date, date);
    } else if (reportType === 'monthly') {
      if (month) {
        periodSql += ' AND (w.period_month LIKE ? OR DATE_FORMAT(w.period_start, "%Y-%m") = ?)';
        periodParams.push(`%${month}%`, month);
      }
      if (year) {
        periodSql += ' AND (w.period_year = ? OR w.period_month LIKE ?)';
        periodParams.push(Number(year), `%${year}%`);
      }
    } else if (reportType === 'annual') {
      if (year) {
        periodSql += ' AND (w.period_year = ? OR w.period_month LIKE ? OR YEAR(w.period_start) = ?)';
        periodParams.push(Number(year), `%${year}%`, Number(year));
      }
    } else if (reportType === 'range' || reportType === 'detailed') {
      if (startDate) {
        periodSql += ' AND (w.period_end >= ? OR w.period_start >= ?)';
        periodParams.push(startDate, startDate);
      }
      if (endDate) {
        periodSql += ' AND (w.period_start <= ? OR w.period_end <= ?)';
        periodParams.push(endDate, endDate);
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const s = `%${search.trim()}%`;
      periodSql += ' AND (w.id LIKE ? OR w.period_month LIKE ? OR p.name LIKE ? OR w.notes LIKE ?)';
      periodParams.push(s, s, s, s);
    }

    periodSql += ' ORDER BY w.period_start DESC, w.created_at DESC';

    const [periodRows]: any = await pool.query(periodSql, periodParams);

    const periodIds = periodRows.map((p: any) => p.id);

    // 2. Fetch Tankers for matching periods (or matching date if daily)
    let tankersList: any[] = [];
    if (periodIds.length > 0 || (reportType === 'daily' && date)) {
      let tankerSql = `
        SELECT 
          t.*,
          p.name as property_name,
          w.period_month
        FROM water_tankers t
        LEFT JOIN properties p ON t.property_id = p.id
        LEFT JOIN water_costs w ON t.period_id = w.id
        WHERE 1=1
      `;
      const tankerParams: any[] = [];

      if (propertyId && propertyId !== 'ALL') {
        tankerSql += ' AND t.property_id = ?';
        tankerParams.push(propertyId);
      }

      if (reportType === 'daily' && date) {
        tankerSql += ' AND t.entry_date = ?';
        tankerParams.push(date);
      } else if (periodIds.length > 0) {
        tankerSql += ` AND t.period_id IN (${periodIds.map(() => '?').join(',')})`;
        tankerParams.push(...periodIds);
      }

      tankerSql += ' ORDER BY t.entry_date DESC, t.created_at DESC';
      const [tRows]: any = await pool.query(tankerSql, tankerParams);
      tankersList = tRows.map((r: any) => ({
        id: r.id,
        periodId: r.period_id,
        periodMonth: r.period_month,
        propertyId: r.property_id,
        propertyName: r.property_name,
        entryDate: formatSqlDate(r.entry_date) || '',
        tankerCount: Number(r.tanker_count || 1),
        costPerTanker: Number(r.cost_per_tanker || 0),
        totalCost: Number(r.total_cost || 0),
        supplierName: r.supplier_name || 'مورد عام',
        tankerNumber: r.tanker_number || '',
        receiptNumber: r.receipt_number || '',
        paymentMethod: r.payment_method || 'CASH',
        notes: r.notes || ''
      }));
    }

    // 3. Fetch Cost Items / Expenses
    let expenseList: any[] = [];
    if (periodIds.length > 0 || (reportType === 'daily' && date)) {
      let expSql = `
        SELECT 
          ci.*,
          p.name as property_name,
          w.period_month
        FROM water_cost_items ci
        LEFT JOIN properties p ON ci.property_id = p.id
        LEFT JOIN water_costs w ON ci.period_id = w.id
        WHERE 1=1
      `;
      const expParams: any[] = [];

      if (propertyId && propertyId !== 'ALL') {
        expSql += ' AND ci.property_id = ?';
        expParams.push(propertyId);
      }

      if (reportType === 'daily' && date) {
        expSql += ' AND ci.entry_date = ?';
        expParams.push(date);
      } else if (periodIds.length > 0) {
        expSql += ` AND ci.period_id IN (${periodIds.map(() => '?').join(',')})`;
        expParams.push(...periodIds);
      }

      expSql += ' ORDER BY ci.entry_date DESC, ci.created_at DESC';
      const [expRows]: any = await pool.query(expSql, expParams);
      expenseList = expRows.map((r: any) => ({
        id: r.id,
        periodId: r.period_id,
        periodMonth: r.period_month,
        propertyId: r.property_id,
        propertyName: r.property_name,
        costCategory: r.cost_category,
        amount: Number(r.amount || 0),
        entryDate: formatSqlDate(r.entry_date) || '',
        referenceNumber: r.reference_number || '',
        description: r.description || '',
        notes: r.notes || ''
      }));
    }

    // 4. Fetch Tenant Charges (Filtered by building, unit, tenant if requested)
    let chargesList: any[] = [];
    if (periodIds.length > 0) {
      let chgSql = `
        SELECT 
          wc.*,
          u.unit_number,
          u.type as unit_type,
          u.area_sqm as unit_area,
          u.building_id,
          b.name as building_name,
          t.phone as tenant_phone,
          p.name as property_name,
          w.period_month,
          w.status as period_status,
          inv.invoice_number,
          inv.status as invoice_status
        FROM water_charges wc
        LEFT JOIN units u ON wc.unit_id = u.id
        LEFT JOIN buildings b ON u.building_id = b.id
        LEFT JOIN tenants t ON wc.tenant_id = t.id
        LEFT JOIN properties p ON wc.property_id = p.id
        LEFT JOIN water_costs w ON wc.period_id = w.id
        LEFT JOIN invoices inv ON wc.invoice_id = inv.id
        WHERE wc.period_id IN (${periodIds.map(() => '?').join(',')})
      `;
      const chgParams: any[] = [...periodIds];

      if (buildingId && buildingId !== 'ALL') {
        chgSql += ' AND u.building_id = ?';
        chgParams.push(buildingId);
      }

      if (unitId && unitId !== 'ALL') {
        chgSql += ' AND wc.unit_id = ?';
        chgParams.push(unitId);
      }

      if (tenantId && tenantId !== 'ALL') {
        chgSql += ' AND wc.tenant_id = ?';
        chgParams.push(tenantId);
      }

      chgSql += ' ORDER BY wc.unit_number ASC, wc.created_at ASC';
      const [chgRows]: any = await pool.query(chgSql, chgParams);
      chargesList = chgRows.map((r: any) => ({
        id: r.id,
        periodId: r.period_id,
        periodMonth: r.period_month,
        periodStatus: r.period_status,
        propertyId: r.property_id,
        propertyName: r.property_name,
        buildingId: r.building_id,
        buildingName: r.building_name || '',
        unitId: r.unit_id,
        unitNumber: r.unit_number,
        unitType: r.unit_type,
        unitArea: Number(r.unit_area || 0),
        tenantId: r.tenant_id,
        tenantName: r.tenant_name || 'شاغر / غير مؤجر',
        tenantPhone: r.tenant_phone || '',
        contractId: r.contract_id,
        distributionBasis: r.distribution_basis,
        basisValue: Number(r.basis_value || 0),
        calculatedShare: Number(r.calculated_share || 0),
        finalCharge: Number(r.final_charge || 0),
        isOccupied: Boolean(r.is_occupied),
        status: r.status,
        invoiceId: r.invoice_id,
        invoiceNumber: r.invoice_number || '',
        invoiceStatus: r.invoice_status || '',
        notes: r.notes || ''
      }));
    }

    // 5. Structure Periods List
    const periodsFormatted = periodRows.map((r: any) => ({
      id: r.id,
      propertyId: r.property_id,
      propertyName: r.property_name,
      propertyCode: r.property_code,
      periodMonth: r.period_month,
      periodYear: r.period_year ? Number(r.period_year) : undefined,
      periodStart: formatSqlDate(r.period_start),
      periodEnd: formatSqlDate(r.period_end),
      tankerCount: Number(r.tanker_count || 0),
      tankerUnitPrice: Number(r.tanker_unit_price || 0),
      totalTankerCost: Number(r.total_tanker_cost || 0),
      pumpElectricityCost: Number(r.pump_electricity_cost || 0),
      sewerCost: Number(r.sewer_cost || 0),
      tankMaintenanceCost: Number(r.tank_maintenance_cost || 0),
      cleaningCost: Number(r.cleaning_cost || 0),
      laborCost: Number(r.labor_cost || 0),
      treatmentCost: Number(r.treatment_cost || 0),
      otherFees: Number(r.other_fees || 0),
      netTotalOperatingCost: Number(r.net_total_operating_cost || 0),
      totalDistributedAmount: Number(r.total_distributed_amount || 0),
      differenceAmount: Number(r.difference_amount || 0),
      distributionMethod: r.distribution_method,
      status: r.status,
      notes: r.notes || '',
      postedAt: formatSqlDateTime(r.posted_at),
      postedBy: r.posted_by,
      closedAt: formatSqlDateTime(r.closed_at),
      closedBy: r.closed_by,
      createdAt: formatSqlDateTime(r.created_at)
    }));

    // 6. Calculate Summary Metrics (Accurate, distinct sums with NO join multiplication)
    const totalPeriodsCount = periodsFormatted.length;
    const totalTankersCount = periodsFormatted.reduce((acc: number, p: any) => acc + p.tankerCount, 0);
    const totalTankersCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.totalTankerCost, 0);
    const totalPumpElectricityCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.pumpElectricityCost, 0);
    const totalSewerCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.sewerCost, 0);
    const totalMaintenanceCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.tankMaintenanceCost, 0);
    const totalCleaningCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.cleaningCost, 0);
    const totalLaborCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.laborCost, 0);
    const totalOtherCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.otherFees + p.treatmentCost, 0);
    const netTotalWaterCost = periodsFormatted.reduce((acc: number, p: any) => acc + p.netTotalOperatingCost, 0);
    const totalDistributedAmount = periodsFormatted.reduce((acc: number, p: any) => acc + p.totalDistributedAmount, 0);
    const totalPostedAmount = periodsFormatted
      .filter((p: any) => p.status === 'POSTED')
      .reduce((acc: number, p: any) => acc + p.totalDistributedAmount, 0);
    const totalDifferenceAmount = periodsFormatted.reduce((acc: number, p: any) => acc + p.differenceAmount, 0);

    const participatingUnitsCount = new Set(chargesList.map(c => c.unitId)).size;
    const participatingTenantsCount = new Set(chargesList.filter(c => c.tenantId).map(c => c.tenantId)).size;

    // 7. Monthly Breakdown (12 Months of the selected year for Annual Reports)
    const monthNamesArabic = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthlyBreakdown = monthNamesArabic.map((mName, idx) => {
      const monthNum = idx + 1;
      const monthPrefix = `${year}-${String(monthNum).padStart(2, '0')}`;
      
      const matchingPeriods = periodsFormatted.filter((p: any) => {
        if (p.periodStart && p.periodStart.startsWith(monthPrefix)) return true;
        if (p.periodMonth && (p.periodMonth.includes(mName) || p.periodMonth.startsWith(mName))) return true;
        return false;
      });

      const mTankerCount = matchingPeriods.reduce((acc: number, p: any) => acc + p.tankerCount, 0);
      const mTankerCost = matchingPeriods.reduce((acc: number, p: any) => acc + p.totalTankerCost, 0);
      const mOperatingCost = matchingPeriods.reduce((acc: number, p: any) => 
        acc + (p.netTotalOperatingCost - p.totalTankerCost), 0);
      const mTotalCost = matchingPeriods.reduce((acc: number, p: any) => acc + p.netTotalOperatingCost, 0);
      const mDistributed = matchingPeriods.reduce((acc: number, p: any) => acc + p.totalDistributedAmount, 0);
      const mPosted = matchingPeriods
        .filter((p: any) => p.status === 'POSTED')
        .reduce((acc: number, p: any) => acc + p.totalDistributedAmount, 0);

      return {
        monthIndex: monthNum,
        monthName: `${mName} ${year}`,
        periodsCount: matchingPeriods.length,
        tankerCount: mTankerCount,
        tankerCost: mTankerCost,
        operatingCost: mOperatingCost,
        totalCost: mTotalCost,
        distributedAmount: mDistributed,
        postedAmount: mPosted,
        status: matchingPeriods.length > 0 
          ? matchingPeriods.every((p: any) => p.status === 'POSTED') ? 'POSTED' : 'PARTIAL'
          : 'NO_CYCLES'
      };
    });

    res.json({
      reportType,
      filters: {
        date: date || null,
        month: month || null,
        year: year ? Number(year) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        propertyId: propertyId || 'ALL',
        buildingId: buildingId || 'ALL',
        unitId: unitId || 'ALL',
        tenantId: tenantId || 'ALL',
        status: status || 'ALL',
        distributionMethod: distributionMethod || 'ALL',
        search: search || null
      },
      generatedAt: new Date().toISOString(),
      summary: {
        totalPeriodsCount,
        totalTankersCount,
        totalTankersCost,
        totalPumpElectricityCost,
        totalSewerCost,
        totalMaintenanceCost,
        totalCleaningCost,
        totalLaborCost,
        totalOtherCost,
        netTotalWaterCost,
        totalDistributedAmount,
        totalPostedAmount,
        totalDifferenceAmount,
        participatingUnitsCount,
        participatingTenantsCount
      },
      monthlyBreakdown,
      periods: periodsFormatted,
      tankers: tankersList,
      expenses: expenseList,
      charges: chargesList
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
