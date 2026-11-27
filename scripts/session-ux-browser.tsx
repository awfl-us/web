import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import '../src/App.css'
import { SessionDetail, SessionWorkspaceLayout, ModelSelector } from '../src/features/sessions/public'
import { useAppearance, defaultAppearance } from '../src/features/ui/public'

export function Playground() {
  const { appearance, setAppearance } = useAppearance('fixture')
  const [scope, setScope] = useState('a')
  const [running, setRunning] = useState(true)
  const [fail, setFail] = useState(false)
  const [model, setModel] = useState('long')
  const [submissions, setSubmissions] = useState('')
  const scroll = useRef<HTMLDivElement>(null)
  const [mobile, setMobile] = useState(innerWidth <= 640)
  const [pane, setPane] = useState<'list' | 'detail'>('detail')
  // Fixture only: responsive detection without altering production state.
  useEffect(() => {
    const resize = () => setMobile(innerWidth <= 640)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  return <div style={{height:'100dvh',display:'flex',flexDirection:'column'}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
      <button onClick={()=>setAppearance({...appearance, theme:appearance.theme==='dark'?'light':'dark',density:appearance.density==='compact'?'comfortable':'compact'})}>Toggle theme</button>
      <button onClick={()=>setAppearance({...appearance,navigation:appearance.navigation==='left'?'right':'left',navigationWidth:260,conversationMaxWidth:600})}>Switch layout</button>
      <button onClick={()=>setAppearance(defaultAppearance)}>Reset appearance</button>
      <button onClick={()=>setScope(s=>s==='a'?'b':'a')}>Switch session</button>
      <button onClick={()=>setFail(f=>!f)}>Toggle failure</button>
      <button onClick={()=>setRunning(r=>!r)}>Toggle running</button>
      <button onClick={()=>setPane(p=>p==='detail'?'list':'detail')}>Toggle pane</button>
      <output data-testid="submissions">{submissions}</output>
    </div>
    <div style={{flex:1,minHeight:0}}>
      <SessionWorkspaceLayout appearance={appearance} mobile={mobile} pane={pane}
        navigation={<div>Nav</div>} navigationContent={<div>Sessions and files</div>}
        conversation={<SessionDetail title="Deployment investigation" activeStatus={null}
          counts={{queued:2,inProgress:1,done:4,stuck:0}} running={running}
          messages={[{role:'user',content:'Investigate deployment',docId:'u'},{role:'assistant',content:'Checking build configuration',docId:'a'},{role:'tool',content:'Test suite passed',docId:'t'}]}
          loadingTasks={false} onEditTask={()=>{}} onDeleteTask={()=>{}} onAddTask={()=>{}} onEditAgent={()=>{}}
          containerRef={scroll} draftScope={'fixture:'+scope} sessionId={scope}
          wfRunning={running} wfStatus={running?'Running':'Idle'} onStop={()=>setRunning(false)}
          onSubmit={async (text,fund)=>{
            await new Promise(r=>setTimeout(r,250))
            if(fail) throw new Error('fixture failure')
            setSubmissions(JSON.stringify({text,fund,model,scope}))
          }}
          composerExtras={<ModelSelector model={model} onChange={setModel} options={[{value:'long',label:'Very long provider model name for testing'},{value:'short',label:'Short model'}]}/>}
        />}
      />
    </div>
  </div>
}
createRoot(document.getElementById('root')!).render(<Playground/>)
