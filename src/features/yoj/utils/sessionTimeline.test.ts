import {describe,expect,it} from 'vitest'
import {mergeTimelineRows,parseTimelinePage,toTimelineMessages,type TimelineRow} from './sessionTimeline'
import {getTimelineKeys} from './timelineIdentity'
const row=(id:string,time=1,kind:TimelineRow['kind']='assistant',message:Record<string,unknown>={}):TimelineRow=>({id,createTime:time,kind,message:{docId:id,...message}})
const page=(rows:TimelineRow[])=>({version:1,rows,oldestCursor:rows.length?'old':null,newestCursor:rows.length?'new':null,hasMore:false})
describe('session transcript contract',()=>{
  it('preserves authoritative order across same-time pages without client collation',()=>{
    const older=[row('z'),row('A')],newer=[row('b'),row('B')]
    expect(mergeTimelineRows(newer,older,'older')).toEqual([...older,...newer])
    expect(mergeTimelineRows(older,newer)).toEqual([...older,...newer])
  })
  it('upserts replayed IDs without dropping loaded history and keeps an empty poll stable',()=>{
    const current=[row('a'),row('b',2)],updated=row('b',2,'assistant',{content:'changed'})
    expect(mergeTimelineRows(current,[updated,row('c',3)])).toEqual([current[0],updated,row('c',3)])
    expect(mergeTimelineRows(current,[])).toBe(current)
  })
  it('rejects malformed, duplicate and unordered pages',()=>{
    expect(parseTimelinePage(page([row('a')]))).toEqual(page([row('a')]))
    for(const invalid of [null,{...page([]),version:2},{...page([]),hasMore:true},page([row('a'),row('a')]),page([row('a',2),row('b',1)]),page([row('',1)])])expect(()=>parseTimelinePage(invalid)).toThrow('Invalid session timeline response')
  })
  it('preserves backend identity, raw correlation and timestamps through the presentation adapter',()=>{
    const rows=[row('a',1,'assistant',{responseId:'r',tool_calls:[{id:'t'}],create_time:99}),row('b',2,'tool',{tool_call_id:'t',content:{answer:1},cost:'0.1'})]
    const messages=toTimelineMessages(rows)
    expect(messages[0]).toMatchObject({timelineId:'a',create_time:1,responseId:'r',tool_calls:[{id:'t'}]})
    expect(messages[1]).toMatchObject({timelineId:'b',tool_call_id:'t',content:'{"answer":1}',cost:0.1})
    expect(getTimelineKeys(messages)[0]).toEqual(getTimelineKeys([{role:'assistant',responseId:'r',liveResponse:true}])[0])
  })
  it('does not collapse distinct persisted rows sharing a response or bare document ID',()=>{
    const msgs=toTimelineMessages([row('a',1,'assistant',{responseId:'r',docId:'same'}),row('b',1,'assistant',{responseId:'r',docId:'same'})])
    expect(new Set(getTimelineKeys(msgs)).size).toBe(2)
    expect(getTimelineKeys([...msgs].reverse())).toEqual([...getTimelineKeys(msgs)].reverse())
  })
})
