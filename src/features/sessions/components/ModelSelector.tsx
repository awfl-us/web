export type ModelOption = { value: string; label: string }

export function ModelSelector(props: {
  model: string
  options: ModelOption[]
  onChange: (m: string) => void
}) {
  const { model, options, onChange } = props
  return (
    <label
      title="Model"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: '#111827',
        background: '#f3f4f6',
        border: '1px solid #e5e7eb',
        borderRadius: 999,
        padding: '2px 6px 2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ opacity: 0.7 }}>Model</span>
      <select
        aria-label="Model"
        value={model}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          border: 'none',
          background: 'transparent',
          fontSize: 12,
          color: '#111827',
          paddingRight: 14,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span aria-hidden style={{ marginLeft: -12, pointerEvents: 'none' }}>
        ▾
      </span>
    </label>
  )
}
