export type ReadingAnchor = {key: string; offset: number}
const rowSelector = '[data-awfl-message-key]'
const rows = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>(rowSelector))

// The first visible row is the anchor. Retain nearby alternatives for an
// expiring/replaced row; each alternative carries its own original offset.
export function captureReadingAnchors(container: HTMLElement): ReadingAnchor[] {
  const list = rows(container)
  const top = container.getBoundingClientRect().top
  let lo = 0, hi = list.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (list[mid].getBoundingClientRect().bottom <= top) lo = mid + 1
    else hi = mid
  }
  if (lo === list.length) lo--
  if (lo < 0) return []
  const candidates = [lo, lo + 1, lo - 1, lo + 2, lo - 2, lo + 3, lo - 3]
  return candidates.filter(index => index >= 0 && index < list.length).map(index => ({
    key: list[index].dataset.awflMessageKey!,
    offset: list[index].getBoundingClientRect().top - top,
  }))
}

export function anchoredScrollTop(container: HTMLElement, anchors: ReadingAnchor[], fallback: number): number {
  const top = container.getBoundingClientRect().top
  for (const anchor of anchors) {
    const row = container.querySelector<HTMLElement>(`${rowSelector}[data-awfl-message-key="${CSS.escape(anchor.key)}"]`)
    if (row) return container.scrollTop + row.getBoundingClientRect().top - top - anchor.offset
  }
  return fallback
}
