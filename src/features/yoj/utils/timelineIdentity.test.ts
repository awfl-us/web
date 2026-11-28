import { describe, expect, it } from 'vitest'
import { getTimelineKeys } from './timelineIdentity'

describe('timeline identity', () => {
  it('retains stored row identities across insertion, expiration and reorder', () => {
    const rows = [{role:'assistant',docId:'a'}, {role:'tool',docId:'b'}, {role:'system',docId:'c'}]
    const keys = getTimelineKeys(rows)
    expect(getTimelineKeys([{role:'user',docId:'prefix'}, rows[2], rows[0]]).slice(1)).toEqual([keys[2],keys[0]])
  })
  it('reconciles live and persisted responses without relying on timestamp', () => {
    expect(getTimelineKeys([{role:'assistant',responseId:'r',liveResponse:true}])).toEqual(getTimelineKeys([{role:'assistant',responseId:'r',docId:'stored',create_time:12}]))
  })
  it('keeps duplicate identifiers distinct and does not collapse unknown rows', () => {
    const rows = [{role:'assistant',docId:'same'}, {role:'assistant',docId:'same'}, {role:'assistant'}, {role:'assistant',docId:'null'}]
    const keys = getTimelineKeys(rows)
    expect(new Set(keys).size).toBe(rows.length)
    expect(keys[0]).not.toBe(getTimelineKeys([rows[0]])[0])
  })
  it('identifies generated group placeholders independently of description and position', () => {
    const marker = {role:'system',content:JSON.stringify({type:'collapsed_group',name:'GROUP',responseId:'r'})}
    const changed = {...marker,content:JSON.stringify({type:'collapsed_group',name:'GROUP',responseId:'r',description:'new'})}
    expect(getTimelineKeys([marker])[0]).toBe(getTimelineKeys([{role:'user',docId:'u'},changed])[1])
  })
})
