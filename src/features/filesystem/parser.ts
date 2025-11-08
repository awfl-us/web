// Deprecated: legacy parser module. Delegate to the canonical implementation in ./parse
import { parseLsA1F as parseLsA1FImpl } from './parse'
import type { FsEntry } from './types'

export function parseLsA1F(output: string, parentPath: string = '.'): FsEntry[] {
  return parseLsA1FImpl(output, parentPath)
}
