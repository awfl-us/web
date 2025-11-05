import { git, type ToolCallOptions } from '../../tools'

export type Input = { projectId?: string; path: string; ref?: string }

export async function readFile(input: Input, opts?: ToolCallOptions) {
  if (!input?.path) throw new Error('readFile: path is required')
  return await git.read({ projectId: input.projectId, path: input.path, ref: input.ref }, opts)
}
