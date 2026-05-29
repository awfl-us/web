import { useEffect, useMemo, useRef, useState } from 'react'
import { useProjectUpdate } from '../hooks/useProjectUpdate'
import { useProjectDelete } from '../hooks/useProjectDelete'
import type { Project } from '../types/project'

export type EditProjectModalProps = {
  idToken?: string | null
  open: boolean
  project: Project | null
  onClose: () => void
  onUpdated?: (project: Project) => void
  onDeleted?: (projectId: string) => void
}

export function EditProjectModal(props: EditProjectModalProps) {
  const { idToken, open, project, onClose, onUpdated, onDeleted } = props
  const initialName = useMemo(() => project?.name || '', [project])
  const initialRemote = useMemo(() => project?.remote || '', [project])
  const [name, setName] = useState(initialName)
  const [remote, setRemote] = useState(initialRemote)
  const { update, loading: saving, error: saveError } = useProjectUpdate({ idToken, enabled: open })
  const { remove, loading: deleting, error: deleteError } = useProjectDelete({ idToken, enabled: open })
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setRemote(initialRemote)
      setTimeout(() => firstFieldRef.current?.focus(), 0)
    }
  }, [open, initialName, initialRemote])

  if (!open || !project) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
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

  const anyError = saveError || deleteError

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit project" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.5)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '20%', transform: 'translateX(-50%)', background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', width: 'min(520px, calc(100vw - 32px))', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <strong>Edit project</strong>
            <button type="button" onClick={onClose} aria-label="Close" style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gap: 10, padding: 16 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>Name<span aria-hidden>*</span></span>
              <input ref={firstFieldRef} value={name} onChange={e => setName(e.target.value)} placeholder="Project name" required disabled={saving || deleting} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db' }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>Git remote (optional)</span>
              <input value={remote} onChange={e => setRemote(e.target.value)} placeholder="https://github.com/owner/repo.git" disabled={saving || deleting} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db' }} />
            </label>
            {anyError ? (
              <div role="alert" style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: 6 }}>
                {anyError}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
            <button type="button" onClick={handleDelete} disabled={saving || deleting} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #b91c1c', background: '#ef4444', color: 'white' }}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} disabled={saving || deleting} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}>Cancel</button>
              <button type="submit" disabled={saving || deleting || !name.trim()} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #1d4ed8', background: '#2563eb', color: 'white' }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
