// Stats feature barrel: expose chart(s), hook, and types

import type { UsageMetric, UsagePoint, UsageRow, UsageSeries } from './types'
export type { UsageMetric, UsagePoint, UsageRow, UsageSeries }

// Original lightweight SVG chart (fallback)
export { TimeSeriesChart as SvgTimeSeriesChart } from './components/TimeSeriesChart'

// Recharts implementation
export { RechartsTimeSeriesChart } from './components/RechartsTimeSeriesChart'

// Public default chart selection: prefer Recharts, keep SVG as fallback API shape
import { RechartsTimeSeriesChart as _Recharts } from './components/RechartsTimeSeriesChart'
import { TimeSeriesChart as _Svg } from './components/TimeSeriesChart'
import React from 'react'

export type TimeSeriesChartProps = {
  series: UsageSeries[]
  metric: UsageMetric
  start: number
  end: number
  height?: number
}

export function TimeSeriesChart(props: TimeSeriesChartProps) {
  // Use Recharts by default. If an environment flag disables it, fall back to SVG.
  const disableRecharts = (typeof window !== 'undefined') && (window as any)?.AWFL_NO_RECHARTS
  if (!disableRecharts) return React.createElement(_Recharts as any, props)
  return React.createElement(_Svg as any, props)
}

// Hook
export { useProjectHourlyUsage } from './hooks/useProjectHourlyUsage'
