// Consumers feature public surface
export type { ConsumerType, ConsumerStatus } from './types'
export { useConsumerStatus } from './hooks/useConsumerStatus'
export { useProducerControls } from './hooks/useProducerControls'

// Primary UI component (customizable)
export { ConsumerStatusPill } from './components/ConsumerStatusPill'
export type { ConsumerStatusPillProps } from './components/ConsumerStatusPill'
export type { SlotOverrides } from './components/shared'
