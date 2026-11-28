import type { YojMessage } from '../../../types/context'
import { extractMarker, parseJsonLikeWithRemainder } from './markers'

function id(value: unknown): string | null {
  return (typeof value === 'string' && value.trim() && value !== 'null') || (typeof value === 'number' && Number.isFinite(value)) ? String(value) : null
}

// Storage documents hold one raw ChatMessage; responseId is the bridge from SSE
// to its persisted assistant message. Generated group placeholders have no docId.
function identity(message: YojMessage): string | null {
  const role = message.role ?? 'assistant'
  const response = id(message.responseId)
  if (role === 'assistant' && response) return JSON.stringify(['response', response])
  const doc = id(message.docId)
  const msg = id(message.id) ?? id(message.message_id) ?? id(message._id)
  if (msg) return JSON.stringify(['message', doc, role, msg])
  if (doc) return JSON.stringify(['document', role, doc])
  if (role === 'tool' && id(message.tool_call_id)) return JSON.stringify(['result', message.tool_call_id])
  if (role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length) {
    const ids = message.tool_calls.map(call => id(call?.id))
    if (ids.every(Boolean)) return JSON.stringify(['calls', ids])
  }
  if (role === 'system') {
    const parsed = parseJsonLikeWithRemainder(message.content)
    const marker = extractMarker(message) ?? (!parsed.remainder ? extractMarker(parsed.parsed) : null)
    if (marker?.label && marker.responseId) return JSON.stringify(['group', marker.responseId, marker.label])
  }
  return null
}

// No stable identity exists for some generated messages. Keep distinct rows
// rather than deduplicating or guessing a correlation. Identical ambiguous IDs
// are occurrence-scoped; they intentionally have no cross-reorder guarantee.
export function getTimelineKeys(messages: YojMessage[]): string[] {
  const bases = messages.map((m, index) => identity(m) ?? JSON.stringify(['unidentified', m.role, m.create_time, m.execId, index]))
  const counts = new Map<string, number>()
  for (const base of bases) counts.set(base, (counts.get(base) ?? 0) + 1)
  const seen = new Map<string, number>()
  return bases.map(base => {
    if (counts.get(base) === 1) return base
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)
    return JSON.stringify(['ambiguous', base, occurrence])
  })
}

export function getMessageKey(message: YojMessage, index: number): string {
  return identity(message) ?? JSON.stringify(['unidentified', message.role, message.create_time, message.execId, index])
}
