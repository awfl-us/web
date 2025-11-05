export type ToolItem = {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters?: {
      type: 'object'
      properties: Record<string, { type: string; enum?: string[] }>
      required?: string[]
    }
  }
  workflowName: string
}
