import type { YojMessage } from '../../../types/context'

// Prefer stable keys so expanded state doesn't reset on polling refreshes
export function getMessageKey(m: YojMessage, idx: number): string {
  // Only treat per-message identifiers as authoritative keys; docId alone
  // can be shared across multiple messages and must not be used by itself.
  const msgId = (m as any).id || (m as any).message_id || (m as any)._id
  const docId = (m as any).docId
  if (msgId) return docId ? `${String(docId)}:${String(msgId)}` : String(msgId)

  const t = m?.create_time ? String(m.create_time) : ''
  const r = m?.role ? String(m.role) : ''

  // Build a base from docId/timestamp/role and always append idx when
  // no per-message id is available to guarantee uniqueness.
  const base = docId ? `${String(docId)}|${t}|${r}` : `${t}|${r}`
  return `${base}|${idx}`
}

export function formatUsd(cost?: number | null): string | null {
  if (typeof cost !== 'number' || !isFinite(cost)) return null
  try {
    const nf = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })
    return nf.format(cost)
  } catch {
    return `$${cost.toFixed(4)}`
  }
}

// Static tree-based lane mapping: assigns a fixed lane per exec id based on
// parent/child relationships. Roots occupy new lanes left-to-right. First child
// stays on the parent's lane; siblings branch to new lanes on the right.
export function computeLaneMapping(nodes: Array<{ id: string; parentId?: string | null }>): { laneById: Map<string, number>; lanes: number } {
  const laneById = new Map<string, number>()
  const children = new Map<string | null, string[]>()
  const roots: string[] = []

  const byId = new Map<string, { id: string; parentId?: string | null }>()
  for (const n of nodes) {
    if (!n?.id) continue
    const id = String(n.id)
    const parentId = n.parentId == null ? null : String(n.parentId)
    byId.set(id, { id, parentId })
  }

  for (const n of byId.values()) {
    if (!n.parentId || !byId.has(n.parentId)) {
      roots.push(n.id)
    }
    const key = n.parentId ?? null
    const arr = children.get(key) || []
    arr.push(n.id)
    children.set(key, arr)
  }

  const sortIds = (arr: string[]) => arr.slice().sort()

  let nextLane = 0
  function assignSubtree(parentId: string, parentLane: number) {
    const kids = sortIds(children.get(parentId) || [])
    kids.forEach((kidId, idx) => {
      const lane = idx === 0 ? parentLane : nextLane++
      laneById.set(kidId, lane)
      assignSubtree(kidId, lane)
    })
  }

  for (const rootId of sortIds(roots)) {
    const lane = nextLane++
    laneById.set(rootId, lane)
    assignSubtree(rootId, lane)
  }

  const lanes = nextLane
  return { laneById, lanes }
}

export function getExecId(m: any): string | null {
  const id = m?.execId || m?.exec_id || m?.exec?.id || m?.exec
  return id ? String(id) : null
}

export function getExecParentId(m: any): string | null {
  const p =
    m?.exec?.parentId ||
    m?.exec?.parent_id ||
    m?.parentExecId ||
    m?.execParentId ||
    m?.parent_exec_id ||
    m?.exec?.parent?.id ||
    m?.exec_parent ||
    null
  return p ? String(p) : null
}

// Dynamic, timeline-aware lane allocation for messages.
// Goal: only concurrent branches expand the lane count; when a branch ends,
// its lane is freed and may be reused by later branches. Lane indices are
// compacted per-row so that the gutter renders 0..(k-1) columns at that step.
export function computeLaneTimeline(messages: YojMessage[]): {
  laneByIndex: (number | null)[]
  lanesByIndex: number[]
} {
  const laneByIndex: (number | null)[] = new Array(messages.length).fill(null)
  const lanesByIndex: number[] = new Array(messages.length).fill(0)

  // Find the last occurrence index for each exec id
  const lastIndexForExec = new Map<string, number>()
  for (let i = 0; i < messages.length; i++) {
    const execId = getExecId(messages[i] as any)
    if (execId) lastIndexForExec.set(execId, i)
  }

  // Active execs and their original lane indices at the current scan position
  const activeLaneByExec = new Map<string, number>()
  const usedLanes = new Set<number>()

  const findFreeLane = () => {
    let l = 0
    while (usedLanes.has(l)) l++
    return l
  }

  for (let i = 0; i < messages.length; i++) {
    const execId = getExecId(messages[i] as any)
    let lane: number | null = null

    if (execId) {
      if (activeLaneByExec.has(execId)) {
        lane = activeLaneByExec.get(execId) as number
      } else {
        lane = findFreeLane()
        activeLaneByExec.set(execId, lane)
        usedLanes.add(lane)
      }
    }

    // Compact lane indices for this row so lanes are contiguous 0..k-1
    const sortedUsed = Array.from(usedLanes).sort((a, b) => a - b)
    const compact = new Map<number, number>()
    for (let j = 0; j < sortedUsed.length; j++) compact.set(sortedUsed[j], j)

    const compactLane = lane == null ? null : compact.get(lane) ?? null
    laneByIndex[i] = compactLane
    lanesByIndex[i] = sortedUsed.length

    // If this is the last message for this exec, free its lane for reuse
    if (execId && lastIndexForExec.get(execId) === i) {
      const l = activeLaneByExec.get(execId)
      if (l != null) {
        activeLaneByExec.delete(execId)
        usedLanes.delete(l)
      }
    }
  }

  return { laneByIndex, lanesByIndex }
}

// Determine adjacency along exec branches (parent/child lineage).
// Two consecutive messages are connected if one exec is an ancestor of the other
// (or the same exec). Siblings/cousins break the connection.
export function computeExecBranchAdjacency(messages: YojMessage[]): {
  prevSame: boolean[]
  nextSame: boolean[]
} {
  const n = messages.length
  const prevSame = new Array<boolean>(n).fill(false)
  const nextSame = new Array<boolean>(n).fill(false)

  const execIds = messages.map((m) => getExecId(m as any))
  const parents = new Map<string, string | null>()

  // Collect known parent links across messages
  for (const m of messages as any[]) {
    const id = getExecId(m)
    if (!id) continue
    const p = getExecParentId(m)
    if (p != null && !parents.has(id)) parents.set(id, p)
  }

  const isAncestor = (maybeAncestor: string, maybeDesc: string): boolean => {
    if (maybeAncestor === maybeDesc) return true
    let cur: string | null | undefined = maybeDesc
    let hops = 0
    const seen = new Set<string>()
    while (cur && hops < 100) {
      if (cur === maybeAncestor) return true
      if (seen.has(cur)) break
      seen.add(cur)
      cur = parents.get(cur) ?? null
      hops++
    }
    return false
  }

  const inSameBranch = (a: string | null, b: string | null) => {
    if (!a || !b) return false
    return isAncestor(a, b) || isAncestor(b, a)
  }

  for (let i = 0; i < n; i++) {
    const a = execIds[i]
    const prev = i > 0 ? execIds[i - 1] : null
    const next = i < n - 1 ? execIds[i + 1] : null
    if (a && prev && inSameBranch(a, prev)) prevSame[i] = true
    if (a && next && inSameBranch(a, next)) nextSame[i] = true
  }

  return { prevSame, nextSame }
}
