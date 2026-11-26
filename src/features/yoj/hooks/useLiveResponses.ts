import { useEffect, useMemo, useRef, useState } from 'react'
import { buildHeaders } from '../../../api/http'
import { getDefaultApiBase } from '../../../core/apiConfig'
import type { YojMessage } from '../../../types/context'
import { initialLiveState, mergeLiveMessages, pruneLive, reduceLive, SseParser } from '../utils/liveResponses'
import type { LiveState } from '../utils/liveResponses'

type Options={sessionId?:string|null;projectId?:string|null;userId?:string|null;idToken?:string|null;enabled:boolean;messages:YojMessage[];reload:()=>void}
export function useLiveResponses({sessionId,projectId,userId,idToken,enabled,messages,reload}:Options) {
  const key=JSON.stringify([userId,projectId,sessionId])
  const [view,setView]=useState<{key:string;state:LiveState}>(()=>({key,state:initialLiveState()}))
  const stateRef=useRef(view)
  const messagesRef=useRef(messages)
  const reloadRef=useRef(reload)
  const currentKey=useRef(key)
  currentKey.current=key
  messagesRef.current=messages
  reloadRef.current=reload
  useEffect(()=>{
    let stopped=false,controller:AbortController|null=null
    let retry:ReturnType<typeof setTimeout>|undefined,recovery:ReturnType<typeof setTimeout>|undefined
    let delay=500
    const active=()=>!stopped&&currentKey.current===key
    function update(state:LiveState){
      if(!active())return
      const v={key,state};stateRef.current=v;setView(v)
    }
    if(stateRef.current.key!==key)update({ ...initialLiveState() })
    if(!enabled||!sessionId||!projectId||!userId||!idToken){
      update(initialLiveState());return
    }
    const stopRecovery=()=>{if(recovery)clearTimeout(recovery);recovery=undefined}
    function retryLater(ms:number){
      if(active())retry=setTimeout(()=>void connect(),ms)
    }
    async function connect(){
      if(!active())return
      const ac=new AbortController();controller=ac
      let ready=false
      const parser=new SseParser()
      const timeout=setTimeout(()=>ac.abort(),15000)
      try{
        const response=await fetch((getDefaultApiBase()||'')+'/workflows/events/responses/stream?sessionId='+encodeURIComponent(sessionId!),{
          headers:{...buildHeaders({idToken:idToken!},{extraHeaders:{'x-project-id':projectId!}}),Accept:'text/event-stream'},
          signal:ac.signal,cache:'no-store'
        })
        if(!active())return
        if([401,403].includes(response.status)){
          await response.body?.cancel().catch(()=>{})
          update(initialLiveState());return
        }
        if(!response.ok||!response.body||!response.headers.get('content-type')?.includes('text/event-stream')){
          await response.body?.cancel().catch(()=>{})
          // Older/disabled servers remain fully usable through ordinary polling.
          retryLater(response.status===404||response.status===503?30000:Math.min(delay*=2,15000))
          return
        }
        const reader=response.body.getReader()
        try{
          while(active()){
            const {done,value}=await reader.read()
            if(done)break
            parser.push(value,f=>{
              if(!active()||ac.signal.aborted)return
              if(f.type==='response.ready'){
                ready=true;delay=500;clearTimeout(timeout);stopRecovery()
              }
              const before=stateRef.current.state
              const after=reduceLive(before,f)
              if(after!==before)update(after)
              if(f.type==='response.provider_finished'||f.type==='response.failed')reloadRef.current()
              if(after.recover&&!recovery){
                // Give the server's automatic snapshot recovery time to arrive.
                // Only reconnect scheduling is delayed, never delta rendering.
                recovery=setTimeout(()=>{recovery=undefined;if(stateRef.current.state.recover)ac.abort()},1000)
              }else if(!after.recover)stopRecovery()
            })
          }
        }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
      }catch{
        // Ordinary polling remains active when transport is unavailable.
      }finally{clearTimeout(timeout);stopRecovery()}
      if(active()){
        reloadRef.current()
        retryLater(ready?500:Math.min(delay*=2,15000))
      }
    }
    const prune=setInterval(()=>update(pruneLive(stateRef.current.state,messagesRef.current)),15000)
    void connect()
    return ()=>{stopped=true;controller?.abort();clearTimeout(retry);stopRecovery();clearInterval(prune)}
  },[key,enabled,sessionId,projectId,userId,idToken])
  useEffect(()=>{
    if(stateRef.current.key!==key)return
    const next=pruneLive(stateRef.current.state,messages)
    const v={key,state:next};stateRef.current=v;setView(v)
  },[key,messages])
  return useMemo(()=>enabled&&idToken&&view.key===key?mergeLiveMessages(messages,view.state):messages,[enabled,idToken,view,key,messages])
}
