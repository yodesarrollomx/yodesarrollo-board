'use strict';
// Presentación desde el grafo: contrato del compilador y del aviso discreto. Sin red y sin datos reales.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const S=require('../presentacion/storyboard-core.js'),C=require('../presentacion/grafo/compilar.js'),A=require('../presentacion/grafo-aviso.js');
const G=require('./fixtures/grafo-aprobado.json'),R=G.datos.recetas,PPP=G.datos.ppp,root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const MOTORES=['mixto','macrolotes','unifamiliar','residencial','patrimonial'];
const caso=()=>({caso_id:'CASO-SINTETICO',nombre_caso:'Caso sintético',version:7,ts_actualizado:'2026-11-10T18:00:00Z',escenarios_json:JSON.stringify([{id:'a',nombre:'Base',activo:true},{id:'b',nombre:'Alta'}]),
  inTerreno:2500,inEquity:18000000,resumen:{ventas:182500000,costo_proyecto:141300000,utilidad:41200000,margen_pct:22.6,unidades:64,pisos:8,vendible_viv_m2:4480,meses_totales:38}});
const armar=(o={})=>S.normalize(C.compilar({recetas:R,audiencia:'cliente',tipo:'mixto',caso:caso(),...o}));

test('la copia de prueba es un grafo aprobado con recetas para tres audiencias y los cinco tipos de plan',()=>{
  assert.equal(G.versiones.aprobado,G.datos.id);assert.match(G.datos.id,/^G-[0-9]{8}-[0-9]{4}$/);assert.equal(R.esquema,1);
  assert.deepEqual(R.audiencias.map(a=>a.id),['cliente','dueno','producto']);
  assert.deepEqual(Object.values(R.tipos).map(t=>t.motor).sort(),[...MOTORES].sort());
});

test('cada audiencia, tipo de plan y extensión arma un guion válido para el motor de guiones',()=>{
  let n=0;
  for(const a of R.audiencias)for(const motor of MOTORES)for(const breve of [false,true]){
    const s=armar({audiencia:a.id,tipo:motor,caso:C.ejemplo(motor,PPP),breve});n++;
    assert.equal(s.schema,'yod.storyboard.v1');assert.ok(s.scenes.length>=2,a.id+' '+motor);assert.ok(S.timeline(s).length>=s.scenes.length);
    for(const f of s.facts){assert.match(f.source_ref,/^snapshot\.(resumen\.)?[A-Za-z0-9_]+$/);assert.ok(['calculated','assumption','pending'].includes(f.status));}
    if(breve)assert.ok(s.scenes.length<=armar({audiencia:a.id,tipo:motor,caso:C.ejemplo(motor,PPP)}).scenes.length);
    assert.ok(s.title.startsWith(a.titulo));
  }
  assert.equal(n,30);
});

test('cada cifra sale de un campo guardado del plan; al cambiar el campo cambia la cifra',()=>{
  const s=armar(),v=s.facts.find(f=>f.source_ref==='snapshot.resumen.ventas'),t=s.facts.find(f=>f.source_ref==='snapshot.inTerreno');
  assert.equal(v.status,'calculated');assert.equal(v.value,'$182,500,000');assert.equal(t.status,'assumption');assert.equal(S.factLabel(t),'2,500 m²');
  const otro=caso();otro.resumen.ventas='200000000';
  assert.equal(armar({caso:otro}).facts.find(f=>f.source_ref==='snapshot.resumen.ventas').value,'$200,000,000');
});

test('lo que el plan no trae queda «No definido»: nunca se inventa ni se calcula',()=>{
  const sin=caso();delete sin.resumen.ventas;sin.resumen.utilidad='';sin.inTerreno=null;
  const s=armar({caso:sin});
  for(const ref of ['snapshot.resumen.ventas','snapshot.resumen.utilidad','snapshot.inTerreno']){const f=s.facts.find(x=>x.source_ref===ref);assert.equal(f.status,'pending');assert.equal(f.value,null);assert.equal(S.factLabel(f),'No definido');}
  const vacio=armar({caso:{caso_id:'CASO-SINTETICO',version:1}});
  assert.ok(vacio.facts.length>0);assert.ok(vacio.facts.every(f=>f.status==='pending'&&f.value===null));
  // margen = utilidad / ventas no se deriva aunque estén sus insumos
  const sinMargen=caso();delete sinMargen.resumen.margen_pct;
  assert.equal(armar({caso:sinMargen}).facts.find(f=>f.source_ref==='snapshot.resumen.margen_pct').status,'pending');
});

