const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),CRM=require('../brokers-crm.js');
(async()=>{
 const allowed=new Set(['brokers.html','brokers.js','brokers-core.js','brokers-crm.js','brokers-evaluator.js','brokers.css']);
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'brokers.html';if(!allowed.has(name)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(process.cwd(),name)));}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const today=CRM.day(new Date().toISOString());
 const opportunity=(id,title,ppp)=>({id,title,kind:'Terreno',contact_id:id==='o1'?'c1':'',ppp_id:ppp||'',ppp_url:ppp?'https://yodesarrollomx.github.io/potenciales-yod/macrolotes.html?open='+ppp:'',broker_ids:['b1'],stage:'En revisión',next_action:'[PG] Revisar mezcla y confirmar reunión',next_date:today,documents_url:'https://docs.google.com/document/d/synthetic/edit'});
 const activity=(id,status,text,extra={})=>({id,opportunity_id:'o1',date:new Date().toISOString(),author_id:'direction',author_name:'Dirección sintética',note:CRM.encode(text,{v:1,type:'Reunión',status,occurred_at:today,participants:'PG; YOD; Broker',source:'Transcripción sintética',source_url:'https://docs.google.com/document/d/synthetic/edit',...extra})});
 const initial={contract:'brokers.v1',actor:{id:'direction',name:'Dirección sintética',role:'direccion'},revision:1,capabilities:{write:true,agree_participation:true},brokers:[{id:'b1',name:'Broker de prueba'},{id:'b2',name:'Otro broker'}],contacts:[{id:'c1',name:'Referencia sintética',type:'Aliado',broker_ids:['b1']}],opportunities:[opportunity('o1','Terreno pequeño','p1'),opportunity('o2','Terreno grande','p2'),opportunity('o3','Sin plan vinculado'),{...opportunity('private','Privado fuera de alcance','p3'),broker_ids:['b2']}],activities:[activity('a1','Realizado','Elegir participación; pendiente decisión familiar.'),activity('a2','Programado','Reunión propuesta para revisar números.')],participations:[]};
 let assertions=0;
 for(const width of [320,390,1440]){
  let snapshot=structuredClone(initial),saves=[],attempt=0,reads=0;
  const context=await browser.newContext({viewport:{width,height:1000}});await context.addInitScript(()=>localStorage.setItem('pyod_clave_v1','synthetic-session'));
  await context.route('https://**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(req.method()==='GET'&&u.searchParams.get('recurso')==='caso'){
    reads++;assert.equal(u.searchParams.get('k'),'synthetic-session');assert.ok(['p1','p2'].includes(u.searchParams.get('id')));const caso={caso_id:u.searchParams.get('id'),version:4,ts_actualizado:new Date().toISOString(),superficie_ha:u.searchParams.get('id')==='p1'?3:50,tir_dev_pct:26.1,utilidad:1200000,meses_totales:24,inEquity:500000,faltante_capital:0,inCostoNave:7000,inPreNave:12000,escenarios_json:JSON.stringify([{id:'s1',nombre:'Conservador',activo:false,inputs:{}},{id:'s2',nombre:'Guardada activa',activo:true,inputs:{}}])};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,caso})});
   }
   if(req.method()!=='POST')return route.fulfill({status:200,body:'',contentType:'application/javascript'});
   const body=JSON.parse(req.postData());if(body.action==='brokers_snapshot')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data:snapshot})});
   assert.equal(body.action,'brokers_save');saves.push(body);if(++attempt===1)return route.fulfill({status:500,body:''});
   const r=body.data.record;assert.equal(body.data.kind,'activity');assert.equal(r.opportunity_id,'o1');assert.ok(!Object.keys(r).some(k=>k.startsWith('crm_')));
   snapshot={...snapshot,revision:snapshot.revision+1,activities:[...snapshot.activities,{...r,id:'new-'+attempt,date:new Date().toISOString(),author_name:snapshot.actor.name,author_id:snapshot.actor.id}],opportunities:snapshot.opportunities.map(o=>o.id===r.opportunity_id?{...o,next_action:r.next_action,next_date:r.next_date}:o)};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,request_id:body.request_id,data:snapshot})});
  });
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/brokers.html?masterbroker=b1&mode=manage');await p.locator('.case-row').first().waitFor();
  assert.equal(await p.locator('.case-row').count(),3);assert.equal(await p.getByText('Privado fuera de alcance').count(),0);
  await p.locator('[data-expand="o1"]').click();await p.locator('[data-expand="o2"]').click();await p.waitForFunction(()=>document.querySelectorAll('.ppp-compact').length===2);
  assert.equal(await p.locator('.case-preview').count(),2);assert.equal(await p.locator('.case-preview input').count(),0);assert.ok((await p.locator('.case-preview').first().textContent()).includes('Por vincular'));assert.ok(!(await p.locator('.case-preview').first().textContent()).includes('[YOD-CRM'));
  assert.ok((await p.locator('.ppp-compact').first().textContent()).includes('26.1%'));assert.equal(reads,2);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:'crm-compare-'+width+'.png',fullPage:true});
  await p.locator('[data-open="o1"]').click();await p.locator('.crm-calendar').waitFor();const day=p.locator('[data-calendar-day="'+today+'"]');assert.equal(await day.locator('.dot').count(),2);
  await day.click();assert.equal(await p.locator('.timeline li').count(),2);await p.locator('[data-calendar-clear]').click();
  await p.locator('[data-schedule]').click();assert.equal(await p.locator('[name=crm_status]').inputValue(),'Programado');await p.locator('[name=note]').fill('Revisar capital requerido.');await p.locator('[name=crm_participants]').fill('PG; YOD; Broker');await p.locator('[name=next_owner]').selectOption('PG');await p.locator('[name=next_date]').fill(today);await p.locator('#save-record').click();await p.locator('#form-error').getByText('No se pudo conectar con Brokers.').waitFor();assert.equal(await p.locator('#editor').evaluate(e=>e.open),true);
  await p.locator('#save-record').click();await p.locator('#editor').waitFor({state:'hidden'});assert.equal(saves[0].request_id,saves[1].request_id);assert.equal(saves[0].data.expected_revision,saves[1].data.expected_revision);assert.equal(CRM.decode(saves[1].data.record).status,'Programado');assert.equal(snapshot.opportunities.find(o=>o.id==='o1').next_action,'[PG] Reunión de seguimiento');
  assert.equal(await p.getByText('Privado fuera de alcance').count(),0);await p.locator('.ppp-observation').waitFor({state:'attached'});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:'crm-detail-'+width+'.png',fullPage:true});
  await p.locator('[data-resolve-event="a2"][data-result="Realizado"]').click();await p.locator('[name=note]').fill('Se revisó; quedó pendiente confirmar aportación.');await p.locator('#save-record').click();await p.locator('#editor').waitFor({state:'hidden'});assert.equal(await p.locator('[data-resolve-event="a2"]').count(),0);assert.equal(await p.locator('[data-activity="a2"]').count(),1);
  await p.goto(base+'/brokers.html?masterbroker=b1');await p.locator('.case-row').first().waitFor();await p.locator('[data-open="o1"]').click();assert.equal(await p.locator('[data-schedule]').count(),1);await p.locator('[data-schedule]').click();assert.equal(await p.locator('#save-record').isDisabled(),true);const saveCount=saves.length;await p.locator('#cancel-editor').click();assert.equal(saves.length,saveCount);
  await p.evaluate(()=>{localStorage.setItem('pyod_clave_v1','different-session');window.dispatchEvent(new StorageEvent('storage',{key:'pyod_clave_v1'}));});assert.equal(await p.locator('#workspace').isVisible(),false);assert.equal(await p.locator('.case-preview').count(),0);assert.equal(errors.length,0,errors.join('\n'));assertions+=24;
  await context.close();
 }
 console.log(JSON.stringify({assertions,viewports:[320,390,1440],multipleComparisons:true,readonlyPPP:true,calendar:true,sourceHistory:true,idempotentSchedule:true,previewDisabled:true,sessionClear:true,productionWrites:0}));
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);process.exit(1)});
