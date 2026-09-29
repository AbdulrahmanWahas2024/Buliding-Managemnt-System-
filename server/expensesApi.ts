import { Router, Request, Response } from 'express';
import { getPool, executeTransaction } from './db';

const router = Router();

// Helper to extract authenticated user info from request headers
function getUser(req: Request) {
  const userId = (req.headers['x-user-id'] as string) || 'usr-1';
  const userName = (req.headers['x-user-name'] as string) || 'م. أحمد الوهاس';
  const userRole = (req.headers['x-user-role'] as string) || 'SUPER_ADMIN';
  return { userId, userName, userRole };
}

// Generate Next Sequential Expense Number: EXP-YYYY-000001
async function generateNextExpenseNumber(conn: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `EXP-${currentYear}-`;
  const [rows]: any = await conn.query(
    'SELECT expense_number FROM expenses WHERE expense_number LIKE ? ORDER BY expense_number DESC LIMIT 1 FOR UPDATE',
    [`${prefix}%`]
  );
  if (!rows || rows.length === 0) {
    return `${prefix}000001`;
  }
  const lastNumStr = rows[0].expense_number.replace(prefix, '');
  const nextNum = (parseInt(lastNumStr, 10) || 0) + 1;
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

// Generate Next Sequential Maintenance Number: MNT-YYYY-000001
async function generateNextMaintenanceNumber(conn: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `MNT-${currentYear}-`;
  const [rows]: any = await conn.query(
    'SELECT maintenance_number FROM maintenance_requests WHERE maintenance_number LIKE ? ORDER BY maintenance_number DESC LIMIT 1 FOR UPDATE',
    [`${prefix}%`]
  );
  if (!rows || rows.length === 0) {
    return `${prefix}000001`;
  }
  const lastNumStr = rows[0].maintenance_number.replace(prefix, '');
  const nextNum = (parseInt(lastNumStr, 10) || 0) + 1;
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

// ============================================================================
// 1. EXPENSE CATEGORIES API
// ============================================================================

// GET /expenses/categories
router.get('/expenses/categories', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { activeOnly } = req.query;
    let query = 'SELECT * FROM expense_categories';
    const params: any[] = [];
    if (activeOnly === 'true') {
      query += ' WHERE is_active = TRUE';
    }
    query += ' ORDER BY code ASC, name ASC';
    const [rows]: any = await pool.query(query, params);
    
    const categories = rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      accountCode: r.account_code,
      description: r.description,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at
    }));

    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /expenses/categories
