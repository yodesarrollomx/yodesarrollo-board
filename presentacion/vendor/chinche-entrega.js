/* Private sequence delivery. Idempotency belongs to the authenticated backend. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.YodChincheEntrega=api;})(globalThis,function(root){
'use strict';
const CONTRACT='chinche-secuencia-v1';
const URL_SALA='https://script.google.com/macros/s/AKfycbx61UWsEYCL_dHzi0JrUv3GuAUFSDWW4iCmlNmbDDvWBIYY4Hhqkf6sYmt4d8UGIlk7MA/exec';
async function hash(text){return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');}
function key(){try{return root.localStorage.getItem('pyod_clave_v1')||root.localStorage.getItem('sala_clave')||'';}catch{return '';}}
function packageData(ch){return {v:1,id:ch.id,creado:ch.creado,texto:ch.texto,tipo:ch.tipo,pantalla:ch.pantalla,repo:ch.repo,url:String(ch.url||'').split(/[?#]/)[0],objeto:ch.objeto||null,contexto:ch.contexto||null,elemento:ch.elemento||null,codigo:ch.codigo||'',ancla:ch.ancla||null,vista:ch.vista||'',destino:ch.destino||null,secuencia:ch.secuencia};}
async function bind(ch){const k=key();if(k)ch.sequenceOwner=await hash(ch.id+':'+k);return ch;}
function client(io={}){
 const credential=io.key||key,endpoint=io.endpoint||URL_SALA;
 const request=io.request||async function(body){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);try{const r=await root.fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body),signal:ctl.signal});if(!r.ok)throw Error('Sin respuesta');return await r.json();}finally{clearTimeout(timer);}};
 async function call(accion,fields,k){return request({accion,...fields,clave:k});}
 async function send(ch,guard=()=>true){
  if(!ch.secuencia)throw Error('Falta la secuencia');const k=credential();if(!k||!guard())return {state:'auth-required'};
  if(ch.sequenceOwner&&ch.sequenceOwner!==await hash(ch.id+':'+k))return {state:'auth-required'};
  const clean=packageData(ch);
  const data=JSON.stringify(clean),sha256=await hash(data);if(data.length>12500000)throw Error('Paquete demasiado grande');
  const seen=await call('chinche_secuencia_recibo',{id:ch.id},k);
  if(!guard()||credential()!==k)return {state:'auth-required'};
  if(seen.contrato!==CONTRACT||seen.ok!==true)return {state:'waiting',reason:'backend'};
  if(seen.hash){if(seen.hash!==sha256)return {state:'conflict'};return {state:'received',id:ch.id,hash:sha256};}
  // Safe to retry this action: backend lock, immutable ID/hash and ledger reconciliation.
  const ack=await call('chinche_secuencia_guardar',{id:ch.id,hash:sha256,data},k);
  if(!guard()||credential()!==k)return {state:'auth-required'};
  if(ack.ok!==true||ack.contrato!==CONTRACT||ack.id!==ch.id||ack.hash!==sha256)return {state:ack.error==='conflict'?'conflict':'uncertain'};
  const receipt=await call('chinche_secuencia_recibo',{id:ch.id},k);
  return guard()&&credential()===k&&receipt.ok===true&&receipt.hash===sha256&&receipt.id===ch.id?{state:'received',id:ch.id,hash:sha256}:{state:'uncertain'};
 }
 async function read(id){const k=credential();if(!k)throw Error('Inicia sesión en YOD OS');const r=await call('chinche_secuencia_leer',{id},k);if(r.ok!==true||r.contrato!==CONTRACT||r.id!==id||typeof r.data!=='string'||await hash(r.data)!==r.hash)throw Error('No se confirmó el archivo completo');if(credential()!==k)throw Error('Cambió la sesión');return JSON.parse(r.data);}
 return {send,read};
}
return {CONTRACT,hash,client,packageData,bind};
});
