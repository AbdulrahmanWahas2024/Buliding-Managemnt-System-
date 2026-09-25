import mysql from 'mysql2/promise';
import { exec, execSync, spawn } from 'child_process';
import net from 'net';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'smart_property_erp';

let pool: mysql.Pool | null = null;
let isInitialized = false;

// Direct TCP port check - fast, reliable, zero-dependency, ignores password errors
export function isPortOpen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Ensure local MySQL daemon is running and users/databases are properly provisioned
export async function ensureMySQLRunning(): Promise<boolean> {
  const isOpen = await isPortOpen(DB_PORT, DB_HOST);
  if (isOpen) {
    provisionLocalUsers();
    return true;
  }

  // Only attempt to start daemon if target is local
  if (DB_HOST !== '127.0.0.1' && DB_HOST !== 'localhost') {
    console.warn(`Remote MySQL host ${DB_HOST}:${DB_PORT} is not currently reachable.`);
    return false;
  }

  console.log('Ensuring MariaDB/MySQL is installed and daemon running in container...');
  try {
    // If neither mariadbd nor mysqld binary exists, install mariadb-server
    const hasBinary = fs.existsSync('/usr/sbin/mariadbd') || fs.existsSync('/usr/sbin/mysqld');
    if (!hasBinary) {
      console.log('Installing MariaDB packages via apt-get...');
      execSync('DEBIAN_FRONTEND=noninteractive apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server mariadb-client');
    }

    execSync('mkdir -p /run/mysqld /var/lib/mysql && chown -R mysql:mysql /run/mysqld /var/lib/mysql 2>/dev/null || true');
    // Ensure initial system tables exist
    execSync('[ ! -d /var/lib/mysql/mysql ] && (mariadb-install-db --user=mysql --datadir=/var/lib/mysql 2>/dev/null || mysql_install_db --user=mysql --datadir=/var/lib/mysql 2>/dev/null || true)');
    
    // Start daemon in background as detached process
    const binary = fs.existsSync('/usr/sbin/mariadbd') ? '/usr/sbin/mariadbd' : '/usr/sbin/mysqld';
    const child = spawn(binary, ['--user=mysql', '--bind-address=0.0.0.0', '--port=3306'], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    // Wait up to 10 seconds for port to open
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await isPortOpen(DB_PORT, DB_HOST)) {
        console.log('MySQL/MariaDB daemon successfully started and accepting connections.');
        provisionLocalUsers();
        return true;
      }
    }
  } catch (err: any) {
    console.error('Failed to spawn MySQL/MariaDB daemon:', err.message);
  }

  console.warn('MySQL/MariaDB start attempt completed, checking status...');
  const finalCheck = await isPortOpen(DB_PORT, DB_HOST);
  if (finalCheck) {
    provisionLocalUsers();
  }
  return finalCheck;
}

