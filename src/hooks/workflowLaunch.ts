/** Legacy /workflows/execute uses `sync: true` to return 202 immediately.
 * Do not wait for a long-running ProjectManager turn in an HTTP request. */
export function nonblockingWorkflowLaunch(workflowName: string, params: Record<string, unknown>) {
  return { workflowName, params, sync: true as const }
}
