import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'construction_flow.db')

let db = null
const readyPromise = initDb()

async function initDb() {
  const SQL = await initSqlJs()
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
