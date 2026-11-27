import styles from './ModelSelector.module.css'
export type ModelOption = { value: string; label: string }

export function ModelSelector(props: {
  model: string
  options: ModelOption[]
  onChange: (m: string) => void
}) {
  const { model, options, onChange } = props
  return (
    <label title="Model" className={styles.model}>
      <select aria-label="Model" value={model} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
