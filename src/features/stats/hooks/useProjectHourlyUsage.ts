import { useCallback, useEffect, useMemo, useState } from 'react'
import { makeApiClient } from '../../../api/apiClient'
import type { UsageRow, UsageSeries, UsagePoint } from '../types'

function parseSkipAuth(): boolean {
  const raw = (import.meta as any)?.env?.VITE_SKIP_AUTH
  if (typeof raw === 'string') return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
  return !!raw
}

function toMs(input: any): number | null {
  if (input == null) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  if (input instanceof Date) return input.getTime()
  if (typeof input === 'string') {
    const s = input.trim()
    if (/^\d{10}$/.test(s)) {
      const y = Number(s.slice(0, 4))
      const m = Number(s.slice(4, 6)) - 1
      const d = Number(s.slice(6, 8))
      const h = Number(s.slice(8, 10))
      return Date.UTC(y, m, d, h, 0, 0, 0)
    }
    const t = Date.parse(s)
    return Number.isFinite(t) ? t : null
  }
  if ((input as any)?._seconds) return (input as any)._seconds * 1000
  if ((input as any)?.seconds) return (input as any).seconds * 1000
  return null
}

function floorHour(ms: number): number { return Math.floor(ms / 3600_000) * 3600_000 }

function fmtYYYYMMDDHH(ms: number): string {
  const d = new Date(ms)
  const Y = d.getUTCFullYear()
  const M = String(d.getUTCMonth() + 1).padStart(2, '0')
  const D = String(d.getUTCDate()).padStart(2, '0')
  const H = String(d.getUTCHours()).padStart(2, '0')
  return `${Y}${M}${D}${H}`
}

function coerceHourKeyToMs(v: any): number | null {
  const t = toMs(v)
  return t == null ? null : floorHour(t)
}

function normalizeRow(obj: any): UsageRow | null {
  if (!obj || typeof obj !== 'object') return null
  const hour_key = (obj.hour_key ?? obj.hourKey ?? obj.hour ?? obj.window) as any
  const t = coerceHourKeyToMs(hour_key)
  if (t == null) return null
  const workflow_name = obj.workflow_name ?? obj.workflow ?? obj.name ?? 'unknown'
  const total_cost = Number(obj.total_cost ?? obj.cost ?? 0) || 0
  const total_tokens = Number(obj.total_tokens ?? obj.tokens ?? 0) || 0
  return { hour_key, workflow_name, total_cost, total_tokens, ...obj }
}

function toSeries(rows: UsageRow[]): UsageSeries[] {
  const map = new Map<string, UsagePoint[]>()
  for (const r of rows) {
    const t = coerceHourKeyToMs(r.hour_key)
    if (t == null) continue
    const workflow = (r.workflow_name || 'unknown').toString()
    const list = map.get(workflow) || []
    list.push({
      t,
      cost: Number(r.total_cost ?? 0) || 0,
      tokens: Number(r.total_tokens ?? 0) || 0,
    })
    map.set(workflow, list)
  }
  const out: UsageSeries[] = []
  for (const [workflow, points] of map.entries()) {
    points.sort((a, b) => a.t - b.t)
    out.push({ workflow, points })
  }
  out.sort((a, b) => a.workflow.localeCompare(b.workflow))
  return out
}

export type UseProjectHourlyUsageParams = {
  idToken?: string | null
  start: Date | number | string
  end: Date | number | string
  enabled?: boolean
}

export type UseProjectHourlyUsageResult = {
  rows: UsageRow[]
  series: UsageSeries[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useProjectHourlyUsage(params: UseProjectHourlyUsageParams): UseProjectHourlyUsageResult {
  const { idToken, start, end, enabled = true } = params
  const [rows, setRows] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bump, setBump] = useState(0)

  const reload = useCallback(() => setBump(v => v + 1), [])
  const skipAuth = useMemo(parseSkipAuth, [])

  const sParam = useMemo(() => {
    const ms = toMs(start)
    if (ms == null) return ''
    return fmtYYYYMMDDHH(floorHour(ms))
  }, [start])

  const eParam = useMemo(() => {
    const ms = toMs(end)
    if (ms == null) return ''
    return fmtYYYYMMDDHH(floorHour(ms))
  }, [end])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    async function load() {
      setError(null)
      if (!enabled || (!idToken && !skipAuth)) {
        setRows([])
        return
      }
      if (!sParam || !eParam) {
        setRows([])
        return
      }
      setLoading(true)
      try {
        const client = makeApiClient({ idToken: idToken ?? undefined, skipAuth })
        const json: any = await client.llmUsageProjectHourly(
          { start: sParam, end: eParam },
          { signal: ac.signal }
        )
        // Prefer common array shapes first
        let arr: any[] = Array.isArray(json) ? json
          : Array.isArray((json as any)?.rows) ? (json as any).rows
          : Array.isArray((json as any)?.data) ? (json as any).data
          : []

        // Flatten buckets object: { buckets: { YYYYMMDDHH: { workflow: { total_cost, usage:{ total_tokens } } } } }
        if ((!arr || arr.length === 0) && json && typeof json === 'object' && (json as any).buckets && typeof (json as any).buckets === 'object') {
          const b = (json as any).buckets as Record<string, any>
          const flat: any[] = []
          for (const [hourKey, byWorkflow] of Object.entries(b)) {
            if (!byWorkflow || typeof byWorkflow !== 'object') continue
            for (const [workflowName, stats] of Object.entries(byWorkflow as Record<string, any>)) {
              if (!stats || typeof stats !== 'object') continue
              const total_cost = Number((stats as any).total_cost ?? (stats as any).cost ?? 0) || 0
              const total_tokens = Number(((stats as any).usage?.total_tokens) ?? (stats as any).total_tokens ?? (stats as any).tokens ?? 0) || 0
              flat.push({
                hour_key: hourKey,
                workflow_name: workflowName,
                total_cost,
                total_tokens,
                ...stats,
              })
            }
          }
          arr = flat
        }

        const next: UsageRow[] = []
        for (const r of arr) {
          const n = normalizeRow(r)
          if (n) next.push(n)
        }
        if (!cancelled) setRows(next)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [idToken, enabled, sParam, eParam, skipAuth, bump])

  const series = useMemo(() => toSeries(rows), [rows])

  return { rows, series, loading, error, reload }
}
