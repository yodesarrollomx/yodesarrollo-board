const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const files=new Set(['brokers.html','brokers.js','brokers-core.js','brokers-crm.js','brokers-evaluator.js','brokers.css']);
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'brokers.html';if(!files.has(name)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(process.cwd(),name)));}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>localStorage.setItem('pyod_clave_v1','synthetic-session'));
 const id='EV-'+'a'.repeat(20),evaluation={id,broker_id:'B-A',title:'Terreno de prueba',location:'Ubicación de prueba',site_area:180,folder_url:'https://drive.google.com/drive/folders/synthetic',revision:'synthetic'};
 let saved=null,launch=null,snapshot={contract:'brokers.v1',actor:{id:'B-A',name:'Broker de prueba',role:'broker'},revision:1,capabilities:{write:true,agree_participation:false},brokers:[{id:'B-A',name:'Broker de prueba'}],contacts:[],opportunities:[],activities:[],participations:[]};
 await context.route('https://**/*',async route=>{
  const req=route.request();if(req.method()!=='POST')return route.fulfill({status:200,body:'',contentType:'application/javascript'});
  const body=JSON.parse(req.postData());let data;
  if(body.action==='brokers_snapshot')data={ok:true,data:snapshot};
  else if(body.action==='brokers_save'){saved=body;assert.equal(body.data.record.kind,'Terreno');snapshot={...snapshot,revision:2,opportunities:[{...body.data.record,id:'O-A'}]};data={ok:true,request_id:body.request_id,data:snapshot};}
  else if(body.op==='broker_summary')data={ok:true,evaluation};
  else if(body.op==='broker_launch'){launch=body;data={ok:true,url:req.url()+'?app=evaluador&handoff='+'a'.repeat(64)};}
  else throw Error('unexpected request');
  await route.fulfill({status:200,body:JSON.stringify(data),contentType:'application/json',headers:{'access-control-allow-origin':'*'}});
 });
 const p=await context.newPage();await p.goto(base+'/brokers.html?preevaluacion='+id);await p.locator('#editor[open]').waitFor();
 assert.equal(await p.locator('[name=title]').inputValue(),evaluation.title);assert.equal(await p.locator('[name=location]').inputValue(),evaluation.location);assert.ok((await p.locator('[name=notes]').inputValue()).includes(id));
 await p.locator('[name=next_owner]').selectOption('Masterbroker');await p.locator('[name=next_action]').fill('Revisar preevaluación');await p.locator('[name=next_date]').fill('2030-01-01');await p.locator('#save-record').click();await p.locator('#editor').waitFor({state:'hidden'});
 assert.equal(saved.data.record.broker_ids[0],'B-A');assert.ok(saved.request_id);assert.ok(!new URL(p.url()).searchParams.has('preevaluacion'));
 await p.locator('[data-open="O-A"]').click();await p.locator('.case-tools>summary').click();await p.locator('[data-preevaluate="current"]').waitFor();
 await p.evaluate(()=>{window.open=()=>({opener:window,document:{body:{}},location:{replace:url=>{window.__launched=url;}},close(){}});});
 await p.locator('[data-preevaluate="current"]').click();await p.waitForFunction(()=>!!window.__launched);assert.equal(launch.case_id,id);assert.equal(launch.broker_id,'B-A');assert.equal(launch.opportunity_id,'O-A');assert.ok(!(await p.evaluate(()=>window.__launched)).includes('synthetic-session'));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 // Direction preview cannot launch or import a case as the selected broker.
 snapshot={...snapshot,actor:{id:'direction',name:'Dirección de prueba',role:'direccion'}};
 await p.goto(base+'/brokers.html?masterbroker=B-A&preevaluacion='+id);await p.locator('#workspace:not([hidden])').waitFor();assert.equal(await p.locator('[data-preevaluate]').count(),0);assert.equal(await p.locator('#editor').evaluate(e=>e.open),false);
 console.log(JSON.stringify({returnPrefill:true,explicitSave:true,canonicalBroker:true,reopenLinkedCase:true,previewDenied:true,mobileWidth:true,productionWrites:0}));
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);process.exit(1)});
