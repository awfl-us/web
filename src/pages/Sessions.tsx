import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/AuthProvider'

// Components & hooks from features
import {
  SessionSidebar,
  SessionDetail,
  useSessionSelection,
  filterSessionsByQuery,
  mapTopicInfoToSession,
  getWorkflowName,
  NewSessionModal,
  useNewSessionAgents,
  useNewSessionCreation,
} from '../features/sessions/public'
import { TaskModal } from '../features/tasks/public'
import { AgentModal, useAgentModalController, useSessionAgentConfig, useAgentsApi } from '../features/agents/public'
import { SidebarNav } from '../features/sidebar/public'
import { FileSystemSidebar } from '../features/filesystem/public'
import { FileEditorModal, useFileEditorController } from '../features/fileviewer/public'
import { useWorkflowsList } from '../features/workflows/public'

// Types
import type { Session } from '../features/sessions/public'

// Hooks
import { useSessionsList } from '../features/sessions/public'
import { useTopicContextYoj } from '../features/yoj/public'
import { useWorkflowExec, useDebouncedValue, useSessionPolling } from '../core/public'
import { useTasksCounts, useSessionTasks } from '../features/tasks/public'
import { usePlainify } from '../features/plain/public'
import { useScrollHome} from '../features/sessions/public'

const mockSessions: Session[] = []

