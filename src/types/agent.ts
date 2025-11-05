export type AgentRecord = {
  id: string
  name: string
  description: string | null
  workflowName: string | null
  tools: string[]
  created?: number
  updated?: number
}

export type AgentUpsertInput = {
  name: string
  description?: string | null
  workflowName?: string | null
  tools?: string[]
}
