import type { YojMessage } from '../../../types/context'

export type Frame = {type:string; data:Record<string,unknown>}
export class SseParser {
  private decoder=new TextDecoder()
  private buffer=''
  private type=''
  private data:string[]=[]
  private size=0
  push(bytes:Uint8Array, emit:(f:Frame)=>void) {
    this.buffer+=this.decoder.decode(bytes,{stream:true})
    for(let i;(i=this.buffer.indexOf('\n'))>=0;){
      if(i>262144)throw Error('SSE frame too large')
      const line=this.buffer.slice(0,i).replace(/\r$/,'');this.buffer=this.buffer.slice(i+1)
      if(!line){
        if(this.data.length){
          const data:unknown=JSON.parse(this.data.join('\n'))
          if(data&&typeof data==='object'&&!Array.isArray(data))emit({type:this.type||'message',data:data as Record<string,unknown>})
        }
        this.type='';this.data=[];this.size=0
      }else if(line.startsWith('event:'))this.type=line.slice(6).trim()
      else if(line.startsWith('data:')){
        const value=line.slice(5).replace(/^ /,'');this.size+=value.length
        if(this.size>262144)throw Error('SSE frame too large')
        this.data.push(value)
      }
    }
    if(this.buffer.length>262144)throw Error('SSE frame too large')
  }
}
type Part={sequence:number;type:string;content?:string;hasText?:boolean}
type Snapshot={requestId:string;sequence:number;count:number;parts:Record<number,string>;status:string;hasText?:boolean}
type ResponseState={id:string;attempt:string;sequence:number;text:string;status:string;created:number;updated:number;pending:Part[];snapshot?:Snapshot}
export type LiveState={requestId:string;responses:Record<string,ResponseState>;settled:Record<string,number>;recover:boolean}
export const initialLiveState=():LiveState=>({requestId:'',responses:{},settled:{},recover:false})
const TTL=300000, MAX=64, MAX_TEXT=131072
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(v)&&!['__proto__','constructor','prototype','null'].includes(v)
const validSequence=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0
const own=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k)
const validStatus=(v:unknown)=>['response.started','response.delta','response.provider_finished','response.failed'].includes(String(v))

export function pruneLive(s:LiveState, persisted:YojMessage[], now=Date.now()):LiveState{
  const responses={...s.responses}, settled={...s.settled}
  for(const m of persisted)if(m.role==='assistant'&&validId(m.responseId)){settled[m.responseId]=now;delete responses[m.responseId]}
  for(const [id,r] of Object.entries(responses))if(now-r.updated>TTL){delete responses[id];settled[id]=now}
  for(const [id,t] of Object.entries(settled))if(now-t>TTL)delete settled[id]
  const entries=Object.entries(settled).sort((a,b)=>b[1]-a[1]).slice(0,2048)
  return {...s,responses,settled:Object.fromEntries(entries)}
}
function apply(r:ResponseState,p:Part,now:number){
  r.sequence=p.sequence;r.updated=now;r.status=p.type
  if(p.type==='response.delta')r.text+=(p.content||'')
  if(p.type==='response.failed'||p.type==='response.provider_finished'&&p.hasText===false)r.text=''
}
function drain(r:ResponseState,now:number){
  r.pending=r.pending.filter(p=>p.sequence>r.sequence).sort((a,b)=>a.sequence-b.sequence)
  while(r.pending[0]?.sequence===r.sequence+1)apply(r,r.pending.shift()!,now)
}
export function reduceLive(s:LiveState,f:Frame,now=Date.now()):LiveState{
  const d=f.data,t=f.type
  if(t==='response.ready'&&validId(d.requestId))return {...s,requestId:d.requestId,recover:false}
  if(t==='response.gap')return {...s,recover:true}
  if(!validId(d.responseId)||!validId(d.attemptId)||!validSequence(d.sequence)||own(s.settled,d.responseId))return s
  const id=d.responseId,attempt=d.attemptId,seq=d.sequence
  if(!validStatus(t)&&t!=='response.snapshot')return s
  const existing=own(s.responses,id)?s.responses[id]:undefined
  if(existing&&existing.attempt!==attempt)return s
  if(!existing&&Object.keys(s.responses).length>=MAX)return {...s,recover:true}
  const r:ResponseState=existing?{...existing,pending:[...existing.pending]}:{id,attempt,sequence:-1,text:'',status:'response.started',created:now,updated:now,pending:[]}
  const next={...s,responses:{...s.responses,[id]:r}}
  if(t==='response.snapshot'){
    if(d.requestId!==s.requestId||!validId(d.requestId)||seq<r.sequence||!validSequence(d.index)||!validSequence(d.count)||d.count<1||d.count>320||d.index>=d.count||typeof d.content!=='string'||d.content.length>8192||!validStatus(d.status))return s
    const terminal=d.terminal as {hasText?:boolean}|undefined
    let snap=r.snapshot
    if(!snap||snap.requestId!==d.requestId||snap.sequence!==seq)snap={requestId:d.requestId,sequence:seq,count:d.count,parts:{},status:String(d.status),hasText:terminal?.hasText}
    if(snap.count!==d.count||snap.status!==d.status)return {...s,recover:true}
    snap={...snap,parts:{...snap.parts,[d.index]:d.content}}
    if(Object.values(snap.parts).reduce((n,p)=>n+p.length,0)>MAX_TEXT)return {...s,recover:true}
    r.snapshot=snap
    if(Object.keys(snap.parts).length===snap.count){
      const text=Array.from({length:snap.count},(_,i)=>snap.parts[i]).join('')
      if(text.length>MAX_TEXT)return {...s,recover:true}
      r.text=text;r.sequence=seq;r.status=snap.status;r.updated=now;r.snapshot=undefined
      if(r.status==='response.failed'||r.status==='response.provider_finished'&&snap.hasText===false)r.text=''
      drain(r,now)
      next.recover=Object.values(next.responses).some(x=>x.pending.length>0)
    }
  }else{
    if(seq<=r.sequence||r.pending.some(p=>p.sequence===seq))return s
    if(t==='response.delta'&&(typeof d.content!=='string'||d.content.length>8192))return {...s,recover:true}
    const p:Part={sequence:seq,type:t,content:typeof d.content==='string'?d.content:undefined,hasText:typeof d.hasText==='boolean'?d.hasText:undefined}
    if(seq===r.sequence+1){apply(r,p,now);drain(r,now);next.recover=Object.values(next.responses).some(x=>x.pending.length>0)}
    else{
      if(r.pending.length>=256||r.pending.reduce((n,x)=>n+(x.content?.length||0),0)+(p.content?.length||0)>MAX_TEXT)return {...s,recover:true}
      r.pending.push(p)
      next.recover=true
    }
  }
  if(r.text.length>MAX_TEXT){delete next.responses[id];return {...next,settled:{...next.settled,[id]:now},recover:true}}
  return next
}
export function mergeLiveMessages(persisted:YojMessage[],s:LiveState):YojMessage[]{
  const ids=new Set(persisted.filter(m=>m.role==='assistant').map(m=>m.responseId))
  const overlay=Object.values(s.responses).filter(r=>r.text&&r.status!=='response.failed'&&!ids.has(r.id)&&!own(s.settled,r.id))
    .sort((a,b)=>a.created-b.created)
    .map(r=>({role:'assistant',responseId:r.id,content:r.text,create_time:r.created/1000,liveResponse:true}))
  return overlay.length?[...persisted,...overlay]:persisted
}
