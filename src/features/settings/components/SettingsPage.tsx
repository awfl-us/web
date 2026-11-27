import { useEffect, useState } from 'react'
import { useCredsApi } from '../hooks/useCredsApi'
import { ApiKeysSettings } from './ApiKeysSettings'

export type SettingsPageProps = {
  idToken?: string | null
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'opencode', name: 'OpenCode', placeholder: 'Enter OpenCode API key' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'Enter DeepSeek API key' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'Enter Anthropic API key' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'Enter Gemini API key' },
  { id: 'grok', name: 'xAI', placeholder: 'Enter xAI API key' },
] as const
type ProviderId = typeof PROVIDERS[number]['id']
const emptyInputs = () => Object.fromEntries(PROVIDERS.map(p => [p.id, ''])) as Record<ProviderId, string>

export function SettingsPage(props: SettingsPageProps) {
  const { idToken } = props
  const { creds, loading, error, reload, setCred, deleteCred } = useCredsApi({ idToken, enabled: true })

  const [inputs, setInputs] = useState<Record<ProviderId, string>>(emptyInputs)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setLocalError(null)
    setInputs(emptyInputs())
  }, [idToken])

  async function handleSave(provider: ProviderId) {
    setLocalError(null)
    if (!inputs[provider].trim()) {
      setLocalError('Please enter an API key value.')
      return
    }
    setSaving(true)
    try {
      await setCred(provider, inputs[provider].trim())
      setInputs(previous => ({ ...previous, [provider]: '' }))
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
      if (PROVIDERS.some(p => p.id === provider)) setInputs(previous => ({ ...previous, [provider]: '' }))
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
            Stored securely. Write-only: you can update or delete saved values. AWFL automatically selects the lowest estimated-cost compatible provider with a saved key.
          </div>

          {(error || localError) && (
            <div style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: 6, marginBottom: 12 }}>
              {localError || error}
            </div>
          )}

          <div style={{ display: 'grid', gap: 12, alignItems: 'start' }}>
            {PROVIDERS.map(provider => {
              const cred = creds.find(c => c.provider === provider.id)
              const input = inputs[provider.id]
              return (
                <div key={provider.id} style={{ display: 'grid', gap: 6 }}>
                  <label htmlFor={`credential-${provider.id}`} style={{ fontWeight: 600 }}>{provider.name} API key</label>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                    {cred?.hasValue ? (
                      <>
                        Status: Set
                        {cred.last4 ? ` • ending in ${cred.last4}` : ''}
                        {cred.updated ? ` • Updated ${new Date(cred.updated).toLocaleString()}` : ''}
                      </>
                    ) : 'Status: Not set'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      id={`credential-${provider.id}`}
                      type="password"
                      autoComplete="off"
                      placeholder={provider.placeholder}
                      value={input}
                      onChange={e => setInputs(previous => ({ ...previous, [provider.id]: e.target.value }))}
                      style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                    <button
                      onClick={() => handleSave(provider.id)}
                      disabled={saving || deleting || !input.trim()}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#eef2ff' }}
                    >
                      {cred?.hasValue ? 'Update' : 'Save'}
                    </button>
                    {cred?.hasValue && (
                      <button
                        onClick={() => handleDelete(provider.id)}
                        disabled={saving || deleting}
                        title={`Delete stored ${provider.name} key`}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

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
                        disabled={saving || deleting}
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

        <ApiKeysSettings idToken={idToken} />

        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>How to get an OpenCode API key</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            Sign in to the <a href="https://opencode.ai/console" target="_blank" rel="noreferrer">OpenCode Console</a>,
            add credits, create an API key, and save it above. Choose a model in the session model selector; AWFL selects the provider automatically.
          </p>
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
