import {useEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useLiveResponses} from '../src/features/yoj/hooks/useLiveResponses'
import {useTopicContextYoj} from '../src/hooks/useTopicContextYoj'
import {useScrollHome} from '../src/features/sessions/hooks/useScrollHome'
import {SessionItemsView} from '../src/components/sessions/SessionItemsView'
import {setDefaultApiBase} from '../src/core/apiConfig'

setDefaultApiBase('/fixture-api')
function Fixture(){
  const [sessionId,setSessionId]=useState('s')
  const {messages:persisted,running,reload}=useTopicContextYoj({sessionId,projectId:'p',userId:'u',idToken:'fixture'})
  const messages=useLiveResponses({sessionId,projectId:'p',userId:'u',idToken:'fixture',enabled:true,messages:persisted,reload})
  const container=useRef<HTMLDivElement>(null)
  useScrollHome({containerRef:container,itemCount:messages.length,home:'bottom',key:sessionId})
  useEffect(()=>{const timer=setInterval(reload,1500);return()=>clearInterval(timer)},[reload])
  return <><button onClick={()=>setSessionId('other')}>Other session</button><div style={{width:640,height:400,display:'flex',flexDirection:'column'}} data-fixture-scroll>
    <SessionItemsView activeTaskStatus={null} loadingTasks={false} onEditTask={()=>{}} onDeleteTask={()=>{}}
      messages={messages} running={running} containerRef={container} sessionId={sessionId} hideExecGutter/>
  </div></>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
