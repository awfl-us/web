import { beforeEach, describe, expect, it, vi } from 'vitest'
import { git } from '../git'

declare const global: any

describe('git tools smoke', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockFetchOnce(status: number, json: any, headers: Record<string, string> = { 'content-type': 'application/json' }) {
    const body = JSON.stringify(json)
    global.fetch = vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k: string) => headers[k.toLowerCase()] },
      text: async () => body,
    }))
  }

  it('list success (array)', async () => {
    mockFetchOnce(200, [{ path: 'README.md' }])
    const res = await git.list({ projectId: 'p1', path: '' })
    expect(Array.isArray(res)).toBe(true)
  })

  it('read success', async () => {
    mockFetchOnce(200, { path: 'a.txt', sha: 'abc', encoding: 'utf-8', content: 'hello' })
    const res = await git.read({ path: 'a.txt', projectId: 'p1' })
    expect(res.sha).toBe('abc')
  })

  it('write success', async () => {
    mockFetchOnce(200, { content: { path: 'a.txt' }, commit: { sha: 'c1' } })
    const res = await git.write({ path: 'a.txt', content: 'hi', projectId: 'p1' })
    expect(res?.commit?.sha).toBe('c1')
  })

  it('delete success', async () => {
    mockFetchOnce(200, { commit: { sha: 'd1' } })
    const res = await git.delete({ path: 'a.txt', projectId: 'p1' })
    expect(res?.commit?.sha).toBe('d1')
  })

  it('tree success', async () => {
    mockFetchOnce(200, { sha: 't1', tree: [], truncated: false })
    const res = await git.tree({ projectId: 'p1', recursive: true })
    expect(res.sha).toBe('t1')
  })

  it('config get/put/delete success', async () => {
    // put
    mockFetchOnce(200, { hasToken: true })
    const put = await git.configPut({ projectId: 'p1', token: 'x' })
    expect(put.hasToken).toBe(true)
    // get
    mockFetchOnce(200, { owner: 'o', repo: 'r', defaultBranch: 'main', hasToken: true })
    const get = await git.configGet({ projectId: 'p1' })
    expect(get.hasToken).toBe(true)
    // delete
    mockFetchOnce(200, { ok: true })
    const del = await git.configDelete({ projectId: 'p1' })
    expect(del.ok).toBe(true)
  })

  it('maps 400 to MISSING_TOKEN', async () => {
    mockFetchOnce(400, { message: 'Missing token' })
    await expect(git.list({ projectId: 'p1' })).rejects.toMatchObject({ code: 'MISSING_TOKEN' })
  })

  it('maps 401 to BAD_CREDENTIALS', async () => {
    mockFetchOnce(401, { message: 'Bad credentials' })
    await expect(git.read({ projectId: 'p1', path: 'a.txt' })).rejects.toMatchObject({ code: 'BAD_CREDENTIALS' })
  })

  it('passes through 500 as HTTP_ERROR', async () => {
    mockFetchOnce(500, { message: 'Server error' })
    await expect(git.tree({ projectId: 'p1' })).rejects.toMatchObject({ code: 'HTTP_ERROR', httpStatus: 500 })
  })
})
