import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { UsageMetric, UsageSeries } from '../types'

export type RechartsTimeSeriesChartProps = {
  series: UsageSeries[]
  metric: UsageMetric
  start: number
  end: number
  height?: number
}

const PALETTE = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#f59e0b', '#ef4444', '#10b981', '#3b82f6',
]

function floorHour(ms: number) { return Math.floor(ms / 3600_000) * 3600_000 }

function fmtShort(ms: number) {
  const d = new Date(ms)
  const M = String(d.getUTCMonth() + 1).padStart(2, '0')
  const D = String(d.getUTCDate()).padStart(2, '0')
  const H = String(d.getUTCHours()).padStart(2, '0')
  return `${M}/${D} ${H}h`
}

function fmtUtc(ms: number) {
  const d = new Date(ms)
  const Y = d.getUTCFullYear()
  const M = String(d.getUTCMonth() + 1).padStart(2, '0')
  const D = String(d.getUTCDate()).padStart(2, '0')
  const H = String(d.getUTCHours()).padStart(2, '0')
  return `${Y}-${M}-${D} ${H}:00 UTC`
}

export function RechartsTimeSeriesChart(props: RechartsTimeSeriesChartProps) {
  const { series, metric, start, end, height = 240 } = props

  const workflows = useMemo(() => series.map(s => s.workflow), [series])

  const colorByWorkflow = useMemo(() => {
    const m = new Map<string, string>()
    workflows.forEach((w, i) => m.set(w, PALETTE[i % PALETTE.length]))
    return m
  }, [workflows])

  const hours = useMemo(() => {
    const out: number[] = []
    const s = floorHour(start)
    const e = floorHour(end)
    for (let t = s; t <= e; t += 3600_000) out.push(t)
    return out
  }, [start, end])

  // Index points by workflow+hour for O(1) lookups when building rows
  const index = useMemo(() => {
    const m = new Map<string, Map<number, number>>() // workflow -> hour -> value
    for (const s of series) {
      const inner = new Map<number, number>()
      for (const p of s.points) {
        const t = floorHour(p.t)
        if (t < start || t > end) continue
        inner.set(t, metric === 'cost' ? p.cost : p.tokens)
      }
      m.set(s.workflow, inner)
    }
    return m
  }, [series, start, end, metric])

  const data = useMemo(() => {
    return hours.map(t => {
      const row: Record<string, any> = { t }
      for (const w of workflows) {
        const v = index.get(w)?.get(t)
        row[w] = v == null ? null : v
      }
      return row
    })
  }, [hours, workflows, index])

  const yTickFormatter = (v: number) => (metric === 'cost' ? `$${v.toFixed(2)}` : `${Math.round(v)}`)
  const tooltipFormatter = (value: any) => metric === 'cost' ? [`$${Number(value ?? 0).toFixed(4)}`, ''] : [`${Math.round(Number(value ?? 0))}`, '']
  const labelFormatter = (label: any) => typeof label === 'number' ? fmtUtc(label) : String(label)

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis dataKey="t" type="number" domain={[start, end]} tickFormatter={fmtShort} tickMargin={6} />
          <YAxis tickFormatter={yTickFormatter} width={50} />
          <Tooltip formatter={tooltipFormatter as any} labelFormatter={labelFormatter} />
          <Legend />
          {workflows.map((w) => (
            <Line
              key={w}
              type="monotone"
              dataKey={w}
              name={w}
              stroke={colorByWorkflow.get(w) || '#3b82f6'}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default RechartsTimeSeriesChart
