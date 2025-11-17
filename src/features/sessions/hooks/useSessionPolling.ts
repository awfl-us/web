import { useEffect, useRef } from 'react'
import type { TaskStatus } from '../../tasks/public'

interface UseSessionPollingParams {
  enabled: boolean
  sessionId?: string | null
  activeTaskStatus: TaskStatus | null
  running: boolean
  reloadMessages: () => void
  reloadTaskCounts: () => void
  reloadInlineTasks: () => void
  intervalMs?: number
}

// Encapsulates polling orchestration for the Sessions page.
// Preserves DEV logging and behavior from the previous inline effect.
export function useSessionPolling({
  enabled,
  sessionId,
  activeTaskStatus,
  running,
  reloadMessages,
  reloadTaskCounts,
  reloadInlineTasks,
  intervalMs = 10000,
}: UseSessionPollingParams) {
  const runningRef = useRef<boolean>(false)
  const reloadMessagesRef = useRef<() => void>(() => {})
  const reloadTaskCountsRef = useRef<() => void>(() => {})
  const reloadInlineTasksRef = useRef<() => void>(() => {})
  const activeStatusRef = useRef<TaskStatus | null>(null)

  useEffect(() => {
    runningRef.current = !!running
  }, [running])

  useEffect(() => {
    reloadMessagesRef.current = reloadMessages
  }, [reloadMessages])

  useEffect(() => {
    reloadTaskCountsRef.current = reloadTaskCounts
  }, [reloadTaskCounts])

  useEffect(() => {
    reloadInlineTasksRef.current = reloadInlineTasks
  }, [reloadInlineTasks])

  useEffect(() => {
    activeStatusRef.current = activeTaskStatus
  }, [activeTaskStatus])

  useEffect(() => {
    if (!enabled || !sessionId) return
    const timer = setInterval(() => {
      const isRunning = runningRef.current
      if (!isRunning) {
        if ((import.meta as any)?.env?.DEV) {
           
          console.debug('[Sessions] poll tick → reload()', {
            sessionId,
            activeTaskStatus: activeStatusRef.current,
          })
        }
        if (!activeStatusRef.current) {
          reloadMessagesRef.current()
        } else {
          reloadInlineTasksRef.current()
        }
        reloadTaskCountsRef.current()
      } else if ((import.meta as any)?.env?.DEV) {
         
        console.debug('[Sessions] poll tick skipped (running)', { sessionId })
      }
    }, intervalMs)
    return () => clearInterval(timer)
  }, [enabled, sessionId, intervalMs, activeTaskStatus])
}
