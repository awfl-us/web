import {useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useLiveResponses} from '../src/features/yoj/hooks/useLiveResponses'
import {useTopicContextYoj} from '../src/hooks/useTopicContextYoj'
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
  const {messages:persisted,running,reload}=useTopicContextYoj({sessionId,projectId:'p',userId:'u',idToken:'fixture'})
  const messages=useLiveResponses({sessionId,projectId:'p',userId:'u',idToken:'fixture',enabled:true,messages:persisted,reload})
  const container=useRef<HTMLDivElement>(null)
  useScrollHome({containerRef:container,itemCount:messages.length,home:'bottom',key:sessionId})
  useSessionPolling({enabled:true,sessionId,activeTaskStatus:null,running,reloadMessages:reload,reloadTaskCounts:()=>setCounts(n=>n+1),reloadInlineTasks:()=>{},intervalMs:500})
  return <><button onClick={()=>setSessionId('other')}>Other session</button>
    <button onClick={()=>setActivityMode(m=>m==='compact'?'detailed':'compact')}>Toggle activity</button>
    <div style={{width:'min(640px, 100%)',height:580,display:'flex',flexDirection:'column'}} data-fixture-scroll>
      <SessionDetail title="Polling integration" counts={{done:counts}} activeStatus={null} loadingTasks={false} onEditTask={()=>{}} onDeleteTask={()=>{}}
        messages={messages} running={running} containerRef={container} sessionId={sessionId} draftScope={JSON.stringify(['u','p',sessionId])} hideExecGutter
        messagePresentation={{activityMode,messageStyle:'conversation'}} onSubmit={()=>{}} onStop={()=>{}} />
    </div></>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
