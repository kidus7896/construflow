import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb, saveDatabase } from '../db.js'
import { authenticate, getFirebaseAdmin } from '../middleware/auth.js'

const router = Router()

function getClientInfo(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '127.0.0.1'
  const userAgent = req.headers['user-agent'] || ''
  const browser = userAgent.slice(0, 200)
  const os = userAgent.includes('Windows') ? 'Windows' :
    userAgent.includes('Mac') ? 'macOS' :
    userAgent.includes('Linux') ? 'Linux' : 'Unknown'
  return { ip, browser, os }
}

function logAudit(db, userId, companyId, action, details, ip, device, browser) {
  db.run(`INSERT INTO audit_logs (id, user_id, company_id, action, details, ip_address, device, browser)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), userId, companyId, action, details, ip, device, browser]
  )
}

function getFirstRow(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const hasRow = stmt.step()
  if (!hasRow) { stmt.free(); return null }
  const row = stmt.getAsObject()
  stmt.free()
  return row
}

function getAllRows(db, sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

// POST /api/auth/register — create user record after Firebase signup
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, firebaseUid } = req.body
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !firebaseUid) {
      return res.status(400).json({ error: 'First name, last name, email, and firebaseUid are required' })
    }

    const db = await getDb()
    const existing = getFirstRow(db, 'SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (existing) return res.status(409).json({ error: 'User already exists' })

    const id = firebaseUid
    const cleanEmail = email.toLowerCase().trim()

    db.run(`INSERT INTO users (id, first_name, last_name, email, phone, password_hash, email_verified, status, role)
      VALUES (?, ?, ?, ?, ?, '', 1, 'active', 'company_admin')`,
      [id, firstName.trim(), lastName.trim(), cleanEmail, phone || '']
    )

    const { ip, browser, os } = getClientInfo(req)
    logAudit(db, id, null, 'signup', `User ${cleanEmail} registered via Firebase`, ip, os, browser)
    saveDatabase()

    res.status(201).json({ message: 'User registered', userId: id })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const db = await getDb()
    db.run("DELETE FROM sessions WHERE user_id = ?", [req.user.userId])

    const { ip, browser, os } = getClientInfo(req)
    logAudit(db, req.user.userId, null, 'logout', 'User logged out', ip, os, browser)
    saveDatabase()

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/logout-all
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    const db = await getDb()
    db.run("DELETE FROM sessions WHERE user_id = ?", [req.user.userId])

    const { ip, browser, os } = getClientInfo(req)
    logAudit(db, req.user.userId, null, 'logout_all', 'Logged out from all devices', ip, os, browser)
    saveDatabase()

    res.json({ message: 'Logged out from all devices' })
  } catch (err) {
    console.error('Logout all error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/auth/sessions
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const db = await getDb()
    const sessions = getAllRows(db,
      `SELECT id, device_name, browser, os, ip_address, is_current, created_at as login_time
       FROM sessions WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.userId]
    )

    res.json({ sessions: sessions.map(s => ({
      id: s.id,
      deviceName: s.device_name,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ip_address,
      isCurrent: s.is_current === 1,
      loginTime: s.login_time,
    })) })
  } catch (err) {
    console.error('Sessions error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/auth/sessions/:id
router.delete('/sessions/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb()
    const session = getFirstRow(db, 'SELECT * FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId])
    if (!session) return res.status(404).json({ error: 'Session not found' })

    db.run("DELETE FROM sessions WHERE id = ?", [req.params.id])
    saveDatabase()
    res.json({ message: 'Session terminated' })
  } catch (err) {
    console.error('Delete session error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/logout-other
router.post('/logout-other', authenticate, async (req, res) => {
  try {
    const db = await getDb()
    db.run("DELETE FROM sessions WHERE user_id = ?", [req.user.userId])
    saveDatabase()
    res.json({ message: 'Other sessions terminated' })
  } catch (err) {
    console.error('Logout other error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/select-company
router.post('/select-company', authenticate, async (req, res) => {
  try {
    const { companyId } = req.body
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const db = await getDb()
    const membership = getFirstRow(db,
      'SELECT * FROM user_companies WHERE user_id = ? AND company_id = ?',
      [req.user.userId, companyId]
    )
    if (!membership) return res.status(403).json({ error: 'You do not belong to this company' })

    const company = getFirstRow(db, 'SELECT * FROM companies WHERE id = ? AND status = ?', [companyId, 'active'])
    if (!company) return res.status(404).json({ error: 'Company not found' })

    const { ip, browser, os } = getClientInfo(req)
    logAudit(db, req.user.userId, companyId, 'company_switch', `Switched to company: ${company.name}`, ip, os, browser)
    saveDatabase()

    res.json({ company, message: `Switched to ${company.name}` })
  } catch (err) {
    console.error('Select company error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = await getDb()
    let user = getFirstRow(db, 'SELECT * FROM users WHERE id = ?', [req.user.userId])

    if (!user) {
      const admin = getFirebaseAdmin()
      const fbUser = await admin.getUser(req.user.userId)
      if (!fbUser) return res.status(404).json({ error: 'User not found' })

      const cleanEmail = fbUser.email?.toLowerCase().trim() || ''
      db.run(`INSERT INTO users (id, first_name, last_name, email, password_hash, email_verified, status, role)
        VALUES (?, ?, ?, ?, '', 1, 'active', 'company_admin')`,
        [req.user.userId, fbUser.displayName || '', '', cleanEmail]
      )
      saveDatabase()
      user = getFirstRow(db, 'SELECT * FROM users WHERE id = ?', [req.user.userId])
    }

    const companies = getAllRows(db,
      `SELECT c.*, uc.role as membership_role
       FROM companies c
       JOIN user_companies uc ON c.id = uc.company_id
       WHERE uc.user_id = ?`,
      [req.user.userId]
    )

    res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profile_photo,
        preferredLanguage: user.preferred_language,
        timezone: user.timezone,
        lastLogin: user.last_login,
        status: user.status,
        emailVerified: !!user.email_verified,
        defaultCompanyId: user.default_company_id,
      },
      companies,
    })
  } catch (err) {
    console.error('Me error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, preferredLanguage, timezone } = req.body
    const db = await getDb()

    const updates = []
    const params = []
    if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName) }
    if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName) }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone) }
    if (preferredLanguage !== undefined) { updates.push('preferred_language = ?'); params.push(preferredLanguage) }
    if (timezone !== undefined) { updates.push('timezone = ?'); params.push(timezone) }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    updates.push("updated_at = datetime('now')")
    params.push(req.user.userId)

    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)

    const { ip, browser, os } = getClientInfo(req)
    logAudit(db, req.user.userId, null, 'profile_update', 'Profile updated', ip, os, browser)
    saveDatabase()

    res.json({ message: 'Profile updated successfully' })
  } catch (err) {
    console.error('Profile update error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword) return res.status(400).json({ error: 'New password is required' })

    const admin = getFirebaseAdmin()
    await admin.updateUser(req.user.userId, { password: newPassword })
    saveDatabase()

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
