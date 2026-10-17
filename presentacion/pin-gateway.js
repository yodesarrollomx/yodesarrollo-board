'use strict';
(()=>{
 const api=YodPinDelivery,params=new URLSearchParams(location.hash.slice(1)),nonce=params.get('nonce'),origin=params.get('origin'),status=document.getElementById('status');
 const embedded=parent!==self,peer=opener||(embedded?parent:null);
 let packet=null,busy=false,completed=false;
 if(!/^[a-f0-9]{32}$/.test(nonce||'')||![api.ORIGIN,api.EXTERNAL].includes(origin)||!peer){status.textContent='Abre esta conexión desde la chinche de la presentación.';return;}
 function reply(result){peer.postMessage({type:'yod-pin-result',nonce,result},origin);}
 async function run(){if(!packet||busy||completed)return;busy=true;document.getElementById('auth').hidden=true;status.textContent='Guardando en la bandeja de Sala…';
  try{const result=await api.client().deliver(packet);status.textContent=api.label(result);document.getElementById('auth').hidden=result.state!=='auth-required';reply(result);if(result.state==='received'){completed=true;if(!embedded)setTimeout(()=>window.close(),900);}}
  catch{status.textContent='Tu revisión sigue guardada. No se pudo confirmar la recepción en Sala.';reply({state:'error',id:packet.id});}finally{busy=false;}
 }
 addEventListener('message',e=>{if(e.source!==peer||e.origin!==origin||e.data?.nonce!==nonce||e.data.type!=='yod-pin-submit')return;
  try{api.validate(e.data.packet);if(e.data.packet.sourceOrigin!==origin)throw Error();if(packet&&packet.hash!==e.data.packet.hash)throw Error();packet=e.data.packet;run();}catch{status.textContent='El origen de la revisión no coincide. Conserva el comentario en la presentación.';}
 });
 document.getElementById('retry').onclick=run;addEventListener('storage',e=>{if(['pyod_clave_v1','sala_clave'].includes(e.key))run();});
 peer.postMessage({type:'yod-pin-ready',nonce},origin);
})();
