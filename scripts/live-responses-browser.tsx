import {useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useConversation} from '../src/features/yoj/public'
import {useSessionPolling} from '../src/features/sessions/hooks/useSessionPolling'
import {useScrollHome} from '../src/features/sessions/hooks/useScrollHome'
import {SessionDetail} from '../src/features/sessions/public'
import '../src/index.css'
import {setDefaultApiBase} from '../src/core/apiConfig'

setDefaultApiBase('/fixture-api')
function Fixture(){
  const [sessionId,setSessionId]=useState('s')
  const [activityMode,setActivityMode]=useState<'compact'|'detailed'>('compact')
  const [counts,setCounts]=useState(0)
  const [mode,setMode]=useState<'context'|'transcript'>(new URLSearchParams(location.search).get('transcript')==='1'?'transcript':'context')
  const [reset,setReset]=useState(0)
  const {messages,running,reload,error,transcript}=useConversation({sessionId,projectId:'p',userId:'u',idToken:'fixture',enabled:true,mode})
  const container=useRef<HTMLDivElement>(null)
  useScrollHome({containerRef:container,itemCount:messages.length,home:'bottom',key:JSON.stringify([sessionId,mode,reset])})
  useSessionPolling({enabled:true,sessionId,activeTaskStatus:null,running,reloadMessages:reload,reloadTaskCounts:()=>setCounts(n=>n+1),reloadInlineTasks:()=>{},intervalMs:500})
  return <><button onClick={()=>setSessionId('other')}>Other session</button>
    <button onClick={()=>setSessionId('s')}>First session</button>
    <button onClick={()=>setMode(m=>m==='context'?'transcript':'context')}>Toggle history</button>
    {mode==='transcript'&&<><button disabled={!transcript.hasOlder||transcript.running||transcript.loadingOlder||transcript.atLimit||transcript.needsReset} onClick={transcript.loadOlder}>Load older messages</button>
      {(transcript.atLimit||transcript.needsReset)&&<button onClick={()=>{setReset(n=>n+1);transcript.reset()}}>Reload latest</button>}</>}
    <button onClick={()=>setActivityMode(m=>m==='compact'?'detailed':'compact')}>Toggle activity</button>
    <div style={{width:'min(640px, 100%)',height:580,display:'flex',flexDirection:'column'}} data-fixture-scroll>
      <SessionDetail title="Polling integration" counts={{done:counts}} activeStatus={null} loadingTasks={false} onEditTask={()=>{}} onDeleteTask={()=>{}}
        messages={messages} running={running} execError={error} containerRef={container} sessionId={sessionId} draftScope={JSON.stringify(['u','p',sessionId])} hideExecGutter
        messagePresentation={{activityMode,messageStyle:'conversation'}} onSubmit={()=>{}} onStop={()=>{}} />
    </div></>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
