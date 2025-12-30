import { useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useConsumerStatus } from '../hooks/useConsumerStatus'

/**
 * ProducerLockStatus — display-only local/cloud consumer lock indicator.
 *
 * Renders two side-by-side pills for LOCAL and CLOUD consumer states. Active side is highlighted.
 * No controls are included; use ConsumerStatusPill if you need start/stop buttons.
 *
 * Usage (from a page or dependent app):
 *   import { ProducerLockStatus } from '../features/consumers/public'
 *   
 *   <ProducerLockStatus idToken={idToken} projectId={projectId} enabled />
 *
 * Style customization:
 * - Pass className/style for the container.
 * - Use the `slots` prop to target local/cloud sides and their icon/text. Provide optional
 *   active/inactive variants per side. Active/inactive className/style are merged conditionally.
 */
export type ProducerLockStatusProps = {
  idToken?: string
  projectId?: string
  enabled?: boolean
  consumerId?: string | null
  intervalMs?: number
  // Container styling
  className?: string
  style?: CSSProperties
  // Per-side slots with optional state variants
  slots?: {
    local?: SlotOverrides
    cloud?: SlotOverrides
  }
  // Replace default emoji icons if desired
  icons?: {
    local?: ReactNode
    cloud?: ReactNode
  }
  // Replace default text labels if desired
  labels?: {
    local?: string
    cloud?: string
  }
}

export type SlotOverrides = {
  className?: string
  style?: CSSProperties
  iconClassName?: string
  iconStyle?: CSSProperties
  textClassName?: string
  textStyle?: CSSProperties
  activeClassName?: string
  activeStyle?: CSSProperties
  inactiveClassName?: string
  inactiveStyle?: CSSProperties
}

function getOrMakeClientId(): string {
  try {
    const k = 'awfl.consumerId'
    let v = localStorage.getItem(k)
    if (!v) {
      v = `web-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
      localStorage.setItem(k, v)
    }
    return v
  } catch {
    return `web-${Math.random().toString(36).slice(2, 8)}`
  }
}

export function ProducerLockStatus({
  idToken,
  projectId,
  enabled,
  consumerId: consumerIdProp,
  intervalMs,
  className,
  style,
  slots,
  icons,
  labels,
}: ProducerLockStatusProps) {
  const consumerId = useMemo(() => consumerIdProp ?? getOrMakeClientId(), [consumerIdProp])
  const { status } = useConsumerStatus({ idToken, projectId, consumerId, enabled, intervalMs })

  const type = status?.consumerType // 'LOCAL' | 'CLOUD' | null
  const localActive = type === 'LOCAL'
  const cloudActive = type === 'CLOUD'

  const baseSideStyle: CSSProperties = {
    padding: '4px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    lineHeight: 1,
    userSelect: 'none',
  }

  const ACTIVE_TEXT = '#065f46'
  const ACTIVE_BG = '#a7f3d0'
  const INACTIVE_TEXT = '#6b7280'
  const INACTIVE_BG = '#f3f4f6'

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    border: '1px solid #d1d5db',
    borderRadius: 999,
    overflow: 'visible',
    alignItems: 'stretch',
    background: 'white',
    ...(style || {}),
  }

  const localBaseStyle: CSSProperties = localActive
    ? { color: ACTIVE_TEXT, background: ACTIVE_BG }
    : { color: INACTIVE_TEXT, background: INACTIVE_BG }
  const cloudBaseStyle: CSSProperties = cloudActive
    ? { color: ACTIVE_TEXT, background: ACTIVE_BG }
    : { color: INACTIVE_TEXT, background: INACTIVE_BG }

  const local = slots?.local || {}
  const cloud = slots?.cloud || {}

  const localStateStyle = localActive ? local.activeStyle : local.inactiveStyle
  const localStateClass = localActive ? local.activeClassName : local.inactiveClassName
  const cloudStateStyle = cloudActive ? cloud.activeStyle : cloud.inactiveStyle
  const cloudStateClass = cloudActive ? cloud.activeClassName : cloud.inactiveClassName

  return (
    <div className={className} style={containerStyle} aria-label={`Consumer lock: ${localActive ? 'LOCAL' : cloudActive ? 'CLOUD' : 'none'}`}>
      <div
        className={[local.className, localStateClass].filter(Boolean).join(' ')}
        style={{
          ...baseSideStyle,
          ...localBaseStyle,
          borderRight: '1px solid #e5e7eb',
          borderTopLeftRadius: 999,
          borderBottomLeftRadius: 999,
          ...(local.style || {}),
          ...(localStateStyle || {}),
        }}
        title={localActive ? 'Consumer lock: LOCAL' : 'Local consumer'}
        aria-label={localActive ? 'Consumer lock: LOCAL' : 'Local consumer'}
      >
        <span aria-hidden className={local.iconClassName} style={{ display: 'inline-block', lineHeight: 1, ...(local.iconStyle || {}) }}>
          {icons?.local ?? '💻'}
        </span>
        <span className={local.textClassName} style={local.textStyle}>
          {labels?.local ?? 'Local'}
        </span>
      </div>
      <div
        className={[cloud.className, cloudStateClass].filter(Boolean).join(' ')}
        style={{
          ...baseSideStyle,
          ...cloudBaseStyle,
          borderTopRightRadius: 999,
          borderBottomRightRadius: 999,
          ...(cloud.style || {}),
          ...(cloudStateStyle || {}),
        }}
        title={cloudActive ? 'Consumer lock: CLOUD' : 'Cloud consumer'}
        aria-label={cloudActive ? 'Consumer lock: CLOUD' : 'Cloud consumer'}
      >
        <span aria-hidden className={cloud.iconClassName} style={{ display: 'inline-block', lineHeight: 1, ...(cloud.iconStyle || {}) }}>
          {icons?.cloud ?? '☁️'}
        </span>
        <span className={cloud.textClassName} style={cloud.textStyle}>
          {labels?.cloud ?? 'Cloud'}
        </span>
      </div>
    </div>
  )
}

export default ProducerLockStatus
