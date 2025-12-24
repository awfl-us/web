// Runtime API base URL configuration for @awfl/web
// Default stays '/api' to preserve local dev proxy behavior.

let DEFAULT_API_BASE = '/api'

export function getDefaultApiBase(): string {
  return DEFAULT_API_BASE
}

export function setDefaultApiBase(url: string) {
  // Only update when a non-empty string is provided; this prevents accidentally
  // clearing the '/api' dev default when consumers pass an empty env value.
  const next = (url ?? '').toString().trim()
  if (next) DEFAULT_API_BASE = next
}

// Optional zero-code HTML override for static sites
// If a global is defined, respect it once on module load.
(() => {
  try {
    const g: any = (typeof globalThis !== 'undefined' ? (globalThis as any) : (window as any))
    const htmlBase = g && typeof g.__AWFL_API_BASE__ === 'string' ? g.__AWFL_API_BASE__ : undefined
    if (htmlBase) setDefaultApiBase(htmlBase)
  } catch {
    // no-op: environments without window/globalThis
  }
})()
