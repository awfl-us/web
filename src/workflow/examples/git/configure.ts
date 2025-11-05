import { git, type ToolCallOptions } from '../../tools'

export type Input = { projectId: string; owner?: string; repo?: string; token?: string; defaultBranch?: string }

export async function configure(input: Input, opts?: ToolCallOptions) {
  if (!input?.projectId) throw new Error('configure: projectId is required')
  await git.configPut(input, opts)
  return await git.configGet({ projectId: input.projectId }, opts)
}
