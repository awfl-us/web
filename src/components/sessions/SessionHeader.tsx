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
  onBack?: () => void
}) {
  const { title, counts, onTitleClick, onCountClick, activeStatus, onAddTask, onEditAgent, avgUsdPerHourText, onBack } = props

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

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      {/* Left/top: back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {onBack ? (
          <button
            className="mobile-back-button"
            aria-label="Back"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              cursor: 'pointer',
              lineHeight: 1,
              fontSize: 16,
            }}
          >
            <span aria-hidden>{'<'}</span>
          </button>
        ) : null}
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
      </div>

      {/* Right/bottom: task counts + add task, $/hr, and edit agent icon */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
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

        {onEditAgent ? (
          <button
            onClick={onEditAgent}
            title="Edit agent"
            aria-label="Edit agent"
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
              padding: 0,
            }}
          >
            {/* gear icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z"
                stroke="#111827"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a7.97 7.97 0 0 0 .1-1 7.97 7.97 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.3 7.3 0 0 0-1.7-1l-.4-2.7a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.7c-.6.2-1.2.5-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 13a7.97 7.97 0 0 0-.1 1 7.97 7.97 0 0 0 .1 1l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5a.5.5 0 0 0 .6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.7a.5.5 0 0 0 .5.4h4a.5.5 0 0 0 .5-.4l.4-2.7c.6-.2 1.2-.6 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 15z"
                stroke="#111827"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  )
}
