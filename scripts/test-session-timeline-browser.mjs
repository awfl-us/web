import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const peers=new Map()
const row=(n,message)=>({id:'row-'+n,createTime:1700000000+n,kind:message.role,message:{docId:'doc-'+n,...message}})
const original=Array.from({length:72},(_,n)=>row(n,{role:n%2?'assistant':'user',content:'Transcript '+n+' — '+('history text '.repeat(12))}))
original[48]=row(48,{role:'assistant',tool_calls:[{id:'read',type:'function',function:{name:'READ_FILE',arguments:'{"filepath":"file.ts"}'}}]})
original[49]=row(49,{role:'tool',tool_call_id:'read',content:'file output'})
let history=[...original],conflict=false,delayNext=false,requests=[]
const event=(type,data)=>'event: response.'+type+'\ndata: '+JSON.stringify(data)+'\n\n'
const send=(session,type,data)=>{for(const res of peers.get(session)||[])res.write(event(type,data))}
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'transcript-fixture',configureServer(vite){
  vite.middlewares.use((req,res,next)=>{
    if(!req.url?.startsWith('/fixture-api/'))return next()
    if(req.headers.authorization!=='Bearer fixture'||req.headers['x-project-id']!=='p'){res.writeHead(403);res.end();return}
    const url=new URL(req.url,'http://localhost')
    if(url.pathname.endsWith('/responses/stream')){
      const session=url.searchParams.get('sessionId');const set=peers.get(session)||new Set();peers.set(session,set);set.add(res)
      req.on('close',()=>set.delete(res));res.writeHead(200,{'Content-Type':'text/event-stream'});res.write(event('ready',{requestId:'request'}));return
    }
    let body='';req.on('data',c=>body+=c);req.on('end',()=>{
      const input=JSON.parse(body||'{}')
      if(url.pathname.endsWith('/topicContextYoj/run')){requests.push({type:'context',session:input.kala.sessionId});res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({yoj:[{role:'user',docId:'context',content:'Model context inspection'}]}));return}
      if(!url.pathname.endsWith('/sessions/timeline')){res.writeHead(404);res.end();return}
      requests.push({type:'transcript',...input})
      const rows=input.sessionId==='s'?history:[row(900,{role:'user',content:'Other transcript only'})]
      if(conflict&&input.after){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Timeline cursor is stale; reload the latest page'}));return}
      const i=rows.findIndex(r=>r.id===(input.before||input.after));const limit=input.limit
      const end=input.before?i:input.after?Math.min(rows.length,i+1+limit):rows.length
      const start=input.after?i+1:Math.max(0,end-limit)
      const selected=rows.slice(start,end)
      const result={version:1,rows:selected,oldestCursor:selected[0]?.id??null,newestCursor:selected.at(-1)?.id??null,hasMore:input.after?end<rows.length:start>0}
      const respond=()=>{if(!res.destroyed){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result))}}
      if(delayNext&&input.sessionId==='s'){delayNext=false;setTimeout(respond,900)}else respond()
    })
  })
}}]})
await server.listen();const url='http://127.0.0.1:'+server.httpServer.address().port+'/scripts/live-responses-browser.html?transcript=1'
let browser
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})
  for(const width of [900,390]){
    history=[...original];requests=[];conflict=false
    const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message))
    const scroller=page.locator('[data-awfl-slot="timeline"]').first(),rows=scroller.locator('[data-awfl-message-key]')
    const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
    await page.goto(url);await page.getByText('Transcript 71',{exact:false}).waitFor();assert.equal(await rows.count(),30)
    assert.ok(!requests.some(r=>r.type==='context'),'inactive context made network request')
    const call=page.getByRole('button',{name:'Read file 1/1 results recorded'});assert.equal(await call.getAttribute('aria-expanded'),'false');await call.click()
    const anchor=page.getByText('Transcript 51',{exact:false});await anchor.evaluate(e=>{const s=e.closest('[data-awfl-slot="timeline"]');s.scrollTop+=e.getBoundingClientRect().top-s.getBoundingClientRect().top-180});await frame()
    const offset=()=>anchor.evaluate(e=>e.getBoundingClientRect().top-e.closest('[data-awfl-slot="timeline"]').getBoundingClientRect().top)
    const before=await offset();await call.evaluate(e=>window.__timelineCall=e)
    await page.getByRole('button',{name:'Load older messages',exact:true}).click();await page.getByText('Transcript 12',{exact:false}).waitFor({state:'attached'});await frame()
    assert.equal(await rows.count(),60);const prependShift=Math.abs(await offset()-before);assert.ok(prependShift<=2,'older page shifted reading anchor');assert.equal(await call.getAttribute('aria-expanded'),'true');assert.ok(await call.evaluate(e=>e===window.__timelineCall))
    for(let i=0;i<60&&!peers.get('s')?.size;i++)await page.waitForTimeout(50)
    assert.ok(peers.get('s')?.size)
    send('s','started',{responseId:'live',attemptId:'a',sequence:0});send('s','delta',{responseId:'live',attemptId:'a',sequence:1,content:'Live transcript text'})
    const live=page.locator('[data-live-response="live"]');await live.getByText('Live transcript text').waitFor();await frame();assert.ok(Math.abs(await offset()-before)<=2,'SSE moved reader')
    await live.locator('[data-awfl-slot="markdown"]').evaluate(e=>window.__timelineLive=e)
    history.push(row(72,{role:'assistant',responseId:'live',content:'Final transcript text'}))
    send('s','provider_finished',{responseId:'live',attemptId:'a',sequence:2,hasText:true});await page.getByText('Final transcript text',{exact:true}).waitFor();assert.equal(await live.count(),0)
    assert.ok(await page.getByText('Final transcript text',{exact:true}).evaluate(e=>e.closest('[data-awfl-slot="markdown"]')===window.__timelineLive));assert.equal(await rows.count(),61)
    await frame();assert.ok(Math.abs(await offset()-before)<=2,'persisted catch-up moved reader')
    await page.getByRole('button',{name:'Load older messages',exact:true}).click();try{await page.getByText('Transcript 0',{exact:false}).waitFor({state:'attached',timeout:10000})}catch(e){console.error('Older request diagnostic',JSON.stringify({requests:requests.slice(-12),rowCount:await rows.count(),errors}));throw e}assert.equal(await rows.count(),73)
    assert.ok(await page.getByRole('button',{name:'Load older messages',exact:true}).isDisabled());assert.equal(await call.getAttribute('aria-expanded'),'true')
    // A stale cursor must not discard loaded history without explicit user reset.
    conflict=true;await page.getByRole('button',{name:'Reload latest',exact:true}).waitFor();assert.equal(await rows.count(),73);conflict=false
    await page.getByRole('button',{name:'Reload latest',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-awfl-message-key]').length===30);assert.equal(await page.getByRole('button',{name:'Reload latest',exact:true}).count(),0)
    // Switching away during an in-flight poll cannot publish old scope rows.
    const startCount=requests.length;delayNext=true;await page.waitForFunction(()=>true);for(let i=0;i<60&&!requests.slice(startCount).some(r=>r.after);i++)await page.waitForTimeout(25)
    assert.ok(requests.slice(startCount).some(r=>r.after));await page.getByRole('button',{name:'Other session',exact:true}).click();await page.getByText('Other transcript only',{exact:true}).waitFor();await page.waitForTimeout(1100);assert.equal(await rows.count(),1);assert.equal(await page.getByText('Final transcript text',{exact:true}).count(),0)
    const previous=requests.length;await page.getByRole('button',{name:'Toggle history',exact:true}).click();await page.getByText('Model context inspection',{exact:true}).waitFor();await page.waitForTimeout(700);assert.ok(!requests.slice(previous).some(r=>r.type==='transcript'),'inactive transcript made network request')
    await page.getByRole('button',{name:'Toggle history',exact:true}).click();await page.getByText('Other transcript only',{exact:true}).waitFor();assert.equal(await rows.count(),1)
    assert.deepEqual(errors,[]);console.log(JSON.stringify({width,olderPage:'passed',anchorShift:prependShift,streamPersistence:'passed',staleCursor:'passed',scopeSwitch:'passed',contextToggle:'passed'}));await page.close()
  }
}finally{await browser?.close();for(const set of peers.values())for(const res of set)res.end();await server.close()}
