import mysql from 'mysql2/promise';
import { exec, execSync } from 'child_process';
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

  console.log('Starting MySQL daemon in container...');
  try {
    execSync('mkdir -p /run/mysqld /var/lib/mysql && chown -R mysql:mysql /run/mysqld /var/lib/mysql 2>/dev/null || true');
    // Ensure initial system tables exist
    execSync('[ ! -d /var/lib/mysql/mysql ] && mysql_install_db --user=mysql --datadir=/var/lib/mysql 2>/dev/null || true');
    // Start daemon in background
    exec('/usr/sbin/mysqld --user=mysql --bind-address=127.0.0.1 --port=3306 2>/dev/null &');

    // Wait up to 8 seconds for port to open
    for (let i = 0; i < 32; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await isPortOpen(DB_PORT, DB_HOST)) {
        console.log('MySQL daemon successfully started and accepting connections.');
        provisionLocalUsers();
        return true;
      }
    }
  } catch (err: any) {
    console.error('Failed to spawn MySQL daemon:', err.message);
  }

  console.warn('MySQL start attempt completed, checking status...');
  const finalCheck = await isPortOpen(DB_PORT, DB_HOST);
  if (finalCheck) {
    provisionLocalUsers();
  }
  return finalCheck;
}

function provisionLocalUsers() {
  if (DB_HOST === '127.0.0.1' || DB_HOST === 'localhost') {
    try {
      const pass = DB_PASSWORD || '';
      const passClause = pass ? `USING PASSWORD('${pass}')` : `USING PASSWORD('')`;
      const passClauseAlt = pass ? `IDENTIFIED BY '${pass}'` : `IDENTIFIED BY ''`;
      
      const sqlCommands = [
        `ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password ${passClause};`,
        `GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;`,
        `CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' ${passClauseAlt};`,
        `ALTER USER 'root'@'127.0.0.1' IDENTIFIED VIA mysql_native_password ${passClause};`,
        `GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;`,
        `CREATE USER IF NOT EXISTS 'root'@'%' ${passClauseAlt};`,
        `ALTER USER 'root'@'%' IDENTIFIED VIA mysql_native_password ${passClause};`,
        `GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;`,
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
        `CREATE DATABASE IF NOT EXISTS \`smart_property_erp\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
        `FLUSH PRIVILEGES;`
      ].join('\n');

      const tmpSqlPath = '/tmp/provision_mysql_users.sql';
      fs.writeFileSync(tmpSqlPath, sqlCommands, 'utf8');
      
      // Execute via file redirect to avoid shell substitution issues
      execSync(`mariadb < ${tmpSqlPath} 2>/dev/null || mariadb -u root -p'${pass}' < ${tmpSqlPath} 2>/dev/null || true`);
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Buildings
  await p.query(`
    CREATE TABLE IF NOT EXISTS buildings (
      id VARCHAR(50) PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      total_floors INT NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prop (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Units
  await p.query(`
    CREATE TABLE IF NOT EXISTS units (
      id VARCHAR(50) PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      building_id VARCHAR(50),
      building_name VARCHAR(100),
      floor_number INT NOT NULL DEFAULT 0,
      unit_number VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      area_sqm DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'VACANT',
      price_per_cycle DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      electricity_meter_number VARCHAR(100),
      water_meter_or_share VARCHAR(150),
      current_tenant_id VARCHAR(50),
      current_tenant_name VARCHAR(150),
      current_contract_id VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_property (property_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Tenants
  await p.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id VARCHAR(50) PRIMARY KEY,
      tenant_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',
      national_id VARCHAR(50) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(100),
      current_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      rent_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      water_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      electricity_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      deposit_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_code (tenant_code),
      INDEX idx_national (national_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cnt_unit (unit_id),
      INDEX idx_cnt_tenant (tenant_id),
      INDEX idx_cnt_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

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
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_inv_tenant (tenant_id),
      INDEX idx_inv_status (status),
      INDEX idx_inv_acct (account_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

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

  // 11. Water Operating Costs
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
      other_fees DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      net_total_operating_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      distribution_method VARCHAR(50) NOT NULL DEFAULT 'EQUAL',
      status VARCHAR(50) NOT NULL DEFAULT 'CALCULATED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wat_prop (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 12. Electricity Rates History
  await p.query(`
    CREATE TABLE IF NOT EXISTS electricity_rates (
      id VARCHAR(50) PRIMARY KEY,
      property_id VARCHAR(50) NOT NULL,
      rate_per_kwh DECIMAL(18,2) NOT NULL,
      effective_from DATE NOT NULL,
      effective_to DATE,
      notes VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rate_prop (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 13. Electricity Meter Readings
  await p.query(`
    CREATE TABLE IF NOT EXISTS electricity_readings (
      id VARCHAR(50) PRIMARY KEY,
      unit_id VARCHAR(50) NOT NULL,
      unit_number VARCHAR(50) NOT NULL,
      meter_number VARCHAR(100) NOT NULL,
      reading_period_month VARCHAR(20) NOT NULL,
      previous_reading DECIMAL(12,2) NOT NULL,
      current_reading DECIMAL(12,2) NOT NULL,
      consumption_kwh DECIMAL(12,2) NOT NULL,
      rate_per_kwh DECIMAL(18,2) NOT NULL,
      total_amount DECIMAL(18,2) NOT NULL,
      reading_date DATE NOT NULL,
      is_reset_or_replacement BOOLEAN NOT NULL DEFAULT FALSE,
      reset_reason VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'UNBILLED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_meter_unit (unit_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

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
