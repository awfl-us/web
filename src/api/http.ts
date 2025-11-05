export type ApiClientOptions = {
  idToken?: string
  skipAuth?: boolean
  baseUrl?: string
}

export type RequestOptions = {
  signal?: AbortSignal
}

export function buildHeaders(opts: ApiClientOptions) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (opts.idToken) headers['Authorization'] = `Bearer ${opts.idToken}`
  if (opts.skipAuth) headers['X-Skip-Auth'] = '1'
  return headers
}

async function sendJson(
  path: string,
  body: any,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  opts: ApiClientOptions,
  ropts?: RequestOptions
) {
  const url = (opts.baseUrl || '') + path
  const init: RequestInit = {
    method,
    headers: buildHeaders(opts),
    signal: ropts?.signal,
  }
  if (method !== 'GET' && method !== 'DELETE') {
    init.body = JSON.stringify(body || {})
  }
  const res = await fetch(url, init)
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (ct.includes('text/html') || (typeof json?.raw === 'string' && /<\s*html/i.test(json.raw))) {
    const msg = 'Unexpected HTML response'
    const err: any = new Error(msg)
    err.httpStatus = res.status
    err.details = { raw: json?.raw }
    throw err
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText || 'Request failed'
    const err: any = new Error(msg)
    err.httpStatus = res.status
    err.details = json
    throw err
  }
  return json
}

async function sendJsonWithBodyAllowed(
  path: string,
  body: any,
  method: 'DELETE',
  opts: ApiClientOptions,
  ropts?: RequestOptions
) {
  const url = (opts.baseUrl || '') + path
  const init: RequestInit = {
    method,
    headers: buildHeaders(opts),
    signal: ropts?.signal,
    body: JSON.stringify(body || {}),
  }
  const res = await fetch(url, init)
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  let json: any
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (ct.includes('text/html') || (typeof json?.raw === 'string' && /<\s*html/i.test(json.raw))) {
    const msg = 'Unexpected HTML response'
    const err: any = new Error(msg)
    err.httpStatus = res.status
    err.details = { raw: json?.raw }
    throw err
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || res.statusText || 'Request failed'
    const err: any = new Error(msg)
    err.httpStatus = res.status
    err.details = json
    throw err
  }
  return json
}

export async function postJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, body, 'POST', opts, ropts)
}

export async function patchJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, body, 'PATCH', opts, ropts)
}

export async function putJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, body, 'PUT', opts, ropts)
}

export async function deleteJson(path: string, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, undefined, 'DELETE', opts, ropts)
}

export async function deleteWithBodyJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJsonWithBodyAllowed(path, body, 'DELETE', opts, ropts)
}

export async function getJson(path: string, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, undefined, 'GET', opts, ropts)
}
