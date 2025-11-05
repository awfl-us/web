import type { Session } from '../types/session'

function toIsoFromAny(ts: unknown): string | null {
  // number seconds or ms
  if (typeof ts === 'number' && isFinite(ts)) {
    const ms = ts > 1e12 ? ts : ts * 1000
    try {
      return new Date(ms).toISOString()
    } catch {}
  }
  // string date/iso
  if (typeof ts === 'string' && ts) {
    const ms = Date.parse(ts)
    if (!Number.isNaN(ms)) return new Date(ms).toISOString()
  }
  // Firestore Timestamp-like
  if (ts && typeof ts === 'object') {
    const anyTs = ts as any
    const seconds = anyTs._seconds ?? anyTs.seconds
    const nanos = anyTs._nanoseconds ?? anyTs.nanoseconds ?? 0
    if (typeof seconds === 'number') {
      const ms = seconds * 1000 + Math.floor(nanos / 1e6)
      try {
        return new Date(ms).toISOString()
      } catch {}
    }
  }
  return null
}

function pickUpdatedAtIso(doc: any): string {
  const candidates = [
    doc.updated_at,
    doc.updated_time,
    doc.update_time,
    doc.updateTime,
    doc.updatedAt,
    doc.modified_at,
    doc.modifiedAt,
    doc.create_time,
    doc.created_at,
    doc.createdAt,
  ]
  for (const c of candidates) {
    const iso = toIsoFromAny(c)
    if (iso) return iso
  }
  // As a last resort, now
  return new Date().toISOString()
}

function toStringArray(v: unknown): string[] | undefined {
  if (!v) return undefined
  if (Array.isArray(v)) return v.map(x => String(x)).filter(Boolean)
  // allow comma-separated
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  return undefined
}

export function mapTopicInfoToSession(doc: any): Session {
  const id = String(doc?.id ?? doc?.sessionId ?? doc?.sid ?? doc?._id ?? crypto.randomUUID?.() ?? Math.random())

  const titleRaw =
    doc?.title ??
    doc?.topic?.title ??
    doc?.topic ??
    doc?.subject ??
    doc?.name ??
    doc?.display_name ??
    `Session ${id}`
  const title = String(titleRaw).trim() || `Session ${id}`

  const updatedAt = pickUpdatedAtIso(doc)

  const summary = doc?.summary ?? doc?.description ?? doc?.overview ?? undefined

  const highlights = toStringArray(doc?.highlights ?? doc?.points ?? doc?.bullets)

  const tags = toStringArray(doc?.tags ?? doc?.labels ?? doc?.topics)

  return { id, title, updatedAt, summary, highlights, tags }
}