test('el compilador es puro: misma entrada, misma salida, sin tocar el caso ni las recetas',()=>{
  const c=caso(),antes=JSON.stringify(c),recetas=JSON.stringify(R);
  assert.deepEqual(C.compilar({recetas:R,audiencia:'dueno',tipo:'mixto',caso:c}),C.compilar({recetas:R,audiencia:'dueno',tipo:'mixto',caso:c}));
  assert.equal(JSON.stringify(c),antes);assert.equal(JSON.stringify(R),recetas);
  const fuente=read('presentacion/grafo/compilar.js');
  for(const prohibido of ['fetch(','localStorage','sessionStorage','Date.now','new Date','document.','XMLHttpRequest'])assert.ok(!fuente.includes(prohibido),prohibido);
});

test('rechaza recetas, audiencia, tipo o caso que no reconoce',()=>{
  const code=fn=>{try{fn();}catch(e){return e.code;}return 'sin error';};
  assert.equal(code(()=>C.compilar({recetas:null,audiencia:'cliente',tipo:'mixto',caso:caso()})),'recetas_invalidas');
  assert.equal(code(()=>C.compilar({recetas:{...R,esquema:2},audiencia:'cliente',tipo:'mixto',caso:caso()})),'recetas_invalidas');
  assert.equal(code(()=>C.compilar({recetas:R,audiencia:'prensa',tipo:'mixto',caso:caso()})),'audiencia_desconocida');
  assert.equal(code(()=>C.compilar({recetas:R,audiencia:'cliente',tipo:'logistico',caso:caso()})),'tipo_desconocido');
  assert.equal(code(()=>C.compilar({recetas:R,audiencia:'cliente',tipo:'mixto',caso:null})),'caso_invalido');
});

test('de una liga sólo se acepta el Plan de Potencial del tablero de Potenciales',()=>{
  assert.deepEqual(C.deLiga('https://yodesarrollomx.github.io/potenciales-yod/mixto.html?open=CASO-1'),{caso:'CASO-1',motor:'mixto',tipo:'vertical'});
  assert.deepEqual(C.deLiga(' https://yodesarrollomx.github.io/potenciales-yod/residencial.html?open=A_b.c:1 '),{caso:'A_b.c:1',motor:'residencial',tipo:'residencial'});
  for(const mala of ['','no es liga','https://evil.example/potenciales-yod/mixto.html?open=CASO-1','https://yodesarrollomx.github.io/potenciales-yod/accesos.html?open=CASO-1',
    'https://yodesarrollomx.github.io/potenciales-yod/mixto.html','https://yodesarrollomx.github.io/potenciales-yod/mixto.html?open=a%20b','https://yodesarrollomx.github.io/otro/mixto.html?open=CASO-1',
    'javascript:alert(1)'])assert.equal(C.deLiga(mala),null,mala);
  assert.equal(C.tipoDe('MIXTO'),'vertical');assert.equal(C.tipoDe('vertical'),'vertical');assert.equal(C.tipoDe('otro'),null);
});

test('la versión del plan y el ejemplo se dicen como son',()=>{
  assert.deepEqual(C.versionDelPlan(caso()),{version:'7',escenario:'Base',actualizado:'2026-11-10T18:00:00Z'});
  assert.deepEqual(C.versionDelPlan({escenarios_json:'{roto'}),{version:'',escenario:'',actualizado:''});
  for(const motor of MOTORES){const e=C.ejemplo(motor,PPP);assert.equal(e.caso_id,'EJEMPLO');assert.match(e.nombre_caso,/ficticias/);assert.ok(Object.keys(e.resumen).length>0);}
  assert.match(armar({caso:C.ejemplo('mixto',PPP)}).title,/ficticias/);
});

