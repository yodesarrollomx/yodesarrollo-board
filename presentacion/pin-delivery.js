/* YOD review delivery v1. Uses the existing private Sala ledger, never a new backend. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.YodPinDelivery=api;})(typeof window==='object'?window:globalThis,function(root){
'use strict';
const ORIGIN='https://yodesarrollomx.github.io';
const EXTERNAL='https://gaston-madrid-pintarron.sayri-fraijo.chatgpt.site';
const GATEWAY=ORIGIN+'/yodesarrollo-board/presentacion/pin-gateway.html';
const SALA='https://script.google.com/macros/s/AKfycbx61UWsEYCL_dHzi0JrUv3GuAUFSDWW4iCmlNmbDDvWBIYY4Hhqkf6sYmt4d8UGIlk7MA/exec';
const ID=/^CHN-\d{8}-\d{4}-[a-f0-9]{4}$/;
const MAX=47000;
const KIND='yod-presentation-private-v1',CAPABILITY=ORIGIN+'/sala-edicion/presentation-reviews.json';
const utf8=s=>new TextEncoder().encode(s);
async function sha(bytes){return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function allowedSource(origin,url){try{const u=new URL(url);return u.origin===origin&&((origin===ORIGIN&&u.pathname.startsWith('/yodesarrollo-board/presentacion/'))||(origin===EXTERNAL&&u.pathname==='/'));}catch{return false;}}
function validate(p){
 if(!p||p.v!==1||!ID.test(p.id)||!allowedSource(p.sourceOrigin,p.sourceUrl)||!/^[a-f0-9]{64}$/.test(p.hash)||typeof p.detail!=='string'||p.detail.length>MAX)throw Error('Revisión no válida. Conserva el original.');
 const d=JSON.parse(p.detail),r=d.objeto?.revision;
 if(d.kind!==KIND||typeof d.pantalla!=='string'||!d.pantalla||d.id!==p.id||d.objeto?.huella!==p.hash||r?.id!==p.id||r?.source!==p.sourceUrl||typeof r.comment!=='string'||!r.comment.trim()||r.comment.length>12000)throw Error('El contexto de la revisión no coincide.');
 if(r.capture&&(!/^[A-Za-z0-9+/]*={0,2}$/.test(r.capture.data)||r.capture.data.length>30000||r.capture.mime!=='image/jpeg'||!/^[a-f0-9]{64}$/.test(r.capture.sha256)))throw Error('La captura no es válida.');
 if(!['yodesarrollo-board','sala-edicion'].includes(d.repo)||d.carta||d.clave||p.clave)throw Error('Destino de revisión no permitido.');
 return d;
}
async function compactPhoto(blob){
 if(!blob)return null;
 const image=new root.Image(),url=root.URL.createObjectURL(blob);
 try{await new Promise((ok,no)=>{image.onload=ok;image.onerror=()=>no(Error('No se pudo leer la captura.'));image.src=url;});
  let w=Math.min(640,image.naturalWidth),h=Math.round(image.naturalHeight*w/image.naturalWidth),bytes;
  for(let n=0;n<6;n++){
   const c=root.document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(image,0,0,w,h);
   const b=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.64-n*.035));if(!b)throw Error('La captura no pudo prepararse.');bytes=new Uint8Array(await b.arrayBuffer());
   if(bytes.length<=20000||n===5)break;w=Math.round(w*.8);h=Math.round(h*.8);
  }
  if(bytes.length>20000)throw Error('La captura es demasiado grande. Recorta una zona menor; tu original está guardado.');
  let binary='';bytes.forEach(n=>{binary+=String.fromCharCode(n);});
  return{mime:'image/jpeg',data:root.btoa(binary),sha256:await sha(bytes),width:w,height:h};
 }finally{root.URL.revokeObjectURL(url);}
}
async function packet(ch,blob,destination){
 const source=new URL(ch.objeto?.enlace||ch.url);source.search='';source.hash='';
 if(!allowedSource(source.origin,source.href))throw Error('Esta presentación no tiene conexión autorizada.');
 const revision={v:1,id:ch.id,created:ch.creado,source:source.href,comment:ch.texto,context:ch.objeto||{},destination,capture:await compactPhoto(blob)};
 const hash=await sha(utf8(JSON.stringify(revision))),site=destination?.provider==='sites';
 const detail=JSON.stringify({kind:KIND,id:ch.id,repo:site?'sala-edicion':'yodesarrollo-board',pantalla:ch.pantalla,vista:site?'presentacion-sites':'presentacion-inversion',
  texto:'Revisión privada de presentación. Leer solicitud, captura y destino en PRODUCCION por este ID antes de corregir; el marcador público no contiene la nota.',
  url:source.href,quien:'Usuario de la presentación; identidad de sesión validada por Sala',
  elemento:{seccion:'Presentación',texto:'Revisión situada con captura privada'},
  codigo:site?'Destino Sites: consultar objeto.revision.destination del registro privado. No modificar el portal por inferencia.':'presentacion/ · consultar sobre privado por ID, sin publicar la captura ni la nota.',
  objeto:{revision,huella:hash}});
 const p={v:1,id:ch.id,sourceOrigin:source.origin,sourceUrl:source.href,hash,detail};validate(p);return p;
}
function receipt(rows,p){let legacy=false,conflict=false;for(const row of rows||[]){let d;try{d=typeof row.detalle==='string'?JSON.parse(row.detalle):row.detalle;}catch{continue;}if(d?.id!==p.id)continue;if(d.objeto?.huella===p.hash&&d.objeto.revision)return{state:'received',id:p.id,hash:p.hash,hasCapture:!!d.objeto.revision.capture};if(d.objeto?.revision)conflict=true;else legacy=true;}return conflict?{state:'conflict',id:p.id}:legacy?{state:'legacy',id:p.id}:null;}
function openDB(){return new Promise((ok,no)=>{const r=root.indexedDB.open('yodPresentationDelivery',1);r.onupgradeneeded=()=>r.result.createObjectStore('requests',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(Error('No se pudo conservar el estado del envío.'));});}
async function store(op,id,value){const db=await openDB();try{return await new Promise((ok,no)=>{const t=db.transaction('requests',op==='get'?'readonly':'readwrite'),s=t.objectStore('requests');let result;const q=s.get(id);q.onsuccess=()=>{const old=q.result;if(op==='get'){result=old;return;}if(op==='claim'&&old&&old.state!=='ready'){result=false;return;}result=value;s.put({...value,id});};t.oncomplete=()=>ok(result);t.onerror=()=>no(Error('El estado del envío no pudo guardarse.'));});}finally{db.close();}}
async function jsonRequest(url,options){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),20000);try{const r=await root.fetch(url,{...options,signal:ctl.signal});if(!r.ok)throw Error('Sin respuesta de Sala.');const j=await r.json();if(j.error||j.ok===false){const e=Error('Sala no autorizó o no confirmó la operación.');if(/clave|sesión|sesion|autoriz|rol/i.test(String(j.error||'')))e.code='AUTH';throw e;}return j;}finally{clearTimeout(timer);}}
function key(){try{return root.localStorage.getItem('pyod_clave_v1')||root.localStorage.getItem('sala_clave')||'';}catch{return '';}}
function client(deps={}){
 const memory=deps.store||store,readKey=deps.key||key,request=deps.request||jsonRequest;
 async function ready(){const j=await request(CAPABILITY+'?v=sala-pins-1');return j.contract==='sala-presentation-reviews-v1'&&j.privateProjection===true&&j.receipt==='id-sha256';}
 async function read(p,k){const j=await request(SALA+'?'+new URLSearchParams({recurso:'dia',fresco:'1',clave:k}));if(!Array.isArray(j.produccion)||j.cache===true)throw Error('No se pudo confirmar la bandeja de Sala.');return receipt(j.produccion,p);}
 async function deliver(p){
  validate(p);const d=JSON.parse(p.detail);if(await sha(utf8(JSON.stringify(d.objeto.revision)))!==p.hash)throw Error('La huella del comentario no coincide.');
  const k=readKey();if(!k)return{state:'auth-required',id:p.id};
  try{if(!await ready())return{state:'waiting',id:p.id,reason:'contract'};}catch{return{state:'waiting',id:p.id,reason:'connection'};}
  const old=await memory('get',p.id);if(old?.hash&&old.hash!==p.hash)throw Error('El ID ya pertenece a otra versión del comentario.');
  if(old?.state==='received')return old;
  let seen;try{seen=await read(p,k);}catch(e){return{state:e.code==='AUTH'?'auth-required':old?.state==='started'?'uncertain':'waiting',id:p.id,reason:e.name==='AbortError'?'timeout':'ledger'};}
  if(seen?.state==='conflict')return seen;
  if(seen?.state==='received'){const a={...seen,at:new Date().toISOString()};await memory('put',p.id,a);return a;}
  if(old?.state==='started'||old?.state==='uncertain')return{state:'uncertain',id:p.id};
  if(root.navigator?.onLine===false)return{state:'waiting',id:p.id};
  const claim={state:'started',id:p.id,hash:p.hash,at:new Date().toISOString()};if(!await memory('claim',p.id,claim))return{state:'uncertain',id:p.id};
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Hermosillo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  // Legacy notes retain their task/ID. Only the missing private evidence is appended.
  const body={accion:'produccion',clave:k,fecha:date,pieza:seen?.state==='legacy'?'CHINCHE CAPTURA · '+p.id:'ENCARGO · chinche · '+d.repo+'/'+d.pantalla,estado:'pendiente',detalle:JSON.stringify(d),enlace:p.sourceUrl};
  try{const ack=await request(SALA,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)});if(ack.ok!==true)throw Error('Sin acuse explícito.');}catch{/* The append may exist; never repeat it after an ambiguous response. */}
  try{seen=await read(p,k);}catch{seen=null;}
  if(seen?.state==='conflict')return seen;
  if(seen?.state==='received'){const a={...seen,at:new Date().toISOString()};await memory('put',p.id,a);return a;}
  const a={state:'uncertain',id:p.id,hash:p.hash,at:new Date().toISOString()};await memory('put',p.id,a);return a;
 }
 return{deliver};
}
const sessions=new Map();
function begin(id){
 if(root.location?.origin!==EXTERNAL)return null;
 const previous=sessions.get(id);if(previous&&!previous.popup.closed){previous.popup.focus();return previous.popup;}
 const nonce=[...root.crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const popup=root.open(GATEWAY+'#nonce='+nonce+'&origin='+encodeURIComponent(root.location.origin),'_blank','popup,width=540,height=700');
 if(popup)sessions.set(id,{nonce,popup,ready:false,resolve:null,packet:null});return popup;
}
if(root.addEventListener)root.addEventListener('message',e=>{
 if(e.origin!==ORIGIN)return;for(const [id,s] of sessions){
  if(e.source!==s.popup||e.data?.nonce!==s.nonce)continue;
  if(e.data.type==='yod-pin-ready'){s.ready=true;if(s.packet)s.popup.postMessage({type:'yod-pin-submit',nonce:s.nonce,packet:s.packet},ORIGIN);}
  const r=e.data.result;if(e.data.type==='yod-pin-result'&&r?.id===id&&['received','uncertain','waiting','auth-required','conflict','error'].includes(r.state)&&s.packet&&(r.state!=='received'||r.hash===s.packet.hash)){s.onResult?.(r);if(r.state!=='auth-required'){s.resolve?.(r);s.resolve=null;}}
 }
});
async function send(p,onResult){if(root.location.origin===ORIGIN)return client().deliver(p);const s=sessions.get(p.id);if(!s||s.popup.closed)return{state:'connect-required',id:p.id};return new Promise(ok=>{s.resolve=ok;s.onResult=onResult;s.packet=p;if(s.ready)s.popup.postMessage({type:'yod-pin-submit',nonce:s.nonce,packet:p},ORIGIN);setTimeout(()=>{if(s.resolve){s.resolve=null;ok({state:'waiting',id:p.id});}},65000);});}
function label(r){if(r?.state==='waiting'&&r.reason)return ({contract:'Guardada aquí · conexión de revisiones no disponible',connection:'Guardada aquí · sin conexión con Sala; reintentaremos',timeout:'Guardada aquí · Sala tardó en responder; reintentaremos',ledger:'Guardada aquí · no se pudo consultar Sala; reintentaremos'})[r.reason]||'Guardada · pendiente de conexión con Sala';return({conflict:'Guardada · ese ID ya tiene otra versión en Sala; requiere conciliación',received:'Recibida en Sala · en revisión',uncertain:'Guardada · falta confirmar recepción; no se duplicará el envío',waiting:'Guardada · pendiente de conexión con Sala','auth-required':'Guardada · inicia sesión en YOD OS para enviarla','connect-required':'Guardada · conecta con YOD OS para enviarla',error:'Guardada · Sala no confirmó la recepción'})[r?.state]||'Guardada en este dispositivo';}
async function mark(id,r){const db=await new Promise((ok,no)=>{const q=root.indexedDB.open('yodChinche',1);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});try{return await new Promise((ok,no)=>{const t=db.transaction('chinches','readwrite'),s=t.objectStore('chinches'),q=s.get(id);q.onsuccess=()=>{const ch=q.result;if(ch){ch.delivery=r;if(r.state==='received'){ch.estado='mandada';ch.mandada=r.at;ch.via='sala-presentation-v1';}s.put(ch);}};t.oncomplete=ok;t.onerror=()=>no(t.error);});}finally{db.close();}}
return{version:'sala-presentation-v1',ORIGIN,EXTERNAL,allowedSource,validate,packet,receipt,client,begin,send,label,mark,hasSession:()=>!!key()};
});