function provisionLocalUsers() {
  if (DB_HOST === '127.0.0.1' || DB_HOST === 'localhost') {
    try {
      const pass = DB_PASSWORD || '123456';
      
      const sqlCommands = [
        `FLUSH PRIVILEGES;`,
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
        `CREATE DATABASE IF NOT EXISTS \`smart_property_erp\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
        `ALTER USER 'root'@'localhost' IDENTIFIED BY '${pass}';`,
        `GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;`,
        `CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '${pass}';`,
        `ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY '${pass}';`,
        `GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;`,
        `CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '${pass}';`,
        `ALTER USER 'root'@'%' IDENTIFIED BY '${pass}';`,
        `GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;`,
        `FLUSH PRIVILEGES;`
      ].join('\n');

      const tmpSqlPath = '/tmp/provision_mysql_users.sql';
      fs.writeFileSync(tmpSqlPath, sqlCommands, 'utf8');
      
      // Execute via file redirect
      execSync(`mariadb -u root -p'${pass}' < ${tmpSqlPath} 2>/dev/null || mariadb < ${tmpSqlPath} 2>/dev/null || mysql -u root -p'${pass}' < ${tmpSqlPath} 2>/dev/null || mysql < ${tmpSqlPath} 2>/dev/null || true`);
      try { fs.unlinkSync(tmpSqlPath); } catch {}
    } catch {
      // Ignore if provision command fails
    }
  }
}

export async function getPool(): Promise<mysql.Pool> {
  if (pool) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return pool;
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn('Re-establishing MySQL connection pool after connection error:', err.message);
        pool = null;
      }
    }
  }

  await ensureMySQLRunning();

  // Ensure target database exists
  let workingPassword = DB_PASSWORD;
  try {
    const adminConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: workingPassword,
    });
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await adminConn.end();
  } catch (err: any) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      try {
        const altConn = await mysql.createConnection({
          host: DB_HOST,
          port: DB_PORT,
          user: DB_USER,
          password: '',
        });
        await altConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await altConn.end();
        workingPassword = '';
      } catch {
        provisionLocalUsers();
      }
    }
  }

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: workingPassword,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: true,
  });

  return pool;
}

export async function initDatabaseSchema() {
  if (isInitialized) return;
  const p = await getPool();

  console.log('Initializing MySQL Tables in InnoDB utf8mb4...');

  // 1. Users & RBAC
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Properties
  await p.query(`
    CREATE TABLE IF NOT EXISTS properties (
      id VARCHAR(50) PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      type VARCHAR(50) NOT NULL,
      ownership_type VARCHAR(50) NOT NULL DEFAULT 'SOLE',
      city VARCHAR(100) NOT NULL,
      district VARCHAR(100) NOT NULL,
      street VARCHAR(150) NOT NULL,
      owner_name VARCHAR(100) NOT NULL,
      owner_phone VARCHAR(50) NOT NULL,
      total_units INT NOT NULL DEFAULT 0,
      occupied_units INT NOT NULL DEFAULT 0,
      vacant_units INT NOT NULL DEFAULT 0,
      monthly_expected_rent DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      total_outstanding_rent DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      total_area_sqm DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure missing columns exist in existing properties table
  await p.query(`
    ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(50) NOT NULL DEFAULT 'SOLE',
      ADD COLUMN IF NOT EXISTS total_area_sqm DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS description TEXT NULL,
      ADD COLUMN IF NOT EXISTS notes TEXT NULL;
  `).catch(() => {});

  // 3. Buildings
  await p.query(`
    CREATE TABLE IF NOT EXISTS buildings (
      id VARCHAR(50) PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      code VARCHAR(50),
      name VARCHAR(100) NOT NULL,
      total_floors INT NOT NULL DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prop (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    ALTER TABLE buildings 
      ADD COLUMN IF NOT EXISTS code VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS description TEXT NULL,
      ADD COLUMN IF NOT EXISTS notes TEXT NULL;
  `).catch(() => {});

  // 4. Units
  await p.query(`
    CREATE TABLE IF NOT EXISTS units (
      id VARCHAR(50) PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      building_id VARCHAR(50),
      building_name VARCHAR(100),
      floor_number INT NOT NULL DEFAULT 0,
      floor_name VARCHAR(100),
      unit_code VARCHAR(50),
      unit_number VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      area_sqm DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'VACANT',
      price_per_cycle DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      electricity_meter_number VARCHAR(100),
      water_meter_or_share VARCHAR(150),
      owner_name VARCHAR(150),
      current_tenant_id VARCHAR(50),
      current_tenant_name VARCHAR(150),
      current_contract_id VARCHAR(50),
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_property (property_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    ALTER TABLE units
      ADD COLUMN IF NOT EXISTS unit_code VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS floor_name VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS owner_name VARCHAR(150) NULL,
      ADD COLUMN IF NOT EXISTS description TEXT NULL,
      ADD COLUMN IF NOT EXISTS notes TEXT NULL;
  `).catch(() => {});

  // 5. Tenants
  await p.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id VARCHAR(50) PRIMARY KEY,
      tenant_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',
      national_id VARCHAR(50) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      secondary_phone VARCHAR(50),
      email VARCHAR(100),
      address VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      commercial_record VARCHAR(100),
      notes TEXT,
      current_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      rent_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      water_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      electricity_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      deposit_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_code (tenant_code),
      INDEX idx_national (national_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS address VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS commercial_record VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS notes TEXT NULL;
  `).catch(() => {});

  // 5.1 Tenant Documents
  await p.query(`
    CREATE TABLE IF NOT EXISTS tenant_documents (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      doc_type VARCHAR(50) NOT NULL DEFAULT 'ID_CARD',
      file_name VARCHAR(255) NOT NULL,
      file_size INT NOT NULL DEFAULT 0,
      file_url MEDIUMTEXT NOT NULL,
      uploaded_by VARCHAR(50) NOT NULL DEFAULT 'usr-1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_doc_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5.2 Property Owners
  await p.query(`
    CREATE TABLE IF NOT EXISTS owners (
      id VARCHAR(50) PRIMARY KEY,
      owner_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      national_id VARCHAR(50),
      phone VARCHAR(50) NOT NULL,
      secondary_phone VARCHAR(50),
      email VARCHAR(100),
      address VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_owner_code (owner_code),
      INDEX idx_owner_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Auto-populate owners table from unique property owners if table is empty
  const [existingOwners]: any = await p.query('SELECT COUNT(*) as count FROM owners');
  if (Number(existingOwners[0]?.count || 0) === 0) {
    const [uniquePropOwners]: any = await p.query(`
      SELECT DISTINCT owner_name, owner_phone 
      FROM properties 
      WHERE owner_name IS NOT NULL AND owner_name != ''
    `);
    for (let idx = 0; idx < uniquePropOwners.length; idx++) {
      const o = uniquePropOwners[idx];
      const ownerId = `own-${String(idx + 1).padStart(3, '0')}`;
      const ownerCode = `OWN-${String(idx + 1).padStart(3, '0')}`;
      await p.query(`
        INSERT IGNORE INTO owners (id, owner_code, name, phone, status, notes)
        VALUES (?, ?, ?, ?, 'ACTIVE', 'مالك عقارات ومجمعات مسجل في النظام')
      `, [ownerId, ownerCode, o.owner_name, o.owner_phone || '+967 777 000 000']);
    }
  }

  // Auto-seed sample tenant documents if empty
  const [docCount]: any = await p.query('SELECT COUNT(*) as count FROM tenant_documents');
  if (Number(docCount[0]?.count || 0) === 0) {
    const [existingTenants]: any = await p.query('SELECT id, name FROM tenants LIMIT 3');
    for (const t of existingTenants) {
      await p.query(`
        INSERT IGNORE INTO tenant_documents (id, tenant_id, title, doc_type, file_name, file_size, file_url, uploaded_by)
        VALUES (?, ?, ?, 'ID_CARD', ?, 102400, 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBS', 'usr-1')
      `, [
        `doc-${t.id}-id`,
        t.id,
        `صورة الهوية الوطنية / جواز السفر - ${t.name}`,
        `بطاقة_هوية_${t.name}.pdf`
      ]);
    }
  }

  // 6. Contracts
  await p.query(`
    CREATE TABLE IF NOT EXISTS contracts (
      id VARCHAR(50) PRIMARY KEY,
      contract_number VARCHAR(50) UNIQUE NOT NULL,
      tenant_id VARCHAR(50) NOT NULL,
      tenant_name VARCHAR(150) NOT NULL,
      property_id VARCHAR(50) NOT NULL,
      property_name VARCHAR(150) NOT NULL,
      unit_id VARCHAR(50) NOT NULL,
      unit_number VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      rent_amount DECIMAL(18,2) NOT NULL,
      payment_cycle VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
      deposit_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      guarantee_person_name VARCHAR(150),
      guarantee_person_phone VARCHAR(50),
      notice_period_days INT NOT NULL DEFAULT 60,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      original_end_date DATE,
      renewal_count INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cnt_unit (unit_id),
      INDEX idx_cnt_tenant (tenant_id),
      INDEX idx_cnt_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    ALTER TABLE contracts 
      ADD COLUMN IF NOT EXISTS notes TEXT NULL,
      ADD COLUMN IF NOT EXISTS original_end_date DATE NULL,
      ADD COLUMN IF NOT EXISTS renewal_count INT NOT NULL DEFAULT 0;
  `).catch(() => {});

  // 7. Deposits (Guarantees)
  await p.query(`
    CREATE TABLE IF NOT EXISTS deposits (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      contract_id VARCHAR(50) NOT NULL,
      unit_id VARCHAR(50) NOT NULL,
      deposit_amount DECIMAL(18,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'HELD',
      refunded_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      guarantor_name VARCHAR(150),
      guarantor_phone VARCHAR(50),
      received_date DATE NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dep_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Invoices (Rent, Water, Electricity, Services)
  await p.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(50) PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      tenant_id VARCHAR(50) NOT NULL,
      tenant_name VARCHAR(150) NOT NULL,
      contract_id VARCHAR(50),
      property_id VARCHAR(50) NOT NULL,
      property_name VARCHAR(150) NOT NULL,
      unit_id VARCHAR(50) NOT NULL,
      unit_number VARCHAR(50) NOT NULL,
      account_type VARCHAR(50) NOT NULL,
      period_month VARCHAR(20) NOT NULL,
      total_amount DECIMAL(18,2) NOT NULL,
      paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      remaining_amount DECIMAL(18,2) NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
      base_rent DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      additional_charges DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      billing_period_start DATE NULL,
      billing_period_end DATE NULL,
      cancelled_by VARCHAR(100) NULL,
      cancelled_at DATETIME NULL,
      cancellation_reason TEXT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_inv_tenant (tenant_id),
      INDEX idx_inv_status (status),
      INDEX idx_inv_acct (account_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS base_rent DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS additional_charges DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS discount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS billing_period_start DATE NULL,
      ADD COLUMN IF NOT EXISTS billing_period_end DATE NULL,
      ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS cancelled_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL;
  `).catch(() => {});

  // 9. Payments & Receipts
  await p.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(50) PRIMARY KEY,
      receipt_number VARCHAR(50) UNIQUE NOT NULL,
      invoice_id VARCHAR(50) NOT NULL,
      tenant_id VARCHAR(50) NOT NULL,
      tenant_name VARCHAR(150) NOT NULL,
      unit_number VARCHAR(50) NOT NULL,
      property_name VARCHAR(150) NOT NULL,
      account_type VARCHAR(50) NOT NULL,
      amount_paid DECIMAL(18,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
      collector_id VARCHAR(50) NOT NULL,
      collector_name VARCHAR(100) NOT NULL,
      collected_at DATETIME NOT NULL,
      notes TEXT,
      qr_code_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pay_tenant (tenant_id),
      INDEX idx_pay_inv (invoice_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. Tenant Ledger (Journal Entries by Account Type)
  await p.query(`
    CREATE TABLE IF NOT EXISTS tenant_ledger (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      reference VARCHAR(100) NOT NULL,
      account_type VARCHAR(50) NOT NULL,
      debit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      credit DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      balance_after DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      description VARCHAR(255) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ledg_tenant (tenant_id),
      INDEX idx_ledg_type (account_type),
      INDEX idx_ledg_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11. Water Operating Costs & Periods
  await p.query(`
    CREATE TABLE IF NOT EXISTS water_costs (
      id VARCHAR(50) PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      property_name VARCHAR(150) NOT NULL,
      period_month VARCHAR(20) NOT NULL,
      tanker_count INT NOT NULL DEFAULT 0,
      tanker_unit_price DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      total_tanker_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      pump_electricity_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      sewer_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      tank_maintenance_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      cleaning_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      labor_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      treatment_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      other_fees DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      net_total_operating_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      total_distributed_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      difference_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      distribution_method VARCHAR(50) NOT NULL DEFAULT 'EQUAL',
      period_year INT NULL,
      period_start DATE NULL,
      period_end DATE NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      notes TEXT NULL,
      posted_at DATETIME NULL,
      posted_by VARCHAR(100) NULL,
      closed_at DATETIME NULL,
      closed_by VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wat_prop (property_id),
      INDEX idx_wat_status (status),
      INDEX idx_wat_period (period_month, period_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await p.query(`
    ALTER TABLE water_costs 
      ADD COLUMN IF NOT EXISTS period_year INT NULL,
      ADD COLUMN IF NOT EXISTS period_start DATE NULL,
      ADD COLUMN IF NOT EXISTS period_end DATE NULL,
      ADD COLUMN IF NOT EXISTS treatment_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS total_distributed_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS difference_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS notes TEXT NULL,
      ADD COLUMN IF NOT EXISTS posted_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS posted_by VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS closed_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS closed_by VARCHAR(100) NULL;
  `).catch(() => {});

  // 11.1 Water Tankers - الوايتات
  await p.query(`
    CREATE TABLE IF NOT EXISTS water_tankers (
      id VARCHAR(50) PRIMARY KEY,
      period_id VARCHAR(50) NOT NULL,
      property_id VARCHAR(50) NOT NULL,
      entry_date DATE NOT NULL,
      tanker_count INT NOT NULL DEFAULT 1,
      cost_per_tanker DECIMAL(18,2) NOT NULL,
      total_cost DECIMAL(18,2) NOT NULL,
      supplier_name VARCHAR(150),
      tanker_number VARCHAR(50),
      receipt_number VARCHAR(100),
      payment_method VARCHAR(50) DEFAULT 'CASH',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wt_period (period_id),
      INDEX idx_wt_prop (property_id),
      INDEX idx_wt_date (entry_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11.2 Other Water Costs entries (Electricity, Sewer, Maintenance, Cleaning, Labor, Treatment, Other)
  await p.query(`
    CREATE TABLE IF NOT EXISTS water_cost_items (
      id VARCHAR(50) PRIMARY KEY,
      period_id VARCHAR(50) NOT NULL,
      property_id VARCHAR(50) NOT NULL,
      cost_category VARCHAR(50) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      entry_date DATE NOT NULL,
      reference_number VARCHAR(100),
      description VARCHAR(255) NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wci_period (period_id),
      INDEX idx_wci_cat (cost_category),
      INDEX idx_wci_date (entry_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 11.3 Tenant / Unit Water Charges & Distribution
  await p.query(`
    CREATE TABLE IF NOT EXISTS water_charges (
      id VARCHAR(50) PRIMARY KEY,
      period_id VARCHAR(50) NOT NULL,
      property_id VARCHAR(50) NOT NULL,
      unit_id VARCHAR(50) NOT NULL,
      unit_number VARCHAR(50) NOT NULL,
      tenant_id VARCHAR(50) NULL,
      tenant_name VARCHAR(150) NULL,
      contract_id VARCHAR(50) NULL,
      distribution_basis VARCHAR(50) NOT NULL DEFAULT 'EQUAL',
      basis_value DECIMAL(12,2) NOT NULL DEFAULT 1.00,
      calculated_share DECIMAL(18,2) NOT NULL,
      final_charge DECIMAL(18,2) NOT NULL,
      is_occupied BOOLEAN NOT NULL DEFAULT TRUE,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      invoice_id VARCHAR(50) NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wc_period (period_id),
      INDEX idx_wc_tenant (tenant_id),
      INDEX idx_wc_unit (unit_id),
      INDEX idx_wc_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 12. Electricity Meters
  await p.query(`
    CREATE TABLE IF NOT EXISTS electricity_meters (
      id VARCHAR(50) PRIMARY KEY,
      meter_number VARCHAR(100) UNIQUE NOT NULL,
      property_id VARCHAR(50) NOT NULL,
      building_id VARCHAR(50),
      unit_id VARCHAR(50),
      meter_type VARCHAR(50) NOT NULL DEFAULT 'DIGITAL',
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      installation_date DATE,
      initial_reading DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      current_reading DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      previous_reading DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      multiplier DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
      location_notes VARCHAR(255),
      notes TEXT,
      created_by VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_em_prop (property_id),
      INDEX idx_em_building (building_id),
      INDEX idx_em_unit (unit_id),
      INDEX idx_em_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 13. Meter Replacements History
  await p.query(`
    CREATE TABLE IF NOT EXISTS meter_replacements (
      id VARCHAR(50) PRIMARY KEY,
      old_meter_id VARCHAR(50) NOT NULL,
      old_meter_number VARCHAR(100) NOT NULL,
      new_meter_id VARCHAR(50) NOT NULL,
      new_meter_number VARCHAR(100) NOT NULL,
      unit_id VARCHAR(50) NOT NULL,
      final_reading_old DECIMAL(12,2) NOT NULL,
      initial_reading_new DECIMAL(12,2) NOT NULL,
      replacement_date DATE NOT NULL,
      reason VARCHAR(255) NOT NULL,
      replaced_by VARCHAR(100) NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mr_unit (unit_id),
      INDEX idx_mr_old (old_meter_id),
      INDEX idx_mr_new (new_meter_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 14. Electricity Rates History (Tariffs)
  await p.query(`
    CREATE TABLE IF NOT EXISTS electricity_rates (
      id VARCHAR(50) PRIMARY KEY,
      tariff_name VARCHAR(100) NOT NULL DEFAULT 'تعرفة استهلاك الكهرباء',
      property_id VARCHAR(50) NOT NULL,
      rate_per_kwh DECIMAL(18,2) NOT NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      notes VARCHAR(255),
      created_by VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rate_prop (property_id),
      INDEX idx_rate_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure missing columns in electricity_rates
  await p.query(`
    ALTER TABLE electricity_rates
      ADD COLUMN IF NOT EXISTS tariff_name VARCHAR(100) NOT NULL DEFAULT 'تعرفة استهلاك الكهرباء',
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NULL;
  `).catch(() => {});

  // 15. Electricity Meter Readings
  await p.query(`
    CREATE TABLE IF NOT EXISTS electricity_readings (
      id VARCHAR(50) PRIMARY KEY,
      meter_id VARCHAR(50),
      unit_id VARCHAR(50) NOT NULL,
      unit_number VARCHAR(50) NOT NULL,
      property_id VARCHAR(50),
      building_id VARCHAR(50),
      tenant_id VARCHAR(50),
      tenant_name VARCHAR(100),
      contract_id VARCHAR(50),
      meter_number VARCHAR(100) NOT NULL,
      reading_period_month VARCHAR(20) NOT NULL,
      billing_period_start DATE,
      billing_period_end DATE,
      previous_reading DECIMAL(12,2) NOT NULL,
      current_reading DECIMAL(12,2) NOT NULL,
      consumption_kwh DECIMAL(12,2) NOT NULL,
      multiplier DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
      rate_per_kwh DECIMAL(18,2) NOT NULL,
      tariff_id VARCHAR(50),
      tariff_name VARCHAR(100),
      total_amount DECIMAL(18,2) NOT NULL,
      reading_date DATE NOT NULL,
      is_reset_or_replacement BOOLEAN NOT NULL DEFAULT FALSE,
      reset_reason VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'UNBILLED',
      invoice_id VARCHAR(50),
      invoice_number VARCHAR(100),
      recorded_by VARCHAR(100),
      posted_at DATETIME,
      posted_by VARCHAR(100),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_meter_unit (unit_id),
      INDEX idx_meter_id (meter_id),
      INDEX idx_reading_status (status),
      INDEX idx_reading_period (reading_period_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure missing columns in electricity_readings
  await p.query(`
    ALTER TABLE electricity_readings
      ADD COLUMN IF NOT EXISTS meter_id VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS property_id VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS building_id VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS contract_id VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS billing_period_start DATE NULL,
      ADD COLUMN IF NOT EXISTS billing_period_end DATE NULL,
      ADD COLUMN IF NOT EXISTS multiplier DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
      ADD COLUMN IF NOT EXISTS tariff_id VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS tariff_name VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS posted_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS posted_by VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS notes TEXT NULL;
  `).catch(() => {});

  // Seed default electricity tariffs if table is empty
  const [rateCountRows]: any = await p.query('SELECT COUNT(*) as cnt FROM electricity_rates').catch(() => [[{ cnt: 0 }]]);
  if (!rateCountRows || Number(rateCountRows[0]?.cnt || 0) === 0) {
    await p.query(`
      INSERT INTO electricity_rates (id, tariff_name, property_id, rate_per_kwh, effective_from, effective_to, status, notes, created_by)
      VALUES 
      ('trf-01', 'التعرفة السكنية الموحدة', 'ALL', 300.00, '2026-01-01', NULL, 'ACTIVE', 'التعرفة العامة المعتمدة لكافة العقارات والوحدات السكنية', 'م. أحمد الوهاس'),
      ('trf-02', 'التعرفة التجارية والاستثمارية', 'prop-01', 350.00, '2026-01-01', NULL, 'ACTIVE', 'تعرفة المحلات والمعارض التجارية في برج السلام', 'م. أحمد الوهاس')
    `).catch(() => {});
  }

  // Populate initial electricity_meters from existing units if empty
  const [meterCountRows]: any = await p.query('SELECT COUNT(*) as cnt FROM electricity_meters').catch(() => [[{ cnt: 0 }]]);
  if (!meterCountRows || Number(meterCountRows[0]?.cnt || 0) === 0) {
    await p.query(`
      INSERT IGNORE INTO electricity_meters 
      (id, meter_number, property_id, building_id, unit_id, meter_type, status, installation_date, initial_reading, current_reading, previous_reading, multiplier, notes, created_by)
      SELECT 
        CONCAT('mtr-', SUBSTRING(MD5(id), 1, 8)),
        electricity_meter_number,
        property_id,
        building_id,
        id,
        'DIGITAL',
        'ACTIVE',
        '2026-01-01',
        1000.00,
        1250.00,
        1000.00,
        1.0000,
        CONCAT('عداد كهربائي رئيسي للوحدة رقم ', unit_number),
        'م. أحمد الوهاس'
      FROM units 
      WHERE electricity_meter_number IS NOT NULL AND electricity_meter_number != '';
    `).catch(() => {});
  }

  // 14. Audit Logs
  await p.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      user_name VARCHAR(100) NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity VARCHAR(50) NOT NULL,
      entity_id VARCHAR(50) NOT NULL,
      details TEXT,
      ip_address VARCHAR(50),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_entity (entity),
      INDEX idx_audit_time (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed default Super Admin user if not exists
  await p.query(`
    INSERT IGNORE INTO users (id, name, email, phone, role)
    VALUES ('usr-1', 'م. أحمد الوهاس', 'al.wahaas2023@gmail.com', '+967 777 000 000', 'SUPER_ADMIN')
  `);

  isInitialized = true;
  console.log('MySQL schema initialization complete.');
}

// Transaction execution helper
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
