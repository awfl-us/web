export function extractStdout(res: any): string {
  if (!res) return ''
  // Try a variety of likely shapes
  const paths = [
    ['stdout'],
    ['output', 'stdout'],
    ['result', 'stdout'],
    ['lastExec', 'output', 'stdout'],
    ['lastExec', 'result', 'stdout'],
    ['raw', 'stdout'],
    ['output', 'text'],
    ['result', 'text'],
  ] as const

  for (const p of paths) {
    let cur: any = res
    let ok = true
    for (const k of p) {
      if (cur && typeof cur === 'object' && k in cur) cur = (cur as any)[k]
      else {
        ok = false
        break
      }
    }
    if (ok && typeof cur === 'string') return cur
  }

  // If the whole response is a string, return it
  if (typeof res === 'string') return res
  if (typeof res?.raw === 'string') return res.raw
  return ''
}
