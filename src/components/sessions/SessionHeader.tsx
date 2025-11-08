type Counts = {
  queued?: number
  inProgress?: number
  done?: number
  stuck?: number
}

type Status = 'Queued' | 'In Progress' | 'Done' | 'Stuck'

export function SessionHeader(props: {
  title: string
  updatedAt?: number | string | Date | null
  counts?: Counts
  onTitleClick?: () => void
  onCountClick?: (status: Status) => void
  activeStatus?: Status | null
  onAddTask?: () => void
  onEditAgent?: () => void
  avgUsdPerHourText?: string | null
}) {
  const { title, updatedAt, counts, onTitleClick, onCountClick, activeStatus, onAddTask, onEditAgent, avgUsdPerHourText } = props

  const Badge = ({
    label,
    count,
    bg,
    emoji,
  }: {
    label: Status
    count?: number
    bg: string
    emoji: string
  }) => {
    const clickable = !!onCountClick
    const selected = activeStatus === label
    return (
      <span
        title={`${label}: ${typeof count === 'number' ? count : 0}`}
        onClick={clickable ? () => onCountClick?.(label) : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onCountClick?.(label)
                }
              }
            : undefined
        }
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          color: '#111827',
          background: selected ? '#fde68a' : bg,
          border: selected ? '1px solid #f59e0b' : '1px solid rgba(0,0,0,0.08)',
          padding: '2px 6px',
          borderRadius: 999,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          cursor: clickable ? 'pointer' : 'default',
          outline: 'none',
        }}
      >
        <span aria-hidden>{emoji}</span>
        <span>{typeof count === 'number' ? count : 0}</span>
      </span>
    )
  }

  const updatedDate = updatedAt
    ? updatedAt instanceof Date
      ? updatedAt
      : new Date(updatedAt as any)
    : null
  const updatedText = updatedDate ? updatedDate.toLocaleString() : '-'

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          onClick={onTitleClick}
          title={onTitleClick ? 'Back to messages' : undefined}
          style={{
            fontSize: 18,
            fontWeight: 600,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: onTitleClick ? 'pointer' : 'default',
          }}
        >
          {title}
        </div>
        {counts ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Badge label="Queued" count={counts.queued} bg="#e0f2fe" emoji="🕒" />
            <Badge label="In Progress" count={counts.inProgress} bg="#fef9c3" emoji="🚧" />
            <Badge label="Done" count={counts.done} bg="#dcfce7" emoji="✅" />
            <Badge label="Stuck" count={counts.stuck} bg="#fee2e2" emoji="⛔" />
            {onAddTask ? (
              <button
                onClick={onAddTask}
                title="Add task"
                aria-label="Add task"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  cursor: 'pointer',
                  lineHeight: 1,
                  fontSize: 16,
                }}
              >
                +
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {avgUsdPerHourText ? (
          <div
            title="Average cost rate over the loaded window"
            style={{
              fontSize: 12,
              color: '#111827',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: 999,
              padding: '2px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {avgUsdPerHourText}
          </div>
        ) : null}
        <div style={{ color: '#6b7280', fontSize: 12 }}>Updated {updatedText}</div>
        {onEditAgent ? (
          <button
            onClick={onEditAgent}
            title="Edit agent"
            aria-label="Edit agent"
            style={{
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              borderRadius: 6,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12,
              color: '#111827',
            }}
          >
            Edit Agent
          </button>
        ) : null}
      </div>
    </div>
  )
}
