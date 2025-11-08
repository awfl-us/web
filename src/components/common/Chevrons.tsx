// Simple, reusable double-chevron glyph used for expand/collapse affordances.
// Uses text glyphs for minimal footprint; can be swapped to SVG later if desired.
export function Chevrons(props: { expanded: boolean; size?: number; color?: string }) {
  const { expanded, size = 12, color = '#111827' } = props
  const glyph = expanded ? '˄˄' : '˅˅'
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        fontSize: size,
        lineHeight: 1,
        color,
        userSelect: 'none',
      }}
    >
      {glyph}
    </span>
  )
}
