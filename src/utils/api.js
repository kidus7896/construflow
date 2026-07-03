const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function bodyAsText(res) {
  try { return res.text() } catch { return '' }
}

function parseJson(text) {
  try { return JSON.parse(text) } catch { return {} }
}

export async function api(endpoint, options = {}) {
  try {
    const { method = 'GET', body: requestBody, headers: extraHeaders = {} } = options
    const headers = { 'Content-Type': 'application/json', ...extraHeaders }
    const rawBody = requestBody ? JSON.stringify(requestBody) : undefined

    const res = await fetch(`${API_BASE}${endpoint}`, { method, headers, body: rawBody })
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
