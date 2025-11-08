import { useEffect, useMemo, useState } from 'react'
import { useCredsApi, type CredMeta } from '../hooks/useCredsApi'

export type SettingsPageProps = {
  idToken?: string | null
}

export function SettingsPage(props: SettingsPageProps) {
  const { idToken } = props
  const { creds, loading, error, reload, setCred, deleteCred } = useCredsApi({ idToken, enabled: true })

  const openai: CredMeta | undefined = useMemo(() => creds.find(c => c.provider === 'openai'), [creds])

  const [openaiInput, setOpenaiInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setLocalError(null)
  }, [idToken])

  async function handleSave() {
    setLocalError(null)
    if (!openaiInput.trim()) {
      setLocalError('Please enter an API key value.')
      return
    }
    setSaving(true)
    try {
      await setCred('openai', openaiInput.trim())
      setOpenaiInput('')
      await reload()
    } catch (e: any) {
      setLocalError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(provider: string) {
    setLocalError(null)
    setDeleting(true)
    try {
      await deleteCred(provider)
      if (provider === 'openai') setOpenaiInput('')
      await reload()
    } catch (e: any) {
      setLocalError(e?.message || String(e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Settings</h2>
        <div style={{ color: '#6b7280', fontSize: 12 }}>Manage your settings.</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16, display: 'grid', gap: 16 }}>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Credentials</h3>
          <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>
            Stored securely. Write-only: you can update or delete saved values.
          </div>

          {(error || localError) && (
            <div style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: 6, marginBottom: 12 }}>
              {localError || error}
            </div>
          )}

          <div style={{ display: 'grid', gap: 12, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontWeight: 600 }}>OpenAI API key</label>
              <div style={{ color: '#6b7280', fontSize: 12 }}>
                {openai?.hasValue ? (
                  <>
                    Status: Set
                    {openai?.last4 ? ` • ending in ${openai.last4}` : ''}
                    {openai?.updated ? ` • Updated ${new Date(openai.updated).toLocaleString()}` : ''}
                  </>
                ) : (
                  'Status: Not set'
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={openaiInput}
                  onChange={e => setOpenaiInput(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !openaiInput.trim()}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#eef2ff' }}
                >
                  {openai?.hasValue ? 'Update' : 'Save'}
                </button>
                {openai?.hasValue && (
                  <button
                    onClick={() => handleDelete('openai')}
                    disabled={deleting}
                    title="Delete stored key"
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ color: '#6b7280' }}>Loading…</div>
            ) : creds.length ? (
              <div>
                <div style={{ fontWeight: 600, marginTop: 8, marginBottom: 6 }}>Stored credentials</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                  {creds.map(c => (
                    <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14 }}>{c.provider}</div>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>
                          {c.hasValue ? 'Set' : 'Empty'}
                          {c.last4 ? ` • ending in ${c.last4}` : ''}
                          {c.updated ? ` • ${new Date(c.updated).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(c.provider)}
                        disabled={deleting}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2' }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        {/* OpenAI setup instructions */}
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>How to get an OpenAI API key (≈3 minutes)</h3>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8, color: '#374151' }}>
            <li>
              Visit{' '}
              <a href="https://platform.openai.com/" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                platform.openai.com
              </a>{' '}
              and sign up or sign in.
            </li>
            <li>
              Open the{' '}
              <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                Billing settings
              </a>{' '}
              to add a payment method or verify available credits.
            </li>
            <li>
              Go to{' '}
              <a href="https://platform.openai.com/settings/organization/api-keys" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                API keys
              </a>{' '}
              and click <strong>Create new secret key</strong>.
            </li>
            <li>
              Copy the generated key (starts with <code>sk-</code>) and paste it in the field above, then click <strong>Save</strong>.
            </li>
          </ol>
          <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
            Tips: Keep your key private. You can rotate or delete it anytime in OpenAI settings. This app stores your key securely and never
            reads it back; we only display limited metadata (e.g., last 4) provided by the server.
          </div>
        </section>
      </div>
    </div>
  )
}
