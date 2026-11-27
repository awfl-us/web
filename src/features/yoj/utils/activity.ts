import type { YojMessage } from '../../../types/context'
import { extractMarker, parseJsonLikeWithRemainder } from './markers'

export type ActivityCall = {
  id: string | null
  name: string
  raw: unknown
  resultIndex?: number
}
export type ActivityResult = { call?: ActivityCall; callIndex?: number; id: string | null }
export type ActivityIndex = { calls: Map<number, ActivityCall[]>; results: Map<number, ActivityResult> }

function identifier(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value !== 'null' ? value : null
}
export function toolLabel(name: string) {
  const known: Record<string, string> = {
    READ_FILE: 'Read file', UPDATE_FILE: 'Update file', RUN_COMMAND: 'Run command',
    SEARCH_FILES: 'Search files', QUERY: 'Query', RESPOND: 'Respond',
  }
  return Object.prototype.hasOwnProperty.call(known, name) ? known[name] :
    name === '(unknown)' ? 'Unknown tool' : name.replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase())
}

// The dispatcher runs child workflows, so execId equality is not required.
// Correlate only unique explicit IDs in the visible window, in chronological order.
// Preserve result rows at their original position; no implicit adjacency or success inference.
export function indexActivity(messages: YojMessage[]): ActivityIndex {
  const calls = new Map<number, ActivityCall[]>()
  const results = new Map<number, ActivityResult>()
  const byId = new Map<string, {call: ActivityCall; index: number}[]>()
  const resultIds = new Map<string, number[]>()
  messages.forEach((m, index) => {
    if (m.liveResponse || (m.role !== 'tool' && !(Array.isArray(m.tool_calls) && m.tool_calls.length))) return
    if (extractMarker(m)) return
    const parsed = parseJsonLikeWithRemainder(m.content)
    if (!parsed.remainder && extractMarker(parsed.parsed)) return
    if (Array.isArray(m.tool_calls) && m.tool_calls.length) {
      const entries = m.tool_calls.map((raw: any): ActivityCall => ({
        id: identifier(raw?.id),
        name: identifier(raw?.function?.name) ?? '(unknown)',
        raw,
      }))
      calls.set(index, entries)
      for (const call of entries) {
        if (!call.id) continue
        const found = byId.get(call.id) ?? []
        found.push({call, index})
        byId.set(call.id, found)
      }
    }
    if (m.role === 'tool') {
      const id = identifier(m.tool_call_id)
      results.set(index, {id})
      if (id) {
        const found = resultIds.get(id) ?? []
        found.push(index)
        resultIds.set(id, found)
      }
    }
  })
  for (const [id, entries] of byId) {
    const matches = resultIds.get(id)
    if (entries.length !== 1 || matches?.length !== 1) continue
    const {call, index} = entries[0]
    const resultIndex = matches[0]
    if (resultIndex <= index) continue
    call.resultIndex = resultIndex
    results.set(resultIndex, {id, call, callIndex: index})
  }
  return {calls, results}
}
