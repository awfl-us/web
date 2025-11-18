// Projects feature public surface

export { useProjectsList } from './hooks/useProjectsList'
export type { Project } from './types/project'

// Project selection helpers (tab-specific via sessionStorage; cookie fallback)
export { getSelectedProjectId, setSelectedProjectId } from './utils/projectSelection'
