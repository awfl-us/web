import React from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ACTIVE_BG, ACTIVE_TEXT, INACTIVE_BG, INACTIVE_TEXT, type SlotOverrides } from './shared'

export type BaseStatusPillProps = {
  // Which side is active; null means neither
  active: 'LOCAL' | 'CLOUD' | null
  className?: string
  style?: CSSProperties
  // Per-side slot overrides
  slots?: {
    local?: SlotOverrides
    cloud?: SlotOverrides
  }
  // Icons and labels for sides
  icons?: {
    local?: ReactNode
    cloud?: ReactNode
  }
  labels?: {
    local?: string
    cloud?: string
  }
  // Whether to render text labels next to icons
  showText?: boolean
  // Optional extras to render inside each side after icon/text
  extras?: {
    local?: ReactNode
    cloud?: ReactNode
  }
}

export function BaseStatusPill({ active, className, style, slots, icons, labels, showText = true, extras }: BaseStatusPillProps) {
  const localActive = active === 'LOCAL'
  const cloudActive = active === 'CLOUD'

  const baseSideStyle: CSSProperties = {
    padding: '4px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    lineHeight: 1,
    userSelect: 'none',
  }

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
        {showText && (
          <span className={local.textClassName} style={local.textStyle}>
            {labels?.local ?? 'Local'}
          </span>
        )}
        {extras?.local}
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
        {showText && (
          <span className={cloud.textClassName} style={cloud.textStyle}>
            {labels?.cloud ?? 'Cloud'}
          </span>
        )}
        {extras?.cloud}
      </div>
    </div>
  )
}

export default BaseStatusPill
