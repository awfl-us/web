import { git, type ToolCallOptions } from '../../tools'

export type Input = { projectId?: string; path: string; message?: string; branch?: string; sha?: string }

export async function deleteFile(input: Input, opts?: ToolCallOptions) {
  if (!input?.path) throw new Error('deleteFile: path is required')
  return await git.delete({
    projectId: input.projectId,
    path: input.path,
    message: input.message,
    branch: input.branch,
    sha: input.sha,
  }, opts)
}
