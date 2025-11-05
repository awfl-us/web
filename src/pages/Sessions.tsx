import { useMemo, useState, useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthProvider'

// Components
import { SessionSidebar, SessionDetail } from '../features/sessions/public'
import { TaskModal } from '../features/tasks/public'
import { AgentModal } from '../features/agents/public'
import { SidebarNav } from '../features/sidebar/public'
import { FileSystemSidebar } from '../features/filesystem/public'
import { FileEditorModal } from '../features/fileviewer/public'

// Types
import type { Session } from '../features/sessions/public'
import type { ToolItem } from '../features/tools/public'

// Hooks
import { useSessionsList } from '../features/sessions/public'
import { useTopicContextYoj } from '../features/yoj/public'
import { useWorkflowExec, useDebouncedValue, useScrollHome, useSessionPolling } from '../core/public'
import { useTasksCounts, useSessionTasks } from '../features/tasks/public'
import { useAgentsApi } from '../features/agents/public'
import { usePlainify } from '../features/plain/public'
import { useToolExec } from '../features/tools/public'

// Utils
import { filterSessionsByQuery, mapTopicInfoToSession } from '../features/sessions/public'

const mockSessions: Session[] = []

export default function Sessions() {
  const { idToken, user } = useAuth()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [leftPanel, setLeftPanel] = useState<'sessions' | 'fs'>('sessions')

  // Load sessions via hook
  const { sessions, loading: loadingList, error: listError } = useSessionsList({
    userId: user?.uid,
    idToken,
    field: 'update_time',
    order: 'desc',
    start: 0,
    end: 4102444800,
    mapDocToSession: mapTopicInfoToSession,
  })

  // If auth is missing, clear selection
  useEffect(() => {
    if (!idToken || !user?.uid) {
      setSelectedId(null)
    }
  }, [idToken, user?.uid])

  // Initialize/reset selection when sessions change
  useEffect(() => {
    if (!selectedId && sessions.length) {
      setSelectedId(sessions[0].id)
    } else if (selectedId && sessions.length && !sessions.find(s => s.id === selectedId)) {
      // Previously selected session is no longer present; select first
      setSelectedId(sessions[0].id)
    }
  }, [sessions, selectedId])

  const sourceSessions = sessions.length ? sessions : mockSessions

  // Debounce query to reduce recomputation during fast typing
  const debouncedQuery = useDebouncedValue(query, 200)

  // Filter sessions using shared helper
  const filtered = useMemo(() => filterSessionsByQuery(sourceSessions, debouncedQuery), [sourceSessions, debouncedQuery])

  const selected = useMemo(() => {
    if (!filtered.length) return null
    const byId = filtered.find(s => s.id === (selectedId ?? ''))
    return byId ?? filtered[0]
  }, [filtered, selectedId])

  // Compute workflow name: same as sessionId, suffixed with WORKFLOW_ENV (Dev when running locally)
  const env = (import.meta as any)?.env
  const rawSuffix = env?.VITE_WORKFLOW_ENV
  const workflowEnvSuffix = rawSuffix && String(rawSuffix).trim().length > 0 ? rawSuffix : (env?.DEV ? 'Dev' : '')
  const workflowName = selected?.id ? `${selected.id}${workflowEnvSuffix || ''}` : null

  // Task counts for selected session
  const { counts: taskCounts, reload: reloadTaskCounts } = useTasksCounts({
    sessionId: selected?.id,
    idToken,
    enabled: !!selected,
  })

  // Session tasks logic (status selection, inline list, modal CRUD)
  const {
    activeTaskStatus,
    setActiveTaskStatus,
    sessionTasks,
    loadingTasks,
    tasksError,
    reloadTasks,
    taskModalOpen,
    taskModalMode,
    editingTask,
    openAddTask,
    handleEditTask,
    closeTaskModal,
    handleSaveTask,
    handleDeleteTask,
  } = useSessionTasks({
    sessionId: selected?.id,
    idToken,
    workflowName,
    startWf: useWorkflowExec({ sessionId: selected?.id, idToken, enabled: !!selected }).start,
    enabled: !!selected,
    reloadTaskCounts,
  })

  // Topic context messages for selected session (disabled while viewing tasks)
  const { messages, running, error: execError, reload } = useTopicContextYoj({
    sessionId: selected?.id,
    idToken,
    windowSeconds: 3600,
    enabled: !!selected && !activeTaskStatus,
  })

  // Scroll container/anchor refs
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Reusable auto-scroll behavior with "home" detection:
  const home: 'top' | 'bottom' = activeTaskStatus ? 'top' : 'bottom'
  const itemCount = activeTaskStatus ? (sessionTasks?.length || 0) : (messages?.length || 0)
  const viewKey = `${selected?.id || 'none'}:${activeTaskStatus ? `tasks:${activeTaskStatus}` : 'messages'}`

  useScrollHome({
    containerRef: scrollRef,
    anchorRef: home === 'bottom' ? bottomRef : undefined,
    itemCount,
    home,
    enabled: !!selected,
    key: viewKey,
  })

  // Workflow execution (execute/stop) for current session
  const { status: wfStatus, running: wfRunning, error: wfError, start: startWf, stop: stopWf } = useWorkflowExec({
    sessionId: selected?.id,
    idToken,
    enabled: !!selected,
  })

  // Plainify: encapsulated hook
  const {
    pendingCount: plainifyPending,
    plainify: handleFsPlainify,
    errorCount: plainifyErrorCount,
    dismissErrors: handlePlainifyDismissErrors,
  } = usePlainify({
    sessionId: selected?.id,
    idToken,
    enabled: !!selected,
  })

  const [submitting, setSubmitting] = useState(false)

  async function handlePromptSubmit(text: string) {
    if (!workflowName) return
    try {
      setSubmitting(true)
      await startWf(workflowName, { query: text })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStop() {
    try {
      await stopWf({ includeDescendants: true, workflow: workflowName || undefined })
    } catch {}
  }

  // Encapsulated polling for messages/tasks and counts
  useSessionPolling({
    enabled: !!selected?.id,
    sessionId: selected?.id,
    activeTaskStatus,
    running: !!running,
    reloadMessages: reload,
    reloadTaskCounts,
    reloadInlineTasks: reloadTasks,
    intervalMs: 1500,
  })

  // Agent modal state and handlers
  const [agentModalOpen, setAgentModalOpen] = useState(false)
  const [agentModalMode, setAgentModalMode] = useState<'create' | 'edit'>('edit')
  const [agentInitial, setAgentInitial] = useState<{ id?: string; name: string; description?: string | null; workflowName?: string | null; tools?: string[] } | null>(null)
  const [toolsList, setToolsList] = useState<ToolItem[]>([])
  const { listTools, getAgentByName, getAgentById, listAgentTools, getSessionAgentMapping, linkSessionAgent, saveAgent } = useAgentsApi({ idToken, enabled: agentModalOpen })

  async function openEditAgent() {
    if (!selected?.id) return
    setAgentModalOpen(true)
    setAgentModalMode('edit')
    try {
      const [registryTools, mapping] = await Promise.all([listTools(), getSessionAgentMapping(selected.id)])
      setToolsList(registryTools)

      let existing: { id: string; name: string; description: string | null; workflowName: string | null; tools: string[] } | null = null
      if (mapping?.agentId) {
        existing = await getAgentById(mapping.agentId)
        // fallback to name match if mapping refers to a missing agent
        if (!existing) existing = await getAgentByName(selected.id)
      } else {
        existing = await getAgentByName(selected.id)
      }

      let defaultTools: string[] = []
      if (!existing) {
        try {
          // Ask backend for default tools by passing the reserved "default" agent id
          defaultTools = await listAgentTools('default')
        } catch {
          defaultTools = []
        }
      }

      const init = existing
        ? { id: existing.id, name: existing.name, description: existing.description ?? '', workflowName: existing.workflowName ?? (workflowName || ''), tools: existing.tools || [] }
        : { name: selected.id, description: '', workflowName: workflowName || '', tools: defaultTools }
      setAgentInitial(init)
    } catch (e) {
      // Keep modal open; tools list may be empty on error; initial falls back
      const init = { name: selected.id, description: '', workflowName: workflowName || '', tools: [] }
      setAgentInitial(init)
      setToolsList([])
    }
  }

  async function handleSaveAgent(input: { id?: string; name: string; description?: string | null; workflowName?: string | null; tools?: string[] }) {
    const saved = await saveAgent(input)
    // Link session to this agent id for future lookups
    if (saved && selected?.id) {
      try { await linkSessionAgent(selected.id, saved.id) } catch {}
    }
  }

  // File editor modal state and handlers
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [fileModalPath, setFileModalPath] = useState<string | null>(null)
  const { runCommand } = useToolExec({ idToken, enabled: !!selected })

  function shQuotePath(p: string) {
    const s = p || '.'
    return `'${s.replace(/'/g, `'\\''`)}'`
  }

  function decodeCliResult(resp: any): { output: string; error: string } {
    try {
      const enc = resp?.result?.encoded
      if (typeof enc !== 'string') return { output: '', error: '' }
      const parsed = JSON.parse(enc)
      const output = typeof parsed?.output === 'string' ? parsed.output : ''
      const error = typeof parsed?.error === 'string' ? parsed.error : ''
      return { output, error }
    } catch {
      return { output: '', error: '' }
    }
  }

  const handleOpenFile = (path: string) => {
    setFileModalPath(path)
    setFileModalOpen(true)
  }

  const handleLoadFile = async (path: string, signal: AbortSignal) => {
    const cmd = `cat ${shQuotePath(`plain/${path}`)}`
    const resp = await runCommand(cmd, { signal })
    const { output, error } = decodeCliResult(resp)
    if (error) throw new Error(error)
    return { content: output }
  }

  const handleSaveFile = async (content: string, path?: string | null) => {
    if (!path) return
    // UTF-8 safe base64 encode
    let b64 = ''
    try {
      b64 = btoa(unescape(encodeURIComponent(content)))
    } catch {
      b64 = btoa(content)
    }
    const cmd = `echo ${shQuotePath(b64)} | base64 -d > ${shQuotePath(`plain/${path}`)}`
    const resp = await runCommand(cmd)
    const { error } = decodeCliResult(resp)
    if (error) throw new Error(error)
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        boxSizing: 'border-box',
        minHeight: 0,
        overflow: 'hidden',
        overflowX: 'hidden',
        padding: 16,
        gap: 16,
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          height: '100%',
          minHeight: 0,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <SidebarNav
          items={[
            { key: 'sessions', label: 'S', title: 'Sessions' },
            { key: 'fs', label: 'F', title: 'Filesystem' },
          ]}
          selectedKey={leftPanel}
          onSelect={(key: string) => setLeftPanel(key === 'fs' ? 'fs' : 'sessions')}
        />
        <div
          style={{
            height: '100%',
            minHeight: 0,
            overflow: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          {leftPanel === 'sessions' ? (
            <SessionSidebar
              sessions={filtered}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id)
                setActiveTaskStatus(null)
              }}
              loading={loadingList}
              error={listError}
              query={query}
              onQueryChange={setQuery}
            />
          ) : (
            <FileSystemSidebar
              sessionId={selected?.id}
              idToken={idToken}
              pendingCount={plainifyPending}
              errorCount={plainifyErrorCount}
              onDismissError={handlePlainifyDismissErrors}
              onPlainify={handleFsPlainify}
              onOpenFile={handleOpenFile}
            />
          )}
        </div>
      </div>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'stretch',
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        {!selected ? (
          <div style={{ color: '#6b7280', textAlign: 'left' }}>Select a session to view details.</div>
        ) : (
          <SessionDetail
            title={selected.title}
            updatedAt={selected.updatedAt}
            counts={taskCounts || undefined}
            onTitleClick={activeTaskStatus ? () => setActiveTaskStatus(null) : undefined}
            onCountClick={(status) => setActiveTaskStatus(status)}
            activeStatus={activeTaskStatus}
            onAddTask={openAddTask}
            onEditAgent={openEditAgent}
            execError={execError}
            wfError={wfError}
            running={running}
            messages={messages as any}
            tasksError={tasksError}
            loadingTasks={loadingTasks}
            sessionTasks={sessionTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            containerRef={scrollRef}
            bottomRef={bottomRef}
            // Identity for collapse state persistence
            sessionId={selected.id}
            idToken={idToken}
            promptPlaceholder={workflowName ? `Trigger workflow ${workflowName}…` : 'Select a session to trigger workflow'}
            wfStatus={wfStatus}
            wfRunning={wfRunning}
            submitting={submitting}
            onSubmit={handlePromptSubmit}
            onStop={handleStop}
            promptDisabled={!selected}
          />
        )}
      </main>

      <TaskModal
        open={taskModalOpen}
        mode={taskModalMode}
        initial={editingTask ?? undefined}
        onClose={closeTaskModal}
        onSave={handleSaveTask}
      />

      <AgentModal
        open={agentModalOpen}
        mode={agentModalMode}
        initial={agentInitial || { name: selected?.id || '', description: '', workflowName: workflowName || '', tools: [] }}
        tools={toolsList}
        onClose={() => setAgentModalOpen(false)}
        onSave={handleSaveAgent}
      />

      <FileEditorModal
        open={fileModalOpen}
        path={fileModalPath || undefined}
        onClose={() => setFileModalOpen(false)}
        load={handleLoadFile}
        onSave={handleSaveFile}
        readOnly={false}
      />
    </div>
  )
}
