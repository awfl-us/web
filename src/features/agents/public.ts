// Agents feature barrel: agent modal, API hook, and related types

export { AgentModal } from './AgentModal'
export { useAgentsApi } from '../../hooks/useAgentsApi'
export { useAgentModalController } from './hooks/useAgentModalController'

// Types
export type { AgentRecord, AgentUpsertInput } from '../../types/agent'