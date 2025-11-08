import { getCookie } from '../utils/cookies'

export type ApiClientOptions = {
  idToken?: string
  skipAuth?: boolean
  baseUrl?: string
}

export type RequestOptions = {
  signal?: AbortSignal
}

function buildHeaders(opts: ApiClientOptions) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (opts.idToken) headers['Authorization'] = `Bearer ${opts.idToken}`
  if (opts.skipAuth) headers['X-Skip-Auth'] = '1'
  // Always include project header; backend ignores value when not needed but may require presence
  headers['x-project-id'] = getCookie('awfl.projectId') || ''
  return headers
}

async function sendJson(path: string, body: any, method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT', opts: ApiClientOptions, ropts?: RequestOptions) {
  const url = (opts.baseUrl || '') + path
  const init: RequestInit = {
    method,
    headers: buildHeaders(opts),
    signal: ropts?.signal,
  }
  if (method !== 'GET' && method !== 'DELETE') {
    // Authorization header is used; do not include userAuthToken in body
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
  // If server returned HTML (likely front-end index), surface as an error so callers can fallback.
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

async function sendJsonWithBodyAllowed(path: string, body: any, method: 'DELETE', opts: ApiClientOptions, ropts?: RequestOptions) {
  // Specialized sender to support DELETE with JSON body
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

async function postJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, body, 'POST', opts, ropts)
}

async function patchJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, body, 'PATCH', opts, ropts)
}

async function putJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, body, 'PUT', opts, ropts)
}

async function deleteJson(path: string, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, undefined, 'DELETE', opts, ropts)
}

async function deleteWithBodyJson(path: string, body: any, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJsonWithBodyAllowed(path, body, 'DELETE', opts, ropts)
}

async function getJson(path: string, opts: ApiClientOptions, ropts?: RequestOptions) {
  return await sendJson(path, undefined, 'GET', opts, ropts)
}

function normalizeTasksArray(json: any): any[] | null {
  if (!json) return null
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.tasks)) return json.tasks
  if (Array.isArray(json?.items)) return json.items
  if (Array.isArray(json?.data)) return json.data
  if (Array.isArray(json?.result)) return json.result
  if (Array.isArray(json?.records)) return json.records
  return null
}