router.post('/expenses/categories', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية إضافة تصنيفات مصروفات' });
    }

    const { code, name, accountCode = '5101', description, isActive = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم تصنيف المصروف مطلوب' });
    }

    const cleanCode = code && code.trim() ? code.trim().toUpperCase() : `CAT-${Date.now().toString().slice(-4)}`;
    
    // Check code uniqueness
    const [existing]: any = await pool.query('SELECT id FROM expense_categories WHERE code = ?', [cleanCode]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'كود التصنيف موجود مسبقاً، يرجى اختيار كود آخر' });
    }

    const id = `cat-${Date.now()}`;
    await pool.query(
      'INSERT INTO expense_categories (id, code, name, account_code, description, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, cleanCode, name.trim(), accountCode.trim(), description?.trim() || null, Boolean(isActive)]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`aud-${Date.now()}`, userId, userName, 'CREATE_EXPENSE_CATEGORY', 'EXPENSE_CATEGORY', id, `إضافة تصنيف مصروفات جديد: ${name.trim()} (${cleanCode})`]
    );

    res.status(201).json({
      id,
      code: cleanCode,
      name: name.trim(),
      accountCode: accountCode.trim(),
      description: description?.trim() || null,
      isActive: Boolean(isActive)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /expenses/categories/:id
router.put('/expenses/categories/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تعديل تصنيفات المصروفات' });
    }

    const { id } = req.params;
    const { name, accountCode, description, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم التصنيف مطلوب' });
    }

    const [existing]: any = await pool.query('SELECT * FROM expense_categories WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'تصنيف المصروف غير موجود' });
    }

    await pool.query(
      'UPDATE expense_categories SET name = ?, account_code = ?, description = ?, is_active = ? WHERE id = ?',
      [name.trim(), (accountCode || '5101').trim(), description?.trim() || null, isActive !== undefined ? Boolean(isActive) : true, id]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`aud-${Date.now()}`, userId, userName, 'UPDATE_EXPENSE_CATEGORY', 'EXPENSE_CATEGORY', id, `تعديل تصنيف المصروف: ${name.trim()}`]
    );

    res.json({ success: true, message: 'تم تحديث التصنيف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /expenses/categories/:id/toggle
router.patch('/expenses/categories/:id/toggle', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تغيير حالة التصنيف' });
    }

    const { id } = req.params;
    const [existing]: any = await pool.query('SELECT * FROM expense_categories WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'التصنيف غير موجود' });
    }

    const newStatus = !existing[0].is_active;
    await pool.query('UPDATE expense_categories SET is_active = ? WHERE id = ?', [newStatus, id]);

    await pool.query(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`aud-${Date.now()}`, userId, userName, 'TOGGLE_EXPENSE_CATEGORY', 'EXPENSE_CATEGORY', id, `تغيير حالة تصنيف المصروف ${existing[0].name} إلى ${newStatus ? 'نشط' : 'معطل'}`]
    );

    res.json({ success: true, isActive: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /expenses/categories/:id
router.delete('/expenses/categories/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { userRole, userName, userId } = getUser(req);
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'حذف التصنيفات يتطلب صلاحيات مدير النظام' });
    }

    const { id } = req.params;

    // Check historical dependencies
    const [expCnt]: any = await pool.query('SELECT COUNT(*) as cnt FROM expenses WHERE category_id = ?', [id]);
    if (Number(expCnt[0]?.cnt || 0) > 0) {
      return res.status(400).json({
        error: `لا يمكن حذف هذا التصنيف لوجود ${expCnt[0].cnt} مصروفات مسجلة عليه. يمكنك تعطيل التصنيف بدلاً من حذفه.`
      });
    }

    const [mntCnt]: any = await pool.query('SELECT COUNT(*) as cnt FROM maintenance_requests WHERE category_id = ?', [id]);
    if (Number(mntCnt[0]?.cnt || 0) > 0) {
      return res.status(400).json({
        error: `لا يمكن حذف هذا التصنيف لوجود ${mntCnt[0].cnt} طلبات صيانة مسجلة عليه. يمكنك تعطيله بدلاً من ذلك.`
      });
    }

    await pool.query('DELETE FROM expense_categories WHERE id = ?', [id]);

    await pool.query(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`aud-${Date.now()}`, userId, userName, 'DELETE_EXPENSE_CATEGORY', 'EXPENSE_CATEGORY', id, `حذف تصنيف المصروفات ${id}`]
    );

    res.json({ success: true, message: 'تم حذف التصنيف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. VENDORS & TECHNICIANS API
// ============================================================================

// GET /vendors
router.get('/vendors', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { type, activeOnly, search } = req.query;
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params: any[] = [];

    if (type && type !== 'ALL') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (activeOnly === 'true') {
      query += ' AND is_active = TRUE';
    }
    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ? OR phone LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY name ASC';
    const [rows]: any = await pool.query(query, params);

    const vendors = rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type: r.type,
      phone: r.phone,
      address: r.address,
      taxId: r.tax_id,
      notes: r.notes,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at
    }));

    res.json(vendors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /vendors
router.post('/vendors', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية إضافة موردين أو فنيين' });
    }

    const { code, name, type = 'TECHNICIAN', phone, address, taxId, notes, isActive = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم الفني أو المورد مطلوب' });
    }

    let cleanCode = code && code.trim() ? code.trim().toUpperCase() : null;
    if (!cleanCode) {
      const [cntRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM vendors');
      cleanCode = `VND-${String(Number(cntRows[0]?.cnt || 0) + 1).padStart(3, '0')}`;
    }

    // Check uniqueness
    const [existing]: any = await pool.query('SELECT id FROM vendors WHERE code = ?', [cleanCode]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'رمز المورد مسجل مسبقاً' });
    }

    const id = `vnd-${Date.now()}`;
    await pool.query(
      'INSERT INTO vendors (id, code, name, type, phone, address, tax_id, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, cleanCode, name.trim(), type, phone?.trim() || null, address?.trim() || null, taxId?.trim() || null, notes?.trim() || null, Boolean(isActive)]
    );

    await pool.query(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`aud-${Date.now()}`, userId, userName, 'CREATE_VENDOR', 'VENDOR', id, `إضافة مورد/فني جديد: ${name.trim()} (${cleanCode})`]
    );

    res.status(201).json({
      id,
      code: cleanCode,
      name: name.trim(),
      type,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      taxId: taxId?.trim() || null,
      notes: notes?.trim() || null,
      isActive: Boolean(isActive)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /vendors/:id
router.put('/vendors/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تعديل بيانات المورد' });
    }

    const { id } = req.params;
    const { name, type, phone, address, taxId, notes, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'اسم المورد/الفني مطلوب' });
    }

    await pool.query(
      'UPDATE vendors SET name = ?, type = ?, phone = ?, address = ?, tax_id = ?, notes = ?, is_active = ? WHERE id = ?',
      [name.trim(), type || 'TECHNICIAN', phone?.trim() || null, address?.trim() || null, taxId?.trim() || null, notes?.trim() || null, isActive !== undefined ? Boolean(isActive) : true, id]
    );

    await pool.query(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`aud-${Date.now()}`, userId, userName, 'UPDATE_VENDOR', 'VENDOR', id, `تعديل بيانات المورد/الفني ${name.trim()}`]
    );

    res.json({ success: true, message: 'تم تحديث بيانات المورد بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /vendors/:id
router.delete('/vendors/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { userRole, userName, userId } = getUser(req);
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'PROPERTY_MANAGER') {
      return res.status(403).json({ error: 'حذف الموردين يتطلب صلاحية إدارة النظام' });
    }

    const { id } = req.params;
    const [expRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM expenses WHERE vendor_id = ?', [id]);
    if (Number(expRows[0]?.cnt || 0) > 0) {
      return res.status(400).json({ error: 'لا يمكن حذف المورد لوجود مصروفات سابقة مسجلة لصالحه. يمكنك تعطيل حسابه بدلاً من الحذف.' });
    }

    const [mntRows]: any = await pool.query('SELECT COUNT(*) as cnt FROM maintenance_requests WHERE vendor_id = ?', [id]);
    if (Number(mntRows[0]?.cnt || 0) > 0) {
      return res.status(400).json({ error: 'لا يمكن حذف الفني/المورد لوجود طلبات صيانة مسندة إليه.' });
    }

    await pool.query('DELETE FROM vendors WHERE id = ?', [id]);

    await pool.query(
      'INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`aud-${Date.now()}`, userId, userName, 'DELETE_VENDOR', 'VENDOR', id, `حذف المورد/الفني ${id}`]
    );

    res.json({ success: true, message: 'تم حذف المورد بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. MAINTENANCE REQUESTS API
// ============================================================================

// GET /maintenance/stats
router.get('/maintenance/stats', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, dateFrom, dateTo } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (propertyId && propertyId !== 'ALL') {
      whereClause += ' AND property_id = ?';
      params.push(propertyId);
    }
    if (dateFrom) {
      whereClause += ' AND request_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClause += ' AND request_date <= ?';
      params.push(dateTo);
    }

    const [rows]: any = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'NEW' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'REVIEW' THEN 1 END) as review_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count,
        COALESCE(SUM(expected_cost), 0) as total_expected_cost,
        COALESCE(SUM(actual_cost), 0) as total_actual_cost
      FROM maintenance_requests
      ${whereClause}
    `, params);

    const r = rows[0] || {};
    res.json({
      total: Number(r.total || 0),
      newCount: Number(r.new_count || 0),
      reviewCount: Number(r.review_count || 0),
      approvedCount: Number(r.approved_count || 0),
      inProgressCount: Number(r.in_progress_count || 0),
      completedCount: Number(r.completed_count || 0),
      cancelledCount: Number(r.cancelled_count || 0),
      totalExpectedCost: Number(r.total_expected_cost || 0),
      totalActualCost: Number(r.total_actual_cost || 0),
      costDifference: Number(r.total_actual_cost || 0) - Number(r.total_expected_cost || 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /maintenance
router.get('/maintenance', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const {
      propertyId, buildingId, unitId, vendorId, status, priority,
      dateFrom, dateTo, search, page = 1, limit = 50
    } = req.query;

    let query = `
      SELECT 
        m.*,
        p.name AS live_property_name,
        b.name AS live_building_name,
        u.unit_number AS live_unit_number,
        v.name AS live_vendor_name,
        v.phone AS live_vendor_phone,
        e.expense_number AS linked_expense_number,
        e.status AS linked_expense_status
      FROM maintenance_requests m
      LEFT JOIN properties p ON m.property_id = p.id
      LEFT JOIN buildings b ON m.building_id = b.id
      LEFT JOIN units u ON m.unit_id = u.id
      LEFT JOIN vendors v ON m.vendor_id = v.id
      LEFT JOIN expenses e ON m.expense_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND m.property_id = ?';
      params.push(propertyId);
    }
    if (buildingId && buildingId !== 'ALL') {
      query += ' AND m.building_id = ?';
      params.push(buildingId);
    }
    if (unitId && unitId !== 'ALL') {
      query += ' AND m.unit_id = ?';
      params.push(unitId);
    }
    if (vendorId && vendorId !== 'ALL') {
      query += ' AND m.vendor_id = ?';
      params.push(vendorId);
    }
    if (status && status !== 'ALL') {
      query += ' AND m.status = ?';
      params.push(status);
    }
    if (priority && priority !== 'ALL') {
      query += ' AND m.priority = ?';
      params.push(priority);
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
      query += ' AND (m.maintenance_number LIKE ? OR m.requester_name LIKE ? OR m.problem_description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countQuery = `SELECT COUNT(*) AS total_count FROM (${query}) AS sub`;
    const [cntRows]: any = await pool.query(countQuery, params);
    const totalCount = Number(cntRows[0]?.total_count || 0);

    query += ' ORDER BY m.request_date DESC, m.created_at DESC';

    const pNum = Math.max(1, Number(page));
    const lNum = Math.max(1, Math.min(200, Number(limit)));
    query += ' LIMIT ? OFFSET ?';
    params.push(lNum, (pNum - 1) * lNum);

    const [rows]: any = await pool.query(query, params);

    const items = rows.map((r: any) => ({
      id: r.id,
      maintenanceNumber: r.maintenance_number,
      requestDate: r.request_date,
      propertyId: r.property_id,
      propertyName: r.live_property_name || r.property_name || 'غير محدد',
      buildingId: r.building_id,
      buildingName: r.live_building_name || r.building_name || 'غير محدد',
      unitId: r.unit_id,
      unitNumber: r.live_unit_number || r.unit_number || 'غير محدد',
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      requesterName: r.requester_name,
      requesterPhone: r.requester_phone,
      problemDescription: r.problem_description,
      priority: r.priority,
      vendorId: r.vendor_id,
      vendorName: r.live_vendor_name || r.vendor_name,
      vendorPhone: r.live_vendor_phone,
      assignedTo: r.assigned_to,
      expectedCost: Number(r.expected_cost || 0),
      actualCost: Number(r.actual_cost || 0),
      startDate: r.start_date,
      completionDate: r.completion_date,
      status: r.status,
      notes: r.notes,
      attachments: r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [],
      expenseId: r.expense_id,
      linkedExpenseNumber: r.linked_expense_number,
      linkedExpenseStatus: r.linked_expense_status,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    res.json({
      totalCount,
      page: pNum,
      limit: lNum,
      items
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /maintenance/:id
router.get('/maintenance/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const [rows]: any = await pool.query(`
      SELECT 
        m.*,
        p.name AS live_property_name,
        b.name AS live_building_name,
        u.unit_number AS live_unit_number,
        v.name AS live_vendor_name,
        v.phone AS live_vendor_phone,
        e.expense_number AS linked_expense_number,
        e.status AS linked_expense_status,
        e.amount AS linked_expense_amount
      FROM maintenance_requests m
      LEFT JOIN properties p ON m.property_id = p.id
      LEFT JOIN buildings b ON m.building_id = b.id
      LEFT JOIN units u ON m.unit_id = u.id
      LEFT JOIN vendors v ON m.vendor_id = v.id
      LEFT JOIN expenses e ON m.expense_id = e.id
      WHERE m.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'طلب الصيانة غير موجود' });
    }

    const r = rows[0];
    res.json({
      id: r.id,
      maintenanceNumber: r.maintenance_number,
      requestDate: r.request_date,
      propertyId: r.property_id,
      propertyName: r.live_property_name || r.property_name,
      buildingId: r.building_id,
      buildingName: r.live_building_name || r.building_name,
      unitId: r.unit_id,
      unitNumber: r.live_unit_number || r.unit_number,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      categoryId: r.category_id,
      categoryName: r.category_name,
      requesterName: r.requester_name,
      requesterPhone: r.requester_phone,
      problemDescription: r.problem_description,
      priority: r.priority,
      vendorId: r.vendor_id,
      vendorName: r.live_vendor_name || r.vendor_name,
      vendorPhone: r.live_vendor_phone,
      assignedTo: r.assigned_to,
      expectedCost: Number(r.expected_cost || 0),
      actualCost: Number(r.actual_cost || 0),
      startDate: r.start_date,
      completionDate: r.completion_date,
      status: r.status,
      notes: r.notes,
      attachments: r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [],
      expenseId: r.expense_id,
      linkedExpenseNumber: r.linked_expense_number,
      linkedExpenseStatus: r.linked_expense_status,
      linkedExpenseAmount: Number(r.linked_expense_amount || 0),
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /maintenance
router.post('/maintenance', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تسجيل طلبات صيانة' });
    }

    const {
      requestDate, propertyId, buildingId, unitId, tenantId, categoryId,
      requesterName, requesterPhone, problemDescription, priority = 'MEDIUM',
      vendorId, expectedCost = 0, notes, attachments
    } = req.body;

    if (!problemDescription || !problemDescription.trim()) {
      return res.status(400).json({ error: 'وصف مشكلة الصيانة مطلوب' });
    }
    if (!requesterName || !requesterName.trim()) {
      return res.status(400).json({ error: 'اسم مقدم الطلب مطلوب' });
    }

    const result = await executeTransaction(async (conn) => {
      const maintenanceNumber = await generateNextMaintenanceNumber(conn);
      const id = `mnt-${Date.now()}`;

      // Fetch related names
      let propertyName = null;
      if (propertyId) {
        const [pRows]: any = await conn.query('SELECT name FROM properties WHERE id = ?', [propertyId]);
        propertyName = pRows[0]?.name || null;
      }
      let buildingName = null;
      if (buildingId) {
        const [bRows]: any = await conn.query('SELECT name FROM buildings WHERE id = ?', [buildingId]);
        buildingName = bRows[0]?.name || null;
      }
      let unitNumber = null;
      if (unitId) {
        const [uRows]: any = await conn.query('SELECT unit_number FROM units WHERE id = ?', [unitId]);
        unitNumber = uRows[0]?.unit_number || null;
      }
      let tenantName = null;
      if (tenantId) {
        const [tRows]: any = await conn.query('SELECT name FROM tenants WHERE id = ?', [tenantId]);
        tenantName = tRows[0]?.name || null;
      }
      let categoryName = null;
      if (categoryId) {
        const [cRows]: any = await conn.query('SELECT name FROM expense_categories WHERE id = ?', [categoryId]);
        categoryName = cRows[0]?.name || null;
      }
      let vendorName = null;
      if (vendorId) {
        const [vRows]: any = await conn.query('SELECT name FROM vendors WHERE id = ?', [vendorId]);
        vendorName = vRows[0]?.name || null;
      }

      await conn.query(`
        INSERT INTO maintenance_requests 
        (id, maintenance_number, request_date, property_id, property_name, building_id, building_name,
         unit_id, unit_number, tenant_id, tenant_name, category_id, category_name, requester_name,
         requester_phone, problem_description, priority, vendor_id, vendor_name, assigned_to,
         expected_cost, actual_cost, status, notes, attachments, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'NEW', ?, ?, ?)
      `, [
        id, maintenanceNumber, requestDate || new Date().toISOString().split('T')[0],
        propertyId || null, propertyName, buildingId || null, buildingName,
        unitId || null, unitNumber, tenantId || null, tenantName,
        categoryId || null, categoryName, requesterName.trim(),
        requesterPhone?.trim() || null, problemDescription.trim(), priority,
        vendorId || null, vendorName, vendorName || null,
        Number(expectedCost || 0), notes?.trim() || null,
        attachments ? JSON.stringify(attachments) : null, userName
      ]);

      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'CREATE_MAINTENANCE', 'MAINTENANCE_REQUEST', ?, ?)
      `, [
        `aud-${Date.now()}`, userId, userName, id,
        `تسجيل طلب صيانة جديد ${maintenanceNumber}: ${problemDescription.slice(0, 60)}`
      ]);

      return { id, maintenanceNumber };
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل طلب الصيانة بنجاح',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /maintenance/:id/status
router.patch('/maintenance/:id/status', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تغيير حالة طلب الصيانة' });
    }

    const { id } = req.params;
    const { status, notes, actualCost, completionDate } = req.body;

    const allowed = ['NEW', 'REVIEW', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'حالة الصيانة المحددة غير صالحة' });
    }

    const pool = await getPool();
    const [existing]: any = await pool.query('SELECT * FROM maintenance_requests WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'طلب الصيانة غير موجود' });
    }

    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (actualCost !== undefined && !isNaN(Number(actualCost))) {
      updates.push('actual_cost = ?');
      params.push(Number(actualCost));
    }
    if (completionDate) {
      updates.push('completion_date = ?');
      params.push(completionDate);
    } else if (status === 'COMPLETED') {
      updates.push('completion_date = CURDATE()');
    }
    if (notes) {
      updates.push('notes = ?');
      params.push(notes);
    }

    params.push(id);
    await pool.query(`UPDATE maintenance_requests SET ${updates.join(', ')} WHERE id = ?`, params);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, ?, ?, 'UPDATE_MAINTENANCE_STATUS', 'MAINTENANCE_REQUEST', ?, ?)
    `, [
      `aud-${Date.now()}`, userId, userName, id,
      `تحديث حالة طلب الصيانة ${existing[0].maintenance_number} من ${existing[0].status} إلى ${status}`
    ]);

    res.json({ success: true, message: 'تم تحديث حالة طلب الصيانة بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /maintenance/:id/create-expense
router.post('/maintenance/:id/create-expense', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية إنشاء مصروف من طلب الصيانة' });
    }

    const { id } = req.params;
    const {
      amount, categoryId, paymentMethod = 'CASH', cashBoxId, description, notes
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ المحدد للمصروف غير صالح' });
    }

    const result = await executeTransaction(async (conn) => {
      const [mRows]: any = await conn.query('SELECT * FROM maintenance_requests WHERE id = ? FOR UPDATE', [id]);
      if (!mRows.length) throw new Error('طلب الصيانة غير موجود');
      const m = mRows[0];

      if (m.status === 'CANCELLED') {
        throw new Error('لا يمكن إصدار مصروف لطلب صيانة ملغى');
      }
      if (m.expense_id) {
        throw new Error('تم إصدار سند مصروف مالي مسبقاً لهذا الطلب، منع التكرار مفعل');
      }

      const expenseNumber = await generateNextExpenseNumber(conn);
      const expenseId = `exp-${Date.now()}`;

      // Default or custom category
      let catId = categoryId || m.category_id || 'cat-01';
      const [catRows]: any = await conn.query('SELECT id, name, account_code FROM expense_categories WHERE id = ?', [catId]);
      const catName = catRows[0]?.name || 'صيانة وإصلاحات';
      const accountCode = catRows[0]?.account_code || '5101';

      // Cash box info if provided
      let cashBoxName = null;
      if (cashBoxId) {
        const [boxRows]: any = await conn.query('SELECT name FROM cash_boxes WHERE id = ?', [cashBoxId]);
        cashBoxName = boxRows[0]?.name || null;
      }

      const expDesc = description || `تكاليف تنفيذ طلب صيانة رقم ${m.maintenance_number}: ${m.problem_description.slice(0, 100)}`;

      await conn.query(`
        INSERT INTO expenses 
        (id, expense_number, expense_date, category_id, category_name, account_code, description,
         amount, currency, payment_method, cash_box_id, cash_box_name, property_id, property_name,
         building_id, building_name, unit_id, unit_number, maintenance_id, vendor_id, vendor_name,
         status, approved_by, approved_at, notes, created_by)
        VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, 'YER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, NOW(), ?, ?)
      `, [
        expenseId, expenseNumber, catId, catName, accountCode, expDesc,
        numAmount, paymentMethod, cashBoxId || null, cashBoxName,
        m.property_id, m.property_name, m.building_id, m.building_name,
        m.unit_id, m.unit_number, m.id, m.vendor_id, m.vendor_name,
        userName, notes || null, userName
      ]);

      // Link to maintenance request and update actual cost
      await conn.query(`
        UPDATE maintenance_requests 
        SET expense_id = ?, actual_cost = ?, status = CASE WHEN status = 'NEW' OR status = 'REVIEW' THEN 'APPROVED' ELSE status END
        WHERE id = ?
      `, [expenseId, numAmount, m.id]);

      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'CREATE_EXPENSE_FROM_MAINTENANCE', 'EXPENSE', ?, ?)
      `, [
        `aud-${Date.now()}`, userId, userName, expenseId,
        `إنشاء سند مصروف معتمد رقم ${expenseNumber} بمبلغ ${numAmount} ر.ي لطلب الصيانة ${m.maintenance_number}`
      ]);

      return {
        expenseId,
        expenseNumber,
        amount: numAmount,
        maintenanceNumber: m.maintenance_number
      };
    });

    res.status(201).json({
      success: true,
      message: `تم إنشاء سند المصروف بنجاح (${result.expenseNumber})`,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. EXPENSES API
// ============================================================================

// GET /expenses/dashboard
router.get('/expenses/dashboard', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { propertyId, dateFrom, dateTo } = req.query;

    let whereClause = "WHERE status != 'CANCELLED' AND status != 'REVERSED'";
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      whereClause += ' AND property_id = ?';
      params.push(propertyId);
    }
    if (dateFrom) {
      whereClause += ' AND expense_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClause += ' AND expense_date <= ?';
      params.push(dateTo);
    }

    // 1. Overall stats
    const [overallRows]: any = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) as month_amount,
        COALESCE(SUM(CASE WHEN maintenance_id IS NOT NULL OR category_name LIKE '%صيانة%' THEN amount ELSE 0 END), 0) as maint_amount,
        COALESCE(SUM(CASE WHEN status = 'POSTED' THEN amount ELSE 0 END), 0) as posted_amount,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as approved_amount,
        COALESCE(SUM(CASE WHEN status = 'DRAFT' THEN amount ELSE 0 END), 0) as draft_amount
      FROM expenses
      ${whereClause}
    `, params);

    const r = overallRows[0] || {};

    // 2. By Property
    const [propRows]: any = await pool.query(`
      SELECT 
        COALESCE(property_id, 'GENERAL') as property_id,
        COALESCE(property_name, 'مصروفات عامة للمنشأة') as property_name,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expenses
      ${whereClause}
      GROUP BY property_id, property_name
      ORDER BY total_amount DESC
    `, params);

    // 3. By Category
    const [catRows]: any = await pool.query(`
      SELECT 
        category_id,
        category_name,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM expenses
      ${whereClause}
      GROUP BY category_id, category_name
      ORDER BY total_amount DESC
    `, params);

    res.json({
      totalExpenses: Number(r.total_amount || 0),
      monthExpenses: Number(r.month_amount || 0),
      maintenanceExpenses: Number(r.maint_amount || 0),
      paidPostedExpenses: Number(r.posted_amount || 0),
      approvedExpenses: Number(r.approved_amount || 0),
      draftExpenses: Number(r.draft_amount || 0),
      expensesCount: Number(r.total_count || 0),
      byProperty: propRows.map((p: any) => ({
        propertyId: p.property_id,
        propertyName: p.property_name,
        count: Number(p.count),
        amount: Number(p.total_amount)
      })),
      byCategory: catRows.map((c: any) => ({
        categoryId: c.category_id,
        categoryName: c.category_name,
        count: Number(c.count),
        amount: Number(c.total_amount)
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /expenses
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const {
      propertyId, categoryId, status, paymentMethod, cashBoxId, vendorId,
      dateFrom, dateTo, search, page = 1, limit = 50
    } = req.query;

    let query = `
      SELECT 
        e.*,
        p.name AS live_property_name,
        b.name AS live_building_name,
        u.unit_number AS live_unit_number,
        v.name AS live_vendor_name,
        m.maintenance_number,
        m.problem_description AS maintenance_problem
      FROM expenses e
      LEFT JOIN properties p ON e.property_id = p.id
      LEFT JOIN buildings b ON e.building_id = b.id
      LEFT JOIN units u ON e.unit_id = u.id
      LEFT JOIN vendors v ON e.vendor_id = v.id
      LEFT JOIN maintenance_requests m ON e.maintenance_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (propertyId && propertyId !== 'ALL') {
      query += ' AND e.property_id = ?';
      params.push(propertyId);
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
    if (cashBoxId && cashBoxId !== 'ALL') {
      query += ' AND e.cash_box_id = ?';
      params.push(cashBoxId);
    }
    if (vendorId && vendorId !== 'ALL') {
      query += ' AND e.vendor_id = ?';
      params.push(vendorId);
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
      query += ' AND (e.expense_number LIKE ? OR e.description LIKE ? OR e.vendor_name LIKE ? OR e.check_number LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const countQuery = `
      SELECT COUNT(*) AS total_count, COALESCE(SUM(amount), 0) AS total_sum 
      FROM (${query}) AS sub
    `;
    const [cntRows]: any = await pool.query(countQuery, params);
    const totalCount = Number(cntRows[0]?.total_count || 0);
    const totalAmount = Number(cntRows[0]?.total_sum || 0);

    query += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const pNum = Math.max(1, Number(page));
    const lNum = Math.max(1, Math.min(200, Number(limit)));
    query += ' LIMIT ? OFFSET ?';
    params.push(lNum, (pNum - 1) * lNum);

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
      cashBoxId: r.cash_box_id,
      cashBoxName: r.cash_box_name,
      bankName: r.bank_name,
      checkNumber: r.check_number,
      transferReference: r.transfer_reference,
      propertyId: r.property_id,
      propertyName: r.live_property_name || r.property_name || 'عام / الشركة',
      buildingId: r.building_id,
      buildingName: r.live_building_name || r.building_name,
      unitId: r.unit_id,
      unitNumber: r.live_unit_number || r.unit_number,
      maintenanceId: r.maintenance_id,
      maintenanceNumber: r.maintenance_number,
      vendorId: r.vendor_id,
      vendorName: r.live_vendor_name || r.vendor_name,
      status: r.status,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      postedBy: r.posted_by,
      postedAt: r.posted_at,
      ledgerId: r.ledger_id,
      cancelledBy: r.cancelled_by,
      cancelledAt: r.cancelled_at,
      cancellationReason: r.cancellation_reason,
      reversedBy: r.reversed_by,
      reversedAt: r.reversed_at,
      reversalReason: r.reversal_reason,
      attachments: r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [],
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    res.json({
      totalCount,
      totalAmount,
      page: pNum,
      limit: lNum,
      items
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /expenses/:id
router.get('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const [rows]: any = await pool.query(`
      SELECT 
        e.*,
        p.name AS live_property_name,
        b.name AS live_building_name,
        u.unit_number AS live_unit_number,
        v.name AS live_vendor_name,
        m.maintenance_number,
        m.problem_description AS maintenance_problem
      FROM expenses e
      LEFT JOIN properties p ON e.property_id = p.id
      LEFT JOIN buildings b ON e.building_id = b.id
      LEFT JOIN units u ON e.unit_id = u.id
      LEFT JOIN vendors v ON e.vendor_id = v.id
      LEFT JOIN maintenance_requests m ON e.maintenance_id = m.id
      WHERE e.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'المصروف غير موجود' });
    }

    const r = rows[0];
    res.json({
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
      cashBoxId: r.cash_box_id,
      cashBoxName: r.cash_box_name,
      bankName: r.bank_name,
      checkNumber: r.check_number,
      transferReference: r.transfer_reference,
      propertyId: r.property_id,
      propertyName: r.live_property_name || r.property_name || 'عام / الشركة',
      buildingId: r.building_id,
      buildingName: r.live_building_name || r.building_name,
      unitId: r.unit_id,
      unitNumber: r.live_unit_number || r.unit_number,
      maintenanceId: r.maintenance_id,
      maintenanceNumber: r.maintenance_number,
      vendorId: r.vendor_id,
      vendorName: r.live_vendor_name || r.vendor_name,
      status: r.status,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      postedBy: r.posted_by,
      postedAt: r.posted_at,
      ledgerId: r.ledger_id,
      cancelledBy: r.cancelled_by,
      cancelledAt: r.cancelled_at,
      cancellationReason: r.cancellation_reason,
      reversedBy: r.reversed_by,
      reversedAt: r.reversed_at,
      reversalReason: r.reversal_reason,
      attachments: r.attachments ? (typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments) : [],
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /expenses
router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تسجيل مصروفات جديدة' });
    }

    const {
      expenseDate, categoryId, description, amount, currency = 'YER',
      paymentMethod = 'CASH', cashBoxId, bankName, checkNumber, transferReference,
      propertyId, buildingId, unitId, vendorId, maintenanceId, notes, attachments
    } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'يجب إدخال مبلغ صحيح أكبر من الصفر' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'بيان ووصف المصروف مطلوب' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'يرجى اختيار تصنيف المصروف' });
    }

    const result = await executeTransaction(async (conn) => {
      const expenseNumber = await generateNextExpenseNumber(conn);
      const id = `exp-${Date.now()}`;

      // Category lookup
      const [catRows]: any = await conn.query('SELECT name, account_code FROM expense_categories WHERE id = ?', [categoryId]);
      if (!catRows.length) throw new Error('تصنيف المصروف المحدد غير موجود');
      const categoryName = catRows[0].name;
      const accountCode = catRows[0].account_code || '5101';

      // Lookups
      let propertyName = null;
      if (propertyId) {
        const [pRows]: any = await conn.query('SELECT name FROM properties WHERE id = ?', [propertyId]);
        propertyName = pRows[0]?.name || null;
      }
      let buildingName = null;
      if (buildingId) {
        const [bRows]: any = await conn.query('SELECT name FROM buildings WHERE id = ?', [buildingId]);
        buildingName = bRows[0]?.name || null;
      }
      let unitNumber = null;
      if (unitId) {
        const [uRows]: any = await conn.query('SELECT unit_number FROM units WHERE id = ?', [unitId]);
        unitNumber = uRows[0]?.unit_number || null;
      }
      let vendorName = null;
      if (vendorId) {
        const [vRows]: any = await conn.query('SELECT name FROM vendors WHERE id = ?', [vendorId]);
        vendorName = vRows[0]?.name || null;
      }
      let cashBoxName = null;
      if (cashBoxId) {
        const [boxRows]: any = await conn.query('SELECT name FROM cash_boxes WHERE id = ?', [cashBoxId]);
        cashBoxName = boxRows[0]?.name || null;
      }

      await conn.query(`
        INSERT INTO expenses 
        (id, expense_number, expense_date, category_id, category_name, account_code, description,
         amount, currency, payment_method, cash_box_id, cash_box_name, bank_name, check_number,
         transfer_reference, property_id, property_name, building_id, building_name, unit_id,
         unit_number, maintenance_id, vendor_id, vendor_name, status, notes, attachments, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
      `, [
        id, expenseNumber, expenseDate || new Date().toISOString().split('T')[0],
        categoryId, categoryName, accountCode, description.trim(),
        numAmount, currency, paymentMethod, cashBoxId || null, cashBoxName,
        bankName?.trim() || null, checkNumber?.trim() || null, transferReference?.trim() || null,
        propertyId || null, propertyName, buildingId || null, buildingName,
        unitId || null, unitNumber, maintenanceId || null, vendorId || null, vendorName,
        notes?.trim() || null, attachments ? JSON.stringify(attachments) : null, userName
      ]);

      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'CREATE_EXPENSE', 'EXPENSE', ?, ?)
      `, [
        `aud-${Date.now()}`, userId, userName, id,
        `إنشاء مسودة مصروف جديدة رقم ${expenseNumber} بمبلغ ${numAmount} ر.ي (${categoryName})`
      ]);

      return { id, expenseNumber };
    });

    res.status(201).json({
      success: true,
      message: 'تم حفظ مسودة المصروف بنجاح',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /expenses/:id
router.put('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية تعديل المصروف' });
    }

    const { id } = req.params;
    const {
      expenseDate, categoryId, description, amount, currency,
      paymentMethod, cashBoxId, bankName, checkNumber, transferReference,
      propertyId, buildingId, unitId, vendorId, notes
    } = req.body;

    const pool = await getPool();
    const [expRows]: any = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!expRows.length) return res.status(404).json({ error: 'المصروف غير موجود' });
    const exp = expRows[0];

    if (exp.status === 'POSTED' || exp.status === 'REVERSED') {
      return res.status(400).json({ error: 'لا يمكن تعديل المصروف بعد ترحيله مالياً، الحفاظ على النزاهة المحاسبية' });
    }

    const numAmount = amount !== undefined ? Number(amount) : Number(exp.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'المبلغ غير صالح' });
    }

    // Lookups
    let categoryName = exp.category_name;
    let accountCode = exp.account_code;
    if (categoryId && categoryId !== exp.category_id) {
      const [cRows]: any = await pool.query('SELECT name, account_code FROM expense_categories WHERE id = ?', [categoryId]);
      if (cRows.length) {
        categoryName = cRows[0].name;
        accountCode = cRows[0].account_code;
      }
    }

    let propertyName = exp.property_name;
    if (propertyId !== undefined) {
      if (propertyId) {
        const [pRows]: any = await pool.query('SELECT name FROM properties WHERE id = ?', [propertyId]);
        propertyName = pRows[0]?.name || null;
      } else {
        propertyName = null;
      }
    }

    let vendorName = exp.vendor_name;
    if (vendorId !== undefined) {
      if (vendorId) {
        const [vRows]: any = await pool.query('SELECT name FROM vendors WHERE id = ?', [vendorId]);
        vendorName = vRows[0]?.name || null;
      } else {
        vendorName = null;
      }
    }

    let cashBoxName = exp.cash_box_name;
    if (cashBoxId !== undefined) {
      if (cashBoxId) {
        const [boxRows]: any = await pool.query('SELECT name FROM cash_boxes WHERE id = ?', [cashBoxId]);
        cashBoxName = boxRows[0]?.name || null;
      } else {
        cashBoxName = null;
      }
    }

    await pool.query(`
      UPDATE expenses 
      SET expense_date = ?, category_id = ?, category_name = ?, account_code = ?,
          description = ?, amount = ?, currency = ?, payment_method = ?,
          cash_box_id = ?, cash_box_name = ?, bank_name = ?, check_number = ?,
          transfer_reference = ?, property_id = ?, property_name = ?,
          vendor_id = ?, vendor_name = ?, notes = ?
      WHERE id = ?
    `, [
      expenseDate || exp.expense_date, categoryId || exp.category_id, categoryName, accountCode,
      description !== undefined ? description.trim() : exp.description, numAmount, currency || exp.currency,
      paymentMethod || exp.payment_method, cashBoxId !== undefined ? cashBoxId : exp.cash_box_id, cashBoxName,
      bankName !== undefined ? bankName : exp.bank_name, checkNumber !== undefined ? checkNumber : exp.check_number,
      transferReference !== undefined ? transferReference : exp.transfer_reference,
      propertyId !== undefined ? propertyId : exp.property_id, propertyName,
      vendorId !== undefined ? vendorId : exp.vendor_id, vendorName, notes !== undefined ? notes : exp.notes,
      id
    ]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, ?, ?, 'UPDATE_EXPENSE', 'EXPENSE', ?, ?)
    `, [
      `aud-${Date.now()}`, userId, userName, id,
      `تعديل بيانات المصروف ${exp.expense_number}`
    ]);

    res.json({ success: true, message: 'تم تحديث المصروف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /expenses/:id (DRAFT ONLY)
router.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية حذف المصروف' });
    }

    const { id } = req.params;
    const pool = await getPool();
    const [expRows]: any = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!expRows.length) return res.status(404).json({ error: 'المصروف غير موجود' });
    const exp = expRows[0];

    if (exp.status !== 'DRAFT') {
      return res.status(400).json({
        error: `لا يمكن الحذف الفعلي لمصروف حالته (${exp.status}). يسمح بحذف المسودات فقط. يمكنك استخدام إجراء الإلغاء بدلاً من ذلك.`
      });
    }

    await pool.query('DELETE FROM expenses WHERE id = ?', [id]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, ?, ?, 'DELETE_EXPENSE', 'EXPENSE', ?, ?)
    `, [
      `aud-${Date.now()}`, userId, userName, id,
      `حذف مسودة المصروف ${exp.expense_number} بمبلغ ${exp.amount} ر.ي`
    ]);

    res.json({ success: true, message: 'تم حذف مسودة المصروف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /expenses/:id/approve
router.post('/expenses/:id/approve', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY' || userRole === 'CASHIER' || userRole === 'COLLECTOR') {
      return res.status(403).json({ error: 'اعتماد المصروفات يتطلب صلاحية مدير أو محاسب' });
    }

    const { id } = req.params;
    const pool = await getPool();
    const [expRows]: any = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!expRows.length) return res.status(404).json({ error: 'المصروف غير موجود' });
    const exp = expRows[0];

    if (exp.status === 'POSTED') {
      return res.status(400).json({ error: 'المصروف مرحل مسبقاً' });
    }
    if (exp.status === 'CANCELLED' || exp.status === 'REVERSED') {
      return res.status(400).json({ error: 'لا يمكن اعتماد مصروف ملغى أو معكوس' });
    }

    await pool.query(
      'UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['APPROVED', userName, id]
    );

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, ?, ?, 'APPROVE_EXPENSE', 'EXPENSE', ?, ?)
    `, [
      `aud-${Date.now()}`, userId, userName, id,
      `اعتماد المصروف ${exp.expense_number} بمبلغ ${exp.amount} ر.ي`
    ]);

    res.json({ success: true, message: 'تم اعتماد المصروف بنجاح وأصبح جاهزاً للترحيل المالي' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /expenses/:id/post (ATOMIC FINANCIAL POSTING)
router.post('/expenses/:id/post', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY' || userRole === 'COLLECTOR') {
      return res.status(403).json({ error: 'الترحيل المالي يتطلب صلاحية محاسب أو مدير نظام' });
    }

    const { id } = req.params;
    const { cashBoxId } = req.body;

    const result = await executeTransaction(async (conn) => {
      // 1. Lock expense row
      const [expRows]: any = await conn.query('SELECT * FROM expenses WHERE id = ? FOR UPDATE', [id]);
      if (!expRows.length) throw new Error('المصروف غير موجود');
      const exp = expRows[0];

      // 2. Strict status check to prevent duplicate posting
      if (exp.status === 'POSTED') {
        throw new Error('هذا المصروف مرحل بالفعل بدفتر الأستاذ العام');
      }
      if (exp.status === 'CANCELLED') {
        throw new Error('لا يمكن ترحيل مصروف ملغى');
      }
      if (exp.status === 'REVERSED') {
        throw new Error('لا يمكن ترحيل قيد مصروف معكوس');
      }
      if (exp.status !== 'APPROVED') {
        throw new Error('لا يمكن ترحيل المصروف مباشرة، يجب اعتماد المصروف أولاً قبل الترحيل المالي.');
      }

      const amount = Number(exp.amount);
      let activeBoxId = cashBoxId || exp.cash_box_id;

      // Auto-assign default active cash box if payment is cash and none was pre-selected
      if (exp.payment_method === 'CASH' && !activeBoxId) {
        const [defBoxRows]: any = await conn.query("SELECT id, name, current_balance FROM cash_boxes WHERE status = 'ACTIVE' LIMIT 1");
        if (defBoxRows.length > 0) {
          activeBoxId = defBoxRows[0].id;
        }
      }

      // 3. Deduct from Cash Box if Cash payment
      let boxName = exp.cash_box_name;
      if (exp.payment_method === 'CASH' && activeBoxId) {
        const [boxRows]: any = await conn.query('SELECT * FROM cash_boxes WHERE id = ? FOR UPDATE', [activeBoxId]);
        if (!boxRows.length) {
          throw new Error('الصندوق الخزني المحدد غير موجود');
        }
        const box = boxRows[0];
        boxName = box.name;
        if (Number(box.current_balance) < amount) {
          throw new Error(`رصيد الصندوق (${box.name}) الحالي هو ${Number(box.current_balance).toLocaleString()} ر.ي وهو غير كافٍ لصرف هذا المصروف (${amount.toLocaleString()} ر.ي)`);
        }

        await conn.query('UPDATE cash_boxes SET current_balance = current_balance - ? WHERE id = ?', [amount, activeBoxId]);
      }

      // 4. Create General Ledger entry in tenant_ledger
      const ledgerId = `ledg-exp-${exp.id}`;
      const desc = `صرف مصروف ${exp.category_name} - ${exp.description}`;

      await conn.query(`
        INSERT INTO tenant_ledger 
        (id, tenant_id, date, reference, account_type, debit, credit, balance_after,
         description, user_id, property_id, property_name, unit_id, unit_number,
         source_module, status)
        VALUES (?, NULL, ?, ?, 'EXPENSE', ?, 0.00, 0.00, ?, ?, ?, ?, ?, ?, 'EXPENSES', 'POSTED')
      `, [
        ledgerId, exp.expense_date, exp.expense_number,
        amount, desc, userId,
        exp.property_id || null, exp.property_name || null,
        exp.unit_id || null, exp.unit_number || null
      ]);

      // 5. Update Expense to POSTED
      await conn.query(`
        UPDATE expenses 
        SET status = 'POSTED', posted_by = ?, posted_at = NOW(), ledger_id = ?,
            cash_box_id = COALESCE(?, cash_box_id), cash_box_name = COALESCE(?, cash_box_name)
        WHERE id = ?
      `, [userName, ledgerId, activeBoxId || null, boxName || null, exp.id]);

      // 6. If linked to maintenance request, complete it
      if (exp.maintenance_id) {
        await conn.query(`
          UPDATE maintenance_requests 
          SET status = 'COMPLETED', completion_date = COALESCE(completion_date, CURDATE())
          WHERE id = ?
        `, [exp.maintenance_id]);
      }

      // 7. Write Audit Log
      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'POST_EXPENSE', 'EXPENSE', ?, ?)
      `, [
        `aud-${Date.now()}`, userId, userName, exp.id,
        `ترحيل مالي رسمي لمصروف رقم ${exp.expense_number} بمبلغ ${amount} ر.ي إلى دفتر الأستاذ العام (قيد مدين: ${ledgerId})`
      ]);

      return {
        expenseNumber: exp.expense_number,
        amount,
        ledgerId,
        postedBy: userName,
        postedAt: new Date().toISOString()
      };
    });

    res.json({
      success: true,
      message: `تم الترحيل المالي للمصروف بنجاح (${result.expenseNumber}) والتأثير في دفتر الأستاذ والصناديق`,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /expenses/:id/cancel
router.post('/expenses/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole === 'READ_ONLY') {
      return res.status(403).json({ error: 'ليس لديك صلاحية إلغاء المصروف' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'سبب الإلغاء مطلوب' });
    }

    const pool = await getPool();
    const [expRows]: any = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!expRows.length) return res.status(404).json({ error: 'المصروف غير موجود' });
    const exp = expRows[0];

    if (exp.status === 'POSTED') {
      return res.status(400).json({
        error: 'المصروف مرحل مالياً بدفتر الأستاذ. يجب استخدام إجراء (عكس القيد الدفتري - Reverse) لإلغاء أثره المالي بنزاهة محاسبية.'
      });
    }
    if (exp.status === 'CANCELLED') {
      return res.status(400).json({ error: 'المصروف ملغى مسبقاً' });
    }

    await pool.query(`
      UPDATE expenses 
      SET status = 'CANCELLED', cancelled_by = ?, cancelled_at = NOW(), cancellation_reason = ?
      WHERE id = ?
    `, [userName, reason.trim(), id]);

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
      VALUES (?, ?, ?, 'CANCEL_EXPENSE', 'EXPENSE', ?, ?)
    `, [
      `aud-${Date.now()}`, userId, userName, id,
      `إلغاء سند المصروف ${exp.expense_number} - السبب: ${reason.trim()}`
    ]);

    res.json({ success: true, message: 'تم إلغاء المصروف بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /expenses/:id/reverse (REVERSE FINANCIAL POSTING)
router.post('/expenses/:id/reverse', async (req: Request, res: Response) => {
  try {
    const { userRole, userName, userId } = getUser(req);
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'PROPERTY_MANAGER' && userRole !== 'ACCOUNTANT') {
      return res.status(403).json({ error: 'عكس القيود المالية يتطلب صلاحية محاسب أو مدير نظام' });
    }

    const { id } = req.params;
    const { reversalReason } = req.body;
    if (!reversalReason || !reversalReason.trim()) {
      return res.status(400).json({ error: 'يرجى كتابة سبب عكس قيد المصروف' });
    }

    const result = await executeTransaction(async (conn) => {
      // 1. Lock row
      const [expRows]: any = await conn.query('SELECT * FROM expenses WHERE id = ? FOR UPDATE', [id]);
      if (!expRows.length) throw new Error('المصروف غير موجود');
      const exp = expRows[0];

      // 2. Strict status check to prevent duplicate reversals
      if (exp.status === 'REVERSED') {
        throw new Error('تم عكس قيد هذا المصروف مسبقاً، منع التكرار مفعل');
      }
      if (exp.status !== 'POSTED') {
        throw new Error('يمكن عكس القيود المرحلة فقط (POSTED)');
      }

      const amount = Number(exp.amount);

      // 3. Revert Cash Box if Cash payment
      if (exp.payment_method === 'CASH' && exp.cash_box_id) {
        await conn.query('UPDATE cash_boxes SET current_balance = current_balance + ? WHERE id = ?', [amount, exp.cash_box_id]);
      }

      // 4. Generate Reversal entry in tenant_ledger (Credit to cancel the previous Debit)
      const revLedgerId = `ledg-rev-exp-${Date.now()}`;
      await conn.query(`
        INSERT INTO tenant_ledger 
        (id, tenant_id, date, reference, account_type, debit, credit, balance_after,
         description, user_id, property_id, property_name, unit_id, unit_number,
         source_module, status, reversal_of)
        VALUES (?, NULL, CURDATE(), ?, 'EXPENSE', 0.00, ?, 0.00, ?, ?, ?, ?, ?, ?, 'REVERSAL', 'POSTED', ?)
      `, [
        revLedgerId, `REV-${exp.expense_number}`, amount,
        `عكس قيد صرف مصروف ${exp.expense_number} (${exp.category_name}) - سبب: ${reversalReason.trim()}`,
        userId, exp.property_id || null, exp.property_name || null,
        exp.unit_id || null, exp.unit_number || null, exp.expense_number
      ]);

      // 5. Update Expense row
      await conn.query(`
        UPDATE expenses 
        SET status = 'REVERSED', reversed_by = ?, reversed_at = NOW(),
            reversal_reason = ?, reversal_ledger_id = ?
        WHERE id = ?
      `, [userName, reversalReason.trim(), revLedgerId, exp.id]);

      // 6. Audit Log
      await conn.query(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details)
        VALUES (?, ?, ?, 'REVERSE_EXPENSE', 'EXPENSE', ?, ?)
      `, [
        `aud-${Date.now()}`, userId, userName, exp.id,
        `عكس قيد ترحيل مصروف رقم ${exp.expense_number} بمبلغ ${amount} ر.ي دفترياً. السبب: ${reversalReason.trim()}`
      ]);

      return {
        expenseNumber: exp.expense_number,
        reversalReference: `REV-${exp.expense_number}`,
        revLedgerId
      };
    });

    res.json({
      success: true,
      message: `تم عكس قيد المصروف دفترياً وإلغاء أثره المالي بنجاح (${result.reversalReference})`,
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
