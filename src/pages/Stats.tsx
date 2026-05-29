import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { TimeSeriesChart, useProjectHourlyUsage } from '../features/stats/public'
import type { UsageMetric } from '../features/stats/public'

const PALETTE = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#f59e0b', '#ef4444', '#10b981', '#3b82f6',
]

export default function StatsPage() {
  const { idToken, user } = useAuth() as any

  // Controls
  const [metric, setMetric] = useState<UsageMetric>('cost')
  const [hours, setHours] = useState<number>(48)

  const now = Date.now()
  const startMs = now - hours * 3600_000
  const endMs = now

  const enabled = !!(idToken || (import.meta as any)?.env?.VITE_SKIP_AUTH)

  const { series, rows, loading, error, reload } = useProjectHourlyUsage({
    idToken,
    start: startMs,
    end: endMs,
    enabled,
  })

  const flat = useMemo(() => {
    const arr: { t: number; workflow: string; value: number }[] = []
    series.forEach((s) => {
      s.points.forEach((p) => {
        if (p.t >= startMs && p.t <= endMs) {
          arr.push({ t: p.t, workflow: s.workflow, value: metric === 'cost' ? p.cost : p.tokens })
        }
      })
    })
    arr.sort((a, b) => a.t - b.t || a.workflow.localeCompare(b.workflow))
    return arr
  }, [series, startMs, endMs, metric])

  const legend = useMemo(() => series.map((s, i) => ({ key: s.workflow, color: PALETTE[i % PALETTE.length] })), [series])

  function fmtHour(ms: number) {
    const d = new Date(ms)
    const Y = d.getUTCFullYear()
    const M = String(d.getUTCMonth() + 1).padStart(2, '0')
    const D = String(d.getUTCDate()).padStart(2, '0')
    const H = String(d.getUTCHours()).padStart(2, '0')
    return `${Y}-${M}-${D} ${H}:00 UTC`
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', padding: 16, gap: 16, boxSizing: 'border-box' }}>
      <aside style={{ width: 280, maxWidth: '40%', minWidth: 240, borderRight: '1px solid #e5e7eb', paddingRight: 12 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontWeight: 600 }}>Controls</div>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Metric</span>
            <select value={metric} onChange={(e) => setMetric(e.target.value as UsageMetric)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
              <option value="cost">Cost ($)</option>
              <option value="tokens">Tokens</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Time window</span>
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db' }}>
              <option value={24}>Last 24 hours</option>
              <option value={48}>Last 48 hours</option>
              <option value={72}>Last 72 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
          </label>

          <button onClick={reload} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white' }}>
            Reload
          </button>

          <div style={{ height: 1, background: '#e5e7eb', margin: '6px 0' }} />

          <div style={{ fontWeight: 600 }}>Workflows</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {legend.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: 12 }}>No data</div>
            ) : legend.map((l) => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, background: l.color, borderRadius: 2, display: 'inline-block' }} />
                <span>{l.key}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{(user?.displayName || user?.email || 'Project') + ' — LLM Usage'}</h2>
          {loading ? <span style={{ color: '#6b7280', fontSize: 12 }}>Loading…</span> : null}
        </div>

        {error ? (
          <div style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 8, borderRadius: 6 }}>{error}</div>
        ) : null}

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
          <TimeSeriesChart series={series} metric={metric} start={startMs} end={endMs} height={240} />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Hour</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>Workflow</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>{metric === 'cost' ? 'Cost ($)' : 'Tokens'}</th>
              </tr>
            </thead>
            <tbody>
              {flat.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} style={{ padding: 12, color: '#6b7280' }}>No usage rows in this window.</td>
                </tr>
              ) : (
                flat.slice(-400).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>{fmtHour(r.t)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>{r.workflow}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6' }}>
                      {metric === 'cost' ? r.value.toFixed(4) : Math.round(r.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
