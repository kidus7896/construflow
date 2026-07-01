import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data', 'construction_flow.db')

let db = null
const readyPromise = initDb()

async function initDb() {
  const SQL = await initSqlJs()
  const dataDir = path.join(__dirname, '..', 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  initSchema()
  seed()
  saveDb()
  return db
}

function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      password_hash TEXT DEFAULT '',
      email_verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending_verification' CHECK(status IN ('pending_verification','active','suspended','locked','deleted')),
      role TEXT DEFAULT 'company_admin' CHECK(role IN ('super_admin','company_admin','accountant','finance_officer','project_manager','viewer')),
      default_company_id TEXT,
      profile_photo TEXT,
      preferred_language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'UTC',
      last_login TEXT,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      business_type TEXT DEFAULT 'Construction',
      tin_number TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      vat_rate REAL DEFAULT 15,
      withholding_rate REAL DEFAULT 3,
      currency TEXT DEFAULT 'ETB',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','archived')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_companies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'company_admin',
      joined_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      UNIQUE(user_id, company_id)
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      device_name TEXT DEFAULT '',
      browser TEXT DEFAULT '',
      os TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      is_current INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      refresh_expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      company_id TEXT,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      device TEXT DEFAULT '',
      browser TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)
}

function seed() {
  const count = db.exec("SELECT COUNT(*) as cnt FROM users")
  const rows = count.length > 0 ? count[0].values : []
  if (rows.length === 0 || rows[0][0] === 0) {
    const saId = uuidv4()
    const companyId = uuidv4()
    const passwordHash = bcrypt.hashSync('Admin@123', 12)

    db.run(`INSERT INTO users (id, first_name, last_name, email, phone, password_hash, email_verified, status, role, default_company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saId, 'Super', 'Admin', 'admin@construflow.com', '+251911111111',
      passwordHash, 1, 'active', 'super_admin', null]
    )

    db.run(`INSERT INTO companies (id, name, tin_number, phone, email, address, vat_rate, withholding_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyId, 'ABC Construction PLC', 'TIN-001-2024', '+251911223344',
      'info@abcconstruction.com', 'Addis Ababa, Ethiopia', 15, 3]
    )

    db.run(`INSERT INTO user_companies (id, user_id, company_id, role)
      VALUES (?, ?, ?, ?)`, [uuidv4(), saId, companyId, 'company_admin'])
  }
}

export async function getDb() {
  if (!db) await readyPromise
  return db
}

export function saveDatabase() {
  saveDb()
}

export function closeDb() {
  if (db) { saveDb(); db.close(); db = null }
}

export { readyPromise }
