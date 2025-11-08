import { useCallback, useMemo, useState } from 'react'
import { makeApiClient } from '../api/apiClient'
import type { AgentRecord, AgentUpsertInput } from '../types/agent'
import type { ToolItem } from '../features/tools/public'

export function useAgentsApi(params: { idToken?: string | null; enabled?: boolean }) {
  const { idToken } = params
  const skipAuth = (import.meta as any)?.env?.VITE_SKIP_AUTH === '1'
  const client = useMemo(() => makeApiClient({ idToken: idToken ?? undefined, skipAuth }), [idToken, skipAuth])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listTools = useCallback(async () => {
    const json = await client.toolsList()
    const items = Array.isArray((json as any)?.items) ? ((json as any).items as ToolItem[]) : []
    return items
  }, [client])

  const listAgents = useCallback(async () => {
    const json = await client.agentsList()
    const agents = Array.isArray((json as any)?.agents) ? ((json as any).agents as AgentRecord[]) : []
    return agents
  }, [client])

  const getAgentByName = useCallback(async (name: string) => {
    const agents = await listAgents()
    return agents.find(a => a.name === name) || null
  }, [listAgents])

  const getAgentById = useCallback(async (id: string) => {
    const agents = await listAgents()
    return agents.find(a => a.id === id) || null
  }, [listAgents])

  const listAgentTools = useCallback(async (agentId: string) => {
    const json = await client.agentToolsList(agentId)
    const tools = Array.isArray((json as any)?.tools) ? ((json as any).tools as string[]) : []
    return tools
  }, [client])

  const getSessionAgentMapping = useCallback(async (sessionId: string) => {
    try {
      const json = await client.agentsSessionGet(sessionId)
      if (json && typeof (json as any).agentId === 'string') return json as { sessionId: string; agentId: string }
      return null
    } catch {
      return null
    }
  }, [client])

  const linkSessionAgent = useCallback(async (sessionId: string, agentId: string) => {
    await client.agentsSessionLink(sessionId, agentId)
  }, [client])

  const saveAgent = useCallback(
    async (input: AgentUpsertInput & { id?: string }) => {
      setError(null)
      setLoading(true)
      try {
        let agent: AgentRecord | null = null
        if (input.id) {
          const json = await client.agentUpdate({ id: input.id, name: input.name, description: input.description ?? null, workflowName: input.workflowName ?? null })
          agent = (json as any)?.agent || null
        } else {
          const json = await client.agentCreate({ name: input.name, description: input.description ?? null, workflowName: input.workflowName ?? null, tools: input.tools || [] })
          agent = (json as any)?.agent || null
        }
        if (!agent) throw new Error('Failed to save agent')

        // Sync tools delta if provided and supported
        if (Array.isArray(input.tools)) {
          const currentTools = Array.isArray(agent.tools) ? agent.tools : []
          const toAdd = input.tools.filter(t => !currentTools.includes(t))
          const toRemove = currentTools.filter(t => !input.tools!.includes(t))
          if (toAdd.length) await client.agentToolsAdd(agent.id, toAdd)
          if (toRemove.length) await client.agentToolsRemove(agent.id, toRemove)
          // Fetch latest agent to reflect current tools
          const agents = await listAgents()
          agent = agents.find(a => a.id === agent!.id) || agent
        }
        return agent
      } finally {
        setLoading(false)
      }
    },
    [client, listAgents]
  )

  return { listTools, listAgents, getAgentByName, getAgentById, listAgentTools, getSessionAgentMapping, linkSessionAgent, saveAgent, loading, error }
}
