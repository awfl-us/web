import type { CSSProperties } from 'react'

// Shared style tokens and slot override types for status pill components
export const ACTIVE_TEXT = '#065f46'
export const ACTIVE_BG = '#a7f3d0'
export const INACTIVE_TEXT = '#6b7280'
export const INACTIVE_BG = '#f3f4f6'

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
