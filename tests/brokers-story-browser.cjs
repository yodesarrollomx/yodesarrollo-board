const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../presentacion/story-core.js');
function fixture(){const d={inv1_version:'1',inv1_brand:'Synthetic Studio',inv1_logo_url:'https://example.test/logo.png',inv1_primary:'#123456',inv1_ink:'#222222',inv1_paper:'#eeeeee',inv1_duration_seconds:'10',inv1_title:'A clear investment opportunity.',inv1_lead:'Synthetic description of the opportunity for a property development.',inv1_material_profile:'https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/'};for(const k of C.fields)if(!d['inv1_'+k])d['inv1_'+k]='Synthetic '+k;for(let n=1;n<=4;n++){d['inv1_phase'+n+'_label']='PHASE '+n;d['inv1_phase'+n+'_title']='A clear step '+n;d['inv1_phase'+n+'_body']='A synthetic explanation with enough words to exercise the space that the public narrative requires.';}return d;}

async function revealLegacy(page){
 await page.waitForFunction(()=>{const mono=document.querySelector('#monoline'),story=document.querySelector('#story');return(mono&&!mono.hidden&&mono.offsetWidth>0)||(story&&!story.hidden&&story.offsetWidth>0);},null,{timeout:60000});
 if(await page.locator('#monoline').isVisible()){await page.locator('#monoLegacy').click();await page.locator('#story:not([hidden])').waitFor();}
}

