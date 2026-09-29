import { getPool } from './db';
import { 
  INITIAL_PROPERTIES, 
  INITIAL_UNITS, 
  INITIAL_TENANTS, 
  INITIAL_CONTRACTS, 
  INITIAL_INVOICES, 
  INITIAL_PAYMENTS,
  INITIAL_WATER_COST,
  INITIAL_ELECTRICITY_READING
} from '../src/data/initialData';

export async function seedDatabaseIfEmpty() {
  const pool = await getPool();

  // Check if maintenance requests table is empty and seed initial operational records
  const [mntCountRows]: any = await pool.query('SELECT COUNT(*) AS cnt FROM maintenance_requests').catch(() => [[{ cnt: 0 }]]);
  if (mntCountRows[0]?.cnt === 0) {
    // 1. Maintenance request 1 (Completed with linked expense)
    await pool.query(
      `INSERT INTO maintenance_requests 
      (id, maintenance_number, request_date, property_id, property_name, building_id, building_name, unit_id, unit_number, category_id, category_name, requester_name, requester_phone, problem_description, priority, vendor_id, vendor_name, expected_cost, actual_cost, start_date, completion_date, status, notes, expense_id, created_by)
      VALUES 
      ('mnt-01', 'MNT-2026-000001', '2026-08-15', 'prop-01', 'عمارة الأمل السكنية', 'bld-prop-01', 'المبنى الرئيسي - عمارة الأمل', 'unit-02', '102', 'cat-01', 'صيانة وإصلاحات', 'م. فؤاد المعلمي', '771234567', 'تسريب مياه في خط التغذية الرئيسي للحمام مع تلف محبس الأمان وضغط المضخة', 'HIGH', 'vnd-01', 'مؤسسة النجم للسباكة ومضخات المياه', 30000.00, 26500.00, '2026-08-15', '2026-08-16', 'COMPLETED', 'تم استبدال المحبس الإيطالي وتثبيت الأنابيب بنجاح والتجربة ممتازة', 'exp-01', 'م. أحمد الوهاس')`
    );

    // 2. Maintenance request 2 (In progress, urgent)
    await pool.query(
      `INSERT INTO maintenance_requests 
      (id, maintenance_number, request_date, property_id, property_name, building_id, building_name, unit_id, unit_number, category_id, category_name, requester_name, requester_phone, problem_description, priority, vendor_id, vendor_name, expected_cost, actual_cost, start_date, completion_date, status, notes, expense_id, created_by)
      VALUES 
      ('mnt-02', 'MNT-2026-000002', '2026-08-26', 'prop-02', 'برج الصالح التجاري', 'bld-prop-02', 'المبنى الرئيسي - برج الصالح', NULL, NULL, 'cat-02', 'كهرباء وإنارة', 'حارس المجمع / نجيب', '777654321', 'فصل متكرر في القاطع الكهربائي الرئيسي للسلالم ولوحة المضخات مع تصاعد حرارة', 'URGENT', 'vnd-02', 'المهندس خلدون للكهرباء والتبريد', 45000.00, 0.00, '2026-08-27', NULL, 'IN_PROGRESS', 'جاري فحص الأحمال والكابلات وتوريد قاطع 100 أمبير أصلي', NULL, 'م. أحمد الوهاس')`
    );

    // 3. Sample Posted Expense (Linked to mnt-01)
    await pool.query(
      `INSERT INTO expenses 
      (id, expense_number, expense_date, category_id, category_name, account_code, description, amount, currency, payment_method, cash_box_id, cash_box_name, property_id, property_name, building_id, building_name, unit_id, unit_number, maintenance_id, vendor_id, vendor_name, status, approved_by, approved_at, posted_by, posted_at, ledger_id, created_by)
      VALUES 
      ('exp-01', 'EXP-2026-000001', '2026-08-16', 'cat-01', 'صيانة وإصلاحات', '5101', 'صرف تكلفة صيانة شبكة السباكة وتغيير محابس وحدة 102 - عمارة الأمل (MNT-2026-000001)', 26500.00, 'YER', 'CASH', 'cb-01', 'صندوق الإدارة الرئيسي', 'prop-01', 'عمارة الأمل السكنية', 'bld-prop-01', 'المبنى الرئيسي - عمارة الأمل', 'unit-02', '102', 'mnt-01', 'vnd-01', 'مؤسسة النجم للسباكة ومضخات المياه', 'POSTED', 'م. أحمد الوهاس', '2026-08-16 11:00:00', 'م. أحمد الوهاس', '2026-08-16 11:30:00', 'ledg-exp-01', 'م. أحمد الوهاس')`
    );

    // Update cash box balance for exp-01
    await pool.query('UPDATE cash_boxes SET current_balance = current_balance - 26500.00 WHERE id = "cb-01"').catch(() => {});

    // General ledger entry for exp-01
    await pool.query(
      `INSERT IGNORE INTO tenant_ledger 
      (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id, property_id, property_name, unit_id, unit_number, source_module, status)
      VALUES 
      ('ledg-exp-01', NULL, '2026-08-16', 'EXP-2026-000001', 'EXPENSE', 26500.00, 0.00, 0.00, 'صرف مصروف صيانة وإصلاحات شبكة سباكة وحدة 102 - عمارة الأمل', 'usr-1', 'prop-01', 'عمارة الأمل السكنية', 'unit-02', '102', 'EXPENSES', 'POSTED')`
    ).catch(() => {});

    // 4. Sample Approved Expense (Monthly cleaning services for prop-03)
    await pool.query(
      `INSERT INTO expenses 
      (id, expense_number, expense_date, category_id, category_name, account_code, description, amount, currency, payment_method, cash_box_id, cash_box_name, property_id, property_name, building_id, building_name, unit_id, unit_number, maintenance_id, vendor_id, vendor_name, status, approved_by, approved_at, created_by)
      VALUES 
      ('exp-02', 'EXP-2026-000002', '2026-08-25', 'cat-04', 'نظافة وخدمات بيئية', '5103', 'مستحقات عمال النظافة وأدوات التعقيم والتنظيف الشامل لشهر أغسطس - مجمع النور', 35000.00, 'YER', 'CASH', 'cb-01', 'صندوق الإدارة الرئيسي', 'prop-03', 'مجمع النور السكني التجاري', NULL, NULL, NULL, NULL, NULL, NULL, 'عمال النظافة الميدانيين', 'APPROVED', 'م. أحمد الوهاس', '2026-08-25 14:00:00', 'م. أحمد الوهاس')`
    );
  }

  // Check if properties table is empty
  const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM properties');
  if (rows[0].count > 0) {
    console.log('MySQL tables already populated with data.');
    return;
  }

  console.log('Seeding real initial data into MySQL...');

  // 1. Properties
  for (const p of INITIAL_PROPERTIES) {
    await pool.query(
      `INSERT IGNORE INTO properties 
      (id, code, name, type, city, district, street, owner_name, owner_phone, total_units, occupied_units, vacant_units, monthly_expected_rent, total_outstanding_rent) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, p.code, p.name, p.type, p.city, p.district, p.street,
        p.ownerName, p.ownerPhone, p.totalUnits, p.occupiedUnits, p.vacantUnits,
        p.monthlyExpectedRent, p.totalOutstandingRent
      ]
    );

    // Seed default building for property
    await pool.query(
      `INSERT IGNORE INTO buildings (id, property_id, code, name, total_floors, status)
       VALUES (?, ?, ?, ?, 4, 'ACTIVE')`,
      [`bld-${p.id}`, p.id, `${p.code}-B1`, `المبنى الرئيسي - ${p.name}`]
    );
  }

  // 2. Units
  for (const u of INITIAL_UNITS) {
    await pool.query(
      `INSERT IGNORE INTO units 
      (id, property_id, building_id, building_name, floor_number, unit_number, type, area_sqm, status, price_per_cycle, electricity_meter_number, water_meter_or_share, current_tenant_id, current_tenant_name, current_contract_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id, u.propertyId, `bld-${u.propertyId}`, u.buildingName, u.floorNumber,
        u.unitNumber, u.type, u.areaSqm, u.status, u.pricePerCycle,
        u.electricityMeterNumber || null, u.waterMeterOrShare,
        u.currentTenantId || null, u.currentTenantName || null, u.currentContractId || null
      ]
    );
  }

  // 3. Tenants
  for (const t of INITIAL_TENANTS) {
    await pool.query(
      `INSERT IGNORE INTO tenants 
      (id, tenant_code, name, type, national_id, phone, email, current_balance, rent_balance, water_balance, electricity_balance, deposit_balance) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, 0.00, 0.00)`,
      [
        t.id, t.tenantCode, t.name, t.type, t.nationalId, t.phone, t.email || null,
        t.currentBalance, t.currentBalance
      ]
    );

    // Initial ledger balance for tenant
    if (t.currentBalance > 0) {
      await pool.query(
        `INSERT IGNORE INTO tenant_ledger 
        (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id) 
        VALUES (?, ?, '2026-08-01', 'OB-2026-08', 'RENT', ?, 0.00, ?, 'رصيد مرحل سابق', 'usr-001')`,
        [`ledg-ob-${t.id}`, t.id, t.currentBalance, t.currentBalance]
      );
    }
  }

  // 4. Contracts
  for (const c of INITIAL_CONTRACTS) {
    await pool.query(
      `INSERT IGNORE INTO contracts 
      (id, contract_number, tenant_id, tenant_name, property_id, property_name, unit_id, unit_number, start_date, end_date, rent_amount, payment_cycle, deposit_amount, guarantee_person_name, guarantee_person_phone, notice_period_days, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id, c.contractNumber, c.tenantId, c.tenantName, c.propertyId, c.propertyName,
        c.unitId, c.unitNumber, c.startDate, c.endDate, c.rentAmount, c.paymentCycle,
        c.depositAmount, c.guaranteePersonName || null, c.guaranteePersonPhone || null,
        c.noticePeriodDays, c.status
      ]
    );

    // Create deposit record if deposit exists
    if (c.depositAmount > 0) {
      await pool.query(
        `INSERT IGNORE INTO deposits 
        (id, tenant_id, contract_id, unit_id, deposit_amount, status, received_date, guarantor_name, guarantor_phone, notes) 
        VALUES (?, ?, ?, ?, ?, 'HELD', ?, ?, ?, 'ضمان مالي معزول للعقد')`,
        [
          `dep-${c.id}`, c.tenantId, c.id, c.unitId, c.depositAmount,
          c.startDate, c.guaranteePersonName || null, c.guaranteePersonPhone || null
        ]
      );
    }
  }

  // 5. Invoices
  for (const inv of INITIAL_INVOICES) {
    await pool.query(
      `INSERT IGNORE INTO invoices 
      (id, invoice_number, tenant_id, tenant_name, contract_id, property_id, property_name, unit_id, unit_number, account_type, period_month, total_amount, paid_amount, remaining_amount, issue_date, due_date, status, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inv.id, inv.invoiceNumber, inv.tenantId, inv.tenantName, null,
        inv.propertyId, inv.propertyName, inv.unitId, inv.unitNumber, inv.type,
        inv.period, inv.totalAmount, inv.paidAmount, inv.remainingAmount,
        inv.issueDate, inv.dueDate, inv.status, null
      ]
    );
  }

  // 6. Payments
  for (const pay of INITIAL_PAYMENTS) {
    await pool.query(
      `INSERT IGNORE INTO payments 
      (id, receipt_number, invoice_id, tenant_id, tenant_name, unit_number, property_name, account_type, amount_paid, payment_method, collector_id, collector_name, collected_at, notes, qr_code_content) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pay.id, pay.receiptNumber, pay.invoiceId, pay.tenantId, pay.tenantName,
        pay.unitNumber, pay.propertyName, pay.accountType, pay.amountPaid,
        pay.paymentMethod, pay.collectorId, pay.collectorName, pay.date,
        pay.notes || null, pay.qrVerificationUrl || null
      ]
    );

    // Add ledger credit entry
    await pool.query(
      `INSERT IGNORE INTO tenant_ledger 
      (id, tenant_id, date, reference, account_type, debit, credit, balance_after, description, user_id) 
      VALUES (?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, ?)`,
      [
        `ledg-${pay.id}`, pay.tenantId, pay.date.split(' ')[0] || '2026-08-30',
        pay.receiptNumber, pay.accountType, pay.amountPaid,
        `سداد ${pay.accountType === 'RENT' ? 'إيجار' : 'خدمات'} بموجب سند ${pay.receiptNumber}`,
        pay.collectorId
      ]
    );
  }

  // 7. Water Operating Costs
  await pool.query(
    `INSERT IGNORE INTO water_costs 
    (id, property_id, property_name, period_month, tanker_count, tanker_unit_price, total_tanker_cost, pump_electricity_cost, sewer_cost, tank_maintenance_cost, cleaning_cost, labor_cost, other_fees, net_total_operating_cost, distribution_method, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      INITIAL_WATER_COST.id, INITIAL_WATER_COST.propertyId, INITIAL_WATER_COST.propertyName,
      INITIAL_WATER_COST.period, INITIAL_WATER_COST.tankerCount, INITIAL_WATER_COST.tankerUnitPrice,
      INITIAL_WATER_COST.totalTankersCost, INITIAL_WATER_COST.pumpElectricityCost,
      INITIAL_WATER_COST.sewerCost, INITIAL_WATER_COST.tankMaintenanceCost,
      INITIAL_WATER_COST.tankCleaningCost, INITIAL_WATER_COST.laborWages,
      INITIAL_WATER_COST.operatingFees, INITIAL_WATER_COST.totalWaterCost,
      INITIAL_WATER_COST.distributionMethod, INITIAL_WATER_COST.status
    ]
  );

  // 8. Electricity Rates
  await pool.query(
    `INSERT IGNORE INTO electricity_rates 
    (id, property_id, rate_per_kwh, effective_from, notes) 
    VALUES ('rate-01', 'prop-01', 300.00, '2026-01-01', 'التعريفة الرسمية المقرة')`
  );

  // 9. Electricity Reading
  await pool.query(
    `INSERT IGNORE INTO electricity_readings 
    (id, unit_id, unit_number, meter_number, reading_period_month, previous_reading, current_reading, consumption_kwh, rate_per_kwh, total_amount, reading_date, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      INITIAL_ELECTRICITY_READING.id, INITIAL_ELECTRICITY_READING.unitId,
      INITIAL_ELECTRICITY_READING.unitNumber, INITIAL_ELECTRICITY_READING.meterNumber,
      INITIAL_ELECTRICITY_READING.period, INITIAL_ELECTRICITY_READING.previousReading,
      INITIAL_ELECTRICITY_READING.currentReading, INITIAL_ELECTRICITY_READING.consumption,
      INITIAL_ELECTRICITY_READING.ratePerKWh, INITIAL_ELECTRICITY_READING.totalAmount,
      INITIAL_ELECTRICITY_READING.readingDate, 'BILLED'
    ]
  );

  console.log('Seeding completed successfully into MySQL!');
}
