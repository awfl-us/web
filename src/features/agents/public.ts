// Agents feature barrel: agent modal, API hook, and related types

export { AgentModal } from './AgentModal'
export { useAgentsApi } from '../../hooks/useAgentsApi'
export { useAgentModalController } from './hooks/useAgentModalController'
export { useSessionAgentConfig } from './hooks/useSessionAgentConfig'
export { useAgentsList } from './hooks/useAgentsList'

// Types
export type { AgentRecord, AgentUpsertInput } from '../../types/agent'