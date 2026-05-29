export type UsageRow = {
  hour_key: string | number
  workflow_name?: string | null
  total_cost?: number | null
  total_tokens?: number | null
  [k: string]: any
}

export type UsagePoint = {
  t: number // epoch ms for the start of the hour (UTC)
  cost: number
  tokens: number
}

export type UsageSeries = {
  workflow: string
  points: UsagePoint[]
}

export type UsageMetric = 'cost' | 'tokens'
