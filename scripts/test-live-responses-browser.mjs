import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {mkdir} from 'node:fs/promises'

const peers=new Map()
const history=Array.from({length:32},(_,i)=>({role:i%2?'assistant':'user',content:'History '+i+' — '+('old text '.repeat(12)),docId:'history-'+i,create_time:1700000000+i}))
let stored=[...history]
let disabled=false
let connections=0
const event=(type,data)=>'event: response.'+type+'\ndata: '+JSON.stringify(data)+'\n\n'
const send=(session,type,data)=>{
  for(const res of peers.get(session)||[])res.write(event(type,data))
}
const delta=(sequence,content)=>send('s','delta',{responseId:'r',attemptId:'a',sequence,content})
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'live-response-fixture',configureServer(vite){
  vite.middlewares.use((req,res,next)=>{
    if(!req.url?.startsWith('/fixture-api/'))return next()
    if(req.headers.authorization!=='Bearer fixture'||req.headers['x-project-id']!=='p'){
      res.writeHead(403);res.end();return
    }
    const url=new URL(req.url,'http://localhost')
    if(url.pathname.endsWith('/responses/stream')){
      if(disabled){res.writeHead(503);res.end();return}
      const session=url.searchParams.get('sessionId')
      const set=peers.get(session)||new Set();peers.set(session,set);set.add(res)
      req.on('close',()=>set.delete(res))
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'})
      res.write(event('ready',{requestId:'req'+(++connections)}));return
    }
    if(url.pathname.endsWith('/topicContextYoj/run')){
      let body='';req.on('data',c=>body+=c);req.on('end',()=>{
        const session=JSON.parse(body).kala.sessionId
        res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({yoj:session==='s'?stored:[{role:'user',content:'Other session only'}]}))
      });return
    }
    res.writeHead(404);res.end()
  })
}}]})
await server.listen()
const address=server.httpServer.address()
const url='http://127.0.0.1:'+address.port+'/scripts/live-responses-browser.html'
let browser
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  const page=await browser.newPage({viewport:{width:900,height:700}})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  const scroll=page.locator('[data-fixture-scroll] > div').first()
  const live=page.locator('[data-live-response="r"]')
  const wait=fn=>page.waitForFunction(fn)
  const bottom=()=>wait(()=>{const e=document.querySelector('[data-fixture-scroll] > div');return e&&e.scrollHeight-e.clientHeight-e.scrollTop<10})
  await page.goto(url)
  await page.getByText('History 31',{exact:false}).waitFor()
  await bottom()
  for(let i=0;i<100&&!peers.get('s')?.size;i++)await new Promise(r=>setTimeout(r,25))
  assert.ok(peers.get('s')?.size)
  const start=Date.now()
  send('s','started',{responseId:'r',attemptId:'a',sequence:0})
  delta(1,'First live text')
  await live.getByText('First live text').waitFor()
  console.log('first visible text ms',Date.now()-start)
  delta(2,'\n'+('Growing response line\n'.repeat(40)))
  await live.getByText('Growing response line',{exact:false}).waitFor()
  await bottom()
  await scroll.evaluate(e=>e.scrollTop=120)
  await wait(()=>document.querySelector('[data-fixture-scroll] > div').scrollTop<200)
  await page.waitForTimeout(100)
  const before=await scroll.evaluate(e=>e.scrollTop)
  delta(3,'\n'+('More live text\n'.repeat(35)))
  await live.getByText('More live text',{exact:false}).waitFor()
  await page.waitForTimeout(200)
  const after=await scroll.evaluate(e=>e.scrollTop)
  assert.ok(Math.abs(before-after)<=4,'reader moved from '+before+' to '+after)
  await scroll.evaluate(e=>e.scrollTop=e.scrollHeight)
  await bottom()
  delta(4,'\n'+('Final growth\n'.repeat(30)))
  await live.getByText('Final growth',{exact:false}).waitFor()
  await bottom()
  await mkdir('test-results',{recursive:true})
  await page.screenshot({path:'test-results/live-response-streaming.png'})
  stored=[...history,{role:'assistant',responseId:'r',docId:'persisted-r',content:'Authoritative final text',create_time:1700000100}]
  send('s','provider_finished',{responseId:'r',attemptId:'a',sequence:5,hasText:true})
  await page.getByText('Authoritative final text',{exact:true}).waitFor()
  assert.equal(await live.count(),0)
  assert.equal(await page.getByText('Authoritative final text',{exact:true}).count(),1)
  await page.getByRole('button',{name:'Other session'}).click()
  await page.getByText('Other session only',{exact:true}).waitFor()
  assert.equal(await page.getByText('Authoritative final text',{exact:true}).count(),0)
  delta(6,'Stale session should never appear')
  await page.waitForTimeout(100)
  assert.equal(await page.getByText('Stale session should never appear',{exact:false}).count(),0)
  disabled=true
  await page.reload()
  await page.getByText('History 31',{exact:false}).waitFor()
  await page.getByText('Authoritative final text',{exact:true}).waitFor()
  assert.deepEqual(errors,[])
  console.log('Chromium live rendering, bottom follow, reading position, persistence, scope switch and disabled-stream fallback passed')
}finally{
  await browser?.close()
  for(const set of peers.values())for(const res of set)res.end()
  await server.close()
}
