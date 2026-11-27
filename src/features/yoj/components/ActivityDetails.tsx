import { useRef, useState, type ReactNode } from 'react'
import type { YojMessage } from '../../../types/context'
import { toolLabel, type ActivityCall, type ActivityResult } from '../utils/activity'
import { CopyTextButton } from './CopyTextButton'
import styles from './ActivityDetails.module.css'

function RawData({ value }: { value: unknown }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? ''
  return <div className={styles.raw}>
    <CopyTextButton label="Copy raw data" getText={() => text}/>
    <pre tabIndex={0}>{text}</pre>
  </div>
}

function Disclosure({ summary, children, kind }: {summary: ReactNode; children: ReactNode; kind: string}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  return <div className={styles.activity} data-awfl-slot="activity" data-activity-kind={kind} ref={root}>
    <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => {
      root.current?.dispatchEvent(new CustomEvent('awfl:user-content-expand', {bubbles: true}))
      setOpen(v => !v)
    }}>
      <span className={styles.chevron} aria-hidden="true">{open ? '▾' : '▸'}</span>
      <span className={styles.summary}>{summary}</span>
    </button>
    {open && <div className={styles.details}>{children}</div>}
  </div>
}

export function ToolCallActivity({ calls, message }: {calls: ActivityCall[]; message: YojMessage}) {
  const recorded = calls.filter(c => c.resultIndex !== undefined).length
  const names = calls.map(c => toolLabel(c.name))
  const title = calls.length === 1 ? names[0] : calls.length + ' tool calls'
  return <Disclosure kind="calls" summary={<>
    <span className={styles.name}>{title}</span>
    <span className={styles.state}>{recorded === 0 ? 'No result recorded' : recorded + '/' + calls.length + ' results recorded'}</span>
  </>}>
    {calls.map((call, index) => <div className={styles.entry} key={index}>
      <div className={styles.name}>{names[index]}</div>
      <div className={styles.state}>{call.resultIndex !== undefined ? 'Result recorded' : 'No result recorded'}{call.id ? ' · ' + call.id : ''}</div>
      <RawData value={call.raw}/>
    </div>)}
    <details className={styles.original}><summary>Original message</summary><RawData value={message}/></details>
  </Disclosure>
}

export function ToolResultActivity({ result, message }: {result: ActivityResult; message: YojMessage}) {
  return <Disclosure kind="result" summary={<>
    <span className={styles.name}>{result.call ? toolLabel(result.call.name) + ' result' : 'Tool result'}</span>
    <span className={styles.state}>{result.call ? 'Recorded' : 'Unmatched in this view'}</span>
  </>}>
    {result.id && <div className={styles.state}>Call ID: {result.id}</div>}
    {message.content != null && <RawData value={message.content}/>}
    <details className={styles.original}><summary>Original message</summary><RawData value={message}/></details>
  </Disclosure>
}
