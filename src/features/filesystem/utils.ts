// Utilities for filesystem feature

export function normalizePath(path: string): string {
  if (!path) return '/'
  let p = path.trim()
  if (!p.startsWith('/')) p = '/' + p
  // Remove trailing slashes except for root
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p || '/'
}

export function joinPath(base: string, name: string): string {
  const b = normalizePath(base)
  if (!name || name === '.') return b
  if (name === '..') {
    const parts = b.split('/').filter(Boolean)
    parts.pop()
    return '/' + parts.join('/')
    
  }
  return b === '/' ? `/${name}` : `${b}/${name}`
}

// POSIX-safe single-quote for shell: ' -> '\''
export function shSingleQuote(s: string): string {
  return `'${String(s).replace(/'/g, "'\\''")}'`
}