export function makeApiClient(opts: ApiClientOptions) {
  return {
    async listSessions(body: any, ropts?: RequestOptions) {
      // Updated endpoint for listing sessions within a time range
      return await postJson('/api/workflows/context/sessions/list', body, opts, ropts)
    },
    async topicContextYoj(body: any, ropts?: RequestOptions) {
      // Updated endpoint for running TopicContextYoj
      const json = await postJson('/api/workflows/context/topicContextYoj/run', body, opts, ropts)
      // Normalize: ensure top-level yoj exists if only nested under lastExec/output
      if (!json?.yoj) {
        const nested = json?.lastExec?.output?.yoj || json?.lastExec?.result?.yoj || json?.result?.yoj
        if (Array.isArray(nested)) json.yoj = nested
      }
      return json
    },
    async workflowsExecute(body: any, ropts?: RequestOptions) {
      // POST /workflows/execute via public API proxy
      // Do not force sync=true; default to false unless provided by caller
      const payload: any = body && typeof body === 'object' ? { ...body } : {}
      if (payload.sync == null) payload.sync = false
      return await postJson('/api/workflows/execute', payload, opts, ropts)
    },
    async workflowsStatusLatest(sessionId: string, limit = 1, ropts?: RequestOptions) {
      const q = typeof limit === 'number' ? `?limit=${encodeURIComponent(String(limit))}` : ''
      return await getJson(`/api/workflows/exec/status/latest/${encodeURIComponent(sessionId)}${q}`, opts, ropts)
    },
    async workflowsStop(body: any, ropts?: RequestOptions) {
      // POST /workflows/exec/stop via public API proxy
      return await postJson('/api/workflows/exec/stop', body, opts, ropts)
    },
    async workflowsExecTree(body: { sessionId?: string; execId?: string; includeStatus?: boolean } | null, ropts?: RequestOptions) {
      // Return execution tree for a session or a particular exec id
      return await postJson('/api/workflows/exec/tree', body || {}, opts, ropts)
    },

    // Projects service under /api/workflows/projects
    async projectsList(params?: { limit?: number; order?: 'asc' | 'desc' }, ropts?: RequestOptions) {
      const q = new URLSearchParams()
      if (params?.limit != null) q.set('limit', String(params.limit))
      if (params?.order) q.set('order', params.order)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return await getJson(`/api/workflows/projects${qs}`, opts, ropts)
    },

    // Tasks service under /api/workflows/tasks
    async tasksList(
      params: { sessionId?: string; status?: string; limit?: number; order?: 'asc' | 'desc' },
      ropts?: RequestOptions
    ) {
      const q = new URLSearchParams()
      if (params?.sessionId) q.set('sessionId', params.sessionId)
      if (params?.status) q.set('status', params.status)
      if (typeof params?.limit === 'number') q.set('limit', String(params.limit))
      if (params?.order) q.set('order', params.order)
      const qs = q.toString() ? `?${q.toString()}` : ''

      const json = await getJson(`/api/workflows/tasks${qs}`, opts, ropts)
      const arr = normalizeTasksArray(json) || []
      return { tasks: arr }
    },
    async tasksListBySession(
      params: { sessionId: string; status?: string; limit?: number; order?: 'asc' | 'desc' },
      ropts?: RequestOptions
    ) {
      const q = new URLSearchParams()
      if (params?.status) q.set('status', params.status)
      if (typeof params?.limit === 'number') q.set('limit', String(params.limit))
      if (params?.order) q.set('order', params.order)
      const qs = q.toString() ? `?${q.toString()}` : ''
      const path = `/api/workflows/tasks/by-session/${encodeURIComponent(params.sessionId)}${qs}`
      const json = await getJson(path, opts, ropts)
      const arr = normalizeTasksArray(json) || []
      return { tasks: arr }
    },
    async taskCreate(body: { sessionId?: string; title?: string; description?: string; status?: string }, ropts?: RequestOptions) {
      // Create a task; server returns created record
      return await postJson('/api/workflows/tasks', body, opts, ropts)
    },
    async taskUpdate(body: { id: string; title?: string; description?: string; status?: string }, ropts?: RequestOptions) {
      // Update a task by id using PATCH /workflows/tasks/:id
      const { id, ...fields } = body || ({} as any)
      if (!id) throw new Error('taskUpdate: id is required')
      return await patchJson(`/api/workflows/tasks/${encodeURIComponent(id)}`, fields, opts, ropts)
    },
    async taskStatusUpdate(body: { id: string; status: string }, ropts?: RequestOptions) {
      const { id, status } = body || ({} as any)
      if (!id) throw new Error('taskStatusUpdate: id is required')
      return await postJson(`/api/workflows/tasks/${encodeURIComponent(id)}/status`, { status }, opts, ropts)
    },
    async taskDelete(id: string, ropts?: RequestOptions) {
      if (!id) throw new Error('taskDelete: id is required')
      return await deleteJson(`/api/workflows/tasks/${encodeURIComponent(id)}`, opts, ropts)
    },

    // Agents service under /api/workflows/agents
    async agentsList(ropts?: RequestOptions) {
      return await getJson('/api/workflows/agents', opts, ropts)
    },
    async agentCreate(body: { name: string; description?: string | null; workflowName?: string | null; tools?: string[] }, ropts?: RequestOptions) {
      return await postJson('/api/workflows/agents', body, opts, ropts)
    },
    async agentUpdate(body: { id: string; name?: string | null; description?: string | null; workflowName?: string | null }, ropts?: RequestOptions) {
      const { id, ...fields } = body || ({} as any)
      if (!id) throw new Error('agentUpdate: id is required')
      return await patchJson(`/api/workflows/agents/${encodeURIComponent(id)}`, fields, opts, ropts)
    },
    async agentDelete(id: string, ropts?: RequestOptions) {
      if (!id) throw new Error('agentDelete: id is required')
      return await deleteJson(`/api/workflows/agents/${encodeURIComponent(id)}`, opts, ropts)
    },
    async agentToolsAdd(id: string, tools: string[] | string, ropts?: RequestOptions) {
      if (!id) throw new Error('agentToolsAdd: id is required')
      const payload = { tools }
      return await postJson(`/api/workflows/agents/${encodeURIComponent(id)}/tools`, payload, opts, ropts)
    },
    async agentToolsRemove(id: string, tools: string[] | string, ropts?: RequestOptions) {
      if (!id) throw new Error('agentToolsRemove: id is required')
      const payload = { tools }
      return await deleteWithBodyJson(`/api/workflows/agents/${encodeURIComponent(id)}/tools`, payload, opts, ropts)
    },
    async agentToolsList(id: string, ropts?: RequestOptions) {
      if (!id) throw new Error('agentToolsList: id is required')
      return await getJson(`/api/workflows/agents/${encodeURIComponent(id)}/tools`, opts, ropts)
    },

    // Agent-session mapping under /api/workflows/agents/session
    async agentsSessionLink(sessionId: string, agentId: string, ropts?: RequestOptions) {
      if (!sessionId) throw new Error('agentsSessionLink: sessionId is required')
      if (!agentId) throw new Error('agentsSessionLink: agentId is required')
      return await putJson(`/api/workflows/agents/session/${encodeURIComponent(sessionId)}`, { agentId }, opts, ropts)
    },
    async agentsSessionGet(sessionId: string, ropts?: RequestOptions) {
      if (!sessionId) throw new Error('agentsSessionGet: sessionId is required')
      return await getJson(`/api/workflows/agents/session/${encodeURIComponent(sessionId)}`, opts, ropts)
    },
    async agentsSessionDelete(sessionId: string, ropts?: RequestOptions) {
      if (!sessionId) throw new Error('agentsSessionDelete: sessionId is required')
      return await deleteJson(`/api/workflows/agents/session/${encodeURIComponent(sessionId)}`, opts, ropts)
    },

    // Tools registry service under /api/workflows/tools
    async toolsList(params?: { names?: string[] }, ropts?: RequestOptions) {
      const q = new URLSearchParams()
      const names = params?.names || []
      if (names.length) q.set('names', JSON.stringify(names))
      const qs = q.toString() ? `?${q.toString()}` : ''
      return await getJson(`/api/workflows/tools/list${qs}`, opts, ropts)
    },

    // Git service under /api/workflows/services/git
    async gitConfigGet(projectId: string, ropts?: RequestOptions) {
      if (!projectId) throw new Error('gitConfigGet: projectId is required')
      const q = new URLSearchParams()
      q.set('projectId', projectId)
      const qs = `?${q.toString()}`
      return await getJson(`/api/workflows/services/git/config${qs}`, opts, ropts)
    },
    async gitConfigPut(body: { projectId: string; owner?: string; repo?: string; defaultBranch?: string; token?: string }, ropts?: RequestOptions) {
      const { projectId, ...rest } = body || ({} as any)
      if (!projectId) throw new Error('gitConfigPut: projectId is required')
      return await putJson('/api/workflows/services/git/config', { projectId, ...rest }, opts, ropts)
    },
    async gitConfigDelete(projectId: string, ropts?: RequestOptions) {
      if (!projectId) throw new Error('gitConfigDelete: projectId is required')
      const q = new URLSearchParams()
      q.set('projectId', projectId)
      const qs = `?${q.toString()}`
      return await getJson(`/api/workflows/services/git/config${qs}`, opts, ropts)
    },
    async gitTree(params: { projectId: string; ref?: string; recursive?: boolean }, ropts?: RequestOptions) {
      const q = new URLSearchParams()
      if (!params?.projectId) throw new Error('gitTree: projectId is required')
      q.set('projectId', params.projectId)
      if (params?.ref) q.set('ref', params.ref)
      if (params?.recursive) q.set('recursive', '1')
      const qs = `?${q.toString()}`
      return await getJson(`/api/workflows/services/git/tree${qs}`, opts, ropts)
    },
    async gitList(params: { projectId?: string; path?: string; ref?: string }, ropts?: RequestOptions) {
      const q = new URLSearchParams()
      if (params?.projectId) q.set('projectId', params.projectId)
      if (typeof params?.path === 'string') q.set('path', params.path)
      if (params?.ref) q.set('ref', params.ref)
      const qs = q.toString() ? `?${q.toString()}` : ''
      return await getJson(`/api/workflows/services/git/list${qs}`, opts, ropts)
    },
    async gitRead(params: { projectId?: string; path: string; ref?: string }, ropts?: RequestOptions) {
      if (!params?.path) throw new Error('gitRead: path is required')
      const q = new URLSearchParams()
      if (params?.projectId) q.set('projectId', params.projectId)
      q.set('path', params.path)
      if (params?.ref) q.set('ref', params.ref)
      const qs = `?${q.toString()}`
      return await getJson(`/api/workflows/services/git/read${qs}`, opts, ropts)
    },
    async gitWrite(body: { projectId?: string; path: string; content: string; message?: string; branch?: string; sha?: string }, ropts?: RequestOptions) {
      const { path: filePath, content, ...rest } = body || ({} as any)
      if (!filePath) throw new Error('gitWrite: path is required')
      if (typeof content !== 'string') throw new Error('gitWrite: content is required')
      return await putJson('/api/workflows/services/git/write', { path: filePath, content, ...rest }, opts, ropts)
    },
    async gitDelete(body: { projectId?: string; path: string; message?: string; branch?: string; sha?: string }, ropts?: RequestOptions) {
      const { path: filePath, ...rest } = body || ({} as any)
      if (!filePath) throw new Error('gitDelete: path is required')
      return await deleteWithBodyJson('/api/workflows/services/git/delete', { path: filePath, ...rest }, opts, ropts)
    },

    // Collapsed group state under /api/workflows/context/collapse/state
    async collapseStateSet(body: { sessionId: string; group: string; expanded: boolean; responseId?: string | null }, ropts?: RequestOptions) {
      if (!body?.sessionId) throw new Error('collapseStateSet: sessionId is required')
      if (!body?.group) throw new Error('collapseStateSet: group is required')
      const payload = { sessionId: body.sessionId, group: body.group, expanded: !!body.expanded, ...(body.responseId ? { responseId: body.responseId } : {}) }

      // Use the correct path first; keep legacy fallback to avoid breaking older deployments
      const paths = [
        '/api/workflows/context/collapse/state/set', // correct, current
        '/api/context/collapse/state/set', // legacy without /workflows prefix
      ]

      let lastErr: any = null
      for (const p of paths) {
        try {
          return await postJson(p, payload, opts, ropts)
        } catch (err: any) {
          lastErr = err
          const status = err?.httpStatus || err?.status || err?.response?.status
          // For 400/401 or other non-404 errors, do not attempt further fallbacks
          if (status && status !== 404) throw err
          // otherwise try next path
        }
      }
      // If all attempts failed (likely 404s), throw the last error
      throw lastErr || new Error('collapseStateSet failed')
    },
    // Note: GET endpoint for hydration will be added in a follow-up task (z4EMEMZKuk8scCfpsF76)

    // Credentials service under /api/workflows/creds
    async credsList(ropts?: RequestOptions) {
      return await getJson('/api/workflows/creds', opts, ropts)
    },
    async credsSet(provider: string, value: string, ropts?: RequestOptions) {
      if (!provider) throw new Error('credsSet: provider is required')
      if (typeof value !== 'string' || !value) throw new Error('credsSet: value is required')
      return await postJson(`/api/workflows/creds/${encodeURIComponent(provider)}`, { value }, opts, ropts)
    },
    async credsDelete(provider: string, ropts?: RequestOptions) {
      if (!provider) throw new Error('credsDelete: provider is required')
      return await deleteJson(`/api/workflows/creds/${encodeURIComponent(provider)}`, opts, ropts)
    },
  }
}
