const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base='https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/distrito-obregon/';

// ---- SB07 · mapa sobre traza OSM, diagrama de patrimonio y solapamiento de rótulos ----
// ---- SB08 · (#348) red de integrantes (participacion) y tabla de flujos (retribucion): ver sb08Scenes ----
// ---- SB09 · (#349) «Por qué un distrito» (complementos): cadena operación → necesidad → producto → filtro → ruta → siguiente paso: ver sb09Scenes ----
// ---- SB10 · (#350) escena «capital» como ecuación de aportaciones A/B, reveal inverso (data-until) y piel del proyecto: ver sb10Scenes ----
// Las fallas de estas aserciones se acumulan en `problems` y se reportan juntas al final (todos los viewports, con texto/escena/paso).
const VERSION='YOD-SB10',OVERLAP_PX=2,SAMPLES=[.5]/* t dentro del paso: la cámara ya llegó y la capa semántica está revelada */;
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
const STRUCK=/^Llenar el terreno de productos/,CAUTELA='Sin porcentajes ni tarifas acordados',FIGURES=/\d\s*%|\$\s*\d|MXN|USD|\d{2,}\s*(años|meses)/;
// Se ejecuta dentro de la página: líneas (line, [data-link]) y cajas de íconos ([data-icon]) visibles de #semantic-layer, en pantalla.
// Las líneas se muestrean punto a punto (getPointAtLength) para detectar cruces con cajas de texto aunque sean diagonales o curvas.
function scanShapes(){
  const svg=document.querySelector('#stage svg'),layer=svg&&svg.querySelector('#semantic-layer');if(!layer)return {lines:[],icons:[]};
  const visible=el=>{let op=1;for(let n=el;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return false;op*=Number(cs.opacity);if(n===svg)break}return op>.5};
  const lines=[],icons=[];
  for(const el of layer.querySelectorAll('line,[data-link],[data-strike]')){
    if(!visible(el)||typeof el.getTotalLength!=='function')continue;
    const m=el.getScreenCTM(),len=el.getTotalLength(),pts=[];if(!m||!len)continue;
    for(let d=0;d<=len;d+=Math.max(1,len/200)){const q=el.getPointAtLength(d);pts.push([m.a*q.x+m.c*q.y+m.e,m.b*q.x+m.d*q.y+m.f])}
    lines.push({layer:'#semantic-layer',strike:el.hasAttribute('data-strike'),text:'línea '+(el.hasAttribute('data-strike')?'tachado':(el.dataset.link||el.id||el.tagName.toLowerCase())),pts,dashed:!!(el.getAttribute('stroke-dasharray')||getComputedStyle(el).strokeDasharray!=='none')});
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
    if(ln.strike&&STRUCK.test(t.text))continue;// el tachado de «Llenar el terreno de productos» atraviesa su propio texto a propósito
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
// ---- SB09 ------------------------------------------------------------------------------------------------------------------------
const FIGURES9=/\d+\s*%|\$\s*\d|MXN|USD/;
// Aserciones SB09 (#349), escena «complementos» (índice 5). No lanzan: acumulan en `problems`.
async function sb09Scenes(p,viewport){
  const vp=viewport.width+'x'+viewport.height,ck=(ok,msg)=>{if(!ok)problems.push('['+vp+'] '+msg)},phone=viewport.width<=650;
  const co=sceneIndex('complementos');assert.equal(co,5,'complementos debe ser la escena de índice 5');
  const opacity=sel=>p.evaluate(s=>[...document.querySelectorAll(s)].map(e=>{let op=1;for(let n=e;n&&n.nodeType===1;n=n.parentNode){op*=Number(getComputedStyle(n).opacity);if(n.tagName==='svg')break}return op}),sel);
  const objectOpacity=ids=>p.evaluate(a=>Object.fromEntries(a.map(id=>{const e=document.querySelector('[data-object="'+id+'"]');return [id,e?Number(getComputedStyle(e).opacity):null]})),ids);
  // a) Paso 4: cinco necesidades, cinco productos, filtro, ruta y siguiente paso; un solo texto «Siguiente paso».
  await setProgress(p,co*4+3.5);
  const c=await p.evaluate(()=>{const q=s=>document.querySelectorAll('#semantic-layer '+s);const txt=document.querySelector('#semantic-layer').textContent.replace(/\s+/g,' ');
    return {need:[...q('[data-need]')].map(e=>e.dataset.need),product:[...q('[data-product]')].map(e=>e.dataset.product),gate:q('[data-gate]').length,route:q('[data-route]').length,next:q('[data-next]').length,siguiente:(txt.match(/Siguiente paso/g)||[]).length}});
  ck(c.need.length===5&&new Set(c.need).size===5,'complementos paso 4: [data-need] = '+JSON.stringify(c.need)+' (se esperan 5 distintos)');
  ck(c.product.length===5&&new Set(c.product).size===5,'complementos paso 4: [data-product] = '+JSON.stringify(c.product)+' (se esperan 5 distintos)');
  ck(c.gate>=1,'complementos paso 4: falta [data-gate]');ck(c.route>=1,'complementos paso 4: falta [data-route]');ck(c.next>=1,'complementos paso 4: falta [data-next]');
  ck(c.siguiente===1,'complementos paso 4: el texto «Siguiente paso» aparece '+c.siguiente+' veces (se espera 1)');
  const vis=((await p.evaluate(scanTexts)).items||[]).filter(i=>i.layer==='#semantic-layer');
  ck(vis.filter(i=>/Siguiente paso/.test(i.text)).length===1,'complementos paso 4: debe haber exactamente un texto visible «Siguiente paso»');
  // b) Paso 1 (progreso 20.0): los productos existen pero aún no se ven (opacidad efectiva < .1).
  for(const pos of [co*4]){await setProgress(p,pos);const ops=await opacity('#semantic-layer [data-product]');
    ck(ops.length===5,'complementos paso 1 (progreso '+pos+'): [data-product] = '+ops.length+' (se esperan 5)');
    ck(ops.every(o=>o<.1),'complementos paso 1 (progreso '+pos+'): los productos ya se ven; opacidades '+JSON.stringify(ops.map(o=>Math.round(o*100)/100))+' (se espera < .1)')}
  // c) Sin cifras de dinero ni porcentajes en la escena (pasos 1–4); la única cifra es «250 a 500 m²» y la superficie del terreno no aparece.
  for(let k=0;k<4;k++){await setProgress(p,co*4+k+.5);
    const all=await p.evaluate(()=>document.querySelector('#semantic-layer')?document.querySelector('#semantic-layer').textContent.replace(/\s+/g,' '):'');
    const m=all.match(FIGURES9);ck(!m,'complementos paso '+(k+1)+': el texto contiene una cifra prohibida «'+(m&&m[0])+'» (regex '+FIGURES9+')');
    ck(!all.includes('24.7584'),'complementos paso '+(k+1)+': aparece la superficie del terreno (24.7584)')}
  // d) Figuras Hairline persistentes: la nave desde el paso 1; plaza y office al llegar el paso 2; hotel, club y pocket al llegar el paso 3. En teléfono se ocultan.
  const check=async(pos,ids,label)=>{await setProgress(p,pos);const o=await objectOpacity(ids);
    for(const [id,v] of Object.entries(o)){if(phone&&id!=='nave')ck(v!==null&&v<.1,'complementos (progreso '+pos+'): en teléfono la figura "'+id+'" debe estar oculta; opacidad '+v);
      else ck(v!==null&&v>=.95,'complementos (progreso '+pos+', '+label+'): el objeto "'+id+'" tiene opacidad '+v+' (se espera ≥ .95)')}};
  await check(co*4,['nave'],'nave');await check(co*4+.6,['nave'],'nave');
  await check(co*4+1,['nave','plaza','office'],'plaza y oficinas');
  await check(co*4+2,['nave','hotel','club','pocket'],'hotel, club y bodegas pocket');
  // e) Solapamiento de textos, íconos y líneas, pasos 1–4 (el tachado de «Llenar el terreno de productos» se ignora contra su propio texto).
  for(let k=0;k<4;k++)for(const s of SAMPLES){const pos=co*4+k+s;await setProgress(p,pos);
    const scan=await p.evaluate(scanTexts),shapes=await p.evaluate(scanShapes),where='complementos paso '+(k+1)+' (progreso '+pos+')';
    if(!scan.error)ck(scan.items.filter(i=>i.layer==='#semantic-layer').length>0,where+': no hay textos visibles en #semantic-layer');
    ck(shapes.icons.length>0,where+': no hay íconos visibles');
    for(const m of overlapsIn(scan,where))problems.push('['+vp+'] '+m);
    for(const m of shapeProblems(scan.items||[],shapes,where))problems.push('['+vp+'] '+m);}
  await setProgress(p,0);
}
// ---- SB10 ------------------------------------------------------------------------------------------------------------------------
const FIGURES10=/\d\s*%|\$\s*\d|MXN|USD|50\/50/,SKIN_NAVY='rgb(5, 37, 67)',SKIN_COPPER='rgb(155, 96, 54)',INK_RGB='rgb(37, 62, 59)',SIL_RGB='rgb(40, 67, 63)',UNTIL_AT=25.2;
// Aserciones SB10 (#350), escena «capital» (índice 6) y piel del proyecto. No lanzan: acumulan en `problems`.
async function sb10Scenes(p,viewport){
  const vp=viewport.width+'x'+viewport.height,ck=(ok,msg)=>{if(!ok)problems.push('['+vp+'] '+msg)},phone=viewport.width<=650,round=n=>Math.round(n*100)/100;
  const cp=sceneIndex('capital');assert.equal(cp,6,'capital debe ser la escena de índice 6');
  const landNow=()=>p.evaluate(()=>{const e=document.querySelector('[data-object="land"]'),m=e&&/translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/.exec(e.getAttribute('transform')||'');return m?{x:+m[1],y:+m[2],s:+m[3],op:Number(getComputedStyle(e).opacity)}:null});
  // a) El terreno persistente es el héroe durante el paso 1 (24.0, 24.6 y 24.8), viaja al empezar el paso 2 y está en la fila A en 25.5; es el mismo nodo todo el tiempo.
  await setProgress(p,cp*4);await p.evaluate(()=>{window.__landSb10=document.querySelector('[data-object="land"]')});
  const rowA=phone?{x:50,y:250,s:.26}:{x:150,y:300,s:.38};
  for(const pos of [cp*4,cp*4+.6,cp*4+.8]){await setProgress(p,pos);const l=await landNow();
    ck(!!l,'capital (progreso '+round(pos)+'): no se pudo leer la transformación de [data-object="land"]');if(!l)continue;
    ck(l.op>=.95,'capital (progreso '+round(pos)+'): el terreno tiene opacidad '+round(l.op)+' (se espera ≥ .95)');
    ck(l.s>=(phone?.9:1.5),'capital (progreso '+round(pos)+'): el terreno tiene escala '+round(l.s)+' (se espera ≥ '+(phone?.9:1.5)+' como héroe)')}
  await setProgress(p,cp*4+1.5);
  {const l=await landNow();
   ck(!!l,'capital (progreso 25.5): no se pudo leer la transformación de [data-object="land"]');
   if(l){ck(l.op>=.95,'capital (progreso 25.5): el terreno tiene opacidad '+round(l.op)+' (se espera ≥ .95)');
    ck(Math.abs(l.x-rowA.x)<=4&&Math.abs(l.y-rowA.y)<=4,'capital (progreso 25.5): el terreno está en ('+round(l.x)+', '+round(l.y)+'), se espera la fila A ('+rowA.x+', '+rowA.y+') ± 4');
    ck(Math.abs(l.s-rowA.s)<=.05,'capital (progreso 25.5): el terreno tiene escala '+round(l.s)+', se espera '+rowA.s+' ± .05')}}
  ck(await p.evaluate(()=>window.__landSb10===document.querySelector('[data-object="land"]')),'capital: el objeto "land" dejó de ser el mismo nodo del DOM');
  // a2) La fila A (suelo, trabajo, capital y modelo) ya se ve completa en 25.5.
  {const ops=await p.evaluate(()=>[...document.querySelectorAll('#semantic-layer [data-row="A"],#semantic-layer [data-row="A"] [data-gives]')].map(e=>{let op=1;for(let n=e;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'){op=0;break}op*=Number(cs.opacity);if(n.tagName==='svg')break}return op}));
   ck(ops.length>0&&ops.every(o=>o>=.95),'capital (progreso 25.5): la fila A no se ve completa; opacidades '+JSON.stringify(ops.map(round))+' (se espera ≥ .95)')}
  // a3) Mientras el terreno viaja (desktop), no tapa ningún texto visible (opacidad efectiva > .5) de la lámina.
  if(!phone)for(const pos of [cp*4+.8,cp*4+1,cp*4+1.2,cp*4+1.5]){await setProgress(p,pos);
    const r=await p.evaluate(()=>{const e=document.querySelector('[data-object="land"]').getBoundingClientRect();return {l:e.left,t:e.top,r:e.right,b:e.bottom}}),scan=await p.evaluate(scanTexts);
    for(const i of scan.items||[]){if(i.pin)continue;const ox=Math.min(r.r,i.r)-Math.max(r.l,i.l),oy=Math.min(r.b,i.b)-Math.max(r.t,i.t);
      if(ox>OVERLAP_PX&&oy>OVERLAP_PX)ck(false,'capital (progreso '+round(pos)+'): el terreno (x '+Math.round(r.l)+'–'+Math.round(r.r)+', y '+Math.round(r.t)+'–'+Math.round(r.b)+') se encima con '+fmt(i)+' (traslape '+Math.round(ox*10)/10+' × '+Math.round(oy*10)/10+' px)')}}
  // a4) Al llegar a la fila A (25.2, 25.35 y 25.5; desktop y teléfono) el terreno no tapa ningún texto, ni siquiera apenas visible (opacidad efectiva > .05).
  for(const pos of [cp*4+1.2,cp*4+1.35,cp*4+1.5]){await setProgress(p,pos);
    const q=await p.evaluate(()=>{const svg=document.querySelector('#stage svg'),e=document.querySelector('[data-object="land"]').getBoundingClientRect(),out=[];
      for(const sel of ['#semantic-layer','#scene-labels','#territory']){const layer=svg.querySelector(sel);if(!layer)continue;
        for(const t of layer.querySelectorAll('text')){const text=t.textContent.replace(/\s+/g,' ').trim();if(!text)continue;let op=1;
          for(let n=t;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'){op=0;break}op*=Number(cs.opacity);if(n===svg)break}
          if(!(op>.05))continue;const r=t.getBoundingClientRect();if(!r.width||!r.height)continue;
          out.push({text,op:Math.round(op*100)/100,l:r.left,t:r.top,r:r.right,b:r.bottom})}}
      return {land:{l:e.left,t:e.top,r:e.right,b:e.bottom},items:out}});
    for(const i of q.items){const ox=Math.min(q.land.r,i.r)-Math.max(q.land.l,i.l),oy=Math.min(q.land.b,i.b)-Math.max(q.land.t,i.t);
      if(ox>OVERLAP_PX&&oy>OVERLAP_PX)ck(false,'capital (progreso '+round(pos)+'): el terreno (x '+Math.round(q.land.l)+'–'+Math.round(q.land.r)+', y '+Math.round(q.land.t)+'–'+Math.round(q.land.b)+') tapa «'+i.text+'» (opacidad '+i.op+', x '+Math.round(i.l)+'–'+Math.round(i.r)+', y '+Math.round(i.t)+'–'+Math.round(i.b)+'; traslape '+Math.round(ox*10)/10+' × '+Math.round(oy*10)/10+' px)')}}
  // b) Paso 4: filas A y B, cuatro aportaciones por fila, qué recibe cada parte, fórmula y una sola frase en el color de acción.
  await setProgress(p,cp*4+3.5);
  const c=await p.evaluate(()=>{const L=document.querySelector('#semantic-layer'),eff=e=>{let op=1;for(let n=e;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return 0;op*=Number(cs.opacity);if(n.tagName==='svg')break}return op};
    const rowOf=e=>{const r=e.closest('[data-row]');if(r)return r.dataset.row;/* «recibe» puede ir junto a la fila (hermano posterior en el mismo grupo de revelado) */for(let n=e.previousElementSibling;n;n=n.previousElementSibling)if(n.dataset&&n.dataset.row)return n.dataset.row;return null},all=a=>[...L.querySelectorAll(a)];
    const per=(attr,row)=>all('['+attr+']').filter(e=>rowOf(e)===row).map(e=>e.getAttribute(attr)).sort();
    return {rowA:all('[data-row="A"]').length,rowB:all('[data-row="B"]').length,gives:all('[data-gives]').length,receives:all('[data-receives]').length,
      givesA:per('data-gives','A'),givesB:per('data-gives','B'),recA:per('data-receives','A'),recB:per('data-receives','B'),
      hidden:all('[data-gives],[data-receives],[data-formula]').filter(e=>!(eff(e)>.5)).map(e=>(e.dataset.gives?'gives='+e.dataset.gives:e.dataset.receives?'receives='+e.dataset.receives:'formula')+(rowOf(e)?'@'+rowOf(e):'')),
      formula:all('[data-formula]').length,action:all('text').filter(e=>e.textContent.trim()&&getComputedStyle(e).fill==='rgb(81, 122, 67)'&&eff(e)>.5).map(e=>e.textContent.replace(/\s+/g,' ').trim())}});
  ck(c.rowA>=1&&c.rowB>=1,'capital paso 4: faltan [data-row="A"] ('+c.rowA+') o [data-row="B"] ('+c.rowB+')');
  ck(c.gives===8,'capital paso 4: [data-gives] = '+c.gives+' (se esperan 8: 4 por fila)');
  const GIVES=JSON.stringify(['capital','modelo','suelo','trabajo']),REC=JSON.stringify(['equipo','ustedes']);
  for(const [r,g] of [['A',c.givesA],['B',c.givesB]])ck(JSON.stringify(g)===GIVES,'capital paso 4: la fila '+r+' tiene data-gives = '+JSON.stringify(g)+' (se espera suelo, trabajo, capital y modelo)');
  ck(c.receives===4,'capital paso 4: [data-receives] = '+c.receives+' (se esperan 4: 2 por fila)');
  for(const [r,g] of [['A',c.recA],['B',c.recB]])ck(JSON.stringify(g)===REC,'capital paso 4: la fila '+r+' tiene data-receives = '+JSON.stringify(g)+' (se espera ustedes y equipo)');
  ck(c.formula>=1,'capital paso 4: falta [data-formula]');
  ck(!c.hidden.length,'capital paso 4: hay aportaciones, "recibe" o fórmula sin verse (opacidad efectiva ≤ .5): '+c.hidden.join(', '));
  ck(c.action.length===1,'capital paso 4: hay '+c.action.length+' textos visibles en el color de acción #517a43 (se espera 1): '+JSON.stringify(c.action));
  // c) data-until: lo del paso 1 existe, se ve completo (≥ .95) en 24.0, 24.4 y 24.8 y desde 25.2 ya no se ve (opacidad efectiva < .1).
  const untilState=()=>p.evaluate(()=>[...document.querySelectorAll('#semantic-layer [data-until]')].map(e=>{let op=1;for(let n=e;n&&n.nodeType===1;n=n.parentNode){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'){op=0;break}op*=Number(cs.opacity);if(n.tagName==='svg')break}return op}));
  for(const pos of [cp*4,cp*4+.4,cp*4+.8]){await setProgress(p,pos);const ops=await untilState();
    ck(ops.length>0,'capital (progreso '+round(pos)+'): no hay elementos con data-until (los rótulos del paso 1 deben desvanecerse)');
    ck(ops.every(o=>o>=.95),'capital (progreso '+round(pos)+'): hay elementos con data-until que no se ven completos; opacidades '+JSON.stringify(ops.map(round))+' (se espera ≥ .95)')}
  for(const pos of [UNTIL_AT,cp*4+1.5,cp*4+3.5]){await setProgress(p,pos);const ops=await untilState();
    ck(ops.every(o=>o<.1),'capital (progreso '+round(pos)+'): lo marcado con data-until sigue visible; opacidades '+JSON.stringify(ops.map(round))+' (se espera < .1 desde 25.2)')}
  // d) Sin porcentajes, montos ni «50/50» en la escena (pasos 1–4).
  for(let k=0;k<4;k++){await setProgress(p,cp*4+k+.5);
    const all=await p.evaluate(()=>document.querySelector('#semantic-layer')?document.querySelector('#semantic-layer').textContent.replace(/\s+/g,' '):'');
    const m=all.match(FIGURES10);ck(!m,'capital paso '+(k+1)+': el texto contiene una cifra prohibida «'+(m&&m[0])+'» (regex '+FIGURES10+')');
    ck(all.trim().length>0,'capital paso '+(k+1)+': #semantic-layer sin texto')}
  // e) Solapamiento de textos, íconos y líneas, pasos 1–4.
  // En el paso 1 el rótulo se ve completo antes de desvanecerse (data-until), así que se muestrea al inicio del paso además de a mitad.
  for(let k=0;k<4;k++)for(const s of (k===0?[.2,...SAMPLES]:SAMPLES)){const pos=cp*4+k+s;await setProgress(p,pos);
    const scan=await p.evaluate(scanTexts),shapes=await p.evaluate(scanShapes),where='capital paso '+(k+1)+' (progreso '+pos+')';
    if(!scan.error)ck(scan.items.filter(i=>i.layer==='#semantic-layer').length>0,where+': no hay textos visibles en #semantic-layer');
    if(!(k===0&&s>=.5))ck(shapes.icons.length>0,where+': no hay íconos visibles ([data-icon])');
    for(const m of overlapsIn(scan,where))problems.push('['+vp+'] '+m);
    for(const m of shapeProblems(scan.items||[],shapes,where))problems.push('['+vp+'] '+m);}
  // f) Piel del proyecto: con body.skin-obregon el título de escena es navy; sin la clase vuelve a la tinta anterior sin residuos.
  await setProgress(p,cp*4+.5);
  const probe=()=>p.evaluate(()=>{const cs=(e,k)=>e?getComputedStyle(e)[k]:null,q=s=>document.querySelector(s),h=[...document.querySelectorAll('#scene-heading text')],titles=h.filter(e=>e.getAttribute('fill')==='#253e3b');
    return {skin:document.body.classList.contains('skin-obregon'),titles:titles.map(e=>getComputedStyle(e).fill),nTitles:titles.length,label:cs(h[0],'fill'),sil:cs(q('#stage .sil'),'stroke'),project:cs(q('.project'),'color'),projectSpan:cs(q('.project span'),'color'),header:cs(q('header'),'borderBottomColor'),
      stageTop:cs(q('#stage'),'borderTopWidth')==='0px'||cs(q('#stage'),'borderTopStyle')==='none'?'none':cs(q('#stage'),'borderTopColor'),accent:cs(q('.track input'),'accentColor'),active:cs(q('#stages button.active'),'color'),
      customProp:getComputedStyle(document.body).getPropertyValue('--skin-navy').trim(),inline:document.querySelectorAll('[style*="skin"]').length,bodyStyle:document.body.getAttribute('style'),palette:document.querySelectorAll('#topics span').length}});
  const on=await probe();
  ck(on.skin,'piel: el <body> no lleva la clase skin-obregon');
  ck(on.nTitles>0&&on.titles.every(f=>f===SKIN_NAVY),'piel: con skin-obregon el fill computado del título de escena es '+JSON.stringify(on.titles)+' (se espera '+SKIN_NAVY+')');
  ck(on.sil===SKIN_NAVY,'piel: con skin-obregon el trazo de .sil es '+on.sil+' (se espera '+SKIN_NAVY+')');
  ck(on.project===SKIN_NAVY&&on.projectSpan===SKIN_COPPER,'piel: el encabezado del proyecto es '+on.project+' / '+on.projectSpan+' (se espera navy / cobre)');
  ck(on.label!==SKIN_NAVY&&on.label!==SKIN_COPPER,'piel: la etiqueta de función de la escena (color con función) quedó teñida por la piel: '+on.label);
  ck(on.palette===6,'piel: la paleta de funciones tiene '+on.palette+' colores (se esperan 6)');
  await p.evaluate(()=>document.body.classList.remove('skin-obregon'));
  try{
    const off=await probe();
    ck(!off.skin,'piel: la clase skin-obregon no se pudo quitar del <body>');
    ck(off.nTitles===on.nTitles&&off.titles.every(f=>f===INK_RGB),'piel: sin skin-obregon el fill computado del título es '+JSON.stringify(off.titles)+' (se espera '+INK_RGB+')');
    ck(off.sil===SIL_RGB,'piel: sin skin-obregon el trazo de .sil es '+off.sil+' (se espera '+SIL_RGB+')');
    for(const k of ['project','projectSpan','header','stageTop','accent','active'])ck(off[k]!==SKIN_NAVY&&off[k]!==SKIN_COPPER,'piel: sin skin-obregon queda un residuo de la piel en '+k+': '+off[k]);
    ck(off.customProp==='','piel: sin skin-obregon sigue definida --skin-navy ('+off.customProp+')');
    ck(off.inline===0&&off.bodyStyle===on.bodyStyle,'piel: quedaron estilos en línea de la piel ('+off.inline+' elementos; style del body '+JSON.stringify(off.bodyStyle)+')');
    ck(off.palette===6,'piel: sin skin-obregon la paleta tiene '+off.palette+' colores (se esperan 6)');
  }finally{await p.evaluate(()=>document.body.classList.add('skin-obregon'))}
  const back=await probe();
  ck(JSON.stringify(back)===JSON.stringify(on),'piel: al volver a poner la clase el estado no se restaura: '+JSON.stringify(back)+' ≠ '+JSON.stringify(on));
  await setProgress(p,0);
}
// d) Versión cargada y e) red: se llama al final de cada viewport.
async function sb07Runtime(p,viewport,{requested,blocked}){
  const vp=viewport.width+'x'+viewport.height,ck=(ok,msg)=>{if(!ok)problems.push('['+vp+'] '+msg)};
  ck(diskStory.version===VERSION,'story.js en disco declara version '+diskStory.version+', se espera '+VERSION);
  const tag=await p.locator('.eyebrow .tag').innerText(),version=await p.evaluate(async v=>(await import('./story.js?v='+v)).story.version,VERSION);
  ck(tag.includes(VERSION),'la etiqueta de la lámina dice "'+tag+'", se espera '+VERSION);
  ck(version===VERSION,'story.js cargado en el navegador declara '+version+', se espera '+VERSION);
  const stale=[...new Set(requested.filter(u=>u.includes('/distrito-obregon/')&&!u.includes('/vendor/')&&/YOD-SB0[0-9]\b/.test(u)))];
  ck(!stale.length,'se pidieron módulos con versión anterior a '+VERSION+' (carga doble de módulos): '+stale.map(u=>u.replace(/^.*\/distrito-obregon\//,'')).join(', '));
  const mods=['app.js','drawings.js','story.js','access.js','meaning.js','territory.js','diagram-kit.js','network.js','flows.js','districts.js','icons.js','capital.js'].filter(f=>!requested.some(u=>u.includes('/'+f+'?v=')&&u.includes(VERSION)&&!/YOD-SB0[0-9]\b/.test(u)));
  ck(!mods.length,'estos módulos no se pidieron con ?v=…'+VERSION+': '+mods.join(', '));
  // e) Ninguna llamada de red real: todo se sirve desde el repo o desde dobles; lo que no coincide se aborta y se registra en `blocked`.
  if(process.env.SB07_DEBUG)console.error(vp,'solicitudes abortadas:',[...new Set(blocked)]);
  const external=blocked.filter(l=>!/^\S+ https:\/\/yodesarrollomx\.github\.io\/(yodesarrollo-board|yod-portal|potenciales-yod)\//.test(l)&&!/^POST https:\/\/script\.google\.com\//.test(l));
  ck(!external.length,'solicitudes de red no previstas (teselas/Overpass/CDN…; deben ir empaquetadas): '+[...new Set(external)].slice(0,8).join(' | '));
}
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});let posts=[];const results=[];try{for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1365,height:900}]){const ctx=await browser.newContext({viewport,hasTouch:true}),p=await ctx.newPage();let authenticated=false,role='admin',email='owner@example.invalid',rows=[],errors=[],connection=true,canjes=0,blocked=[],requested=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requested.push(r.url()));await ctx.addInitScript(()=>{const original=crypto.subtle.digest.bind(crypto.subtle);crypto.subtle.digest=async(algorithm,data)=>new TextDecoder().decode(data)==='owner@example.invalid'?Uint8Array.from('c27e8a6088a74a82ad2c14ef7ed0d2b4b69d80c4c7bb841c95822980a28c9bad'.match(/../g),h=>parseInt(h,16)).buffer:original(algorithm,data)});await ctx.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(['data:','blob:'].includes(u.protocol))return route.continue();if(u.pathname.endsWith('/yod-acceso.js'))return route.fulfill({contentType:'text/javascript',body:'window.YOD_PORTERO={original:"https://script.google.com/portero-mock"}'});if(u.pathname.endsWith('/portero.js'))return route.fulfill({contentType:'text/javascript',body:'window.YODPortero={entrar(){}}'});if(u.hostname==='script.google.com'){if(u.pathname==='/portero-mock'){canjes++;return route.fulfill({json:{ok:authenticated,token:'SYNTHETIC',rol:role,correo:email},headers:{'Access-Control-Allow-Origin':'*'}});}if(req.method()==='POST'){const data=JSON.parse(req.postData());if(data.accion==='presentaciones')return route.fulfill({json:{ok:false,error:'backend_not_ready'},headers:{'Access-Control-Allow-Origin':'*'}});posts.push(data);rows.push(data);return route.abort();}return route.fulfill({json:{produccion:rows,cache:false},headers:{'Access-Control-Allow-Origin':'*'}});}if(u.pathname==='/sala-edicion/presentation-reviews.json'){if(!connection)return route.abort();return route.fulfill({json:{contract:'sala-presentation-reviews-v1',privateProjection:true,receipt:'id-sha256'}});}if(u.pathname.startsWith('/yodesarrollo-board/')){let file=path.join(root,u.pathname.slice('/yodesarrollo-board/'.length));if(file.endsWith('/'))file+='index.html';if(fs.existsSync(file)){const ext=path.extname(file),type={'.js':'text/javascript','.mjs':'text/javascript','.webp':'image/webp','.css':'text/css','.html':'text/html','.png':'image/png','.woff2':'font/woff2'}[ext]||'application/octet-stream';return route.fulfill({contentType:type,body:fs.readFileSync(file)})}}blocked.push(req.method()+' '+req.url());return route.abort()});await p.goto(base);await p.locator('#stage svg').waitFor();assert.equal(await p.locator('#stages button').count(),10);assert.equal(await p.locator('#topics span').count(),6);await p.locator('#colorGuide').click();assert.equal(await p.locator('#colorCriteria article').count(),6);assert((await p.locator('#colorsDialog').innerText()).includes('función de la frase'));await p.locator('#colorsDialog [data-close]').click();assert.equal(await p.locator('#pin').isVisible(),false);await p.evaluate(()=>{sessionStorage.setItem('pyod_rol','admin')});await p.reload();assert.equal(await p.locator('#pin').isVisible(),false,'Cached role cannot grant access');await p.waitForFunction(()=>document.querySelector('#stage [data-object="nave"]'));await p.evaluate(()=>window.__nave=document.querySelector('[data-object="nave"]'));for(let n=0;n<10;n++){await p.locator('#stages button').nth(n).click();assert(await p.evaluate(()=>window.__nave===document.querySelector('[data-object="nave"]')),'Same object across scenes');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow');}await p.locator('#progress').evaluate(e=>{e.value=39;e.dispatchEvent(new Event('input'))});assert.equal(await p.locator('#offerReview').isVisible(),true);assert((await p.locator('#narration').innerText()).includes('formalizar la asociación'));assert.equal(await p.locator('#semantic-layer [data-reveal="3"]').getAttribute('opacity'),'1');await p.locator('#rotor').focus();await p.keyboard.press('End');await p.waitForFunction(()=>Number(document.querySelector('#progress').value)>38.9);await p.keyboard.press('ArrowUp');await p.waitForFunction(()=>Number(document.querySelector('#progress').value)<38.5);await p.locator('#stages button').first().click();await sb07Scenes(p,viewport);await sb08Scenes(p,viewport);await sb09Scenes(p,viewport);await sb10Scenes(p,viewport);
if(viewport.width===390){authenticated=true;await p.evaluate(()=>localStorage.setItem('pyod_clave_v1','SYNTHETIC'));await p.reload();await p.locator('#pin').waitFor({state:'visible'});const beforeCanje=canjes;await p.evaluate(async v=>{const {access}=await import('./access.js?v='+v);await Promise.all(Array.from({length:12},()=>access.verify()))},VERSION);assert.equal(canjes-beforeCanje,1,'Concurrent saves/focus share one fresh verification');connection=false;await p.locator('#pin').click();await p.locator('#stage').click({position:{x:160,y:230}});await p.locator('.chn-txt').fill('SYNTHETIC REVIEW — PRIVATE');await p.locator('.chn-btn[data-ok]').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('sin conexión con Sala'));assert.equal(posts.length,0,'Disconnected note must stay in outbox');connection=true;await p.reload();try{await p.waitForFunction(()=>document.querySelector('#toast').textContent.startsWith('Recibida en Sala'),null,{timeout:20000});}catch(e){console.log({toast:await p.locator('#toast').innerText(),posts:posts.length,errors,packet:await p.evaluate(async()=>{const q=indexedDB.open('yodChinche',1);const db=await new Promise(r=>q.onsuccess=()=>r(q.result));const read=(s)=>new Promise(r=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>r(q.result)});const ch=(await read('chinches'))[0],f=(await read('fotos'))[0];try{await YodPinDelivery.packet(ch,f?.full||f?.mini,{provider:'github',repository:'yodesarrollomx/yodesarrollo-board',path:'presentacion/distrito-obregon/'});return 'ok'}catch(e){return {error:e.message,photo:typeof f?.full,keys:Object.keys(f||{})}}})});throw e;}assert.equal(posts.length,1);assert.equal(await p.locator('dialog[open]').count(),0,'No navigation or blocking saved modal');const payload=JSON.parse(posts[0].detalle);assert.equal(payload.objeto.revision.comment,'SYNTHETIC REVIEW — PRIVATE');assert(payload.objeto.revision.capture.data.length>100);await p.reload();await p.locator('#reviews').waitFor({state:'visible'});await p.locator('#reviews').click();await p.locator('#reviewsDialog[open]').waitFor();assert((await p.locator('#reviewList').innerText()).includes('Recibida en Sala'));assert.equal(posts.length,1,'No duplicate after reload');await p.locator('#reviewsDialog [data-close]').click();role='viewer';await p.locator('#access').click();await p.locator('#pin').waitFor({state:'hidden'});assert.equal(await p.locator('#pin').isVisible(),false);assert.equal(await p.locator('#reviewList').innerText(),'');await p.locator('#accessDialog [data-close]').click();}
if(process.env.QA_DIR){fs.mkdirSync(process.env.QA_DIR,{recursive:true});await p.locator('#stages button').nth(3).click();await p.screenshot({path:path.join(process.env.QA_DIR,viewport.width+'.png'),fullPage:true});}await sb07Runtime(p,viewport,{requested,blocked});assert.deepEqual(errors,[]);results.push({viewport,scenes:10,colors:6,persistentObjects:true,publicNoEdit:true});await ctx.close();}if(problems.length)throw new Error('SB07/SB08/SB09/SB10: '+problems.length+' aserciones fallaron:\n - '+problems.join('\n - '));console.log(JSON.stringify({status:'PASS',results,salaSyntheticPosts:posts.length}));}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
