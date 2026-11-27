import { useState } from 'react'
import styles from './MarkdownMessage.module.css'

export function CopyTextButton({ getText, label = 'Copy', disabled = false }: {
  getText: () => string
  label?: string
  disabled?: boolean
}) {
  const [result, setResult] = useState<'copied' | 'failed' | null>(null)
  return <button type="button" className={styles.copy} disabled={disabled}
    aria-label={label} onClick={async () => {
      try {
        await navigator.clipboard.writeText(getText())
        setResult('copied')
      } catch { setResult('failed') }
    }}>
    {result === 'copied' ? 'Copied' : result === 'failed' ? 'Copy failed — retry' : label}
  </button>
}
