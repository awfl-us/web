import { useSyncExternalStore } from 'react'
import { getSelectedProjectId, subscribeSelectedProjectId } from '../utils/projectSelection'

// Stable subscription hook for project id changes. Uses useSyncExternalStore
// to avoid tearing and ensures consistent value across renders.
export function useSelectedProjectId(): string {
  return useSyncExternalStore(
    subscribeSelectedProjectId,
    getSelectedProjectId,
    getSelectedProjectId
  )
}
