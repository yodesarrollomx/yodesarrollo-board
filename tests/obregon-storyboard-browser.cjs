const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base='https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/distrito-obregon/';

// ---- SB07 · mapa sobre traza OSM, diagrama de patrimonio y solapamiento de rótulos ----
// ---- SB08 · (#348) red de integrantes (participacion) y tabla de flujos (retribucion): ver sb08Scenes ----
// Las fallas de estas aserciones se acumulan en `problems` y se reportan juntas al final (todos los viewports, con texto/escena/paso).
const VERSION='YOD-SB08',OVERLAP_PX=2,SAMPLES=[.5]/* t dentro del paso: la cámara ya llegó y la capa semántica está revelada */;
const problems=[];
const diskStory=JSON.parse(fs.readFileSync(path.join(root,'presentacion/distrito-obregon/story.js'),'utf8').replace(/^\s*export const story\s*=\s*/,'').replace(/;\s*$/,''));
const sceneIndex=id=>{const i=diskStory.scenes.findIndex(s=>s.id===id);assert(i>=0,'Escena inexistente en story.js: '+id);return i};
// Se ejecuta dentro de la página: textos <text> visibles (opacidad efectiva > .5 con ancestros) de #semantic-layer, #territory y #scene-labels, en pantalla.
function scanTexts(){
  const svg=document.querySelector('#stage svg');if(!svg)return {error:'no hay <svg> en #stage'};
  const ctm=svg.getScreenCTM(),vb=svg.viewBox.baseVal,P=(x,y)=>[ctm.a*x+ctm.c*y+ctm.e,ctm.b*x+ctm.d*y+ctm.f],A=P(vb.x,vb.y),B=P(vb.x+vb.width,vb.y+vb.height);
  const view={l:Math.min(A[0],B[0]),t:Math.min(A[1],B[1]),r:Math.max(A[0],B[0]),b:Math.max(A[1],B[1])};
  const paper=svg.querySelector('#map-paper'),pr=paper&&paper.getBoundingClientRect(),frame=pr&&pr.width?{l:pr.left,t:pr.top,r:pr.right,b:pr.bottom}:null,items=[];
  for(const sel of ['#semantic-layer','#territory','#scene-labels']){const layer=svg.querySelector(sel);if(!layer)continue;
    for(const el of layer.querySelectorAll('text')){
      const text=el.textContent.replace(/\s+/g,' ').trim();if(!text)continue;
      let op=1,hidden=false;
      for(let n=el;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'){hidden=true;break}op*=Number(cs.opacity);if(n===svg)break}
      if(hidden||!(op>.5))continue;
      const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
      items.push({layer:sel,text,op:Math.round(op*100)/100,l:r.left,t:r.top,r:r.right,b:r.bottom,framed:!!el.closest('#map-frame')});
    }}
  // Chinchetas: círculos de #map-labels (se comparan contra los textos visibles; el numeral propio de cada una se ignora).
  const mapLabels=svg.querySelector('#map-labels');
  if(mapLabels)for(const el of mapLabels.querySelectorAll('circle')){
    let op=1,hidden=false;
    for(let n=el;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'){hidden=true;break}op*=Number(cs.opacity);if(n===svg)break}
    if(hidden||!(op>.5))continue;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    const num=(el.parentNode.querySelector('text')||{}).textContent;
    items.push({layer:'#map-labels',pin:true,text:'chincheta'+(num?' '+num.trim():''),op:Math.round(op*100)/100,l:r.left,t:r.top,r:r.right,b:r.bottom,framed:!!el.closest('#map-frame')});
  }
  return {view,frame,items};
}
const fmt=i=>'«'+i.text+'» ('+i.layer+', x '+Math.round(i.l)+'–'+Math.round(i.r)+', y '+Math.round(i.t)+'–'+Math.round(i.b)+')';
// Pares que se intersecan más de OVERLAP_PX en ambos ejes + rótulos fuera del SVG o cortados por el marco del mapa.
function overlapsIn(scan,where){
  const out=[];if(scan.error)return [where+': '+scan.error];
  const {view,items,frame}=scan,tol=1;
  for(const i of items){
    if(i.l<view.l-tol||i.r>view.r+tol||i.t<view.t-tol||i.b>view.b+tol)out.push(where+': '+fmt(i)+' queda fuera del SVG (viewBox en pantalla x '+Math.round(view.l)+'–'+Math.round(view.r)+', y '+Math.round(view.t)+'–'+Math.round(view.b)+')');
    if(i.framed&&frame&&(i.l<frame.l-tol||i.r>frame.r+tol||i.t<frame.t-tol||i.b>frame.b+tol))out.push(where+': '+fmt(i)+' queda cortado por el marco del mapa');
  }
  for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){const p=items[a],q=items[b];
    if(p.pin||q.pin){if(p.pin&&q.pin)continue;const c=p.pin?p:q,t=p.pin?q:p,cx=(c.l+c.r)/2,cy=(c.t+c.b)/2,rad=(c.r-c.l)/2;
      if(t.text.length<=2&&cx>=t.l&&cx<=t.r&&cy>=t.t&&cy<=t.b)continue;// numeral de la propia chincheta
      const nx=Math.max(t.l,Math.min(cx,t.r)),ny=Math.max(t.t,Math.min(cy,t.b)),pen=rad-Math.hypot(cx-nx,cy-ny);
      if(pen>OVERLAP_PX)out.push(where+': '+fmt(c)+' choca con '+fmt(t)+' (la chincheta penetra '+Math.round(pen*10)/10+' px en el texto, máximo permitido '+OVERLAP_PX+' px)');continue}
    const ox=Math.min(p.r,q.r)-Math.max(p.l,q.l),oy=Math.min(p.b,q.b)-Math.max(p.t,q.t);
    if(ox>OVERLAP_PX&&oy>OVERLAP_PX)out.push(where+': '+fmt(p)+' choca con '+fmt(q)+' (traslape '+Math.round(ox*10)/10+' × '+Math.round(oy*10)/10+' px, máximo permitido '+OVERLAP_PX+' px)');}
  return out;
}
const setProgress=async(p,v)=>{await p.locator('#progress').evaluate((e,x)=>{e.value=x;e.dispatchEvent(new Event('input'))},v);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))};
// Aserciones SB07 de escena (a, b, c). No lanzan: acumulan en `problems`.
async function sb07Scenes(p,viewport){
  const vp=viewport.width+'x'+viewport.height,ck=(ok,msg)=>{if(!ok)problems.push('['+vp+'] '+msg)};
  const ub=sceneIndex('ubicacion'),pa=sceneIndex('patrimonio');
  // a) Escena 0: traza OSM, contorno, rótulo de la Federal 15, escala, norte y atribución; sin la forma de la presentación original.
  await setProgress(p,ub*4+.5);
  const a=await p.evaluate(()=>({roads:document.querySelectorAll('#territory [data-road]').length,status:[...document.querySelectorAll('#territory [data-status]')].map(e=>e.dataset.status),stage:document.querySelector('#stage svg').textContent}));
  ck(a.roads>300,'escena ubicacion: #territory [data-road] = '+a.roads+' (se esperan > 300 vías OSM)');
  ck(a.status.length>0&&a.status.every(s=>['conceptual','kmz'].includes(s)),'escena ubicacion: el contorno debe tener data-status conceptual|kmz; encontrado '+JSON.stringify(a.status));
  const seen=(await p.evaluate(scanTexts)).items||[],inTerritory=seen.filter(i=>i.layer==='#territory');
  ck(seen.some(i=>i.text.includes('Carretera Federal 15')),'escena ubicacion paso 1: no hay texto visible con "Carretera Federal 15"');
  ck(inTerritory.some(i=>/^\d+ m$/.test(i.text)),'escena ubicacion paso 1: no hay barra de escala visible con texto /^\\d+ m$/ en #territory');
  ck(inTerritory.some(i=>i.text==='N'),'escena ubicacion paso 1: no hay indicador "N" (norte) visible en #territory');
  ck(inTerritory.some(i=>/OpenStreetMap/.test(i.text)),'escena ubicacion paso 1: no hay atribución OpenStreetMap visible en #territory');
  for(let n=0;n<4;n++){await setProgress(p,ub*4+n+.5);const txt=await p.evaluate(()=>document.querySelector('#stage svg').textContent);ck(!txt.includes('Forma de la presentación original'),'escena ubicacion paso '+(n+1)+': sigue apareciendo el texto "Forma de la presentación original"')}
  // b) Escena patrimonio en el paso 3 (progreso 6.99): las seis figuras Hairline visibles y el diagrama rotulado.
  await setProgress(p,6.99);
  const b=await p.evaluate(()=>({op:Object.fromEntries(['nave','plaza','office','hotel','club','pocket'].map(id=>{const e=document.querySelector('[data-object="'+id+'"]');return [id,e?Number(getComputedStyle(e).opacity):null]})),stage:document.querySelector('#stage svg').textContent}));
  for(const [id,o] of Object.entries(b.op))ck(o!==null&&o>.9,'patrimonio paso 3 (progreso 6.99): el objeto "'+id+'" tiene opacidad '+o+' (se espera > .9)');
  for(const need of ['Built-To-Suit','Bodegas pocket'])ck(b.stage.includes(need),'patrimonio paso 3 (progreso 6.99): falta el texto "'+need+'" en el SVG');
  // b2) La nave ya está dibujada al entrar a la escena 1 (viene de la transición 0→1) y los complementos terminan de entrar en el paso 3.
  for(const pos of [4,4.6]){await setProgress(p,pos);const o=await p.evaluate(()=>Number(getComputedStyle(document.querySelector('[data-object="nave"]')).opacity));ck(o>=.95,'patrimonio (progreso '+pos+'): la nave tiene opacidad '+o+' (se espera ≥ .95)')}
  await setProgress(p,6);
  const co=await p.evaluate(()=>Object.fromEntries(['plaza','office','hotel','club','pocket'].map(id=>[id,Number(getComputedStyle(document.querySelector('[data-object="'+id+'"]')).opacity)])));
  for(const [id,o] of Object.entries(co))ck(o>=.95,'patrimonio (progreso 6): el complemento "'+id+'" tiene opacidad '+o+' (se espera ≥ .95)');
  // b3) Forma conceptual: el paso 2 de ubicacion debe decir que la posición es aproximada.
  await setProgress(p,ub*4+1.5);
  const st=await p.evaluate(()=>[...document.querySelectorAll('#territory [data-status]')].map(e=>e.dataset.status));
  if(st.includes('conceptual')){const vis=((await p.evaluate(scanTexts)).items||[]).map(i=>i.text);ck(vis.some(t=>/posición aproximada/i.test(t)),'ubicacion paso 2: con parcel.status="conceptual" falta texto visible con "posición aproximada" (visibles: '+vis.slice(0,12).join(' | ')+'…)')}
  // c) Solapamiento de rótulos: ubicacion y patrimonio, pasos 1–4.
  for(const [name,idx] of [['ubicacion',ub],['patrimonio',pa]])for(let n=0;n<4;n++)for(const s of SAMPLES){const pos=idx*4+n+s;await setProgress(p,pos);
    const scan=await p.evaluate(scanTexts);if(process.env.SB07_DEBUG)console.error(vp,name,'paso',n+1,'textos visibles:',(scan.items||[]).length);
    for(const m of overlapsIn(scan,name+' paso '+(n+1)+' (progreso '+pos+')'))problems.push('['+vp+'] '+m)}
  await setProgress(p,0);
}
// ---- SB08 ------------------------------------------------------------------------------------------------------------------------
const CAUTELA='Sin porcentajes ni tarifas acordados',FIGURES=/\d\s*%|\$\s*\d|MXN|USD|\d{2,}\s*(años|meses)/;
// Se ejecuta dentro de la página: líneas (line, [data-link]) y cajas de íconos ([data-icon]) visibles de #semantic-layer, en pantalla.
// Las líneas se muestrean punto a punto (getPointAtLength) para detectar cruces con cajas de texto aunque sean diagonales o curvas.
function scanShapes(){
  const svg=document.querySelector('#stage svg'),layer=svg&&svg.querySelector('#semantic-layer');if(!layer)return {lines:[],icons:[]};
  const visible=el=>{let op=1;for(let n=el;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return false;op*=Number(cs.opacity);if(n===svg)break}return op>.5};
  const lines=[],icons=[];
  for(const el of layer.querySelectorAll('line,[data-link]')){
    if(!visible(el)||typeof el.getTotalLength!=='function')continue;
    const m=el.getScreenCTM(),len=el.getTotalLength(),pts=[];if(!m||!len)continue;
    for(let d=0;d<=len;d+=Math.max(1,len/200)){const q=el.getPointAtLength(d);pts.push([m.a*q.x+m.c*q.y+m.e,m.b*q.x+m.d*q.y+m.f])}
    lines.push({layer:'#semantic-layer',text:'línea '+(el.dataset.link||el.id||el.tagName.toLowerCase()),pts,dashed:!!(el.getAttribute('stroke-dasharray')||getComputedStyle(el).strokeDasharray!=='none')});
  }
  for(const el of layer.querySelectorAll('[data-icon]')){
    if(!visible(el))continue;const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    icons.push({layer:'#semantic-layer',text:'ícono '+el.dataset.icon,l:r.left,t:r.top,r:r.right,b:r.bottom});
  }
  return {lines,icons};
}
// Cruces de líneas y cajas de íconos contra los textos visibles (las líneas pueden tocar el borde de una caja, no atravesar un texto).
function shapeProblems(texts,shapes,where){
  const out=[],tol=OVERLAP_PX;
  for(const ln of shapes.lines)for(const t of texts){
    if(ln.pts.some(([x,y])=>x>t.l+tol&&x<t.r-tol&&y>t.t+tol&&y<t.b-tol))out.push(where+': '+ln.text+' cruza '+fmt(t));
  }
  for(const ic of shapes.icons)for(const t of texts){
    const ox=Math.min(ic.r,t.r)-Math.max(ic.l,t.l),oy=Math.min(ic.b,t.b)-Math.max(ic.t,t.t);
    if(ox>tol&&oy>tol)out.push(where+': '+ic.text+' (x '+Math.round(ic.l)+'–'+Math.round(ic.r)+', y '+Math.round(ic.t)+'–'+Math.round(ic.b)+') choca con '+fmt(t)+' (traslape '+Math.round(ox*10)/10+' × '+Math.round(oy*10)/10+' px)');
  }
  for(let a=0;a<shapes.icons.length;a++)for(let b=a+1;b<shapes.icons.length;b++){const p=shapes.icons[a],q=shapes.icons[b],ox=Math.min(p.r,q.r)-Math.max(p.l,q.l),oy=Math.min(p.b,q.b)-Math.max(p.t,q.t);
    if(ox>tol&&oy>tol)out.push(where+': '+p.text+' choca con '+q.text);}
  return out;
}
// Aserciones SB08 (#348). No lanzan: acumulan en `problems`.
async function sb08Scenes(p,viewport){
  const vp=viewport.width+'x'+viewport.height,ck=(ok,msg)=>{if(!ok)problems.push('['+vp+'] '+msg)};
  const pa=sceneIndex('participacion'),rt=sceneIndex('retribucion');
  assert.equal(pa,2,'participacion debe ser la escena de índice 2');assert.equal(rt,4,'retribucion debe ser la escena de índice 4');
  const visibleSemantic=async()=>((await p.evaluate(scanTexts)).items||[]).filter(i=>i.layer==='#semantic-layer');
  // a) participacion, paso 4: 11 nodos, 3 de la alianza, ≥ 6 por seleccionar y el cierre «una sola coordinación».
  await setProgress(p,pa*4+3.5);
  const n=await p.evaluate(()=>{const nodes=[...document.querySelectorAll('#stage [data-node]')];return {total:nodes.length,ids:nodes.map(e=>e.dataset.node),alianza:nodes.filter(e=>e.dataset.status==='alianza').length,porSeleccionar:nodes.filter(e=>e.dataset.status==='por-seleccionar').length,estados:[...new Set(nodes.map(e=>e.dataset.status))]}});
  ck(n.total===11,'participacion paso 4: [data-node] = '+n.total+' (se esperan 11)');
  ck(new Set(n.ids).size===n.ids.length,'participacion paso 4: hay data-node repetidos: '+n.ids.join(', '));
  ck(n.alianza===3,'participacion paso 4: [data-status="alianza"] = '+n.alianza+' (se esperan 3)');
  ck(n.porSeleccionar>=6,'participacion paso 4: [data-status="por-seleccionar"] = '+n.porSeleccionar+' (se esperan ≥ 6)');
  ck(n.estados.every(s=>['alianza','por-seleccionar','por-confirmar','por-prospectar'].includes(s)),'participacion paso 4: data-status fuera del vocabulario: '+JSON.stringify(n.estados));
  ck((await visibleSemantic()).some(i=>i.text.includes('una sola coordinación')),'participacion paso 4: no hay texto visible con «una sola coordinación»');
  // b) retribucion, paso 4: 5 filas de flujo; la cautela visible en los pasos 1 a 4.
  await setProgress(p,rt*4+3.5);
  const f=await p.evaluate(()=>[...document.querySelectorAll('#stage [data-flow]')].map(e=>e.dataset.flow));
  ck(f.length===5,'retribucion paso 4: [data-flow] = '+f.length+' (se esperan 5)');
  ck(JSON.stringify([...f].sort())===JSON.stringify(['colocacion','complementos','especialistas','gerencia','renta']),'retribucion paso 4: valores de data-flow = '+JSON.stringify(f));
  for(let k=0;k<4;k++){await setProgress(p,rt*4+k+.5);ck((await visibleSemantic()).some(i=>i.text.includes(CAUTELA)),'retribucion paso '+(k+1)+': la cautela «'+CAUTELA+'» no está visible')}
  // c) Sin cifras en el texto de las escenas 2 y 4 (pasos 1–4): ni porcentajes, ni montos, ni plazos.
  for(const [name,idx] of [['participacion',pa],['retribucion',rt]])for(let k=0;k<4;k++){await setProgress(p,idx*4+k+.5);
    const all=await p.evaluate(()=>document.querySelector('#semantic-layer')?document.querySelector('#semantic-layer').textContent.replace(/\s+/g,' '):'');
    const m=all.match(FIGURES);ck(!m,name+' paso '+(k+1)+': el texto contiene una cifra prohibida «'+(m&&m[0])+'» (regex '+FIGURES+')');
    const vis=(await visibleSemantic()).map(i=>i.text).filter(t=>FIGURES.test(t));ck(!vis.length,name+' paso '+(k+1)+': texto visible con cifras: '+vis.slice(0,4).join(' | '))}
  // d) Solapamiento de textos (mismo criterio que SB07) en participacion y retribucion, pasos 1–4, más cajas de íconos y líneas.
  let shapesSeen=0;
  for(const [name,idx] of [['participacion',pa],['retribucion',rt]])for(let k=0;k<4;k++)for(const s of SAMPLES){const pos=idx*4+k+s;await setProgress(p,pos);
    const scan=await p.evaluate(scanTexts),shapes=await p.evaluate(scanShapes),where=name+' paso '+(k+1)+' (progreso '+pos+')';
    shapesSeen+=shapes.lines.length+shapes.icons.length;
    if(!scan.error)ck(scan.items.filter(i=>i.layer==='#semantic-layer').length>0,where+': no hay textos visibles en #semantic-layer');
    for(const m of overlapsIn(scan,where))problems.push('['+vp+'] '+m);
    for(const m of shapeProblems(scan.items||[],shapes,where))problems.push('['+vp+'] '+m);}
  if(process.env.SB07_DEBUG)console.error(vp,'SB08: líneas/íconos revisados:',shapesSeen);
  await setProgress(p,0);
}
// d) Versión cargada y e) red: se llama al final de cada viewport.
async function sb07Runtime(p,viewport,{requested,blocked}){
  const vp=viewport.width+'x'+viewport.height,ck=(ok,msg)=>{if(!ok)problems.push('['+vp+'] '+msg)};
  ck(diskStory.version===VERSION,'story.js en disco declara version '+diskStory.version+', se espera '+VERSION);
  const tag=await p.locator('.eyebrow .tag').innerText(),version=await p.evaluate(async v=>(await import('./story.js?v='+v)).story.version,VERSION);
  ck(tag.includes(VERSION),'la etiqueta de la lámina dice "'+tag+'", se espera '+VERSION);
  ck(version===VERSION,'story.js cargado en el navegador declara '+version+', se espera '+VERSION);
  const stale=[...new Set(requested.filter(u=>u.includes('/distrito-obregon/')&&!u.includes('/vendor/')&&/YOD-SB0[0-7]\b/.test(u)))];
  ck(!stale.length,'se pidieron módulos con versión anterior a '+VERSION+' (carga doble de módulos): '+stale.map(u=>u.replace(/^.*\/distrito-obregon\//,'')).join(', '));
  const mods=['app.js','drawings.js','story.js','access.js','meaning.js','territory.js','diagram-kit.js','network.js','flows.js'].filter(f=>!requested.some(u=>u.includes('/'+f+'?v=')&&u.includes(VERSION)&&!/YOD-SB0[0-7]\b/.test(u)));
  ck(!mods.length,'estos módulos no se pidieron con ?v=…'+VERSION+': '+mods.join(', '));
  // e) Ninguna llamada de red real: todo se sirve desde el repo o desde dobles; lo que no coincide se aborta y se registra en `blocked`.
  if(process.env.SB07_DEBUG)console.error(vp,'solicitudes abortadas:',[...new Set(blocked)]);
  const external=blocked.filter(l=>!/^\S+ https:\/\/yodesarrollomx\.github\.io\/(yodesarrollo-board|yod-portal|potenciales-yod)\//.test(l)&&!/^POST https:\/\/script\.google\.com\//.test(l));
  ck(!external.length,'solicitudes de red no previstas (teselas/Overpass/CDN…; deben ir empaquetadas): '+[...new Set(external)].slice(0,8).join(' | '));
}
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});let posts=[];const results=[];try{for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1365,height:900}]){const ctx=await browser.newContext({viewport,hasTouch:true}),p=await ctx.newPage();let authenticated=false,role='admin',email='owner@example.invalid',rows=[],errors=[],connection=true,canjes=0,blocked=[],requested=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requested.push(r.url()));await ctx.addInitScript(()=>{const original=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=async(algorithm,data)=>new TextDecoder().decode(data)==='owner@example.invalid'?Uint8Array.from('c27e8a6088a74a82ad2c14ef7ed0d2b4b69d80c4c7bb841c95822980a28c9bad'.match(/../g),h=>parseInt(h,16)).buffer:original(algorithm,data)});await ctx.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(['data:','blob:'].includes(u.protocol))return route.continue();if(u.pathname.endsWith('/yod-acceso.js'))return route.fulfill({contentType:'text/javascript',body:'window.YOD_PORTERO={original:"https://script.google.com/portero-mock"}'});if(u.pathname.endsWith('/portero.js'))return route.fulfill({contentType:'text/javascript',body:'window.YODPortero={entrar(){}}'});if(u.hostname==='script.google.com'){if(u.pathname==='/portero-mock'){canjes++;return route.fulfill({json:{ok:authenticated,token:'SYNTHETIC',rol:role,correo:email},headers:{'Access-Control-Allow-Origin':'*'}});}if(req.method()==='POST'){const data=JSON.parse(req.postData());if(data.accion==='presentaciones')return route.fulfill({json:{ok:false,error:'backend_not_ready'},headers:{'Access-Control-Allow-Origin':'*'}});posts.push(data);rows.push(data);return route.abort();}return route.fulfill({json:{produccion:rows,cache:false},headers:{'Access-Control-Allow-Origin':'*'}});}if(u.pathname==='/sala-edicion/presentation-reviews.json'){if(!connection)return route.abort();return route.fulfill({json:{contract:'sala-presentation-reviews-v1',privateProjection:true,receipt:'id-sha256'}});}if(u.pathname.startsWith('/yodesarrollo-board/')){let file=path.join(root,u.pathname.slice('/yodesarrollo-board/'.length));if(file.endsWith('/'))file+='index.html';if(fs.existsSync(file)){const ext=path.extname(file),type={'.js':'text/javascript','.mjs':'text/javascript','.webp':'image/webp','.css':'text/css','.html':'text/html','.png':'image/png','.woff2':'font/woff2'}[ext]||'application/octet-stream';return route.fulfill({contentType:type,body:fs.readFileSync(file)})}}blocked.push(req.method()+' '+req.url());return route.abort()});await p.goto(base);await p.locator('#stage svg').waitFor();assert.equal(await p.locator('#stages button').count(),10);assert.equal(await p.locator('#topics span').count(),6);await p.locator('#colorGuide').click();assert.equal(await p.locator('#colorCriteria article').count(),6);assert((await p.locator('#colorsDialog').innerText()).includes('función de la frase'));await p.locator('#colorsDialog [data-close]').click();assert.equal(await p.locator('#pin').isVisible(),false);await p.evaluate(()=>{sessionStorage.setItem('pyod_rol','admin')});await p.reload();assert.equal(await p.locator('#pin').isVisible(),false,'Cached role cannot grant access');await p.waitForFunction(()=>document.querySelector('#stage [data-object="nave"]'));await p.evaluate(()=>window.__nave=document.querySelector('[data-object="nave"]'));for(let n=0;n<10;n++){await p.locator('#stages button').nth(n).click();assert(await p.evaluate(()=>window.__nave===document.querySelector('[data-object="nave"]')),'Same object across scenes');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');}await p.locator('#progress').evaluate(e=>{e.value=39;e.dispatchEvent(new Event('input'))});assert.equal(await p.locator('#offerReview').isVisible(),true);assert((await p.locator('#narration').innerText()).includes('formalizar la asociación'));assert.equal(await p.locator('#semantic-layer [data-reveal="3"]').getAttribute('opacity'),'1');await p.locator('#rotor').focus();await p.keyboard.press('End');await p.waitForFunction(()=>Number(document.querySelector('#progress').value)>38.9);await p.keyboard.press('ArrowUp');await p.waitForFunction(()=>Number(document.querySelector('#progress').value)<38.5);await p.locator('#stages button').first().click();await sb07Scenes(p,viewport);await sb08Scenes(p,viewport);
if(viewport.width===390){authenticated=true;await p.evaluate(()=>localStorage.setItem('pyod_clave_v1','SYNTHETIC'));await p.reload();await p.locator('#pin').waitFor({state:'visible'});const beforeCanje=canjes;await p.evaluate(async v=>{const {access}=await import('./access.js?v='+v);await Promise.all(Array.from({length:12},()=>access.verify()))},VERSION);assert.equal(canjes-beforeCanje,1,'Concurrent saves/focus share one fresh verification');connection=false;await p.locator('#pin').click();await p.locator('#stage').click({position:{x:160,y:230}});await p.locator('.chn-txt').fill('SYNTHETIC REVIEW — PRIVATE');await p.locator('.chn-btn[data-ok]').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('sin conexión con Sala'));assert.equal(posts.length,0,'Disconnected note must stay in outbox');connection=true;await p.reload();try{await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Recibida en Sala'),null,{timeout:20000});}catch(e){console.log({toast:await p.locator('#toast').innerText(),posts:posts.length,errors,packet:await p.evaluate(async()=>{const q=indexedDB.open('yodChinche',1);const db=await new Promise(r=>q.onsuccess=()=>r(q.result));const read=(s)=>new Promise(r=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>r(q.result)});const ch=(await read('chinches'))[0],f=(await read('fotos'))[0];try{await YodPinDelivery.packet(ch,f?.full||f?.mini,{provider:'github',repository:'yodesarrollomx/yodesarrollo-board',path:'presentacion/distrito-obregon/'});return 'ok'}catch(e){return {error:e.message,photo:typeof f?.full,keys:Object.keys(f||{})}}})});throw e;}assert.equal(posts.length,1);assert.equal(await p.locator('dialog[open]').count(),0,'No navigation or blocking saved modal');const payload=JSON.parse(posts[0].detalle);assert.equal(payload.objeto.revision.comment,'SYNTHETIC REVIEW — PRIVATE');assert(payload.objeto.revision.capture.data.length>100);await p.reload();await p.locator('#reviews').waitFor({state:'visible'});await p.locator('#reviews').click();await p.locator('#reviewsDialog[open]').waitFor();assert((await p.locator('#reviewList').innerText()).includes('Recibida en Sala'));assert.equal(posts.length,1,'No duplicate after reload');await p.locator('#reviewsDialog [data-close]').click();role='viewer';await p.locator('#access').click();await p.locator('#pin').waitFor({state:'hidden'});assert.equal(await p.locator('#pin').isVisible(),false);assert.equal(await p.locator('#reviewList').innerText(),'');await p.locator('#accessDialog [data-close]').click();}
if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await p.locator('#stages button').nth(3).click();await p.screenshot({path:path.join(process.env.QA_DIR,viewport.width+'.png'),fullPage:true});}await sb07Runtime(p,viewport,{requested,blocked});assert.deepEqual(errors,[]);results.push({viewport,scenes:10,colors:6,persistentObjects:true,publicNoEdit:true});await ctx.close();}if(problems.length)throw new Error('SB07/SB08: '+problems.length+' aserciones fallaron:\n - '+problems.join('\n - '));console.log(JSON.stringify({status:'PASS',results,salaSyntheticPosts:posts.length}));}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
