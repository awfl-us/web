import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

const API = (import.meta.env.VITE_API_BASE || 'https://api.awfl.us').replace(/\/$/, '')
type ConsentRequest = { client_name: string; resource: string; scope: string }

export default function McpOAuthConsent() {
  const { user, loading, signIn, idToken } = useAuth()
  const requestId = new URLSearchParams(window.location.search).get('request') || ''
  const [request, setRequest] = useState<ConsentRequest | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!idToken || !requestId) return
    let cancelled = false
    fetch(API + '/oauth/requests/' + encodeURIComponent(requestId), {
      headers: { Authorization: 'Bearer ' + idToken },
      cache: 'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error(response.status === 403
        ? 'This Google account is not authorized to connect AWFL.'
        : 'This authorization request has expired or is invalid.')
      return response.json() as Promise<ConsentRequest>
    }).then(data => { if (!cancelled) { setRequest(data); setError('') } })
      .catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [idToken, requestId])

  async function decide(approve: boolean) {
    if (!idToken || !requestId) return
    setWorking(true)
    setError('')
    try {
      const response = await fetch(API + '/oauth/decide', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, approve }),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Authorization could not be completed. Please try connecting again.')
      const data = await response.json()
      const redirect = new URL(data.redirect_url)
      if (redirect.origin !== 'https://chatgpt.com') throw new Error('Invalid OAuth redirect')
      window.location.assign(redirect.toString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed')
      setWorking(false)
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', background: '#f7f8fa',
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, color: '#172033' }}>
      <section style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 14,
        padding: '28px 30px', width: '100%', maxWidth: 470, boxShadow: '0 12px 40px #11182712' }}>
        <img src="/awfl.svg" alt="AWFL" width={38} height={38} />
        <h1 style={{ fontSize: 23, marginBottom: 8 }}>Connect AWFL to ChatGPT</h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
          Sign in with your existing AWFL Google account to authorize access.
        </p>
        {loading ? <p>Checking your sign-in…</p> : !user ? (
          <button onClick={() => signIn().catch(() => setError('Google sign-in was cancelled.'))}
            style={{ padding: '11px 16px', cursor: 'pointer' }}>Sign in with Google</button>
        ) : (
          <>
            <p style={{ fontSize: 14 }}>Signed in as <strong>{user.email}</strong></p>
            {request && (
              <>
                <p><strong>{request.client_name}</strong> requests access to:</p>
                <p style={{ padding: 12, background: '#f1f5f9', borderRadius: 8, overflowWrap: 'anywhere' }}>
                  AWFL API — projects, workflows, cloud environments and agent sessions
                </p>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>
                  This authorization uses the same AWFL account and permissions as the web app.
                  The token permits calls to AWFL APIs and both MCP endpoints, including actions
                  that change projects, launch agents, execute commands, and incur costs.
                  Only authorize ChatGPT if you trust this access.
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
                  <button disabled={working} onClick={() => void decide(false)}
                    style={{ padding: '11px 15px', cursor: 'pointer', flex: 1 }}>Cancel</button>
                  <button disabled={working} onClick={() => void decide(true)}
                    style={{ padding: '11px 15px', cursor: 'pointer', flex: 1,
                      border: 'none', borderRadius: 6, background: '#1d4ed8', color: 'white' }}>
                    {working ? 'Connecting…' : 'Authorize ChatGPT'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}
        {!requestId && <p role="alert">Missing authorization request.</p>}
      </section>
    </main>
  )
}
