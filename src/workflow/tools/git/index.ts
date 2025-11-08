// AWFL Git Files Service tools
// Canonical backend prefix: /api/workflows/services/git
// These wrappers use the shared api client and map errors to ToolError with stable codes.

import { makeApiClient, type RequestOptions } from '../../../api/apiClient'

export class ToolError extends Error {
  code: string
  httpStatus?: number
  details?: any
  constructor(code: string, message: string, httpStatus?: number, details?: any) {
    super(message)
    this.name = 'ToolError'
    this.code = code
    this.httpStatus = httpStatus
    this.details = details
  }
}

export type ToolCallOptions = {
  idToken?: string
  baseUrl?: string
  signal?: AbortSignal
}

function mapGitError(e: any): never {
  const status = e?.httpStatus
  const message = e?.details?.message || e?.message || 'Git service error'
  if (status === 400) {
    throw new ToolError('MISSING_TOKEN', message || 'Missing GitHub token', status, e?.details)
  }
  if (status === 401) {
    throw new ToolError('BAD_CREDENTIALS', message || 'Bad credentials', status, e?.details)
  }
  throw new ToolError('HTTP_ERROR', message || 'Request failed', status, e?.details)
}

function client(opts?: ToolCallOptions) {
  const api = makeApiClient({ idToken: opts?.idToken, baseUrl: opts?.baseUrl })
  return { api, ropts: opts ? ({ signal: opts.signal } as RequestOptions) : undefined }
}

// Types based on spec
export type GitListParams = { path?: string; ref?: string; projectId?: string }
export type GitReadParams = { path: string; ref?: string; projectId?: string }
export type GitWriteParams = { path: string; content: string; message?: string; branch?: string; sha?: string; projectId?: string }
export type GitDeleteParams = { path: string; message?: string; branch?: string; sha?: string; projectId?: string }
export type GitTreeParams = { ref?: string; recursive?: boolean; projectId?: string }
export type GitConfigGetParams = { projectId: string }
export type GitConfigPutParams = { projectId: string; owner?: string; repo?: string; token?: string; defaultBranch?: string }
export type GitConfigDeleteParams = { projectId: string }

export type GitReadResponse = {
  path: string
  sha: string
  encoding: 'utf-8' | 'base64' | string
  content?: string
}

// Note: git.list may return an array (dir listing) or an object (file metadata)
export async function list(params: GitListParams = {}, opts?: ToolCallOptions): Promise<any> {
  const { api, ropts } = client(opts)
  try {
    return await api.gitList({ projectId: params.projectId, path: params.path, ref: params.ref }, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

export async function read(params: GitReadParams, opts?: ToolCallOptions): Promise<GitReadResponse> {
  if (!params?.path) throw new ToolError('INVALID_INPUT', 'read: path is required')
  const { api, ropts } = client(opts)
  try {
    return await api.gitRead({ projectId: params.projectId, path: params.path, ref: params.ref }, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

export async function write(params: GitWriteParams, opts?: ToolCallOptions): Promise<any> {
  if (!params?.path) throw new ToolError('INVALID_INPUT', 'write: path is required')
  if (typeof params?.content !== 'string') throw new ToolError('INVALID_INPUT', 'write: content is required')
  const { api, ropts } = client(opts)
  try {
    return await api.gitWrite({ projectId: params.projectId, path: params.path, content: params.content, message: params.message, branch: params.branch, sha: params.sha }, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

export async function del(params: GitDeleteParams, opts?: ToolCallOptions): Promise<any> {
  if (!params?.path) throw new ToolError('INVALID_INPUT', 'delete: path is required')
  const { api, ropts } = client(opts)
  try {
    return await api.gitDelete({ projectId: params.projectId, path: params.path, message: params.message, branch: params.branch, sha: params.sha }, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

export async function tree(params: GitTreeParams = {}, opts?: ToolCallOptions): Promise<any> {
  const { api, ropts } = client(opts)
  try {
    const projectId = params.projectId || ''
    if (!projectId) throw new ToolError('INVALID_INPUT', 'tree: projectId is required')
    return await api.gitTree({ projectId, ref: params.ref, recursive: !!params.recursive }, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

export async function configGet(params: GitConfigGetParams, opts?: ToolCallOptions): Promise<{ owner?: string; repo?: string; defaultBranch?: string; hasToken: boolean }> {
  const { api, ropts } = client(opts)
  try {
    return await api.gitConfigGet(params.projectId, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

export async function configPut(params: GitConfigPutParams, opts?: ToolCallOptions): Promise<{ hasToken: boolean }> {
  const { api, ropts } = client(opts)
  try {
    return await api.gitConfigPut(params, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

export async function configDelete(params: GitConfigDeleteParams, opts?: ToolCallOptions): Promise<{ ok: true }> {
  const { api, ropts } = client(opts)
  try {
    return await api.gitConfigDelete(params.projectId, ropts)
  } catch (e: any) {
    mapGitError(e)
  }
}

// Namespace export (tree-shakeable) — avoid reserved word by aliasing delete as del
export const git = {
  list,
  read,
  write,
  delete: del,
  tree,
  configGet,
  configPut,
  configDelete,
}

export default git
