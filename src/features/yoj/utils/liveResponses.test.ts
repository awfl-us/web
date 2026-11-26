import { describe, expect, it } from 'vitest'
import { initialLiveState, mergeLiveMessages, pruneLive, reduceLive, SseParser } from './liveResponses'
import type { Frame, LiveState } from './liveResponses'
import {getMessageKey} from './yojUtils'
const event=(type:string,sequence:number,data:Record<string,unknown>={},responseId='r',attemptId='a'):Frame=>({type:'response.'+type,data:{responseId,attemptId,sequence,...data}})
const ready:Frame={type:'response.ready',data:{requestId:'req'}}
const reduce=(frames:Frame[],s:LiveState=initialLiveState())=>frames.reduce((x,f)=>reduceLive(x,f,1000),s)
const snapshot=(index:number,count:number,content:string,sequence=2,extra:Record<string,unknown>={})=>event('snapshot',sequence,{requestId:'req',index,count,content,status:'response.delta',...extra})
describe('live response parser',()=>{
  it('decodes fragmented UTF-8, CRLF, comments and multiline data',()=>{
    const p=new SseParser(),out:Frame[]=[]
    const bytes=new TextEncoder().encode(': keep-alive\r\n\r\nevent: response.delta\r\ndata: {"content":\r\ndata: "🌍"}\r\n\r\nevent: response.ready\ndata: {"requestId":"req"}\n\n')
    for(const byte of bytes)p.push(Uint8Array.of(byte),f=>out.push(f))
    expect(out).toEqual([{type:'response.delta',data:{content:'🌍'}},ready])
  })
})
describe('live response state',()=>{
  it('renders each contiguous text delta, rejects duplicates and foreign attempts',()=>{
    let s=reduce([event('started',0)])
    expect(mergeLiveMessages([],s)).toEqual([])
    s=reduce([event('delta',1,{content:'Hi '}),event('delta',1,{content:'duplicate'}),event('delta',2,{content:'wrong'},'r','bad')],s)
    expect(mergeLiveMessages([],s)[0].content).toBe('Hi ')
    s=reduce([event('delta',2,{content:'there'}),event('provider_finished',3,{hasText:true})],s)
    expect(mergeLiveMessages([],s)[0].content).toBe('Hi there')
  })
  it('buffers a sequence gap without displaying corrupted text and applies late snapshot',()=>{
    let s=reduce([ready,event('delta',3,{content:' C'}),snapshot(1,2,' B')])
    expect(s.recover).toBe(true)
    expect(mergeLiveMessages([],s)).toEqual([])
    s=reduce([snapshot(0,2,'A'),event('delta',4,{content:' D'})],s)
    expect(mergeLiveMessages([],s)[0].content).toBe('A B C D')
    expect(s.recover).toBe(false)
  })
  it('rejects snapshots for old connections and older watermarks',()=>{
    const s=reduce([ready,event('started',0),event('delta',1,{content:'live'}),snapshot(0,1,'old',0),snapshot(0,1,'foreign',2,{requestId:'old'})])
    expect(mergeLiveMessages([],s)[0].content).toBe('live')
  })
  it('reconciles both persistence orders and never resurrects settled text',()=>{
    const stored={role:'assistant',responseId:'r',content:'final',docId:'doc'}
    let s=reduce([event('started',0),event('delta',1,{content:'partial'})])
    const live=mergeLiveMessages([],s)[0]
    expect(getMessageKey(live,0)).toBe(getMessageKey(stored,2))
    expect(mergeLiveMessages([stored],s)).toEqual([stored])
    s=pruneLive(s,[stored],1000)
    s=reduce([ready,event('provider_finished',2,{hasText:true}),snapshot(0,1,'late')],s)
    expect(mergeLiveMessages([],s)).toEqual([])
    const finished=reduce([event('started',0),event('delta',1,{content:'text'}),event('provider_finished',2,{hasText:true})])
    expect(mergeLiveMessages([stored],finished)).toEqual([stored])
  })
  it('handles failure, tool-only completions and multiple response IDs',()=>{
    let s=reduce([event('started',0),event('delta',1,{content:'partial'}),event('failed',2),event('started',0,{},'tool'),event('provider_finished',1,{hasText:false},'tool'),event('started',0,{},'next'),event('delta',1,{content:'second'},'next')])
    expect(mergeLiveMessages([],s).map(x=>x.content)).toEqual(['second'])
    s=pruneLive(s,[],301001)
    expect(mergeLiveMessages([],s)).toEqual([])
  })
  it('handles reconnect request IDs and applies terminal snapshot with no new delta',()=>{
    const s=reduce([ready,event('started',0),event('delta',1,{content:'first'}),{type:'response.gap',data:{}},{type:'response.ready',data:{requestId:'new'}},snapshot(0,1,'stale'),snapshot(0,1,'complete',3,{requestId:'new',status:'response.provider_finished',terminal:{hasText:true}})])
    expect(mergeLiveMessages([],s)[0].content).toBe('complete')
  })
})
