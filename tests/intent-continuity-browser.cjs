'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{webkit,chromium}=require('playwright'),{read}=require('./public-story-copy.cjs');
(async()=>{
 const payload=await read(fs.readFileSync('presentacion/source.js','utf8').match(/url:'([^']+)'/)[1]);
 const server=http.createServer((req,res)=>{const n=new URL(req.url,'http://local').pathname.slice(1)||'index.html';if(n.includes('..')){res.statusCode=404;return res.end();}try{res.setHeader('Content-Type',n.endsWith('.js')?'application/javascript':n.endsWith('.css')?'text/css':n.endsWith('.woff2')?'font/woff2':n.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(n.startsWith('assets/')?n:path.join('presentacion',n)));}catch(_){res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 for(const [engine,name]of [[webkit,'webkit'],[chromium,'chromium']]){
  const browser=await engine.launch(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  let writes=0;await context.route('https://**/*',r=>{if(r.request().method()!=='GET'){let body;try{body=JSON.parse(r.request().postData())}catch{}if(body?.accion==='presentaciones'&&body.presentation?.op==='catalog')return r.fulfill({json:{ok:false,error:'unauthorized'}});writes++;return r.abort();}return r.fulfill({contentType:'application/json',body:JSON.stringify(payload)});});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/');await p.locator('#journey:not([hidden])').waitFor({timeout:65000});
  await p.evaluate(()=>{window.__hero=document.querySelector('[data-object="property-p1"]');window.__plan=document.querySelector('[data-object="same-floorplan"]');window.__film=document.querySelector('[data-film-root]');});
  for(let i=0;i<=140;i++){await p.evaluate(v=>YodSlider.api.seek(v),i/10);assert.ok(await p.evaluate(()=>window.__hero===document.querySelector('[data-object="property-p1"]')&&window.__plan===document.querySelector('[data-object="same-floorplan"]')&&window.__film===document.querySelector('[data-film-root]')),'Persistent architectural objects');}
  for(let boundary=1;boundary<14;boundary++){
   const sample=async n=>{await p.evaluate(v=>YodSlider.api.seek(v),n);return p.evaluate(()=>[...document.querySelectorAll('[data-object="property-p1"] path')].flatMap(e=>(e.getAttribute('d')||'').match(/-?\d+(?:\.\d+)?/g)?.map(Number)||[]));};
   const before=await sample(boundary-.0001),after=await sample(boundary+.0001);assert.equal(before.length,after.length,'Geometry topology persists');assert.ok(Math.max(...before.map((v,i)=>Math.abs(v-after[i])))<.25,'No property jump at '+boundary);
  }
  await p.evaluate(()=>YodSlider.api.seek(4.37));const original=await p.locator('[data-object="property-p1"]').innerHTML();await p.evaluate(()=>YodSlider.api.seek(12.6));await p.evaluate(()=>YodSlider.api.seek(4.37));assert.equal(await p.locator('[data-object="property-p1"]').innerHTML(),original,'Exact reverse geometry');await p.waitForTimeout(220);assert.equal(await p.locator('[data-object="property-p1"]').innerHTML(),original,'No autonomous timeline');
  for(let v=5.5;v<=8.25;v+=.05){await p.evaluate(n=>YodSlider.api.seek(n),v);const edge=await p.locator('[data-object="property-p1"]').evaluate(e=>{const b=e.getBBox();return{x:b.x,right:b.x+b.width};});assert.ok(edge.x>=-1&&edge.right<=641,'Property within canvas during handoff '+v+' '+JSON.stringify(edge));}
  assert.equal(writes,0);assert.deepEqual(errors,[]);
  if(name==='webkit'){
   const shots=[];
   for(const n of [0,3,4.6,6.2,9.1,11.7,14]){await p.evaluate(v=>YodSlider.api.seek(v),n);const b=await p.screenshot({type:'jpeg',quality:70});fs.writeFileSync('intent-film-'+n+'.jpg',b);shots.push(b);}
   const overview=await context.newPage();await overview.setViewportSize({width:1170,height:2532});await overview.setContent('<body style="margin:0;display:grid;grid-template-columns:repeat(3,390px);background:#f6f3ec">'+shots.map(b=>'<img width="390" height="844" src="data:image/jpeg;base64,'+b.toString('base64')+'">').join('')+'</body>');
   const b=await overview.screenshot({type:'jpeg',quality:65});fs.writeFileSync('intent-film-overview.jpg',b);b.toString('base64').match(/.{1,1600}/g).forEach((c,i)=>console.log('FILM_SCREEN_CHUNK overview '+i+' '+c));await overview.close();
  }
  console.log(JSON.stringify({continuousFilm:true,engine:name,persistentObjects:true,fractionalFrames:141,boundaries:13,exactReverse:true,noAutoplay:true,businessWrites:writes}));await browser.close();
 }
 await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);process.exit(1);});
