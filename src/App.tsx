import { useEffect, useState, type ChangeEvent } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Sessions from './pages/Sessions'
import Tasks from './pages/Tasks'
import IntegrationsGitHub from './pages/IntegrationsGitHub'
import { useAuth } from './auth/AuthProvider'
import { getCookie, setCookie } from './utils/cookies'
import { useProjectsList } from './features/projects/public'

type Route = 'home' | 'sessions' | 'tasks' | 'integrations-github'

function Home() {
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <p>Welcome! Use the navigation above to open the Sessions or Tasks pages.</p>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  )
}

function App() {
  const [route, setRoute] = useState<Route>('home')
  const { user, loading, signIn, signOut, idToken } = useAuth() as any

  // GitHub project selection (header dropdown)
  const [projectId, setProjectId] = useState<string>(getCookie('awfl.projectId') || '')

  // Load projects from API (encapsulated in features/projects)
  const { projects, loading: loadingProjects } = useProjectsList({ idToken, enabled: true })

  // Ensure cookie is applied on mount if present
  useEffect(() => {
    if (projectId) setCookie('awfl.projectId', projectId)
  }, [])

  function handleProjectSelect(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    if (next === '__manage__') {
      setRoute('integrations-github')
      return
    }
    setProjectId(next)
    if (next) setCookie('awfl.projectId', next)
  }

  const AuthControls = () => (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
      {loading ? (
        <span style={{ fontSize: 12, color: '#6b7280' }}>Auth…</span>
      ) : user ? (
        <>
          <span style={{ fontSize: 12, color: '#374151' }}>
            {user.displayName || user.email || 'Signed in'}
          </span>
          <button
            onClick={signOut}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}
          >
            Sign out
          </button>
        </>
      ) : (
        <button
          onClick={signIn}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}
        >
          Sign in with Google
        </button>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <strong>AWFL</strong>
        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setRoute('home')}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: route === 'home' ? '#eef2ff' : 'white' }}
          >
            Home
          </button>
          <button
            onClick={() => setRoute('sessions')}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: route === 'sessions' ? '#eef2ff' : 'white' }}
          >
            Sessions
          </button>
          <button
            onClick={() => setRoute('tasks')}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: route === 'tasks' ? '#eef2ff' : 'white' }}
          >
            Tasks
          </button>

          {/* GitHub project dropdown replaces the old button */}
          <select
            value={projectId || ''}
            onChange={handleProjectSelect}
            title="Select GitHub project or manage settings"
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}
          >
            <option value="">{loadingProjects ? 'Loading…' : projects.length ? 'Select project…' : 'No projects'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name || p.remote || p.id}</option>
            ))}
            <option value="__manage__">Manage…</option>
          </select>
        </nav>
        <AuthControls />
      </header>

      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {route === 'home' ? (
          <div style={{ padding: 16, height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
            <Home />
          </div>
        ) : loading ? (
          <div style={{ color: '#6b7280', padding: 16 }}>Loading auth…</div>
        ) : user ? (
          route === 'sessions' ? (
            <Sessions />
          ) : route === 'tasks' ? (
            <Tasks />
          ) : (
            <IntegrationsGitHub />
          )
        ) : (
          <div style={{ display: 'grid', gap: 8, padding: 16 }}>
            <div style={{ color: '#374151' }}>Please sign in to view {route === 'sessions' ? 'Sessions' : route === 'tasks' ? 'Tasks' : 'GitHub'}.</div>
            <div>
              <button
                onClick={signIn}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}
              >
                Sign in with Google
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
