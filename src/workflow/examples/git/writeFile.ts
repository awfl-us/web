import { git, type ToolCallOptions } from '../../tools'

export type Input = { projectId?: string; path: string; content: string; message?: string; branch?: string; sha?: string }

export async function writeFile(input: Input, opts?: ToolCallOptions) {
  if (!input?.path) throw new Error('writeFile: path is required')
  if (typeof input?.content !== 'string') throw new Error('writeFile: content is required')
  return await git.write({
    projectId: input.projectId,
    path: input.path,
    content: input.content,
    message: input.message,
    branch: input.branch,
    sha: input.sha,
  }, opts)
}
