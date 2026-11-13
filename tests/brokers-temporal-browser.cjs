const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),CRM=require('../brokers-crm.js'),S=require('../brokers-server.js');
(async()=>{
 const files=new Set(['brokers.html','brokers.js','brokers-core.js','brokers-crm.js','brokers-evaluator.js','brokers.css']);
 const server=http.createServer((req,res)=>{const file=new URL(req.url,'http://localhost').pathname.slice(1);if(!files.has(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(process.cwd(),file)));}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
 const today=CRM.day(new Date().toISOString()),qa=process.env.QA_DIR||'temporal-review-artifacts',DOC='https://docs.google.com/document/d/synthetic-minuta/edit',VENCIDA='Vencida · sin resultado registrado';
 let checks=0;
 const eq=(a,b,m)=>{assert.equal(a,b,m);checks++;},ok=(v,m)=>{assert.ok(v,m);checks++;};
 const match=(text,part)=>part instanceof RegExp?part.test(text):text.includes(part);
 const has=(text,part,where)=>{assert.ok(match(text,part),where+': falta «'+part+'» en «'+text.slice(0,400)+'»');checks++;};
 const lacks=(text,part,where)=>{assert.ok(!match(text,part),where+': no debe aparecer «'+part+'»');checks++;};
 // Four facts of one case. Only a2 carries a source; a4 closes the meeting scheduled in a3 (replaces) and is registered after it.
 const T={a1:'Primer contacto con el propietario del predio.',a2:'Se revisaron los datos básicos del predio.',a3:'Reunión para revisar la propuesta de números.',a4:'La reunión se realizó y el propietario pidió ajustar la propuesta.',a5:'Llamada por confirmar con el propietario.'};
 const row=(id,text,meta,recorded,next)=>({id,opportunity_id:'o1',note:CRM.encode(text,{v:1,...meta}),date:recorded,author_id:'direction@example.test',author_name:'Directora Ejemplo',next_action:next[0],next_date:next[1]});
 const activities=()=>[
  row('a1',T.a1,{type:'Llamada',status:'Realizado',occurred_at:'2026-10-01',participants:'PG; Broker Uno',stage:'Recibido'},'2026-10-01T18:00:00.000Z',['[Masterbroker] Reunir documentos del predio','2026-10-08']),
  row('a2',T.a2,{type:'Reunión',status:'Realizado',occurred_at:'2026-10-10',participants:'PG; Broker Uno',source:'Minuta de revisión',source_url:DOC,stage:'En revisión'},'2026-10-10T18:00:00.000Z',['[PG] Confirmar reunión de revisión','2026-10-20']),
  row('a3',T.a3,{type:'Reunión',status:'Programado',occurred_at:'2026-10-20',participants:'PG; Broker Uno'},'2026-10-11T18:00:00.000Z',['[YOD] Preparar los números de la reunión','2026-10-20']),
  row('a4',T.a4,{type:'Reunión',status:'Realizado',occurred_at:'2026-10-21',participants:'PG; Broker Uno',replaces:'a3'},'2026-10-21T18:00:00.000Z',['[YOD] Ajustar la propuesta','2026-10-28'])
 ];
 const freshState=()=>({revision:1,brokers:[{id:'b1',name:'Broker Uno',email:'broker@example.test',active:true}],contacts:[{id:'c1',name:'Cliente Uno',type:'Propietario',broker_ids:['b1']}],opportunities:[{id:'o1',title:'Predio Norte',terrain_id:'t1',contact_id:'c1',broker_ids:['b1'],kind:'Terreno',stage:'En revisión',next_action:'[YOD] Revisar números',next_date:today,notes:CRM.encodeCase('Caso sintético para la vista temporal.','Por confirmar',true)}],activities:activities(),participations:[],receipts:[]});
 try{
  assert.ok(today>'2026-10-25','El reloj del entorno debe ser posterior al 2026-10-25 (la prueba usa fechas fijas).');
  fs.mkdirSync(qa,{recursive:true});
  for(const width of [320,390,1440]){
   const wide=width>=1024,state=freshState(),initial=structuredClone(state),collections={contact:'contacts',opportunity:'opportunities',activity:'activities',participation:'participations'};let id=0,saves=0,saveRequests=0;
   const adapter={auth:k=>({ok:k==='synthetic-session',correo:'direction@example.test',nombre:'Directora Ejemplo',rol:'direccion',boards:'IV'}),lock:f=>f(),read:()=>structuredClone(state),hash:v=>v,now:()=>new Date().toISOString(),uuid:()=> 'synthetic-'+(++id),commit:(changes,receipt)=>{for(const change of changes){const rows=state[collections[change.kind]],i=rows.findIndex(r=>r.id===change.record.id);if(i<0)rows.push(change.record);else rows[i]=change.record;}state.receipts.push(receipt);state.revision++;saves++;}};
   const service=S.createService(adapter),ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addInitScript(()=>localStorage.setItem('pyod_clave_v1','synthetic-session'));
   await ctx.route('https://**/*',async route=>{const req=route.request();if(req.method()!=='POST')return route.fulfill({status:200,contentType:'application/javascript',body:''});const payload=JSON.parse(req.postData());if(payload.action==='brokers_save')saveRequests++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(service.handle(payload))});});
   const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   const noOverflow=async()=>{if(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)){checks++;return;}assert.fail('Desbordamiento horizontal a '+width+'px: '+JSON.stringify(await p.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(e=>({tag:e.tagName,cls:String(e.className),x:Math.round(e.getBoundingClientRect().x),w:Math.round(e.getBoundingClientRect().width)})).filter(e=>e.x+e.w>innerWidth+1).slice(0,12))));};
   const shot=async name=>{await noOverflow();await p.screenshot({path:path.join(qa,'temporal-'+width+'-'+name+'.png'),fullPage:true});};
   const panel=n=>p.locator('section.temporal [role=tabpanel][data-pane='+n+']'),tab=n=>p.locator('.temporal-tabs [role=tab][data-temporal-pane='+n+']'),asof=p.locator('#temporal-asof'),back=p.locator('[data-temporal-today]');
   const read=async n=>(await panel(n).evaluate(e=>e.textContent)).replace(/\s+/g,' ').trim();
   const shown=async()=>{let out='';for(const n of ['history','today','plan'])out+=(await panel(n).isVisible())?'1':'0';return out;};
   const focused=async n=>{await p.waitForFunction(v=>document.activeElement&&document.activeElement.dataset.temporalPane===v,n);checks++;};
   const setAsOf=async d=>{await asof.fill(d);await asof.dispatchEvent('change');await p.waitForFunction(v=>document.querySelector('#temporal-asof')?.value===v,d);};
   const openTemporal=async()=>{await p.locator('[data-open=o1]').click();await p.locator('.detail-tabs [data-detail-tab=temporal]').click();await p.locator('section.temporal').waitFor();};

   // Entra como Dirección, abre el caso y la pestaña.
   await p.goto(base+'/brokers.html');await p.locator('.scope-switcher').waitFor();await p.locator('[data-broker=b1]').click();
   await p.locator('[data-open=o1]').click();
   const temporalTab=p.locator('.detail-tabs [data-detail-tab=temporal]');
   eq((await temporalTab.textContent()).trim(),'Historia · Hoy · Plan','Etiqueta de la quinta pestaña');
   await temporalTab.click();await p.locator('section.temporal').waitFor();

   // 1 · hoy
   eq(await temporalTab.getAttribute('aria-current'),'page','La pestaña queda activa');
   eq(await p.locator('section.temporal').count(),1);eq(await p.locator('section.temporal [role=tabpanel]').count(),3);
   eq(await panel('history').getAttribute('aria-label'),'Historial');eq(await panel('today').getAttribute('aria-label'),'Hoy');eq(await panel('plan').getAttribute('aria-label'),'Planeación');
   eq(await asof.getAttribute('type'),'date');eq(await asof.getAttribute('aria-label'),'Fecha de consulta');eq(await asof.inputValue(),today,'La fecha inicial es hoy');eq(await asof.getAttribute('max'),today,'No se puede consultar el futuro');
   ok(await back.isDisabled(),'Volver a hoy está desactivado en la fecha de hoy');has(await p.locator('.temporal-note').textContent(),'Vista de solo lectura','Nota de solo lectura');
   eq(await p.locator('.temporal-grid').getAttribute('data-pane'),'today','Panel inicial');
   if(wide){
    eq(await shown(),'111','A 1440 los tres paneles son visibles');eq(await p.locator('.temporal-tabs').isVisible(),false,'A 1440 no hay pestañas de panel');
    const b=[await panel('history').boundingBox(),await panel('today').boundingBox(),await panel('plan').boundingBox()];
    ok(b[0].x<b[1].x&&b[1].x<b[2].x,'Historia, Hoy y Planeación van de izquierda a derecha');ok(b.every(x=>Math.abs(x.y-b[0].y)<=2),'Los tres paneles van en una misma fila');ok(b[0].x+b[0].width<=b[1].x+1&&b[1].x+b[1].width<=b[2].x+1,'Los paneles no se traslapan');
   }else{
    eq(await shown(),'010','En móvil sólo se ve un panel (Hoy)');eq(await p.locator('.temporal-tabs').isVisible(),true,'En móvil se ven las pestañas de panel');
    eq(await p.locator('.temporal-tabs').getAttribute('role'),'tablist');eq(await p.locator('.temporal-tabs [role=tab]').count(),3);
    eq((await p.locator('.temporal-tabs [role=tab]').allTextContents()).map(t=>t.trim()).join('|'),'← Historia|Hoy|Planeación →','Textos de las pestañas');
    eq(await tab('today').getAttribute('aria-selected'),'true');eq(await tab('history').getAttribute('aria-selected'),'false');eq(await tab('plan').getAttribute('aria-selected'),'false');
    eq(await tab('today').getAttribute('tabindex'),'0');eq(await tab('history').getAttribute('tabindex'),'-1');eq(await tab('plan').getAttribute('tabindex'),'-1');
    const b=await panel('today').boundingBox();ok(b.x>=-1&&b.x+b.width<=width+1,'El panel visible cabe en el ancho');
   }
   {
    const [h,t,pl,all]=[await read('history'),await read('today'),await read('plan'),await p.locator('section.temporal').evaluate(e=>e.textContent)];
    for(const x of [T.a1,T.a2,T.a3,T.a4])has(h,x,'Historia (hoy)');
    ok(h.lastIndexOf(T.a4)<h.lastIndexOf(T.a3)&&h.lastIndexOf(T.a3)<h.lastIndexOf(T.a2)&&h.lastIndexOf(T.a2)<h.lastIndexOf(T.a1),'Historia: del más reciente al más antiguo');
    eq((h.match(/Corrige a/g)||[]).length,1,'Historia (hoy): sólo el resultado corrige a la reunión programada');
    has(h,'Realizado','Historia (hoy)');has(h,'Programado','Historia (hoy)');has(h,'Minuta de revisión','Historia (hoy)');lacks(h,'Registrado después de esta fecha','Historia (hoy)');
    ok(await panel('history').locator('.status').count()>=4,'Historia: estados en texto (.status)');
    const src=panel('history').locator('a[href="'+DOC+'"]');ok(await src.count()>=1,'Historia: enlace a la fuente');eq(await src.first().getAttribute('target'),'_blank');ok(/noopener/.test(await src.first().getAttribute('rel')||''),'La fuente abre sin opener');
    has(t,'En revisión','Hoy (hoy): etapa del expediente');has(t,'Revisar números','Hoy (hoy): siguiente paso del expediente');has(t,T.a4,'Hoy (hoy): último hecho realizado');has(t,'Requiere decisión','Hoy (hoy)');has(t,'Sin bloqueo registrado en el expediente','Hoy (hoy)');
    has(pl,'Compromisos (programados)','Planeación (hoy)');has(pl,'Propuestas','Planeación (hoy)');has(pl,'Sin compromisos programados','Planeación (hoy): la reunión ya tiene resultado');has(pl,'Sin propuestas','Planeación (hoy)');has(pl,'Siguiente paso vigente','Planeación (hoy)');has(pl,'Revisar números','Planeación (hoy)');lacks(pl,T.a3,'Planeación (hoy)');lacks(pl,VENCIDA,'Planeación (hoy)');
    lacks(all,/\d\s*%/,'La vista no muestra porcentajes');
   }
   await shot('1-hoy');

   // 2 · planeación y teclado
   if(!wide){
    await tab('plan').click();eq(await tab('plan').getAttribute('aria-selected'),'true','Planeación seleccionada');eq(await shown(),'001','Sólo se ve Planeación');eq(await p.locator('.temporal-grid').getAttribute('data-pane'),'plan');eq(await tab('plan').getAttribute('tabindex'),'0');eq(await tab('today').getAttribute('tabindex'),'-1');
    await tab('plan').focus();await p.keyboard.press('ArrowLeft');await focused('today');eq(await tab('today').getAttribute('aria-selected'),'true','Flecha izquierda vuelve a Hoy');eq(await shown(),'010');
    await p.keyboard.press('End');await focused('plan');eq(await shown(),'001','Fin va a Planeación');
    await p.keyboard.press('Home');await focused('history');eq(await shown(),'100','Inicio va a Historia');
    await p.keyboard.press('ArrowRight');await focused('today');eq(await shown(),'010','Flecha derecha va a Hoy');
    await tab('plan').click();eq(await shown(),'001');
   }
   await shot('2-plan');

   // 3 · como estaba el 15 de octubre
   await setAsOf('2026-10-15');
   eq(await asof.inputValue(),'2026-10-15');ok(!(await back.isDisabled()),'Volver a hoy se activa con una fecha pasada');
   {
    const [h,t,pl,all]=[await read('history'),await read('today'),await read('plan'),await p.locator('section.temporal').evaluate(e=>e.textContent)];
    has(h,T.a2,'Historia (15 oct)');has(h,T.a1,'Historia (15 oct)');lacks(h,T.a4,'Historia (15 oct): el hecho del 21 aún no ocurría');lacks(h,T.a3,'Historia (15 oct): la reunión es del 20');lacks(h,'Corrige a','Historia (15 oct)');lacks(h,'Registrado después de esta fecha','Historia (15 oct)');has(h,'Minuta de revisión','Historia (15 oct)');
    has(t,'En revisión','Hoy (15 oct): etapa observada');has(t,T.a2,'Hoy (15 oct): último hecho');has(t,'Minuta de revisión','Hoy (15 oct): fuente');ok(await panel('today').locator('a[href="'+DOC+'"]').count()>=1,'Hoy (15 oct): enlace a la fuente');
    has(t,'Confirmar reunión de revisión','Hoy (15 oct): siguiente paso registrado en esa fecha');lacks(t,'Revisar números','Hoy (15 oct): no usa el paso actual del expediente');lacks(t,T.a4,'Hoy (15 oct)');lacks(t,'Requiere decisión','Hoy (15 oct): la decisión sólo aplica hoy');has(t,'Sin bloqueo registrado en el expediente','Hoy (15 oct)');
    has(pl,'Compromisos (programados)','Planeación (15 oct)');has(pl,T.a3,'Planeación (15 oct): la reunión del 20 sigue vigente');lacks(pl,'Sin compromisos programados','Planeación (15 oct)');lacks(pl,VENCIDA,'Planeación (15 oct): el 20 aún no vence');lacks(pl,'Siguiente paso vigente','Planeación (15 oct): sólo aplica hoy');
    ok((await panel('plan').locator('.status').allTextContents()).some(x=>/Programado/.test(x)),'Planeación (15 oct): estado Programado en texto');
    lacks(all,/\d\s*%/,'La vista no muestra porcentajes');
   }
   await shot('3-asof-1015');

   // 4 · como estaba el 25 de octubre
   await setAsOf('2026-10-25');
   {
    const [h,t,pl]=[await read('history'),await read('today'),await read('plan')];
    has(h,T.a4,'Historia (25 oct): aparece el hecho del 21');has(h,T.a3,'Historia (25 oct): la programación se conserva');ok(h.lastIndexOf(T.a4)<h.lastIndexOf(T.a3),'Historia (25 oct): el resultado va antes');eq((h.match(/Corrige a/g)||[]).length,1,'Historia (25 oct)');lacks(h,'Registrado después de esta fecha','Historia (25 oct)');
    has(t,T.a4,'Hoy (25 oct): último hecho');has(t,'En revisión','Hoy (25 oct): etapa observada');has(t,'Ajustar la propuesta','Hoy (25 oct): siguiente paso del último hecho');lacks(t,'Revisar números','Hoy (25 oct)');lacks(t,'Requiere decisión','Hoy (25 oct)');
    lacks(pl,T.a3,'Planeación (25 oct): la reunión fue reemplazada por su resultado');has(pl,'Sin compromisos programados','Planeación (25 oct)');has(pl,'Sin propuestas','Planeación (25 oct)');lacks(pl,VENCIDA,'Planeación (25 oct)');lacks(pl,'Siguiente paso vigente','Planeación (25 oct)');
   }
   if(!wide){await tab('history').click();eq(await shown(),'100','Historia visible para la captura');}
   await shot('4-asof-1025');

   // Vacíos explícitos antes del primer registro
   await setAsOf('2026-09-30');
   {
    const [h,t]=[await read('history'),await read('today')];
    has(h,'Sin hechos registrados hasta esta fecha.','Historia (30 sep)');lacks(h,T.a1,'Historia (30 sep)');has(t,'Etapa no registrada en esa fecha','Hoy (30 sep)');has(t,'Sin siguiente paso registrado','Hoy (30 sep)');has(t,'Sin bloqueo registrado en el expediente','Hoy (30 sep)');lacks(t,'Requiere decisión','Hoy (30 sep)');lacks(t,/\d\s*%/,'Hoy (30 sep): sin porcentajes');
   }

   // Volver a hoy
   await back.click();
   eq(await asof.inputValue(),today,'Volver a hoy restablece la fecha');ok(await back.isDisabled(),'Volver a hoy se desactiva');
   has(await read('plan'),'Siguiente paso vigente','Planeación (de nuevo hoy)');has(await read('today'),'Revisar números','Hoy (de nuevo hoy)');has(await read('today'),'Requiere decisión','Hoy (de nuevo hoy)');

   // Navegar la fecha es sólo lectura.
   eq(saves,0,'Ningún guardado');eq(saveRequests,0,'Ninguna llamada brokers_save');assert.deepEqual(state,initial,'El snapshot sintético no cambió');checks++;

   // Un plan sin resultado se marca vencido por fecha, pero nunca pasa a realizado.
   state.activities.push(row('a5',T.a5,{type:'Llamada',status:'Programado',occurred_at:'2026-10-12'},'2026-10-05T18:00:00.000Z',['[PG] Llamar al propietario','2026-10-12']));
   await p.reload();await p.locator('#workspace:not([hidden])').waitFor();await openTemporal();
   for(const [d,vencida] of [['2026-10-11',false],['2026-10-12',false],['2026-10-13',true],['2026-10-25',true]]){
    await setAsOf(d);const pl=await read('plan');has(pl,T.a5,'Planeación ('+d+')');
    if(vencida){has(pl,VENCIDA,'Planeación ('+d+')');eq((pl.match(new RegExp(VENCIDA,'g'))||[]).length,1,'Planeación ('+d+'): una sola vencida');}else lacks(pl,VENCIDA,'Planeación ('+d+')');
   }
   {
    const t=await read('today'),h=await read('history'),st=await panel('plan').locator('.status').allTextContents();
    has(t,T.a4,'Hoy (25 oct): el último hecho sigue siendo el realizado');lacks(t,T.a5,'Hoy (25 oct): el plan vencido no es un hecho');has(h,T.a5,'Historia (25 oct): el plan vencido se conserva');
    ok(st.some(x=>/Programado/.test(x)),'El plan vencido sigue como Programado');ok(!st.some(x=>/Realizado/.test(x)),'Ningún plan aparece como Realizado');lacks(await read('plan'),'Sin compromisos programados','Planeación (25 oct): queda el plan vencido');
    await setAsOf('2026-10-11');lacks(await read('history'),T.a5,'Historia (11 oct): el plan es del 12');
   }
   eq(saves,0,'Ningún guardado tras recargar');eq(saveRequests,0,'Ninguna llamada brokers_save tras recargar');eq(errors.length,0,errors.join('\n'));
   await ctx.close();
  }
  console.log('temporal browser: '+checks+' comprobaciones');
 }finally{
  await browser.close();if(server.closeAllConnections)server.closeAllConnections();await new Promise(r=>server.close(r));
 }
})().catch(e=>{console.error(e);process.exit(1)});
