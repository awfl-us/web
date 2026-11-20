import { useSyncExternalStore } from 'react'
import { getSelectedProjectId, subscribeSelectedProjectId } from '../utils/projectSelection'

/** Live selection within this tab; other tabs retain their own sessionStorage selection. */
export function useSelectedProjectId(): string {
  return useSyncExternalStore(subscribeSelectedProjectId, getSelectedProjectId, () => '')
}