test('el aviso sólo habla cuando el grafo en pantalla no es el que se está trabajando',()=>{
  const V={aprobado:'G-20261111-2217'},B={id:'G-20261112-0915',pr:70};
  assert.equal(A.estado({cargado:'',versiones:null,borrador:B}).tipo,'sin-dato');
  assert.equal(A.estado({cargado:'',versiones:{aprobado:7},borrador:B}).tipo,'sin-dato');
  assert.equal(A.estado({cargado:V.aprobado,versiones:V,borrador:null}).tipo,'al-dia');
  assert.equal(A.estado({cargado:'',versiones:V,borrador:{}}).tipo,'al-dia');
  assert.equal(A.estado({cargado:V.aprobado,versiones:V,borrador:{id:V.aprobado,pr:70}}).tipo,'al-dia','un borrador que ya es el aprobado no cuenta');
  for(const id of ['','G-3','x',null,7])assert.equal(A.estado({cargado:V.aprobado,versiones:V,borrador:{id,pr:70}}).tipo,'al-dia',String(id));
  assert.equal(A.estado({cargado:V.aprobado,versiones:V,borrador:{id:B.id,pr:0}}).tipo,'borrador','el borrador cuenta aunque su PR todavía no se haya abierto');
  const b=A.estado({cargado:V.aprobado,versiones:V,borrador:B});
  assert.equal(b.tipo,'borrador');assert.equal(b.borrador,B.id);assert.match(b.detalle,/sigue igual hasta que se apruebe/);
  const n=A.estado({cargado:'G-20261101-0800',versiones:V,borrador:B});
  assert.equal(n.tipo,'nueva');assert.equal(n.aprobado,V.aprobado);assert.match(n.detalle,/lo que ves no cambia/);
  for(const e of [b,n]){assert.ok(e.corto.length<=28,e.corto);assert.ok(!/[!¡]|error|alerta|urgente|atención/i.test(e.corto+e.detalle));}
  // lo que está en borrador es el grafo, no el Plan de Potencial
  assert.match(b.detalle,/otra versión del grafo en borrador/);assert.ok(!/Plan de Potencial/.test(b.detalle),b.detalle);
});

test('el rol de pyod_rol se lee como lo guarda portero.js, como la palabra sola de antes y sin romperse con basura',()=>{
  const T='sy0123456789abcdef0000';
  // portero.js: JSON.stringify({f:k.slice(0,14),rol})
  assert.equal(A.rolDe(JSON.stringify({f:T.slice(0,14),rol:'admin'}),T),'admin');
  assert.equal(A.rolDe(JSON.stringify({f:T.slice(0,14),rol:'Direccion'}),T),'direccion');
  assert.equal(A.rolDe(JSON.stringify({f:T.slice(0,14),rol:'editor'}),T),'editor');
  assert.equal(A.rolDe(JSON.stringify({rol:'admin'}),T),'admin','sin huella vale el rol');
  assert.equal(A.rolDe(JSON.stringify({f:T.slice(0,14),rol:'admin'}),''),'admin','sin token a la mano no se descarta');
  assert.equal(A.rolDe(JSON.stringify({f:'syOTRO00000000',rol:'admin'}),T),'','el rol de otro token no cuenta');
  // la palabra sola de siempre
  for(const [v,r] of [['admin','admin'],['DIRECCION','direccion'],[' comercial ','comercial'],['vista','vista']])assert.equal(A.rolDe(v,T),r,v);
  // basura: nunca rompe y nunca da rol
  for(const v of [null,undefined,'',7,{},[],'{roto','{"rol":7}','{"f":1,"rol":["admin"]}','[]','"admin"','{}','admin;x','<b>admin</b>','a'.repeat(40)])assert.equal(A.rolDe(v,T),'',String(v));
});

