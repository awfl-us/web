import { git, type ToolCallOptions } from '../../tools'

export type Input = { projectId: string; ref?: string; recursive?: boolean }

export async function fetchTree(input: Input, opts?: ToolCallOptions) {
  if (!input?.projectId) throw new Error('fetchTree: projectId is required')
  return await git.tree({ projectId: input.projectId, ref: input.ref, recursive: input.recursive ?? true }, opts)
}
