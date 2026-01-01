import { useMemo, type Ref } from 'react'
import { SessionHeader } from '../../../components/sessions/SessionHeader'
import { SessionItemsView } from '../../../components/sessions/SessionItemsView'
import { ErrorBanner } from '../../../components/common/ErrorBanner'
import { PromptComposer } from './PromptComposer'
import type { TaskRecord } from '../../tasks/hooks/useTasksList'
import type { TaskStatus } from '../../tasks/public'

export interface SessionDetailProps {
  // Header
  title: string
  updatedAt?: number | string | Date | null
  counts?: Record<string, number> | null
  onTitleClick?: () => void
  onCountClick?: (status: TaskStatus) => void
  onAddTask?: () => void
  onEditAgent?: () => void
  activeStatus: TaskStatus | null
  onBack?: () => void

  // Items (messages/tasks)
  execError?: string | null
  wfError?: string | null
  running: boolean
  messages: any[]
  tasksError?: string | null
  loadingTasks: boolean
  sessionTasks?: TaskRecord[]
  onEditTask: (t: TaskRecord) => void
  onDeleteTask: (t: TaskRecord) => void
  assistantName?: string
  hideExecGutter?: boolean

  // Scrolling
  containerRef: Ref<HTMLDivElement | null>
  bottomRef?: Ref<HTMLDivElement | null>
  topRef?: Ref<HTMLDivElement | null>

  // Identity for collapse state persistence
  sessionId?: string | null
  idToken?: string | null

  // Prompt/workflow controls
  promptPlaceholder?: string
  promptDisabled?: boolean
  wfStatus?: string | null
  wfRunning?: boolean
  submitting?: boolean
  onSubmit: (text: string) => void | Promise<void>
  onStop: () => void | Promise<void>

  // Latest exec status error (e.g., when status === Failed)
  execStatusError?: string | null
}

export function SessionDetail(props: SessionDetailProps) {
  const {
    title,
    updatedAt,
    counts,
    onTitleClick,
    onCountClick,
    onAddTask,
    onEditAgent,
    activeStatus,
    onBack,
    execError,
    wfError,
    running,
    messages,
    tasksError,
    loadingTasks,
    sessionTasks,
    onEditTask,
    onDeleteTask,
    assistantName,
    hideExecGutter,
    containerRef,
    bottomRef,
    topRef,
    sessionId,
    idToken,
    promptPlaceholder,
    promptDisabled,
    wfStatus,
    wfRunning,
    submitting,
    onSubmit,
    onStop,
    execStatusError,
  } = props

  // Rolling avg $/hr computed over the loaded messages window (SegKala: default 60m).
  // Span is based ONLY on messages that have a defined cost; summary/other messages
  // without cost are ignored for both total and span.
  const avgUsdPerHourText = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) return null
    let total = 0
    let minTs: number | null = null
    let maxTs: number | null = null
    let counted = 0

    for (const m of messages) {
      const rawCost: any = (m as any)?.cost
      const c = typeof rawCost === 'number' ? rawCost : typeof rawCost === 'string' ? parseFloat(rawCost) : NaN
      if (!isFinite(c)) continue // ignore messages without cost

      const ct: any = (m as any)?.create_time
      let ts: number | null = null
      if (typeof ct === 'number' && isFinite(ct)) {
        ts = ct // seconds epoch
      } else if (typeof ct === 'string') {
        const ms = Date.parse(ct)
        if (isFinite(ms)) ts = Math.floor(ms / 1000)
      }

      if (ts == null) continue // require a timestamp for span and inclusion

      total += c
      counted += 1
      if (minTs == null || ts < minTs) minTs = ts
      if (maxTs == null || ts > maxTs) maxTs = ts
    }

    if (!(counted > 0 && minTs != null && maxTs != null)) return null
    const span = Math.max(0, maxTs - minTs)
    if (!(total > 0 && span > 0)) return null

    const ratePerHour = total / (span / 3600)
    try {
      const nf = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      return `${nf.format(ratePerHour)}/hr`
    } catch {
      return `$${ratePerHour.toFixed(2)}/hr`
    }
  }, [messages])

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'stretch',
        minHeight: 0,
        maxWidth: '100%',
      }}
    >
      <SessionHeader
        title={title}
        updatedAt={updatedAt}
        counts={counts || undefined}
        activeStatus={activeStatus || undefined}
        onTitleClick={onTitleClick}
        onCountClick={onCountClick}
        onAddTask={onAddTask}
        onEditAgent={onEditAgent}
        avgUsdPerHourText={avgUsdPerHourText || undefined}
        onBack={onBack}
      />

      {execError ? (
        <ErrorBanner variant="strong">{execError}</ErrorBanner>
      ) : null}
      {wfError ? (
        <ErrorBanner style={{ marginTop: execError ? 4 : 0 }}>{wfError}</ErrorBanner>
      ) : null}

      <SessionItemsView
        activeTaskStatus={activeStatus}
        tasksError={tasksError}
        loadingTasks={loadingTasks}
        sessionTasks={sessionTasks}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        messages={messages}
        running={running}
        execError={execError}
        assistantName={assistantName}
        hideExecGutter={hideExecGutter}
        containerRef={containerRef}
        bottomRef={bottomRef}
        topRef={topRef}
        sessionId={sessionId || undefined}
        idToken={idToken || undefined}
      />

      {/* Latest exec status error banner (e.g., when status === Failed) */}
      {execStatusError ? (
        <ErrorBanner variant="strong">{execStatusError}</ErrorBanner>
      ) : null}

      {/* Prompt composer */}
      <PromptComposer
        placeholder={promptPlaceholder || 'Type a prompt…'}
        disabled={!!promptDisabled}
        submitting={submitting}
        wfStatus={wfStatus}
        wfRunning={!!wfRunning}
        onSubmit={onSubmit}
        onStop={onStop}
        // Ensure upload modal saves to sessions/{sessionId}/{filename}
        uploadIdToken={idToken || null}
        uploadSessionId={sessionId || null}
      />
    </section>
  )
}