test('la liga a Accesos sólo aparece a Dirección y con el rol tal como lo guarda el Portero',async()=>{
  const T='sy0123456789abcdef0000',V={aprobado:'G-20261111-2217',versiones:[]},B={id:'G-20261112-0915',pr:70};
  function nodo(tag){const n={tag,children:[],attrs:{},style:{},classList:{add(){}},hidden:true,textContent:'',
    append(...k){for(const x of k)n.children.push(typeof x==='string'?{tag:'#text',textContent:x,children:[]}:x);},setAttribute(a,v){n.attrs[a]=v;},getBoundingClientRect:()=>({left:10,right:100}),querySelectorAll:()=>[]};
    Object.defineProperty(n,'textContent',{get(){return n._t||'';},set(v){n._t=v;if(v==='')n.children=[];}});n.ownerDocument=doc;return n;}
  const doc={createElement:nodo,createTextNode:t=>({tag:'#text',textContent:t,children:[]}),documentElement:{clientWidth:400},addEventListener(){},removeEventListener(){},hidden:false};
  const todos=n=>[n,...n.children.flatMap(todos)];
  async function abrir(pyodRol){
    const store={pyod_clave_v1:T},ses={pyod_rol:pyodRol},prev={localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage};
    Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>store[k]??null},configurable:true});
    Object.defineProperty(globalThis,'sessionStorage',{value:{getItem:k=>ses[k]??null},configurable:true});
    try{
      const el=nodo('span'),fetchImpl=u=>Promise.resolve({ok:true,json:()=>Promise.resolve(/versiones/.test(u)?V:B)});
      const m=A.montar(el,{cargado:V.aprobado,fetchImpl,cada:0});await m.leer();
      todos(el).find(n=>n.tag==='button').onclick();
      const fin=todos(el);m.detener();return {liga:fin.some(n=>n.tag==='a'),texto:fin.map(n=>n.textContent).join(' ')};
    }finally{for(const k of Object.keys(prev))Object.defineProperty(globalThis,k,{value:prev[k],configurable:true});}
  }
  assert.equal((await abrir(JSON.stringify({f:T.slice(0,14),rol:'admin'}))).liga,true,'admin como lo guarda portero.js');
  assert.equal((await abrir('direccion')).liga,true,'la palabra sola de antes');
  for(const otro of [JSON.stringify({f:T.slice(0,14),rol:'vista'}),JSON.stringify({f:'syOTRO00000000',rol:'admin'}),'{roto',null]){
    const r=await abrir(otro);assert.equal(r.liga,false,String(otro));assert.match(r.texto,/pide a Dirección/);}
});

test('Master Brokers y Presentaciones montan el aviso y enlazan el plan guardado con el visor',()=>{
  for(const pagina of ['brokers.html','presentaciones.html']){const h=read(pagina);
    assert.equal((h.match(/data-grafo-aviso/g)||[]).length,1,pagina);assert.match(h,/<span data-grafo-aviso[^>]* hidden><\/span>/);
    assert.match(h,/presentacion\/grafo-aviso\.css\?v=[A-Za-z0-9.-]+/);assert.match(h,/presentacion\/grafo-aviso\.js\?v=[A-Za-z0-9.-]+/);}
  assert.match(read('presentaciones.html'),/href="presentacion\/grafo\/"/);
  assert.match(read('brokers.js'),/href="presentacion\/grafo\/\?caso=\$\{encodeURIComponent\(p\.id\)\}&amp;tipo=\$\{encodeURIComponent\(p\.type\)\}"/);
});

test('el visor sólo lee: no escribe, no guarda, no borra la credencial y no trae secretos',()=>{
  const app=read('presentacion/grafo/app.mjs'),html=read('presentacion/grafo/index.html'),aviso=read('presentacion/grafo-aviso.js');
  for(const fuente of [app,aviso]){
    for(const prohibido of ['removeItem','setItem','.clear(','innerHTML','insertAdjacentHTML','document.write','eval(',"method:'POST'",'method: \'POST\'','sendBeacon','indexedDB'])assert.ok(!fuente.includes(prohibido),prohibido);
    assert.ok(!/method\s*:/.test(fuente));
  }
  assert.equal((app.match(/recurso: 'caso'/g)||[]).length,1);
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);assert.match(html,/<meta name="referrer" content="no-referrer">/);
  for(const fuente of [app,html,aviso,read('presentacion/grafo/compilar.js')]){
    assert.ok(!/AKfycb[A-Za-z0-9_-]{20,}/.test(fuente));assert.ok(!/sk-[A-Za-z0-9]{12,}|api[_-]?key/i.test(fuente));assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(fuente));
  }
});
