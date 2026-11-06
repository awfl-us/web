import { useEffect, useMemo, useRef, useState } from 'react'
import { makeApiClient } from '../../../api/apiClient'
import { useProjectUpdate } from '../hooks/useProjectUpdate'
import { useProjectDelete } from '../hooks/useProjectDelete'
import type { Project } from '../types/project'

type GithubAppStatus = {
  configured: boolean
  connected: boolean
  repository: string | null
  remoteRepository: string | null
  installationUrl: string | null
  needsReconnect: boolean
}

export type EditProjectModalProps = {
  idToken?: string | null
  open: boolean
  project: Project | null
  onClose: () => void
  onUpdated?: (project: Project) => void
  onDeleted?: (projectId: string) => void
  onOpenGitHubSettings?: () => void
  githubAppNotice?: string | null
}

export function EditProjectModal(props: EditProjectModalProps) {
  const { idToken, open, project, onClose, onUpdated, onDeleted, onOpenGitHubSettings, githubAppNotice } = props
  const initialName = useMemo(() => project?.name || '', [project])
  const initialRemote = useMemo(() => project?.remote || '', [project])
  const [name, setName] = useState(initialName)
  const [remote, setRemote] = useState(initialRemote)
  const { update, loading: saving, error: saveError } = useProjectUpdate({ idToken, enabled: open })
  const { remove, loading: deleting, error: deleteError } = useProjectDelete({ idToken, enabled: open })
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  const [github, setGithub] = useState<GithubAppStatus | null>(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)

  const client = useMemo(() => makeApiClient({
    idToken: idToken || undefined,
    skipAuth: import.meta.env.VITE_SKIP_AUTH === '1',
  }), [idToken])

  useEffect(() => {
    if (!open || !project) return
    setName(initialName)
    setRemote(initialRemote)
    setTimeout(() => firstFieldRef.current?.focus(), 0)
  }, [open, project?.id, initialName, initialRemote])

  useEffect(() => {
    if (!open || !project || (!idToken && import.meta.env.VITE_SKIP_AUTH !== '1')) return
    const controller = new AbortController()
    setGithub(null)
    setGithubError(null)
    setGithubLoading(true)
    client.githubAppStatus(project.id, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setGithub(value as GithubAppStatus) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setGithubError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => { if (!controller.signal.aborted) setGithubLoading(false) })
    return () => controller.abort()
  }, [open, project?.id, idToken, client])

  if (!open || !project) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !project) return
    const updated = await update(project.id, { name: trimmed, remote: remote.trim() || null })
    if (updated) {
      onUpdated?.(updated)
      onClose()
    }
  }

  async function handleDelete() {
    if (!project) return
    const ok = window.confirm('Delete this project? This cannot be undone.')
    if (!ok) return
    const success = await remove(project.id)
    if (success) {
      onDeleted?.(project.id)
      onClose()
    }
  }

  async function handleGitHubConnect() {
    if (!project || githubBusy) return
    setGithubError(null)
    setGithubBusy(true)
    try {
      const response = await client.githubAppStart(project.id)
      const url = new URL(response.url)
      if (url.protocol !== 'https:' || url.hostname !== 'github.com') {
        throw new Error('Invalid GitHub authorization URL')
      }
      window.location.assign(url.toString())
    } catch (error: unknown) {
      setGithubError(error instanceof Error ? error.message : String(error))
      setGithubBusy(false)
    }
  }

  async function handleGitHubDisconnect() {
    if (!project || githubBusy) return
    if (!window.confirm('Disconnect GitHub App access for this project?')) return
    setGithubError(null)
    setGithubBusy(true)
    try {
      await client.githubAppDisconnect(project.id)
      const status = await client.githubAppStatus(project.id)
      setGithub(status as GithubAppStatus)
    } catch (error: unknown) {
      setGithubError(error instanceof Error ? error.message : String(error))
    } finally {
      setGithubBusy(false)
    }
  }

  const remoteIsSaved = remote.trim() === initialRemote.trim()
  const anyError = saveError || deleteError || githubError
  const busy = saving || deleting || githubBusy

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit project" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.5)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: 8, border: '1px solid #e5e7eb',
        width: 'min(520px, calc(100vw - 32px))', maxHeight: '90dvh', overflowY: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <strong>Edit project</strong>
            <button type="button" onClick={onClose} aria-label="Close" style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gap: 10, padding: 16 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>Name<span aria-hidden>*</span></span>
              <input ref={firstFieldRef} value={name} onChange={e => setName(e.target.value)} placeholder="Project name" required disabled={busy} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>Git remote (optional)</span>
              <input value={remote} onChange={e => setRemote(e.target.value)} placeholder="https://github.com/owner/repo.git" disabled={busy} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db' }} />
            </label>

            <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
              <strong style={{ fontSize: 14 }}>GitHub access</strong>
              {githubAppNotice === 'connected' && (
                <div role="status" style={{ color: '#065f46', fontSize: 13 }}>GitHub App connected successfully.</div>
              )}
              {githubAppNotice === 'install_required' && (
                <div role="status" style={{ color: '#92400e', fontSize: 13 }}>
                  GitHub authorization succeeded, but the AWFL GitHub App needs to be installed with access to this repository.
                </div>
              )}
              {githubAppNotice === 'installed' && (
                <div role="status" style={{ fontSize: 13 }}>Installation updated. Select Connect GitHub to finish linking this project.</div>
              )}
              {githubLoading ? (
                <div style={{ color: '#6b7280', fontSize: 13 }}>Checking GitHub connection…</div>
              ) : github?.connected ? (
                <div style={{ fontSize: 13, color: '#065f46' }}>
                  Connected to {github.repository}
                  {github.needsReconnect ? ' (project remote changed — reconnect required)' : ''}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {github?.configured === false ? 'GitHub App not configured on the server yet.' : 'No GitHub App connected to this project.'}
                </div>
              )}
              {!remoteIsSaved && (
                <div style={{ fontSize: 12, color: '#92400e' }}>Save your new Git remote first, then reopen this modal to connect GitHub.</div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={handleGitHubConnect}
                  disabled={busy || githubLoading || !github?.configured || !github.remoteRepository || !remoteIsSaved}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#eef2ff' }}>
                  {githubBusy ? 'Connecting…' : github?.connected ? 'Reconnect GitHub' : 'Connect GitHub'}
                </button>
                {github?.connected && (
                  <button type="button" onClick={handleGitHubDisconnect} disabled={busy}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}>
                    Disconnect
                  </button>
                )}
                {githubAppNotice === 'install_required' && github?.installationUrl && (
                  <a href={github.installationUrl} target="_self"
                    style={{ padding: '7px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db' }}>
                    Install GitHub App
                  </a>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Authorize AWFL on GitHub without creating a personal access token. Repository access can be changed in GitHub.
                Existing PAT credentials still work.
              </div>
              {onOpenGitHubSettings && (
                <button type="button" onClick={onOpenGitHubSettings}
                  style={{ justifySelf: 'start', background: 'transparent', border: 'none', padding: 0, color: '#2563eb', cursor: 'pointer' }}>
                  Manage GitHub PAT instead
                </button>
              )}
            </section>

            {anyError && (
              <div role="alert" style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: 6 }}>
                {anyError}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
            <button type="button" onClick={handleDelete} disabled={busy}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #b91c1c', background: '#ef4444', color: 'white' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} disabled={busy}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}>Cancel</button>
              <button type="submit" disabled={busy || !name.trim()}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #1d4ed8', background: '#2563eb', color: 'white' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