export default function Sessions(props: { projectId?: string | null } = {}) {
  const { projectId = null } = props
  const { idToken, user } = useAuth()
  const [query, setQuery] = useState('')
  const [leftPanel, setLeftPanel] = useState<'sessions' | 'fs'>('sessions')

  // New Session modal state
  const [newOpen, setNewOpen] = useState(false)
  const { agents: newAgents, loading: newAgentsLoading, error: newAgentsError } = useNewSessionAgents({ idToken, enabled: newOpen })
  const { workflows, loading: workflowsLoading, error: workflowsError } = useWorkflowsList({ idToken, enabled: newOpen })
  const agentsApi = useAgentsApi({ idToken })

  // Mobile detection and pane state
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia('(max-width: 640px)').matches : false)
  useEffect(() => {
    if (!('matchMedia' in window)) return
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange)
    onChange()
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange)
    }
  }, [])
  const [pane, setPane] = useState<'list' | 'detail'>(isMobile ? 'list' : 'detail')
  useEffect(() => {
    setPane(isMobile ? 'list' : 'detail')
  }, [isMobile])

  // Load sessions via hook
  const { sessions, loading: loadingList, error: listError } = useSessionsList({
    userId: user?.uid,
    idToken,
    projectId,
    field: 'update_time',
    order: 'desc',
    start: 0,
    end: 4102444800,
    mapDocToSession: mapTopicInfoToSession,
  })

  // Debounce query to reduce recomputation during fast typing
  const debouncedQuery = useDebouncedValue(query, 200)

  // Selection lifecycle encapsulated in feature hook
  const { selectedId, setSelectedId, selected } = useSessionSelection({
    sessions: sessions || mockSessions,
    filtered: sessions || mockSessions,
    userId: user?.uid,
    idToken,
  })

  // If auth is missing, clear selection
  useEffect(() => {
    if (!idToken || !user?.uid) {
      setSelectedId(null)
    }
  }, [idToken, user?.uid, setSelectedId])

  // When project changes, clear selection immediately to avoid stale details flashing
  useEffect(() => {
    // Only clear if a projectId is provided (we avoid clearing on first mount when prop is undefined)
    if (projectId != null) setSelectedId(null)
  }, [projectId, setSelectedId])

  // When a selection changes on mobile, switch to detail; when cleared, switch to list
  useEffect(() => {
    if (!isMobile) return
    if (selectedId) setPane('detail')
    else setPane('list')
  }, [isMobile, selectedId])

  // Re-resolve selected against combined and filtered lists
  const combinedSessions = useMemo<Session[]>(() => {
    // This will be refined after ephemeral merge below; start with base list to keep selection stable
    return sessions || mockSessions
  }, [sessions])

  // Filter sessions using shared helper
  const filtered = useMemo(() => filterSessionsByQuery(combinedSessions, debouncedQuery), [combinedSessions, debouncedQuery])

  const resolvedSelection = useSessionSelection({
    sessions: combinedSessions,
    filtered,
    userId: user?.uid,
    idToken,
  })
  const selId = resolvedSelection.selectedId
  const setSelId = resolvedSelection.setSelectedId
  const sel = resolvedSelection.selected

  // Single shared workflow exec hook for this page; include agentId when configured
  const { status: wfStatus, running: wfRunning, error: wfError, start: startWf, stop: stopWf } = useWorkflowExec({
    sessionId: sel?.id,
    idToken,
    enabled: !!sel,
    agentId: null,
  })

  // Keep a ref of the current selected session id to avoid stale captures in handlers
  const currentSessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    currentSessionIdRef.current = sel?.id || null
  }, [sel?.id])

  // Wrapper that always injects the latest sessionId when starting a workflow
  const startWfForCurrentSession = useCallback(
    (workflowName: string, input?: { query?: string }, opts?: { sessionId?: string; agentId?: string }) => {
      const sid = opts?.sessionId ?? currentSessionIdRef.current ?? undefined
      return startWf(
        workflowName,
        { query: input?.query ?? '' },
        { ...opts, sessionId: sid }
      )
    },
    [startWf]
  )

  // Use new session creation hook (manages ephemeral sessions, agent linking, and kickoff)
  const { ephemeralSessions, createNewSession } = useNewSessionCreation({
    userId: user?.uid || null,
    projectId,
    startWf: startWfForCurrentSession,
    agentsApi,
  })

  // Merge ephemeral + server sessions (dedupe by id; server overrides; ephemeral-only at top)
  const mergedSessions = useMemo<Session[]>(() => {
    const base = sessions || mockSessions
    if (!base.length && !ephemeralSessions.length) return mockSessions
    const serverIds = new Set(base.map(s => s.id))
    const ephemeralOnly = ephemeralSessions.filter(s => !serverIds.has(s.id))
    return [...ephemeralOnly, ...base]
  }, [sessions, ephemeralSessions])

  // Compute workflow name based on session and env
  const sessionWorkflowName = getWorkflowName(sel?.id)

  // Agent modal controller (encapsulated in features/agents)
  const agent = useAgentModalController({
    idToken,
    sessionId: sel?.id || null,
    workflowName: sessionWorkflowName || null,
    enabled: !!sel,
  })

  // Server-backed session agent config (single source of truth for agent + workflow)
  const agentConfig = useSessionAgentConfig({ idToken, sessionId: sel?.id, enabled: !!sel })

  // Effective workflow chosen from agent configuration, falling back to session-derived
  const effectiveWorkflowName = agentConfig.workflowName || sessionWorkflowName || null

  // Task counts for selected session
  const { counts: taskCounts, reload: reloadTaskCounts } = useTasksCounts({
    sessionId: sel?.id,
    idToken,
    enabled: !!sel,
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
    sessionId: sel?.id,
    idToken,
    workflowName: effectiveWorkflowName || undefined,
    startWf: startWfForCurrentSession,
    enabled: !!sel,
    reloadTaskCounts,
  })

  // Topic context messages for selected session (disabled while viewing tasks)
  const { messages, running, error: execError, reload } = useTopicContextYoj({
    sessionId: sel?.id,
    idToken,
    windowSeconds: 3600,
    enabled: !!sel && !activeTaskStatus,
  })

  // Scroll container/anchor refs
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)

  // Reusable auto-scroll behavior with "home" detection:
  const home: 'top' | 'bottom' = activeTaskStatus ? 'top' : 'bottom'
  const itemCount = activeTaskStatus ? (sessionTasks?.length || 0) : (messages?.length || 0)
  const viewKey = `${sel?.id || 'none'}:${activeTaskStatus ? `tasks:${activeTaskStatus}` : 'messages'}`

  useScrollHome({
    containerRef: scrollRef,
    anchorRef: home === 'bottom' ? bottomRef : undefined,
    itemCount,
    home,
    enabled: !!sel,
    key: viewKey,
  })

  // Plainify: encapsulated hook
  const {
    pendingCount: plainifyPending,
    plainify: handleFsPlainify,
    errorCount: plainifyErrorCount,
    dismissErrors: handlePlainifyDismissErrors,
  } = usePlainify({
    sessionId: sel?.id,
    idToken,
    enabled: !!sel,
  })

  const [submitting, setSubmitting] = useState(false)

  async function handlePromptSubmit(text: string) {
    if (!effectiveWorkflowName) return
    try {
      setSubmitting(true)
      await startWfForCurrentSession(effectiveWorkflowName, { query: text })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStop() {
    try {
      await stopWf({ includeDescendants: true, workflow: effectiveWorkflowName || undefined })
    } catch {}
  }

  // Disable timed polling; rely solely on event-driven refresh
  useSessionPolling({
    enabled: !!sel?.id,
    sessionId: sel?.id,
    activeTaskStatus,
    running: !!running,
    reloadMessages: reload,
    reloadTaskCounts,
    reloadInlineTasks: reloadTasks,
    intervalMs: 1500,
  })

  // File editor controller (encapsulated in features/fileviewer)
  const fileEditor = useFileEditorController({ idToken, enabled: !!sel, sessionId: sel?.id || null })

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
          display: isMobile ? (pane === 'list' ? 'flex' : 'none') : 'flex',
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
              sessions={filterSessionsByQuery(
                // Show ephemeral-only sessions first
                (() : Session[] => {
                  const serverIds = new Set((sessions || []).map(s => s.id))
                  const ephemeralOnly = ephemeralSessions.filter(s => !serverIds.has(s.id))
                  return [...ephemeralOnly, ...(sessions || [])]
                })(),
                debouncedQuery,
              )}
              selectedId={selId}
              onSelect={(id) => {
                setSelId(id)
                setActiveTaskStatus(null)
                if (isMobile) setPane('detail')
              }}
              loading={loadingList}
              error={listError}
              query={query}
              onQueryChange={setQuery}
              onCreateNew={() => setNewOpen(true)}
            />
          ) : (
            <FileSystemSidebar
              sessionId={sel?.id}
              idToken={idToken}
              pendingCount={plainifyPending}
              errorCount={plainifyErrorCount}
              onDismissError={handlePlainifyDismissErrors}
              onPlainify={handleFsPlainify}
              onOpenFile={fileEditor.open}
            />
          )}
        </div>
      </div>

      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: isMobile ? (pane === 'detail' ? 'flex' : 'none') : 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'stretch',
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        {!sel ? (
          <div style={{ color: '#6b7280', textAlign: 'left' }}>Select a session to view details.</div>
        ) : (
          <SessionDetail
            title={sel.title}
            updatedAt={sel.updatedAt}
            counts={taskCounts || undefined}
            onTitleClick={activeTaskStatus ? () => setActiveTaskStatus(null) : undefined}
            onCountClick={(status) => setActiveTaskStatus(status)}
            activeStatus={activeTaskStatus}
            onAddTask={openAddTask}
            onEditAgent={agent.openEdit}
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
            topRef={topRef}
            // Identity for collapse state persistence
            sessionId={sel.id}
            idToken={idToken}
            promptPlaceholder={effectiveWorkflowName ? `Trigger workflow ${effectiveWorkflowName}…` : 'Select a session to trigger workflow'}
            wfStatus={wfStatus}
            wfRunning={wfRunning}
            submitting={submitting}
            onSubmit={handlePromptSubmit}
            onStop={handleStop}
            promptDisabled={!sel}
            onBack={isMobile ? () => setPane('list') : undefined}
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
        open={agent.open}
        mode={agent.mode}
        initial={agent.initial || { name: agentConfig.workflowName || sessionWorkflowName || '', description: '', workflowName: sessionWorkflowName || '', tools: [] }}
        tools={agent.tools}
        workflows={agent.workflows}
        workflowsLoading={agent.workflowsLoading}
        onClose={() => agent.setOpen(false)}
        onSave={async (input) => {
          await agent.onSave(input)
          // Reload server-backed config so it reflects immediately and persists across reloads
          await agentConfig.reload()
        }}
      />

      <FileEditorModal
        open={fileEditor.opened}
        path={fileEditor.path || undefined}
        onClose={fileEditor.close}
        load={fileEditor.load}
        onSave={fileEditor.save}
        readOnly={false}
      />

      <NewSessionModal
        open={newOpen}
        agents={newAgents}
        agentsLoading={newAgentsLoading}
        agentsError={newAgentsError}
        workflows={workflows}
        workflowsLoading={workflowsLoading}
        workflowsError={workflowsError}
        defaultAgentName={(useSessionAgentConfig({ idToken, sessionId: (mergedSessions[0] || null)?.id || null, enabled: newOpen && !!(mergedSessions[0] || null)?.id })).agent?.name || null}
        defaultWorkflowName={(useSessionAgentConfig({ idToken, sessionId: (mergedSessions[0] || null)?.id || null, enabled: newOpen && !!(mergedSessions[0] || null)?.id })).workflowName || getWorkflowName((mergedSessions[0] || null)?.id || '') || null}
        onClose={() => setNewOpen(false)}
        onCreate={async (input) => {
          const { id } = await createNewSession(input)
          setSelId(id)
          setActiveTaskStatus(null)
          setNewOpen(false)
          if (isMobile) setPane('detail')
        }}
      />
    </div>
  )
}
