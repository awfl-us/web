import { useMemo } from 'react'
import type { AgentRecord } from '../../../types/agent'
import { useAgentsList } from './useAgentsList'
import { useWorkflowExec } from '../../../core/public'
import { resolveAgentWorkflow, type SessionLike } from '../utils/resolveAgentWorkflow'

export type UseAgentWorkflowExecuteParams = {
  sessionId?: string
  idToken?: string | null
  enabled?: boolean
  // Optional hint when creating a new session: agent chosen before server echo
  pendingAgentId?: string | null
  // Optional session-like shape to allow fallback to session-stored workflow key
  session?: SessionLike
}

export function useAgentWorkflowExecute(params: UseAgentWorkflowExecuteParams) {
  const { sessionId, idToken, enabled = true, pendingAgentId, session } = params || {}

  const { agents, loading: agentsLoading, error: agentsError, reload: reloadAgents } = useAgentsList({ idToken, enabled })

  const agentsById = useMemo(() => {
    const map: Record<string, AgentRecord> = {}
    for (const a of agents) map[a.id] = a
    return map
  }, [agents])

  const resolved = useMemo(() => resolveAgentWorkflow({ pendingAgentId, session, agentsById }), [pendingAgentId, session, agentsById])

  const exec = useWorkflowExec({ sessionId, idToken, enabled })

  const canExecute = Boolean(sessionId) && Boolean(resolved.workflowName)
  const error = exec.error || (agentsError ? String(agentsError) : null)

  const execute = async (inputParams?: Record<string, any>) => {
    if (!canExecute || !resolved.workflowName) return
    await exec.start(resolved.workflowName, inputParams, { sessionId, agentId: resolved.agentId || undefined })
  }

  return {
    // Resolution info
    agentId: resolved.agentId,
    workflowName: resolved.workflowName,
    canExecute,

    // Agents data state
    agents,
    agentsLoading,
    agentsError,
    reloadAgents,

    // Exec state and controls
    latest: exec.latest,
    status: exec.status,
    running: exec.running,
    error,
    reload: exec.reload,
    execute,
    stop: exec.stop,
  }
}
