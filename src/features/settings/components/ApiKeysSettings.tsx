import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { makeApiClient } from '../../../api/apiClient'

export type ApiKeyMetadata = {
  id: string
  name: string
  last4: string
  createdAt: number
  expiresAt: number
  scopes: string[]
}

function skipAuthEnabled() {
  const value = import.meta.env.VITE_SKIP_AUTH
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
}

export function ApiKeysSettings({ idToken }: { idToken?: string | null }) {
  const skipAuth = useMemo(skipAuthEnabled, [])
  const client = useMemo(
    () => makeApiClient({ idToken: idToken || undefined, skipAuth }),
    [idToken, skipAuth]
  )
  const [keys, setKeys] = useState<ApiKeyMetadata[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [createdKeyId, setCreatedKeyId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async (signal?: AbortSignal) => {
    const result = await client.apiKeysList({ signal })
    if (!signal?.aborted) setKeys(Array.isArray(result?.keys) ? result.keys : [])
  }, [client])

  useEffect(() => {
    const controller = new AbortController()
    setCreatedKey(null)
    setCreatedKeyId(null)
    setCopied(false)
    setError(null)
    if (!idToken && !skipAuth) {
      setKeys([])
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    reload(controller.signal)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [idToken, skipAuth, reload])

  async function createKey(event: FormEvent) {
    event.preventDefault()
    const label = name.trim()
    if (!label || creating) return
    setCreating(true)
    setError(null)
    setCreatedKey(null)
    setCreatedKeyId(null)
    setCopied(false)
    try {
      const result = await client.apiKeysCreate(label)
      if (typeof result?.key !== 'string' || !result?.apiKey?.id) {
        throw new Error('Key creation returned an unexpected response')
      }
      setCreatedKey(result.key)
      setCreatedKeyId(result.apiKey.id)
      setName('')
      await reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  async function copyKey() {
    if (!createdKey) return
    try {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
    } catch {
      setError('Clipboard access failed. Select and copy the key manually.')
    }
  }

  async function revokeKey(key: ApiKeyMetadata) {
    if (!window.confirm('Revoke "' + key.name + '"? Clients using this key will lose access immediately.')) return
    setRevokingId(key.id)
    setError(null)
    try {
      await client.apiKeysRevoke(key.id)
      if (createdKeyId === key.id) {
        setCreatedKey(null)
        setCreatedKeyId(null)
      }
      await reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>MCP API keys</h3>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
        Create a key for external MCP clients. Keys expire after 90 days and can be revoked at any time.
        This is separate from your OpenAI API key.
      </p>

      {error && (
        <div role="alert" style={{ color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {createdKey && (
        <div style={{ border: '1px solid #a7f3d0', padding: 12, borderRadius: 6, marginBottom: 14 }}>
          <strong>New API key — copy it now</strong>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            This is the only time AWFL will display the full key. Store it in your MCP client's secret configuration.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              aria-label="New API key"
              type="text"
              readOnly
              value={createdKey}
              onFocus={event => event.currentTarget.select()}
              style={{ flex: '1 1 280px', minWidth: 0, padding: '7px 9px', borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'monospace' }}
            />
            <button type="button" onClick={copyKey} style={{ padding: '7px 12px' }}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" onClick={() => { setCreatedKey(null); setCreatedKeyId(null) }} style={{ padding: '7px 12px' }}>
              Done
            </button>
          </div>
        </div>
      )}

      <form onSubmit={createKey} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          aria-label="API key name"
          placeholder="Key name (e.g., My MCP client)"
          value={name}
          onChange={event => setName(event.target.value)}
          maxLength={80}
          disabled={creating || (!idToken && !skipAuth)}
          style={{ flex: '1 1 240px', minWidth: 0, padding: '7px 9px', borderRadius: 6, border: '1px solid #d1d5db' }}
        />
        <button type="submit" disabled={creating || !name.trim() || (!idToken && !skipAuth)}
          style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#eef2ff' }}>
          {creating ? 'Creating…' : 'Create API key'}
        </button>
      </form>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Your API keys</div>
      {loading ? <div style={{ color: '#6b7280', fontSize: 13 }}>Loading…</div> : (
        keys.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 13 }}>No API keys created yet.</div>
        ) : (
          <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {keys.map(key => (
              <li key={key.id} style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{key.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                    Ending in {key.last4} · Created {new Date(key.createdAt).toLocaleDateString()}
                    {' · '}
                    {key.expiresAt <= Date.now() ? 'Expired' : 'Expires ' + new Date(key.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <button type="button" onClick={() => revokeKey(key)} disabled={revokingId !== null}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2' }}>
                  {revokingId === key.id ? 'Revoking…' : 'Revoke'}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  )
}