(async()=>{
 const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname.slice(1)||'presentacion/index.html';if(name==='presentacion/')name+='index.html';if(!/^presentacion\/[a-z0-9-]+\.(?:html|js|css|json|svg)$/.test(name)&&!['brokers.html','brokers.js','brokers-core.js','brokers-crm.js','brokers-evaluator.js','brokers.css'].includes(name)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(process.cwd(),name)));}).listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});const errors=[];let writes=0;
 const data={textos:fixture()},snapshot={contract:'brokers.v1',actor:{id:'B-SYNTHETIC',name:'Synthetic broker',role:'broker'},revision:1,capabilities:{write:false,agree_participation:false},brokers:[{id:'B-SYNTHETIC',name:'Synthetic broker'}],contacts:[],opportunities:[],activities:[],participations:[]};
 await context.route('https://**/*',async route=>{const req=route.request();if(req.method()==='POST'){const body=JSON.parse(req.postData());assert.equal(body.action,'brokers_snapshot');return route.fulfill({status:200,body:JSON.stringify({ok:true,data:snapshot}),contentType:'application/json'});}if(req.url().includes('recurso=textos'))return route.fulfill({status:200,body:JSON.stringify(data),contentType:'application/json'});return route.fulfill({status:200,body:'',contentType:'application/javascript'});});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/presentacion/?review=1');await revealLegacy(p);await p.locator('#presentation:not([hidden])').waitFor();assert.equal(await p.locator('#chapterTitle').textContent(),data.textos.inv1_title);
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(100);await p.locator('[data-phase="2"]').click();await p.waitForFunction(()=>document.querySelector('#phaseLabel').textContent==='PHASE 3');assert.equal(await p.locator('#phaseLabel').textContent(),'PHASE 3');
 await p.locator('#complete').click();await p.waitForFunction(()=>Number(document.querySelector('#progress').value)===1);assert.ok(Number(await p.locator('.new-building').first().evaluate(e=>e.style.opacity))>.99);
 await p.locator('#repeat').click();await p.waitForFunction(()=>Number(document.querySelector('#progress').value)<.01);
 await p.locator('#play').click();await p.waitForTimeout(350);assert.ok(Number(await p.locator('#progress').evaluate(e=>String(e.value)))>0);await p.locator('#play').click();const paused=await p.locator('#progress').evaluate(e=>String(e.value));await p.waitForTimeout(250);assert.equal(await p.locator('#progress').evaluate(e=>String(e.value)),paused);
 await p.locator('#share').click();await p.locator('#shareDialog[open]').waitFor();assert.equal(await p.locator('#shareUrl').inputValue(),base+'/presentacion/');await p.locator('#shareDialog .close').click();
 for(const v of [{width:390,height:844},{width:320,height:640},{width:1440,height:900}]){await p.setViewportSize(v);await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(100);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const b=await p.locator('#play').boundingBox();assert.ok(b.y+b.height<=v.height+2,JSON.stringify({viewport:v,button:b}));}
 await p.emulateMedia({reducedMotion:'reduce'});await p.reload();await revealLegacy(p);await p.locator('#presentation:not([hidden])').waitFor();assert.equal(await p.locator('#progress').evaluate(e=>String(e.value)),'1');assert.equal(await p.locator('.sticky-scene').evaluate(e=>getComputedStyle(e).position),'relative');await p.locator('#play').click();assert.equal(await p.locator('#play').getAttribute('aria-pressed'),'false');
 await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:390,height:844});await p.addInitScript(()=>localStorage.setItem('pyod_clave_v1','synthetic-session'));
 await p.goto(base+'/brokers.html?embed=1');await p.locator('#workspace:not([hidden])').waitFor();await p.locator('[data-tab="offer"]').click();await p.locator('#public-presentation [data-copy-story]').waitFor();assert.equal(await p.locator('#public-presentation a').getAttribute('href'),'https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/');await p.locator('[data-copy-story]').click();await p.locator('[data-copy-status]').filter({hasText:'Enlace copiado.'}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);
 // Real, read-only publication contract: no credentials, no POST, no business writes.
 const source=fs.readFileSync('presentacion/source.js','utf8'),url=source.match(/url:'([^']+)'/)[1];
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});assert.ok(response.ok,'Public text endpoint must be reachable');const live=await response.json(),normalized=C.normalize(live);assert.equal(normalized.version,'1');
 await context.route('**/*recurso=textos*',route=>route.fulfill({status:200,body:JSON.stringify(live),contentType:'application/json'}));
 await p.goto(base+'/presentacion/');await revealLegacy(p);await p.locator('#presentation:not([hidden])').waitFor();assert.equal(await p.locator('#chapterTitle').textContent(),normalized.title);
 await p.locator('#complete').click();await p.waitForTimeout(100);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:'investor-scene1-mobile.png'});
 console.log(JSON.stringify({scroll:true,controls:true,shareNoToken:true,mobile390:true,mobile320:true,desktop:true,reducedMotion:true,brokerMaterial:true,publicCopyVerified:true,businessWrites:writes,privateFixturePublished:false}));

 // All chapters with real public marketing copy, no CRM identity or writes.
 assert.equal(normalized.chapters.length,7);assert.equal(await p.locator('button[data-chapter]').count(),7);
 const diagramHandle=await p.locator('#capitalRoute').elementHandle();
 for(const v of [{width:390,height:844},{width:320,height:640},{width:1440,height:900}]){
  await p.setViewportSize(v);await p.emulateMedia({reducedMotion:'no-preference'});
  for(let ch=0;ch<7;ch++){
   await p.locator('button[data-chapter="'+ch+'"]').click();await p.waitForFunction(n=>document.documentElement.dataset.chapter===String(n),ch+1);
   assert.equal(await p.locator('#chapterTitle').textContent(),normalized.chapters[ch].title);
   if(ch>0)assert.equal(await p.locator('#analysisPanel li').count(),ch===1?7:ch===2?16:normalized.chapters[ch].groups.reduce((a,g)=>a+g.items.length,0));
   for(let phase=0;phase<normalized.chapters[ch].phases.length;phase++){
    await p.locator('[data-phase="'+phase+'"]').click();await p.waitForTimeout(80);
    assert.equal(await p.locator('#phaseTitle').textContent(),normalized.chapters[ch].phases[phase].title);
    const playBox=await p.locator('#play').boundingBox(),lastBox=await p.locator('.phase-text').boundingBox();
    if(playBox.y+playBox.height>v.height+2){const pixels=(await p.screenshot()).toString('base64');for(let i=0;i<pixels.length;i+=1600)console.log('DEBUG_PIXEL '+(i/1600)+' '+pixels.slice(i,i+1600));}assert.ok(playBox.y+playBox.height<=v.height+2,JSON.stringify({chapter:ch,phase,viewport:v,button:playBox}));
    assert.ok(lastBox.y+lastBox.height<playBox.y,'Copy must remain above controls');
    if(ch>0){const panel=await p.locator('#analysisPanel').boundingBox(),nav=await p.locator('.phase-nav').boundingBox();if(panel.y+panel.height>nav.y+2){const pixels=(await p.screenshot()).toString('base64');for(let i=0;i<pixels.length;i+=1600)console.log('DEBUG_PIXEL '+(i/1600)+' '+pixels.slice(i,i+1600));}assert.ok(panel.y+panel.height<=nav.y+2,JSON.stringify({chapter:ch,phase,viewport:v,panel,nav}));}
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   }
   assert.equal(await diagramHandle.evaluate(e=>e.isConnected),true,'The same diagram persists between chapters');
  }
 }
 await p.setViewportSize({width:390,height:844});await p.locator('button[data-chapter="0"]').click();await p.locator('#nextChapter').click();await p.waitForFunction(()=>document.documentElement.dataset.chapter==='2');await p.locator('#nextChapter').click();await p.waitForFunction(()=>document.documentElement.dataset.chapter==='3');await p.locator('button[data-chapter="0"]').click();
 await p.locator('#complete').click();await p.waitForFunction(()=>Number(document.querySelector('#progress').value)===1);assert.equal(await p.locator('#phaseTitle').textContent(),normalized.chapters[6].phases[2].title);
 await p.locator('#repeat').click();await p.waitForFunction(()=>document.documentElement.dataset.chapter==='1');
 await p.emulateMedia({reducedMotion:'reduce'});await p.reload();await revealLegacy(p);await p.locator('#presentation:not([hidden])').waitFor();await p.locator('button[data-chapter="1"]').click();await p.waitForFunction(()=>document.documentElement.dataset.chapter==='2');await p.locator('[data-phase="1"]').click();assert.equal(await p.locator('#phaseTitle').textContent(),normalized.chapters[1].phases[1].title);await p.emulateMedia({reducedMotion:'no-preference'});
 console.log(JSON.stringify({chapters:7,sevenMethodSteps:true,sixMarketSevenFinancialThreeStress:true,persistentDiagram:true,allPhaseButtons:true,mobile320:true,mobile390:true,desktop:true,chapterReplay:true,reducedMotionNavigation:true}));

 // The close is a usable local handoff, not an automatic send or business mutation.
 await p.locator('button[data-chapter="6"]').click();await p.locator('#nextChapter').click();await p.locator('#closeCta').click();await p.locator('#closingDialog[open]').waitFor();
 for(let choice=1;choice<=3;choice++){await p.locator('[data-choice="'+choice+'"]').click();assert.equal(await p.locator('#closingMessage').inputValue(),C.closingMessage(normalized,choice,base+'/presentacion/'));assert.equal(await p.locator('[data-choice="'+choice+'"]').getAttribute('aria-pressed'),'true');}
 await p.locator('#closingCopy').click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),C.closingMessage(normalized,3,base+'/presentacion/'));await p.locator('#closingClose').click();assert.deepEqual(errors,[]);

 // Capture actual local renderer using real public Sheets copy before deployment.
 for(let ch=0;ch<7;ch++){await p.locator('button[data-chapter="'+ch+'"]').click();await p.waitForTimeout(180);await p.screenshot({path:'investor-scene'+(ch+1)+'-mobile.png'});if(ch>0){const pixels=fs.readFileSync('investor-scene'+(ch+1)+'-mobile.png').toString('base64');for(let i=0;i<pixels.length;i+=1600)console.log('PREVIEW_SCENE'+(ch+1)+'_PIXEL '+(i/1600)+' '+pixels.slice(i,i+1600));}}
 if(process.env.VERIFY_PUBLISHED_STORY==='1'){
  const liveContext=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']}),livePage=await liveContext.newPage();
  const deployed='https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/',expected=fs.readFileSync('presentacion/story.js','utf8').trim();
  let loaded=false;for(let attempt=0;attempt<15&&!loaded;attempt++){try{const check=await fetch(deployed+'story.js?v='+Date.now(),{signal:AbortSignal.timeout(20000)});if(check.ok&&(await check.text()).trim()===expected){await livePage.goto(deployed,{waitUntil:'domcontentloaded',timeout:30000});await revealLegacy(livePage);await livePage.locator('#presentation:not([hidden])').waitFor({timeout:50000});if(await livePage.locator('button[data-chapter]').count()===7)loaded=true;}}catch(_){}if(!loaded)await new Promise(r=>setTimeout(r,8000));}
  assert.ok(loaded,'Published page must serve the exact new script and load anonymously');
  assert.equal(await livePage.locator('button[data-chapter]').count(),7);
  for(const file of ['story-core.js','story.css']){const r=await fetch(deployed+file+'?v='+Date.now(),{signal:AbortSignal.timeout(30000)});assert.ok(r.ok);assert.equal((await r.text()).trim(),fs.readFileSync('presentacion/'+file,'utf8').trim(),'Published '+file+' must match');}
  for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]){
   await livePage.setViewportSize(viewport);
   for(let ch=0;ch<7;ch++){
    await livePage.locator('button[data-chapter="'+ch+'"]').click();await livePage.waitForFunction(n=>document.documentElement.dataset.chapter===String(n),ch+1);
    for(let ph=0;ph<normalized.chapters[ch].phases.length;ph++){await livePage.locator('[data-phase="'+ph+'"]').click();await livePage.waitForTimeout(100);assert.equal(await livePage.locator('#phaseTitle').textContent(),normalized.chapters[ch].phases[ph].title);const box=await livePage.locator('#play').boundingBox();assert.ok(box.y+box.height<=viewport.height+2);assert.ok(await livePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   }
  }
  await livePage.setViewportSize({width:390,height:844});
  for(let ch=0;ch<7;ch++){const value=C.chapterStart(normalized.chapters,ch)+.01;await livePage.evaluate(v=>{const s=document.querySelector('#story');window.scrollTo(0,window.scrollY+s.getBoundingClientRect().top+v*(s.offsetHeight-innerHeight));},value);await livePage.waitForFunction(n=>document.documentElement.dataset.chapter===String(n),ch+1);}

  for(let ch=0;ch<7;ch++){await livePage.locator('button[data-chapter="'+ch+'"]').click();await livePage.waitForFunction(n=>document.documentElement.dataset.chapter===String(n),ch+1);assert.equal(await livePage.locator('#chapterTitle').textContent(),normalized.chapters[ch].title);await livePage.waitForTimeout(500);await livePage.screenshot({path:'investor-scene'+(ch+1)+'-mobile.png'});const pixels=fs.readFileSync('investor-scene'+(ch+1)+'-mobile.png').toString('base64');for(let i=0;i<pixels.length;i+=1600)console.log('PUBLIC_SCENE'+(ch+1)+'_PIXEL '+(i/1600)+' '+pixels.slice(i,i+1600));}
  await livePage.locator('#closeCta').scrollIntoViewIfNeeded();await livePage.locator('#closeCta').click();await livePage.locator('[data-choice="2"]').click();assert.equal(await livePage.locator('#closingMessage').inputValue(),C.closingMessage(normalized,2,deployed));await livePage.locator('#closingCopy').click();assert.equal(await livePage.evaluate(()=>navigator.clipboard.readText()),C.closingMessage(normalized,2,deployed));await livePage.screenshot({path:'investor-closing-mobile.png'});const closePixels=fs.readFileSync('investor-closing-mobile.png').toString('base64');for(let i=0;i<closePixels.length;i+=1600)console.log('PUBLIC_CLOSING_PIXEL '+(i/1600)+' '+closePixels.slice(i,i+1600));await livePage.locator('#closingClose').click();
  await livePage.locator('button[data-chapter="0"]').click();
  await livePage.locator('#play').click();await livePage.waitForTimeout(400);assert.equal(await livePage.locator('#play').getAttribute('aria-pressed'),'true');await livePage.locator('#play').click();await livePage.locator('#complete').click();await livePage.waitForFunction(()=>Number(document.querySelector('#progress').value)===1);await livePage.locator('#repeat').click();await livePage.waitForFunction(()=>document.documentElement.dataset.chapter==='1');
  const box=await livePage.locator('#play').boundingBox();assert.ok(box.y+box.height<=846);
  assert.deepEqual(await livePage.evaluate(()=>Object.keys(localStorage)),[]);
  console.log(JSON.stringify({productionPage:true,anonymousBrowser:true,exactPublishedScript:true,realCopy:true,publicChapters:7,productionPlayback:true,productionReplay:true,productionWrites:0}));
  await liveContext.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
})().catch(e=>{console.error(e);process.exit(1)});
