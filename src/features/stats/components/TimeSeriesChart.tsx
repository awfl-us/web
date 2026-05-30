import { useMemo } from 'react'
import type { UsageMetric, UsageSeries } from '../types'

export type TimeSeriesChartProps = {
  series: UsageSeries[]
  metric: UsageMetric
  start: number // epoch ms (inclusive)
  end: number // epoch ms (inclusive)
  height?: number
}

const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#3b82f6',
]

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }

export function TimeSeriesChart(props: TimeSeriesChartProps) {
  const { series, metric, start, end, height = 220 } = props

  const vbw = 800 // virtual width for viewBox; SVG will scale to container width
  const vbh = height
  const padL = 40
  const padR = 12
  const padT = 8
  const padB = 26

  const flat = useMemo(() => {
    const arr: { t: number; v: number }[] = []
    for (const s of series) {
      for (const p of s.points) {
        if (p.t >= start && p.t <= end) {
          arr.push({ t: p.t, v: metric === 'cost' ? p.cost : p.tokens })
        }
      }
    }
    return arr
  }, [series, start, end, metric])

  const maxY = useMemo(() => {
    let m = 0
    for (const p of flat) m = Math.max(m, p.v)
    return m || 1
  }, [flat])

  const xScale = (t: number) => {
    if (end <= start) return padL
    const r = (t - start) / (end - start)
    return padL + clamp(r, 0, 1) * (vbw - padL - padR)
  }
  const yScale = (v: number) => {
    const r = v / maxY
    return padT + (1 - clamp(r, 0, 1)) * (vbh - padT - padB)
  }

  const fmtShort = (ms: number) => {
    const d = new Date(ms)
    const h = d.getUTCHours().toString().padStart(2, '0')
    const M = (d.getUTCMonth() + 1).toString().padStart(2, '0')
    const D = d.getUTCDate().toString().padStart(2, '0')
    return `${M}/${D} ${h}h`
  }

  // Build polylines per series
  const paths = useMemo(() => {
    const out: { color: string; d: string; key: string }[] = []
    series.forEach((s, i) => {
      const color = PALETTE[i % PALETTE.length]
      const pts = s.points.filter(p => p.t >= start && p.t <= end)
      if (pts.length === 0) return
      const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(p.t)} ${yScale(metric === 'cost' ? p.cost : p.tokens)}`).join(' ')
      out.push({ color, d, key: s.workflow })
    })
    return out
  }, [series, start, end, metric])

  // Dot markers for each point (so single-point series are visible)
  const markers = useMemo(() => {
    const out: { x: number; y: number; color: string; key: string; title: string }[] = []
    series.forEach((s, i) => {
      const color = PALETTE[i % PALETTE.length]
      s.points.forEach(p => {
        if (p.t >= start && p.t <= end) {
          const v = metric === 'cost' ? p.cost : p.tokens
          out.push({
            x: xScale(p.t),
            y: yScale(v),
            color,
            key: `${s.workflow}-${p.t}-${metric}`,
            title: `${fmtShort(p.t)} UTC — ${s.workflow}: ${metric === 'cost' ? `$${v.toFixed(4)}` : Math.round(v)} ${metric}`,
          })
        }
      })
    })
    return out
  }, [series, start, end, metric, maxY])

  // Vertical hourly grid
  const vgrids = useMemo(() => {
    const arr: number[] = []
    const hour = 3600_000
    const first = Math.floor(start / hour) * hour
    for (let t = first; t <= end; t += hour) arr.push(t)
    return arr
  }, [start, end])

  return (
    <svg viewBox={`0 0 ${vbw} ${vbh}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {/* X grid */}
      {vgrids.map((t, i) => (
        <line key={i} x1={xScale(t)} y1={padT} x2={xScale(t)} y2={vbh - padB} stroke="#e5e7eb" strokeWidth={1} />
      ))}

      {/* Y grid (0 and max) */}
      <line x1={padL} y1={yScale(0)} x2={vbw - padR} y2={yScale(0)} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={padL} y1={yScale(maxY)} x2={vbw - padR} y2={yScale(maxY)} stroke="#f3f4f6" strokeWidth={1} />

      {/* Paths */}
      {paths.map(p => (
        <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {/* Point markers */}
      {markers.map(m => (
        <g key={m.key}>
          <circle cx={m.x} cy={m.y} r={2.8} fill={m.color} stroke="#ffffff" strokeWidth={1} />
          <title>{m.title}</title>
        </g>
      ))}

      {/* Axes labels */}
      <text x={padL} y={vbh - 8} fontSize={10} fill="#6b7280">{fmtShort(start)} UTC</text>
      <text x={vbw - padR} y={vbh - 8} fontSize={10} fill="#6b7280" textAnchor="end">{fmtShort(end)} UTC</text>
      <text x={padL} y={10} fontSize={10} fill="#6b7280">Max {metric === 'cost' ? '$' : 'tokens'}: {metric === 'cost' ? maxY.toFixed(2) : Math.round(maxY)}</text>
    </svg>
  )
}

export default TimeSeriesChart
