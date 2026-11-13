(function(root){
 'use strict';const A=root.YODPresentationAPI,C=root.YODBoardCore;
 function create(actor,onChange){
  const key='board:'+actor.id;let revision=0,layout=C.empty(),pending=null,saving=false,closed=false,conflict=false,notice='Cargando organización…',timer;
  const current=()=>!closed&&A.actor()?.id===actor.id&&!!A.token();
  const emit=()=>{if(current())onChange({layout:C.copy(layout),revision,pending:!!pending,saving,conflict,notice});};
  async function persist(){await A.storage.put(key,{revision,layout,pending,conflict});}
  async function load(){
   const cached=await A.storage.get(key).catch(()=>null);if(!current())return;
   if(cached){revision=cached.revision;layout=cached.layout;pending=cached.pending;conflict=!!cached.conflict;notice='Organización recuperada en este dispositivo.';emit();}
   try{const j=await A.request({op:'layout_read'});if(!current())return;
    if(!pending){revision=j.data.revision;layout=j.data.layout;notice='Organización sincronizada con tu cuenta.';await persist();emit();}
    else if(conflict){notice='Hay cambios en otro dispositivo. Tu organización local está conservada.';emit();}
    else await flush();
   }catch(e){notice='Sin conexión. Tu organización local está conservada.';emit();}
  }
  async function flush(){
   if(!current()||saving||conflict||!pending)return;
   saving=true;notice='Guardando organización…';emit();const sent=pending;
   try{sent.sent=true;await persist();if(!current())return;const j=await A.request({op:'layout_save',requestId:sent.id,data:{expectedRevision:sent.revision,layout:sent.layout}});if(!current())return;
    if(j.requestId!==sent.id)throw Error('receipt_mismatch');
    revision=j.data.revision;const newer=JSON.stringify(layout)!==JSON.stringify(sent.layout);
    // A duplicate receipt may report a newer remote revision: never overwrite it silently.
    if(j.appliedRevision!==j.data.revision){conflict=true;notice='Otro dispositivo modificó la mesa. Tu versión local está conservada.';}
    else {pending=newer?{id:A.uid(),revision,layout:C.copy(layout)}:null;notice='Guardado en tu cuenta.';}
    await persist();
   }catch(e){if(!current())return;conflict=e.code==='conflict'||conflict;notice=conflict?'Hay cambios en otro dispositivo. Elige qué organización conservar.':'Guardado local; falta confirmar la sincronización. Puedes reintentar.';await persist().catch(()=>{});
   }finally{saving=false;emit();}
   if(pending&&pending!==sent&&!conflict)await flush();
  }
  async function set(next){if(!current()||conflict)return;layout=C.copy(next);if(!pending)pending={id:A.uid(),revision,layout:C.copy(layout)};else if(!saving&&!pending.sent)pending={id:A.uid(),revision,layout:C.copy(layout)};
   notice='Cambios guardados en este dispositivo.';try{await persist();}catch{notice='No se pudo guardar en este dispositivo. Mantén esta página abierta.';emit();return;}emit();clearTimeout(timer);timer=setTimeout(flush,500);
  }
  async function resolve(keepLocal){if(!current()||saving)return;try{const j=await A.request({op:'layout_read'});if(!current())return;await A.storage.put(key+':conflict-backup:'+Date.now(),{revision,layout,pending});revision=j.data.revision;conflict=false;
   if(keepLocal)pending={id:A.uid(),revision,layout:C.copy(layout)};else{layout=j.data.layout;pending=null;}
   await persist();notice=keepLocal?'Guardando tu organización sobre la revisión actual…':'Organización de tu cuenta recuperada.';emit();if(keepLocal)await flush();
  }catch{notice='No se pudo conciliar. Tu organización local sigue conservada.';emit();}}
  function online(){if(current())flush();}root.addEventListener('online',online);
  return {load,set,retry:flush,resolve,dispose(){closed=true;clearTimeout(timer);root.removeEventListener('online',online);}};
 }
 root.YODBoardStore={create};
})(window);
