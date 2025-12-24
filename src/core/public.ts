// Core orchestrator barrel: cross-cutting hooks and utilities used by feature pages

export { useWorkflowExec } from '../hooks/useWorkflowExec'
export { useDebouncedValue } from '../hooks/useDebouncedValue'
export { useScrollHome } from '../features/sessions/hooks/useScrollHome'
export { useSessionPolling } from '../features/sessions/hooks/useSessionPolling'
// Re-export exec tree hook from exec feature to preserve existing import sites
export { useExecTrees } from '../features/exec/public'

// API base configuration (runtime + React context)
export { ApiProvider, useApiConfig } from './ApiProvider'
export { getDefaultApiBase, setDefaultApiBase } from './apiConfig'
