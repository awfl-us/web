import { describe, expect, it } from 'vitest'
import { indexActivity, toolLabel } from './activity'

const request = (id: string, name = 'READ_FILE', execId = 'parent') => ({role:'assistant', execId, tool_calls:[{id,function:{name,arguments:'{"filepath":"x"}'}}]})
const result = (id: string, execId = 'child') => ({role:'tool', execId, tool_call_id:id, content:'output'})
describe('activity indexing', () => {
  it('correlates interleaved unique ids without moving result positions or requiring same execution', () => {
    const view = indexActivity([request('a'),request('b','RUN_COMMAND','other'),result('b'),{role:'user',content:'next'},result('a')])
    expect(view.calls.get(0)?.[0].resultIndex).toBe(4)
    expect(view.calls.get(1)?.[0].resultIndex).toBe(2)
    expect(view.results.get(4)?.callIndex).toBe(0)
    expect([...view.results.keys()]).toEqual([2,4])
  })
  it('leaves missing, duplicate, reversed and null ids unmatched', () => {
    const view = indexActivity([result('early'),request('early'),request('dup'),request('dup'),result('dup'),request('null'),result('null'),request('missing'),request('twice'),result('twice'),result('twice')])
    expect([...view.calls.values()].flat().every(c=>c.resultIndex===undefined)).toBe(true)
    expect([...view.results.values()].every(r=>!r.call)).toBe(true)
  })
  it('preserves multiple calls and avoids consuming explicit context groups', () => {
    const m = request('a')
    m.tool_calls.push(request('b').tool_calls[0])
    const view = indexActivity([m,{...request('hidden'),type:'collapsed_group'},result('a'),result('hidden')])
    expect(view.calls.get(0)).toHaveLength(2)
    expect(view.calls.has(1)).toBe(false)
    expect(view.results.get(3)?.call).toBeUndefined()
    expect(toolLabel('RUN_COMMAND')).toBe('Run command')
    expect(toolLabel('custom_tool')).toBe('Custom tool')
  })
})
