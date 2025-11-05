import type { FsEntry, FsKind } from './types'

// Map ls -F suffix to kind
function kindFromSuffix(name: string): FsKind {
  if (!name) return 'other'
  const last = name.charAt(name.length - 1)
  switch (last) {
    case '/':
      return 'dir'
    case '@':
      return 'symlink'
    case '*':
      return 'exec'
    case '|':
      return 'pipe'
    case '=':
      return 'socket'
    default:
      return 'file'
  }
}

function stripSuffix(name: string): string {
  if (!name) return name
  const last = name.charAt(name.length - 1)
  if ('/@*|='.includes(last)) return name.slice(0, -1)
  return name
}

export function parseLsA1F(output: string): FsEntry[] {
  if (!output) return []
  const lines = output
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  const entries: FsEntry[] = []
  for (const line of lines) {
    // Ignore total line or headers just in case
    if (/^total\s+\d+$/i.test(line)) continue
    const kind = kindFromSuffix(line)
    const name = stripSuffix(line)
    if (!name || name === '.' || name === '..') continue
    entries.push({ name, kind })
  }
  return entries
}
