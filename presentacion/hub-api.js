(function(root){
 'use strict';
 const cfg=root.YODPresentationConfig,D=root.YODPresentationsDomain;
 const messages={source_snapshot_unavailable:'No está disponible el snapshot de la versión revisada. El encargo no se ha reemplazado por datos actuales.',connection_uncertain:'No se confirmó la respuesta. El próximo intento consulta el mismo encargo.',invalid_context:'No se pudo confirmar el expediente del agente.',invalid_response:'La respuesta no coincide con esta versión. Conservamos la solicitud para revisarla.',authorization_missing:'No se pudo confirmar la instrucción de etapa 2.',production_required:'Esta presentación sigue en revisión privada. La publicación requiere su proceso de producción.',invalid_storyboard:'El guion recibido no cumple el formato visual. Se conservó el original para revisarlo.',unsupported_visual:'Este dibujo requiere un adaptador compatible antes de mostrarse.',source_mismatch:'La fuente no corresponde al expediente de esta presentación.',version_not_found:'No se encontró esa versión del guion.',generation_forbidden:'El encargo no está autorizado para registrar esta versión.',integrity:'La huella del original no coincide. Conservamos el recibo para revisar.',unauthorized:'Entra con tu cuenta de Dirección.',forbidden:'Esta cuenta no tiene permiso para editar.',conflict:'Hay una revisión más reciente. Conservamos tu texto para compararlo.',controller_active:'La presentación ya tiene conductor. Puedes tomar el mando.',controller_changed:'El mando pasó a otro dispositivo.',session_expired:'La conducción terminó o venció. Puedes iniciarla de nuevo.',backend_not_ready:'Preparando el control de presentaciones.',busy:'El servicio está ocupado. Conservamos el cambio.',invalid_patch:'Revisa el texto del guion.',unknown_case:'No se pudo confirmar el expediente seleccionado.'};
 const token=()=>{try{return localStorage.getItem('pyod_clave_v1')||'';}catch{return '';}};
 const uid=()=>crypto.randomUUID().replace(/-/g,''),listeners=new Set();
 let actor=null,ownToken='',generation=0,dbPromise=null,privateFlight=null;
 function emit(){for(const fn of listeners)fn(actor);}
 function clear(){generation++;actor=null;ownToken='';privateFlight=null;emit();}
 function error(code){const e=Error(messages[code]||'No se pudo completar la conexión. Tu trabajo sigue disponible.');e.code=code;return e;}
 function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('yodPresentationHub',1);req.onupgradeneeded=()=>req.result.createObjectStore('state',{keyPath:'key'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>{dbPromise=null;reject(error('storage_unavailable'));};});return dbPromise;}
 async function storage(mode,fn){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('state',mode),s=tx.objectStore('state');let request;try{request=fn(s);}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(error('storage_unavailable'));tx.onabort=()=>reject(error('storage_unavailable'));});}
 const put=(key,value)=>storage('readwrite',s=>s.put({key,value})),get=key=>storage('readonly',s=>s.get(key)).then(x=>x?.value),remove=key=>storage('readwrite',s=>s.delete(key)),all=()=>storage('readonly',s=>s.getAll()).then(x=>x||[]);
 async function request(input,{publicRead=false,timeout=60000}={}){
  const mine=generation,k=token(),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  try{let url=cfg.endpoint,options={signal:ctrl.signal,cache:'no-store',credentials:'omit'};
   if(publicRead){const q=new URLSearchParams({recurso:'presentaciones_publico'});if(input.id)q.set('id',input.id);if(input.op==='public_session')q.set('estado','1');if(input.release)q.set('release',input.release);url+='?'+q;}
   else {if(!k)throw error('unauthorized');options.method='POST';options.headers={'Content-Type':'text/plain'};options.body=JSON.stringify({accion:'presentaciones',presentation:{...input,token:k}});}
   const res=await fetch(url,options);if(!res.ok)throw error(res.status===403?'forbidden':'network');let j;try{j=await res.json();}catch{throw error('network');}
   if(!publicRead&&(mine!==generation||k!==token()))throw error('session_changed');
   if(j.ok!==true){if(['unauthorized','forbidden'].includes(j.error)&&!publicRead)clear();throw error(j.error||'network');}return j;
  }catch(e){if(e.code)throw e;throw error('network');}finally{clearTimeout(timer);}
 }
 async function catalog({force=false}={}){
  const k=token();if(ownToken&&ownToken!==k)clear();if(!k)throw error('unauthorized');
  if(privateFlight&&!force)return privateFlight;const mine=generation;
  const work=request({op:'catalog'}).then(j=>{if(mine!==generation)throw error('session_changed');actor=j.actor;ownToken=k;emit();return j;}).finally(()=>{if(privateFlight===work)privateFlight=null;});privateFlight=work;return work;
 }
 async function publicCatalog(){try{const res=await fetch(new URL('catalogo.json',new URL('.',document.currentScript?.src||cfg.catalogURL)),{cache:'no-cache'});if(!res.ok)throw Error();return D.normalizeCatalog(await res.json()).presentations;}catch{const res=await fetch(cfg.catalogURL,{cache:'no-cache'});if(!res.ok)throw error('network');return D.normalizeCatalog(await res.json()).presentations;}}
 async function publicRelease(id,release){const key='public-release:'+id+':'+(release||'latest');try{const j=await request({op:'public_release',id,release},{publicRead:true,timeout:25000});await put(key,j.data).catch(()=>{});return {...j.data,stale:false};}catch(e){const cached=await get(key).catch(()=>null);if(cached)return {...cached,stale:true};throw e;}}
 async function inspect(id){return request({op:'inspect',id});}
 async function mutate(op,id,data,{queue=op==='save_draft'||op==='link',requestId=uid()}={}){
  if(!actor?.owner||!ownToken||ownToken!==token())await catalog();if(!actor?.owner)throw error('forbidden');
  const who=actor.id,key='outbox:'+who+':'+requestId,p={op,id,data,requestId};
  if(queue)await put(key,{actor:who,request:p,at:Date.now(),state:'pending'});
  try{const j=await request(p);if(j.requestId!==requestId)throw error('receipt_mismatch');if(queue)await remove(key);return {...j,pending:false};}
  catch(e){if(queue){await put(key,{actor:who,request:p,at:Date.now(),state:e.code==='conflict'?'conflict':e.code==='unauthorized'||e.code==='forbidden'?'auth':'pending'});if(!['conflict','unauthorized','forbidden','session_changed'].includes(e.code))return {ok:false,pending:true,requestId,error:e.code};}throw e;}
 }
 let flushing=false;
 async function pending(){if(!actor)return [];return (await all()).filter(x=>x.key.startsWith('outbox:'+actor.id+':'));}
 async function flush(){if(flushing||!token())return;flushing=true;try{await catalog();if(!actor?.owner)return;for(const row of await pending()){
   if(row.value.state==='conflict')continue;const p=row.value.request,j=await request({op:'receipt',id:p.id,requestId:p.requestId});if(j.found){await remove(row.key);continue;}
   try{const ack=await request(p);if(ack.requestId===p.requestId)await remove(row.key);}catch(e){if(e.code==='conflict')await put(row.key,{...row.value,state:'conflict'});else break;}
  }}catch{}finally{flushing=false;}}
 let loginFlight=null;function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.setAttribute('data-singate','');s.onload=ok;s.onerror=()=>{s.remove();no(error('network'))};document.head.append(s);});}async function login(){if(root.YODPortero?.entrar)return root.YODPortero.entrar();if(!loginFlight)loginFlight=(async()=>{if(!root.YOD_PORTERO)await loadScript('https://yodesarrollomx.github.io/yod-portal/os/yod-acceso.js?v=1');await loadScript('https://yodesarrollomx.github.io/potenciales-yod/portero.js');if(!root.YODPortero?.entrar)throw error('network');return root.YODPortero.entrar();})().finally(()=>loginFlight=null);return loginFlight;}
 root.YODPresentationAPI={VERSION:cfg.version,token,uid,login,catalog,publicCatalog,publicRelease,inspect,mutate,request,pending,flush,onIdentity(fn){listeners.add(fn);return()=>listeners.delete(fn);},actor:()=>actor,storage:{get,put,remove,all},message:code=>messages[code]||code};
 addEventListener('storage',e=>{if(e.key==='pyod_clave_v1'){clear();if(token())catalog().catch(()=>{});}});addEventListener('online',()=>flush());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush();});
})(window);
