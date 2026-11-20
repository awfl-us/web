import { describe, expect, it } from 'vitest'
import { nonblockingWorkflowLaunch } from './workflowLaunch'

describe('nonblocking agent submit', () => {
  it('requests immediate acknowledgement without dropping workflow inputs', () => {
    const params = { sessionId: 'session-1', agentId: 'project-manager', model: 'gpt-6.1-terra', query: 'test' }
    expect(nonblockingWorkflowLaunch('codebase-ProjectManager', params)).toEqual({
      workflowName: 'codebase-ProjectManager', params, sync: true,
    })
  })
})
