// Exec feature public surface: hooks, utils, and presentational components

export { useExecTrees } from './hooks/useExecTrees'
export { ExecGutter } from './components/ExecGutter'

export type ExecParentMap = Record<string, string | null>

/**
 * Build a child->parent map from a flat list of exec nodes.
 */
export function buildParentMapFromNodes(nodes: Array<{ id: string; parentId?: string | null }>): ExecParentMap {
  const map: ExecParentMap = {}
  for (const n of nodes) {
    const id = String(n.id)
    const p = n.parentId == null ? null : String(n.parentId)
    map[id] = p
  }
  return map
}

/**
 * Compute adjacency booleans for a sequence of execIds using an exec parent map.
 * prevSame[i] is true if message i connects upward to i-1 within the same branch (ancestor/descendant or same).
 * nextSame[i] is true if message i connects downward to i+1 within the same branch.
 */
export function computeAdjacencyFromExecIds(execIds: Array<string | null | undefined>, parentMap: ExecParentMap) {
  const ids = execIds.map((x) => (x == null || x === '' ? null : String(x)))

  function isAncestor(a: string, b: string): boolean {
    // Is a an ancestor of b? climb from b to root
    let cur: string | null | undefined = b
    const guard = new Set<string>()
    while (cur) {
      if (cur === a) return true
      if (guard.has(cur)) break
      guard.add(cur)
      cur = parentMap[cur] ?? null
    }
    return false
  }

  function sameBranch(a: string | null, b: string | null): boolean {
    if (!a || !b) return false
    if (a === b) return true
    return isAncestor(a, b) || isAncestor(b, a)
  }

  const prevSame: boolean[] = new Array(ids.length).fill(false)
  const nextSame: boolean[] = new Array(ids.length).fill(false)
  for (let i = 0; i < ids.length; i += 1) {
    const cur = ids[i]
    const prev = i > 0 ? ids[i - 1] : null
    const next = i + 1 < ids.length ? ids[i + 1] : null
    if (cur && prev && sameBranch(prev, cur)) prevSame[i] = true
    if (cur && next && sameBranch(cur, next)) nextSame[i] = true
  }
  return { prevSame, nextSame }
}
