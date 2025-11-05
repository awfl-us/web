import { git, type ToolCallOptions } from '../../tools'

export type Input = { projectId?: string; ref?: string }

// Example: list files at repo root (path = '')
export async function listRootFiles(input: Input, opts?: ToolCallOptions) {
  const items = await git.list({ projectId: input.projectId, path: '', ref: input.ref }, opts)
  return items
}
