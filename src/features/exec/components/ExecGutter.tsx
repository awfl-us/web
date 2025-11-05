export type ExecGutterProps = {
  lane: number | null
  lanes?: number
  showDot?: boolean
  prevSame?: boolean
  nextSame?: boolean
  height?: number
}

// Minimal, stateless gutter for exec lanes/connectors.
// - Renders a single vertical connector on the active lane when prev/next
//   indicate adjacency.
// - Draws a small dot at the middle when showDot=true.
// - Width scales with the number of lanes (compact per-row model).
export function ExecGutter({ lane, lanes = 0, showDot = true, prevSame = false, nextSame = false, height = 24 }: ExecGutterProps) {
  const cols = Math.max(lanes, showDot ? 1 : 0)
  const colW = 12
  const w = Math.max(cols, 1) * colW
  const cx = (lane == null ? 0 : lane) * colW + colW / 2
  const cy = height / 2

  const stroke = '#d1d5db' // gray-300
  const dotFill = '#6b7280' // gray-600

  return (
    <div style={{ width: w, minWidth: w, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }}>
        {lane != null && (prevSame || nextSame) ? (
          <line x1={cx} x2={cx} y1={prevSame ? 0 : cy} y2={nextSame ? height : cy} stroke={stroke} strokeWidth={2} />
        ) : null}
        {showDot ? <circle cx={cx} cy={cy} r={3} fill={dotFill} /> : null}
      </svg>
    </div>
  )
}
