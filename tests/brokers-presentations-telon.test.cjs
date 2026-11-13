'use strict';
// Telón YOD: cada presentación del catálogo tiene liga VISOR y liga MAESTRO, y la liga MAESTRO conduce una sola vez sin conceder permisos.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),catalog=require('../presentacion/catalogo.json');
const SITE='https://yodesarrollomx.github.io/yodesarrollo-board/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const meta=(html,prop)=>(html.match(new RegExp('<meta property="'+prop+'" content="([^"]*)"'))||[])[1]||'';
const title=html=>(html.match(/<title>([^<]*)<\/title>/)||[])[1]||'';
const local=url=>{assert.ok(url.startsWith(SITE),'La imagen debe servirse desde el mismo sitio: '+url);return url.slice(SITE.length);};
const png=p=>{const b=fs.readFileSync(path.join(root,p));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',p+' debe ser PNG');return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length};};

test('cada presentación del catálogo tiene su par Telón YOD (visor y maestro)',()=>{
 assert.ok(catalog.presentations.length>=4);
 for(const item of catalog.presentations){
  const dir=local(item.url);assert.match(dir,/^presentacion\/([a-z0-9-]+\/)?$/,item.id);
  const visor=read(dir+'index.html'),maestro=read(dir+'maestro.html');
  // VISOR: nombre código buscable, vista previa propia y ninguna referencia a la liga maestro.
  assert.match(title(visor),/^Telón YOD · /,item.id+': título con nombre código');
  assert.match(meta(visor,'og:title'),/^Telón YOD · /,item.id+': og:title con nombre código');
  assert.ok(meta(visor,'og:description').length>20,item.id+': og:description');
  assert.match(meta(visor,'og:image'),/\/presentacion\/telon\/[a-z0-9-]+-visor\.png$/,item.id);
  assert.doesNotMatch(visor,/maestro/i,item.id+': el visor no enlaza ni nombra la liga maestro');
  assert.doesNotMatch(meta(visor,'og:title')+meta(visor,'og:description'),/MAESTRO|NO COMPARTIR/);
  assert.match(visor,/presenter\.js\?v=PMD-1\.0\.0-telon1"/,item.id+': versión del runtime con modo maestro');
  // MAESTRO: alerta en título y vista previa, sin indexar, redirige al mismo recorrido con ?maestro=1.
  for(const text of [title(maestro),meta(maestro,'og:title')]){assert.match(text,/^⛔ MAESTRO · NO COMPARTIR/,item.id);assert.match(text,/Telón YOD/,item.id);}
  assert.match(meta(maestro,'og:description'),/No la reenvíes/,item.id);
  assert.match(meta(maestro,'og:image'),/\/presentacion\/telon\/[a-z0-9-]+-maestro\.png$/,item.id);
  assert.match(maestro,/<meta name="robots" content="noindex,nofollow,noarchive">/,item.id);
  assert.match(maestro,/location\.replace\('\.\/\?maestro=1'\)/,item.id);
  assert.match(maestro,/<a href="\.\/\?maestro=1"/,item.id+': salida sin JavaScript');
  assert.doesNotMatch(maestro,/llave|token|pyod_|[?&#]k=|AKfyc/i,item.id+': la liga maestro no lleva llaves ni secretos');
  for(const image of [meta(visor,'og:image'),meta(maestro,'og:image')]){const info=png(local(image));assert.deepEqual([info.width,info.height],[600,600],image);assert.ok(info.bytes<300000,image+' pesa demasiado para vista previa');}
  assert.notEqual(meta(visor,'og:image'),meta(maestro,'og:image'),item.id+': logos distintos');
 }
});

// Doble mínimo del navegador: ejecuta presenter.js real con servicios sintéticos, sin red.
function boot({search='',token='',owner=false,published='B1',title='Telón YOD · Prueba'}){
 const calls={mutate:[],login:0,status:[]},listeners={};
 const element=()=>({className:'',hidden:false,innerHTML:'',open:false,style:{setProperty(){}},classList:{toggle(){}},setAttribute(){},append(){},prepend(){},remove(){},addEventListener(){},
  querySelector:s=>s==='[data-yp-status]'?{set textContent(v){calls.status.push(v);}}:null,querySelectorAll:()=>[],getBoundingClientRect:()=>({height:0}),close(){},showModal(){this.open=true;}});
 const bar=element();let made=0;
 const document={title,hidden:false,body:element(),documentElement:element(),createElement:()=>made++===0?bar:element(),querySelector:()=>null,
  addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener(){}};
 const session={epoch:1,sequence:0,mode:'guided',position:0,releaseRevision:'R1'};
 const api={uid:()=>'device-1',token:()=>token,login:async()=>{calls.login++;},catalog:async()=>({actor:{owner},data:[{id:'PRS-PRUEBA',revision:1}]}),onIdentity:()=>()=>{},
  publicRelease:async()=>({baseVersion:published,releaseRevision:'R1',patch:{scenes:{}}}),request:async()=>({data:{epoch:0,sequence:0,mode:'idle',position:0}}),
  mutate:async(op,id,body)=>{calls.mutate.push({op,id,body});return {data:session};},flush(){},pending:async()=>[],inspect:async()=>({data:{revision:1}})};
 const window={YODPresentationAPI:api,YODPresentationsDomain:{},YODPresentationConfig:{portalURL:'https://example.invalid/portal'}};
 const sandbox={window,document,location:{search,hash:''},sessionStorage:{getItem:()=>null,setItem(){}},ResizeObserver:class{observe(){}disconnect(){}},URLSearchParams,
  setTimeout:()=>0,clearTimeout(){},addEventListener(){},removeEventListener(){}};
 vm.runInNewContext(read('presentacion/presenter.js'),sandbox,{filename:'presenter.js'});
 const adapter={applyPatch(){},summary:()=>({title:'Resumen'}),frame:()=>({sceneId:'s1',moment:0}),getPosition:()=>0,setPosition(){}};
 const runtime=window.YODPresentationRuntime.mount({id:'PRS-PRUEBA',baseVersion:'B1',adapter});
 return {calls,document,listeners,bar,runtime};
}
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(done=>setImmediate(done));};
const ops=view=>view.calls.mutate.map(x=>x.op);

test('liga maestro con sesión de Dirección: conduce una sola vez y avisa',async()=>{
 const view=boot({search:'?maestro=1',token:'sesion-sintetica',owner:true});await settle();
 assert.deepEqual(ops(view).filter(op=>op.startsWith('session_s')||op==='session_end'),['session_start']);
 assert.equal(view.calls.mutate[0].id,'PRS-PRUEBA');assert.equal(view.calls.mutate[0].body.takeover,false);
 assert.equal(view.calls.login,0);
 assert.match(view.document.title,/^⛔ MAESTRO · Telón YOD/);
 assert.match(view.bar.innerHTML,/data-yp-maestro[^>]*>⛔ MAESTRO · no compartas esta liga/);
 assert.match(view.bar.innerHTML,/data-yp-drive>Terminar</,'queda conduciendo');
 // Volver a la pestaña repite la comprobación de identidad: no debe terminar ni reiniciar la sesión.
 view.listeners.visibilitychange();await settle();view.listeners.visibilitychange();await settle();
 assert.equal(ops(view).filter(op=>op==='session_start').length,1);
 assert.ok(!ops(view).includes('session_end'),'la conducción automática nunca alterna a «Terminar»');
 view.runtime.dispose();
});

test('liga maestro sin sesión: abre el acceso una sola vez y no conduce',async()=>{
 const view=boot({search:'?maestro=1'});await settle();
 view.listeners.visibilitychange();await settle();
 assert.equal(view.calls.login,1);assert.deepEqual(ops(view),[]);
 assert.match(view.bar.innerHTML,/data-yp-login/);
 view.runtime.dispose();
});

test('liga maestro con una cuenta que no es Dirección: no conduce ni muestra controles',async()=>{
 const view=boot({search:'?maestro=1',token:'sesion-sintetica',owner:false});await settle();
 assert.deepEqual(ops(view),[]);assert.equal(view.calls.login,0);
 assert.ok(view.calls.status.includes('Liga MAESTRO: esta cuenta no puede conducir.'));
 assert.doesNotMatch(view.bar.innerHTML,/data-yp-drive/);
 view.runtime.dispose();
});

test('liga maestro cuando la versión publicada no corresponde a la página: no abre sesión sola',async()=>{
 const view=boot({search:'?maestro=1',token:'sesion-sintetica',owner:true,published:'B0'});await settle();
 view.listeners.visibilitychange();await settle();
 assert.deepEqual(ops(view),[],'sin session_start: no deja una sesión abierta que nadie conduce');
 assert.ok(view.calls.status.includes('Liga MAESTRO: esta versión todavía no se puede conducir sola.'));
 assert.match(view.bar.innerHTML,/data-yp-drive>Conducir</,'el botón manual se conserva');
 view.runtime.dispose();
});

test('nombre código: una página que reescribe su título lo recupera al montar',async()=>{
 const visor=boot({title:'YoDesarrollo · Codesarrollo inmobiliario'});await settle();
 assert.equal(visor.document.title,'Telón YOD · YoDesarrollo · Codesarrollo inmobiliario');visor.runtime.dispose();
 const maestro=boot({search:'?maestro=1',title:'YoDesarrollo · Codesarrollo inmobiliario'});await settle();
 assert.equal(maestro.document.title,'⛔ MAESTRO · Telón YOD · YoDesarrollo · Codesarrollo inmobiliario');maestro.runtime.dispose();
});

test('liga visor: nada cambia aunque el dispositivo sea de Dirección',async()=>{
 for(const search of ['','?maestro=0','?maestro','?otro=1']){
  const view=boot({search,token:'sesion-sintetica',owner:true});await settle();
  assert.deepEqual(ops(view),[],search);assert.equal(view.calls.login,0,search);
  assert.equal(view.document.title,'Telón YOD · Prueba',search);
  assert.doesNotMatch(view.bar.innerHTML,/MAESTRO/,search);
  assert.match(view.bar.innerHTML,/data-yp-drive>Conducir</,search);
  view.runtime.dispose();
 }
 const visitor=boot({search:''});await settle();
 assert.deepEqual(ops(visitor),[]);assert.equal(visitor.calls.login,0);assert.doesNotMatch(visitor.bar.innerHTML,/MAESTRO|data-yp-drive/);
 visitor.runtime.dispose();
});
