// Helpers for detecting and working with embedded collapsed/expanded markers in Yoj content

export type Marker = { kind: 'collapsed' | 'expanded'; label: string; description?: string | null; responseId?: string | null }

// Try to parse JSON from various string shapes and return any remaining non-JSON text:
// - Plain JSON string
// - Fenced code block ```json ... ```
// - Text prefix/suffix with a JSON object (take substring from first { to last })
export function parseJsonLikeWithRemainder(raw: unknown): { parsed: any | null; remainder: string | null } {
  if (!raw) return { parsed: null, remainder: null }

  if (typeof raw === 'object') return { parsed: raw as any, remainder: null }
  if (typeof raw !== 'string') return { parsed: null, remainder: null }
  const s = raw.trim()

  // Full JSON string
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try { return { parsed: JSON.parse(s), remainder: null } } catch { return { parsed: null, remainder: null } }
  }

  // Fenced code block
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence && fence[1]) {
    const inner = fence[1].trim()
    try { return { parsed: JSON.parse(inner), remainder: s.replace(fence[0], '').trim() || null } } catch {}
  }

  // Text prefix with trailing JSON object
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    const slice = s.substring(first, last + 1)
    const before = s.substring(0, first).trim()
    const after = s.substring(last + 1).trim()
    const remainder = [before, after].filter(Boolean).join('\n') || null
    try { return { parsed: JSON.parse(slice), remainder } } catch {}
  }

  return { parsed: null, remainder: s || null }
}

export function extractMarker(source: any): Marker | null {
  if (!source || typeof source !== 'object') return null

  // Primary: explicit type markers
  if (source.type === 'collapsed_group') {
    return { kind: 'collapsed', label: source.name || source.group || 'GROUP', description: source.description ?? null, responseId: source.responseId ?? null }
  }
  if (source.type === 'expanded') {
    return { kind: 'expanded', label: source.name || source.group || 'GROUP', description: source.description ?? null, responseId: source.responseId ?? null }
  }

  // Alternate: collapsedGroup/collapsed_group object payloads
  const cg = source.collapsedGroup || source.collapsed_group
  if (cg && typeof cg === 'object') {
    const expanded = !!cg.expanded
    return { kind: expanded ? 'expanded' : 'collapsed', label: cg.name || cg.group || 'GROUP', description: cg.description ?? null, responseId: cg.responseId ?? null }
  }

  return null
}

// Split a content string at the first detectable marker JSON, returning before/after text along with marker
export function splitAtFirstMarker(raw: unknown): { before: string; marker: Marker; after: string } | null {
  if (!raw || typeof raw !== 'string') return null
  const s = raw

  // 1) Full JSON string
  const trimmed = s.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const obj = JSON.parse(trimmed)
      const m = extractMarker(obj)
      if (m) return { before: '', marker: m as any, after: '' }
    } catch {}
  }

  // 2) Fenced code block
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/i
  const fenceMatch = s.match(fenceRe)
  if (fenceMatch && fenceMatch[1]) {
    const block = fenceMatch[0]
    const idx = s.indexOf(block)
    const before = s.slice(0, idx)
    const after = s.slice(idx + block.length)
    try {
      const obj = JSON.parse(fenceMatch[1].trim())
      const m = extractMarker(obj)
      if (m) return { before, marker: m as any, after }
    } catch {}
  }

  // 3) Text with embedded JSON from first { to last }
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    const before = s.slice(0, first)
    const jsonSlice = s.slice(first, last + 1)
    const after = s.slice(last + 1)
    try {
      const obj = JSON.parse(jsonSlice)
      const m = extractMarker(obj)
      if (m) return { before, marker: m as any, after }
    } catch {}
  }

  return null
}
