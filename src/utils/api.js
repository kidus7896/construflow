import { authClient } from '../firebase'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export function setTokens(token) {
  if (token) localStorage.setItem('cf_access_token', token)
  else localStorage.removeItem('cf_access_token')
}

export function clearTokens() {
  localStorage.removeItem('cf_access_token')
  localStorage.removeItem('cf_refresh_token')
  localStorage.removeItem('cf_session_user')
}

export function getAccessToken() {
  return localStorage.getItem('cf_access_token')
}

async function getValidToken() {
  const fbUser = authClient.currentUser
  if (!fbUser) return null
  try {
    const token = await fbUser.getIdToken()
    setTokens(token)
    return token
  } catch {
    return null
  }
}

function bodyAsText(res) {
  try { return res.text() } catch { return '' }
}

function parseJson(text) {
  try { return JSON.parse(text) } catch { return {} }
}

export async function api(endpoint, options = {}) {
  try {
    const { method = 'GET', body: requestBody, auth = true } = options
    const headers = {}

    if (auth) {
      const token = await getValidToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    headers['Content-Type'] = 'application/json'
    const rawBody = requestBody ? JSON.stringify(requestBody) : undefined

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: rawBody,
    })

    const text = await bodyAsText(res)
    const isJson = res.headers.get('content-type')?.includes('application/json')
    const data = isJson ? parseJson(text) : {}

    if (!res.ok) {
      const msg = data.error || (text && !isJson ? 'Server unreachable.' : `Request failed (${res.status})`)
      const err = new Error(msg)
      err.status = res.status
      err.code = data.code
      err.email = data.email
      err.data = data
      throw err
    }

    return data
  } catch (err) {
    if (err.status) throw err
    throw new Error(err.message || 'Cannot connect to server.')
  }
}
