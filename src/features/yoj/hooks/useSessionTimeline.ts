import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { makeApiClient } from '../../../api/apiClient'
import { MAX_LOADED_ROWS, PAGE_SIZE, mergeTimelineRows, parseTimelinePage, toTimelineMessages, type TimelineRow } from '../utils/sessionTimeline'

type Options={sessionId?:string|null;projectId?:string|null;userId?:string|null;idToken?:string|null;enabled:boolean}
type Snapshot={scope:string;rows:TimelineRow[];oldest:string|null;newest:string|null;hasOlder:boolean;running:boolean;loadingOlder:boolean;error:string|null;atLimit:boolean;needsReset:boolean}
const empty=(scope:string):Snapshot=>({scope,rows:[],oldest:null,newest:null,hasOlder:false,running:false,loadingOlder:false,error:null,atLimit:false,needsReset:false})

// One scoped persisted history owner; callers schedule refresh, never mutate rows.
// Serialize page requests and coalesce refresh requests while one is in flight.
export function useSessionTimeline({sessionId,projectId,userId,idToken,enabled}:Options) {
  const scope=JSON.stringify([userId,projectId,sessionId])
  const [view,setView]=useState<Snapshot>(()=>empty(scope))
  const controller=useRef<{reload:()=>void;older:()=>void;reset:()=>void}|null>(null)
  const snapshot=useRef(view)
  useEffect(()=>{
    let active=true,busy=false,pending: 'refresh'|'older'|'reset'|null=null,abort:AbortController|null=null
    let state=snapshot.current.scope===scope?snapshot.current:empty(scope)
    function publish(patch:Partial<Snapshot>){if(!active)return;state={...state,...patch};snapshot.current=state;setView(state)}
    const skipAuth=import.meta.env.VITE_SKIP_AUTH==='1'
    if(!enabled||!sessionId||!projectId||!userId||(!idToken&&!skipAuth)){publish({...empty(scope)});return}
    publish({scope,running:false,loadingOlder:false,error:null})
    const client=makeApiClient({idToken:idToken??undefined,skipAuth})
    async function request(direction:'refresh'|'older'|'reset'){
      if(!active)return
      if(busy){
        // An explicit navigation request takes precedence over a background tick.
        if(direction==='reset'||(direction==='older'&&pending!=='reset')||!pending)pending=direction
        return
      }
      if(direction==='older'&&(!state.hasOlder||!state.oldest||state.atLimit||state.needsReset))return
      if(direction==='refresh'&&(state.atLimit||state.needsReset))return
      busy=true;abort=new AbortController()
      publish({running:direction!=='older',loadingOlder:direction==='older',error:null})
      try{
        const room=MAX_LOADED_ROWS-(direction==='reset'?0:state.rows.length)
        if(room<=0){publish({atLimit:true});return}
        // Keep all loaded rows, including the reader's anchor. An explicit reset
        // is required to release the bounded history; never silently evict.
        const body={sessionId:sessionId!,limit:Math.min(PAGE_SIZE,room),...(direction==='older'?{before:state.oldest!}:direction==='refresh'&&state.newest?{after:state.newest}:{})}
        const page=parseTimelinePage(await client.sessionTimeline(body,{signal:abort.signal,extraHeaders:{'x-project-id':projectId!}}))
        if(!active)return
        const initial=direction==='reset'||!state.newest
        const rows=mergeTimelineRows(initial?[]:state.rows,page.rows,direction==='older'?'older':'newer')
        publish({rows,oldest:initial?page.oldestCursor:direction==='older'?page.oldestCursor??state.oldest:state.oldest,
          newest:initial||direction==='refresh'?page.newestCursor??(initial?null:state.newest):state.newest,
          hasOlder:initial||direction==='older'?page.hasMore:state.hasOlder,atLimit:rows.length>=MAX_LOADED_ROWS,needsReset:false})
        // A large burst is drained across successive bounded polls rather than
        // skipping ahead to the newest page. Polling/SSE completion schedules it.
      }catch(e:unknown){if(active)publish({error:e instanceof Error?e.message:'Timeline unavailable',needsReset:(e as {httpStatus?:number})?.httpStatus===409||state.needsReset})}
      finally{busy=false;abort=null;publish({running:false,loadingOlder:false});if(active&&pending){const next=pending;pending=null;void request(next)}}
    }
    const api={reload:()=>void request('refresh'),older:()=>void request('older'),reset:()=>void request('reset')}
    controller.current=api
    api.reload()
    return()=>{active=false;abort?.abort();if(controller.current===api)controller.current=null}
  },[scope,sessionId,projectId,userId,idToken,enabled])
  const cleared=useMemo(()=>empty(scope),[scope])
  const state=view.scope===scope&&enabled?view:cleared
  const messages=useMemo(()=>toTimelineMessages(state.rows),[state.rows])
  const reload=useCallback(()=>controller.current?.reload(),[])
  const loadOlder=useCallback(()=>controller.current?.older(),[])
  const reset=useCallback(()=>controller.current?.reset(),[])
  return {...state,messages,reload,loadOlder,reset}
}
