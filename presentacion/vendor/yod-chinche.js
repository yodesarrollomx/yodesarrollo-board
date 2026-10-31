/* BEGIN CHINCHE SEQUENCE SHARED */
/* Shared recorded annotations. Private device drafts; network delivery belongs to the host. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.YodChincheSecuencia=api;})(globalThis,function(root){
'use strict';
const VERSION=1, MAX_MS=600000, MAX_BYTES=12000000;
const clone=x=>JSON.parse(JSON.stringify(x));
const el=(tag,text)=>{const n=root.document.createElement(tag);if(text)n.textContent=text;return n;};
function timeline(clock=()=>performance.now(),elapsed=0,events=[]){
 const start=clock();let last=elapsed;
 return {events,time:()=>Math.max(last,Math.min(MAX_MS,elapsed+Math.round(clock()-start))),add(type,data){const t=Math.max(last,Math.min(MAX_MS,elapsed+Math.round(clock()-start)));last=t;const event={t,type,...clone(data)};events.push(event);return event;}};
}
// MIME parameters may contain spaces or quoted codec lists (including Safari).
// Canonicalize the header only, never the encoded bytes or the container.
function audioType(mime){
 if(typeof mime!=='string'||mime.length>256)return null;
 const m=/^\s*(audio\/(?:webm|mp4|ogg))\s*(?:;\s*codecs\s*=\s*(?:"([a-z0-9., -]+)"|([a-z0-9., -]+))\s*)?$/i.exec(mime);
 return m?m[1].toLowerCase():null;
}
function audioParts(audio){
 const type=audioType(audio?.mime),m=typeof audio?.data==='string'&&/^data:([^\r\n]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(audio.data);
 if(!type||!m||audioType(m[1])!==type)throw Error('Audio inválido');
 return {type,header:m[1],payload:m[2]};
}
function normalizeAudio(audio){if(!audio)return null;const p=audioParts(audio);return {...audio,mime:p.type,data:'data:'+p.type+';base64,'+p.payload,originalMime:audio.originalMime||audio.mime,originalDataHeader:audio.originalDataHeader||p.header};}
function draftStore(){
 let opening;
 function database(){if(!opening)opening=new Promise((ok,no)=>{if(!root.indexedDB){no(Error('Almacenamiento local no disponible'));return;}let expired=false;const timer=setTimeout(()=>{expired=true;opening=null;no(Error('El respaldo no respondió'));},5000),r=root.indexedDB.open('yodChincheBorradores',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('drafts'))r.result.createObjectStore('drafts',{keyPath:'id'});};r.onsuccess=()=>{clearTimeout(timer);if(expired){r.result.close();return;}ok(r.result);};r.onerror=r.onblocked=()=>{clearTimeout(timer);opening=null;no(r.error||Error('No abrió el respaldo'));};});return opening;}
 async function run(mode,action){const db=await database();return new Promise((ok,no)=>{let value;const tx=db.transaction('drafts',mode),timer=setTimeout(()=>{try{tx.abort();}catch(e){}no(Error('El respaldo no respondió'));},5000);const r=action(tx.objectStore('drafts'));r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>{clearTimeout(timer);ok(value);};tx.onerror=tx.onabort=()=>{clearTimeout(timer);no(tx.error||r.error||Error('No se guardó el respaldo'));};});}
 return {put:d=>run('readwrite',s=>s.put(d)),get:id=>run('readonly',s=>s.get(id)),remove:id=>run('readwrite',s=>s.delete(id)),async list(scope){const all=await run('readonly',s=>s.getAll());return all.filter(d=>d.scope===scope).map(d=>({id:d.id,updated:d.updated,complete:d.complete})).sort((a,b)=>b.updated-a.updated);}};
}
function visibleStrokes(events,time){const strokes=[];for(const e of events){if(e.t>time)break;if(e.type==='stroke')strokes.push(e);if(e.type==='undo')strokes.pop();}return strokes;}
function draw(ctx,events,time){
 for(const s of visibleStrokes(events,time)){
  const pts=s.points.filter(p=>p[2]<=time);if(!pts.length)continue;
  const first=pts[0],last=pts[pts.length-1];ctx.save();ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=s.tool==='marker'?.28:1;ctx.beginPath();
  if(s.tool==='rect')ctx.rect(first[0],first[1],last[0]-first[0],last[1]-first[1]);
  else if(s.tool==='ellipse')ctx.ellipse((first[0]+last[0])/2,(first[1]+last[1])/2,Math.max(.1,Math.abs(last[0]-first[0])/2),Math.max(.1,Math.abs(last[1]-first[1])/2),0,0,Math.PI*2);
  else{ctx.moveTo(first[0],first[1]);if(['line','arrow'].includes(s.tool)){ctx.lineTo(last[0],last[1]);if(s.tool==='arrow'){const a=Math.atan2(last[1]-first[1],last[0]-first[0]);ctx.moveTo(last[0]-18*Math.cos(a-.5),last[1]-18*Math.sin(a-.5));ctx.lineTo(last[0],last[1]);ctx.lineTo(last[0]-18*Math.cos(a+.5),last[1]-18*Math.sin(a+.5));}}else{if(pts.length===1)ctx.lineTo(first[0]+.1,first[1]+.1);else for(const p of pts.slice(1))ctx.lineTo(p[0],p[1]);}}
  ctx.stroke();ctx.restore();
 }
}
function validate(s){
 if(!s||s.v!==VERSION||!Number.isFinite(s.duration)||s.duration<0||s.duration>MAX_MS+10000||!Number.isInteger(s.width)||!Number.isInteger(s.height)||s.width<1||s.width>2560||s.height<1||s.height>2560||!Array.isArray(s.events)||s.events.length>10000||!Array.isArray(s.frames)||s.frames.length>240)throw Error('Secuencia inválida');
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(s.base))throw Error('Base visual inválida');
 let last=-1,points=0;
 for(const e of s.events){if(!Number.isFinite(e.t)||e.t<last||e.t>s.duration||!['stroke','undo','audio-start','audio-end'].includes(e.type))throw Error('Reloj inválido');last=e.t;
  if(e.type==='stroke'){if(!['pen','marker','line','arrow','rect','ellipse'].includes(e.tool)||!/^#[a-f0-9]{6}$/i.test(e.color)||!Number.isFinite(e.width)||e.width<1||e.width>80||!Array.isArray(e.points)||!e.points.length)throw Error('Trazo inválido');let pt=e.t;for(const p of e.points){if(!Array.isArray(p)||p.length!==4||p.some(n=>!Number.isFinite(n))||p[0]<0||p[0]>s.width||p[1]<0||p[1]>s.height||p[2]<pt||p[2]>s.duration||p[3]<0||p[3]>1)throw Error('Punto inválido');pt=p[2];}points+=e.points.length;}}
 if(points>120000)throw Error('Demasiados puntos');
 let ft=-1;for(const f of s.frames){if(!Number.isFinite(f.t)||f.t<ft||f.t>s.duration||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(f.image))throw Error('Captura inválida');ft=f.t;}
 if(s.audio){if(!Number.isFinite(s.audio.offset)||s.audio.offset<0||s.audio.offset>s.duration)throw Error('Audio inválido');audioParts(s.audio);}
 if(new TextEncoder().encode(JSON.stringify(s)).length>MAX_BYTES)throw Error('La grabación supera 12 MB; conserva el original');return s;
}
function dataURL(blob){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(Error('No se pudo preparar el audio'));r.readAsDataURL(blob);});}
function style(){if(root.document.getElementById('chn-seq-style'))return;const s=el('style');s.id='chn-seq-style';s.textContent=`.chn-seq{background:#f7f5ed;color:#283d32;border:1px solid #bbc4b8;border-radius:12px;padding:12px;margin:12px 0;font:14px system-ui}.chn-seq canvas{display:block;width:100%;height:auto;touch-action:none;background:#fff;border:1px solid #c9cfc4}.chn-seq-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.chn-seq button,.chn-seq select{font:14px system-ui;min-height:44px;padding:8px 12px;border:1px solid #b5c1b5;border-radius:8px;background:#fff;color:#263c30}.chn-seq input[type=color]{height:44px;width:44px}.chn-seq input[type=range]{max-width:120px}.chn-seq-status{min-height:22px}.chn-seq audio{width:100%}.chn-seq-big{position:fixed;inset:8px;z-index:2147483647;overflow:auto;margin:0}.chn-seq-big canvas{max-height:70vh;width:auto;max-width:100%;margin:auto}.chn-seq [hidden]{display:none!important}`;root.document.head.append(s);}
// Apps Script's outer frame may deny microphone. Audio stays in the browser:
// a top-level recorder returns it only to its opener, with a per-session nonce.
function microphoneBridge(onstart,onend,onerror){
 const origin='https://yodesarrollomx.github.io',nonce=Array.from(root.crypto.getRandomValues(new Uint8Array(24))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const popup=root.open(origin+'/yod-portal/chinche/microfono.html','_blank','popup,width=430,height=360');
 if(!popup)throw Error('Permite abrir la ventana de grabación y vuelve a intentar.');
 let done=false,started=false,ready=false,resolve;const openedAt=Date.now();const finish=new Promise(r=>resolve=r);
 function cleanup(){root.removeEventListener('message',receive);clearInterval(watch);}
 function fail(message){if(done)return;done=true;cleanup();resolve();onerror(Error(message));}
 function receive(e){if(e.source!==popup||e.origin!==origin||!e.data||e.data.type!=='yod:chinche:microphone')return;const m=e.data;
  if(m.action==='ready'){ready=true;popup.postMessage({type:m.type,action:'init',nonce},origin);return;}
  if(m.nonce!==nonce||done)return;
  if(m.action==='started'&&!started){started=true;onstart();}
  if(m.action==='error')fail(m.message==='denied'?'No se concedió permiso al micrófono.':'No se pudo conservar el audio; grábalo de nuevo.');
  if(m.action==='complete'){
   if(!started||typeof m.data!=='string'||m.data.length>7000000){fail('La grabación no se pudo verificar. Conserva el original en la ventana de voz.');return;}
   done=true;cleanup();Promise.resolve(onend({mime:m.mime,data:m.data})).then(saved=>{if(saved!==false)popup.postMessage({type:m.type,action:'received',nonce},origin);}).finally(resolve);
  }
 }
 root.addEventListener('message',receive);const watch=setInterval(()=>{if(popup.closed)fail('Se cerró la ventana antes de conservar el audio.');else if(!ready&&Date.now()-openedAt>20000)fail('No cargó la ventana de voz. Vuelve a intentar.');},500);
 return {finish,stop(){if(!done)popup.postMessage({type:'yod:chinche:microphone',action:'stop',nonce},origin);return finish;},dispose(){if(!done){done=true;cleanup();popup.close();resolve();}}};
}
function mount(host,base,opts={}){
 style();const box=el('section');box.className='chn-seq';box.setAttribute('aria-label','Dibujo y explicación grabada');const canvas=el('canvas');canvas.width=base.width;canvas.height=base.height;canvas.setAttribute('aria-label','Dibuja sobre la captura');
 const tools=el('div');tools.className='chn-seq-tools';const select=el('select');select.setAttribute('aria-label','Herramienta');for(const [value,name] of [['pen','Lápiz'],['marker','Marcador'],['line','Línea'],['arrow','Flecha'],['rect','Rectángulo'],['ellipse','Óvalo']]){const o=el('option',name);o.value=value;select.append(o);}
 const color=el('input');color.type='color';color.value='#cc5b36';color.setAttribute('aria-label','Color');const width=el('input');width.type='range';width.min='1';width.max='14';width.value='3';width.setAttribute('aria-label','Grosor');const undo=el('button','Deshacer'),expand=el('button','Ampliar'),record=el('button','Grabar explicación'),stop=el('button','Detener'),preview=el('button','Reproducir');[undo,expand,record,stop,preview].forEach(b=>b.type='button');stop.hidden=true;
 const status=el('div','Dibuja y explica con tu voz.');status.className='chn-seq-status';status.setAttribute('role','status');tools.append(select,color,width,undo,expand,record,stop,preview);box.append(canvas,tools,status);host.append(box);
 const ctx=canvas.getContext('2d');let line=timeline(),active=null,recorder=null,stream=null,blob=null,offset=0,chunks=[],finish=null,disposed=false,pending=false,timer=null,busy=false,audioBytes=0,frames=[],frameBytes=0,lastFrame=-5000,player=null,previewing=false,ended=false,external=null,externalAudio=null,externalError=null;
 let baseData=base.toDataURL('image/jpeg',.75),baseImage=base;const paint=(t=line.time())=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(baseImage,0,0);draw(ctx,line.events,t);};paint();
 const store=opts.draftStore||draftStore(),scope=(root.location?.origin||'')+(root.location?.pathname||'')+(opts.draftScope||'');
 let draftId='draft-'+(root.crypto.randomUUID?root.crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2)),write=Promise.resolve(),draftTimer=null,saved=false,writing=false,dirty=false;
 const backup=el('button','Descargar respaldo'),drafts=el('button','Recuperar borrador'),importButton=el('button','Importar respaldo'),importFile=el('input'),draftStatus=el('div','El respaldo se guarda en este aparato mientras trabajas.');backup.type=drafts.type=importButton.type='button';importFile.type='file';importFile.accept='.json,application/json';importFile.hidden=true;draftStatus.className='chn-seq-status';draftStatus.setAttribute('role','status');tools.append(backup,drafts,importButton,importFile);box.append(draftStatus);
 const hasContent=()=>line.events.length>0||!!blob||!!recorder||!!external||!!externalAudio;
 async function raw(){const partial=blob||(chunks.length?new Blob(chunks,{type:chunks.find(c=>c.type)?.type||recorder?.mimeType||''}):null);return {v:VERSION,width:canvas.width,height:canvas.height,duration:line.time(),base:baseData,events:clone(line.events),frames:clone(frames),audio:externalAudio||(partial?.size?{mime:partial.type,offset,data:await dataURL(partial)}:null),baseKind:opts.baseKind||'capture'};}
 function checkpoint(){if(saved||!hasContent())return write;dirty=true;if(writing)return write;writing=true;write=(async()=>{let draft;do{dirty=false;const sequence=await raw();draft={v:1,id:draftId,scope,updated:Date.now(),complete:!pending&&(!recorder||recorder.state==='inactive')&&(!external||!!externalAudio),sequence,context:opts.draftContext?clone(opts.draftContext()):null};await store.put(draft);draftStatus.textContent=draft.complete?'Borrador conservado en este aparato.':'Respaldo local actualizado · grabación en curso.';}while(dirty&&!saved);return draft;})().catch(error=>{draftStatus.textContent='No se pudo guardar el respaldo local. Descarga el respaldo antes de cerrar.';throw error;}).finally(()=>{writing=false;});return write;}
 function schedule(){if(!draftTimer)draftTimer=setTimeout(()=>{draftTimer=null;checkpoint().catch(()=>{});},1000);}
 async function download(){await halt().catch(()=>{});const sequence=await raw(),packet={format:'yod-chinche-borrador-v1',version:1,created:new Date().toISOString(),scope,complete:!pending&&(!recorder||recorder.state==='inactive')&&(!external||!!externalAudio),sequence,context:opts.draftContext?clone(opts.draftContext()):null};const url=URL.createObjectURL(new Blob([JSON.stringify(packet)],{type:'application/json'})),a=el('a');a.href=url;a.download='chinche-respaldo-'+Date.now()+'.json';box.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);draftStatus.textContent='Respaldo preparado para descargar. Comprueba el archivo antes de cerrar.';return packet;}
 backup.onclick=()=>download().catch(()=>{draftStatus.textContent='No se pudo preparar el archivo. Mantén esta ventana abierta.';});
 async function restore(draft){if(!draft||draft.v!==1||draft.scope!==scope)throw Error('Este borrador no pertenece a esta pantalla');const s=draft.sequence;validate({...s,audio:null});if(s.audio&&(typeof s.audio.data!=='string'||s.audio.data.length>7000000))throw Error('Borrador de audio inválido');await halt().catch(()=>{});if(hasContent())await checkpoint();const image=new Image();image.src=s.base;await image.decode();draftId=draft.id;saved=false;line=timeline(undefined,s.duration,clone(s.events));baseData=s.base;baseImage=image;canvas.width=s.width;canvas.height=s.height;frames=clone(s.frames);frameBytes=frames.reduce((n,f)=>n+f.image.length,0);lastFrame=frames.at(-1)?.t??-5000;recorder=null;chunks=[];blob=null;external=null;externalError=null;externalAudio=s.audio;offset=s.audio?.offset||0;ended=!!s.audio;record.hidden=!!s.audio;record.disabled=false;stop.hidden=true;player?.remove();player=null;previewing=false;preview.textContent='Reproducir';paint();opts.restoreContext?.(draft.context);status.textContent=draft.complete?'Borrador recuperado. Revisa la explicación y clava cuando esté lista.':'Borrador recuperado de una grabación interrumpida. Conserva también el respaldo original.';}
 drafts.onclick=async()=>{try{box.querySelector('[data-draft-list]')?.remove();const list=el('div');list.setAttribute('data-draft-list','');const records=await store.list(scope);if(!records.length)list.append(el('p','No hay borradores en esta pantalla.'));for(const d of records){const row=el('div'),b=el('button','Recuperar · '+new Date(d.updated).toLocaleString());b.type='button';b.onclick=async()=>{try{await restore(await store.get(d.id));list.remove();}catch(e){draftStatus.textContent=e.message;}};row.append(b);list.append(row);}box.append(list);}catch(e){draftStatus.textContent='No se pudieron leer los borradores. Mantén abierta tu explicación actual.';}};
 importButton.onclick=()=>importFile.click();importFile.onchange=async()=>{try{const file=importFile.files[0];if(!file)return;if(file.size>24000000)throw Error('Respaldo demasiado grande');const packet=JSON.parse(await file.text());if(packet.format!=='yod-chinche-borrador-v1'||packet.scope!==scope)throw Error('El respaldo pertenece a otra pantalla');await restore({v:1,id:'draft-'+root.crypto.randomUUID(),scope,sequence:packet.sequence,complete:packet.complete,context:packet.context});await checkpoint();}catch(e){draftStatus.textContent='No se importó: '+e.message;}finally{importFile.value='';}};
 function frame(force=false){const t=line.time();if(!force&&t-lastFrame<5000)return;if(frames.length>=240||frameBytes>4000000)return;const c=el('canvas'),scale=Math.min(1,800/canvas.width);c.width=Math.round(canvas.width*scale);c.height=Math.round(canvas.height*scale);c.getContext('2d').drawImage(canvas,0,0,c.width,c.height);const image=c.toDataURL('image/jpeg',.55);frames.push({t,image});frameBytes+=image.length;lastFrame=t;}
 function point(e,time){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(canvas.width,(e.clientX-r.left)*canvas.width/r.width)),Math.max(0,Math.min(canvas.height,(e.clientY-r.top)*canvas.height/r.height)),time===undefined?line.time():time,e.pressure||.5];}
 canvas.addEventListener('pointerdown',e=>{if(disposed||previewing||e.button!==0||!e.isPrimary||active||line.time()>MAX_MS)return;e.preventDefault();const event=line.add('stroke',{tool:select.value,color:color.value,width:Number(width.value)*(select.value==='marker'?4:1),points:[]});event.points.push(point(e,event.t));active={id:e.pointerId,event};canvas.setPointerCapture(e.pointerId);paint();});
 canvas.addEventListener('pointermove',e=>{if(!active||active.id!==e.pointerId)return;e.preventDefault();const p=point(e),a=active.event.points;if(p[2]-a[a.length-1][2]>=12&&a.length<15000){a.push(p);paint();}});
 function end(e){if(active&&active.id===e.pointerId){active.event.points.push(point(e));active=null;paint();frame(true);schedule();}}
 canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 undo.onclick=()=>{if(active||previewing)return;line.add('undo',{});paint();frame(true);schedule();};expand.onclick=()=>{const on=box.classList.toggle('chn-seq-big');expand.textContent=on?'Reducir':'Ampliar';};
 function release(){clearInterval(timer);timer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
 async function halt(){if(externalError)throw externalError;if(external){await external.stop();if(externalError)throw externalError;}if(pending)throw Error('Espera la respuesta del micrófono');if(recorder&&recorder.state!=='inactive'){recorder.stop();await finish;}release();}
 record.onclick=async()=>{
  if(disposed||pending||recorder||blob||externalAudio||external||previewing)return;
  const policy=root.document.permissionsPolicy||root.document.featurePolicy;
  if(policy&&policy.allowsFeature&&!policy.allowsFeature('microphone')){
   try{externalError=null;record.disabled=true;status.textContent='Abre la ventana de voz, pulsa Grabar y vuelve aquí para dibujar.';
    external=microphoneBridge(()=>{offset=line.time();line.add('audio-start',{});record.hidden=true;stop.hidden=false;status.textContent='Grabando voz y dibujo…';frame(true);timer=setInterval(()=>{frame();schedule();if(line.time()>=MAX_MS)halt().catch(()=>{});},5000);},audio=>{externalAudio={...audio,offset};line.add('audio-end',{});release();stop.hidden=true;record.hidden=true;status.textContent='Audio conservado · puedes reproducirlo con el dibujo.';frame(true);return checkpoint().then(()=>true,()=>false);},error=>{externalError=error;external=null;release();stop.hidden=true;record.hidden=false;record.disabled=false;status.textContent=error.message;checkpoint().catch(()=>{});});
   }catch(e){external=null;record.disabled=false;status.textContent=e.message;}return;
  }if(!root.navigator?.mediaDevices?.getUserMedia||!root.MediaRecorder){status.textContent='Este navegador no permite grabar aquí. El dibujo se conserva.';return;}
  pending=true;record.disabled=true;status.textContent='Esperando permiso del micrófono…';
  try{const opened=await root.navigator.mediaDevices.getUserMedia({audio:true});if(disposed){opened.getTracks().forEach(t=>t.stop());return;}stream=opened;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:48000});
   finish=new Promise(resolve=>{recorder.ondataavailable=e=>{if(e.data?.size){chunks.push(e.data);audioBytes+=e.data.size;schedule();if(audioBytes>5000000&&recorder.state!=='inactive')recorder.stop();}};recorder.onstop=()=>{if(ended)return;blob=new Blob(chunks,{type:chunks.find(c=>c.type)?.type||recorder.mimeType||mime});line.add('audio-end',{});ended=true;release();stop.hidden=true;record.hidden=true;status.textContent=blob.size?'Audio detenido · puedes reproducirlo con el dibujo.':'La grabación quedó vacía. El dibujo se conserva; puedes descargar su respaldo.';frame(true);resolve();checkpoint().catch(()=>{});};});
   recorder.onerror=()=>{status.textContent='La grabación se interrumpió; revisa el audio conservado.';if(recorder.state!=='inactive')recorder.stop();else recorder.onstop();};
   offset=line.time();line.add('audio-start',{});recorder.start(1000);record.hidden=true;stop.hidden=false;status.textContent='Grabando voz y dibujo…';frame(true);timer=setInterval(()=>{frame();const seconds=Math.floor((line.time()-offset)/1000);status.textContent='Grabando · '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');if(line.time()>=MAX_MS)halt().catch(()=>{});},1000);
  }catch(e){release();recorder=null;record.disabled=false;status.textContent='No se abrió el micrófono. Tu dibujo sigue disponible.';}finally{pending=false;}
 };
 stop.onclick=()=>halt().catch(e=>status.textContent=e.message);
 async function value(){await halt();active=null;paint();frame(true);await checkpoint().catch(()=>{});const s=await raw();if(line.events.some(e=>e.type==='audio-start')&&!s.audio)throw Error('La grabación no contiene audio. Descarga el respaldo; tu dibujo sigue aquí.');s.audio=normalizeAudio(s.audio);return validate(s);}
 preview.onclick=async()=>{if(busy)return;if(player){player.querySelectorAll('audio').forEach(a=>a.pause());player.remove();player=null;previewing=false;preview.textContent='Reproducir';paint();return;}busy=true;try{const s=await value();player=el('div');box.append(player);await replay(player,s);previewing=true;preview.textContent='Volver a dibujar';}catch(e){status.textContent=e.message;}finally{busy=false;}};
 const visibility=()=>{if(root.document.hidden)halt().catch(()=>{}).finally(()=>checkpoint().catch(()=>{}));},unload=e=>{if(!saved&&hasContent()){e.preventDefault();e.returnValue='';}};root.document.addEventListener('visibilitychange',visibility);root.addEventListener('beforeunload',unload);
 store.list(scope).then(records=>{if(records.length)drafts.textContent='Recuperar borrador ('+records.length+')';}).catch(()=>{draftStatus.textContent='Respaldo local no disponible. Descarga el respaldo antes de cerrar.';});
 return {box,canvas,hasContent,get pending(){return pending;},value,checkpoint,download,restore,async preserve(){await halt().catch(()=>{});return checkpoint();},async markSaved(){saved=true;clearTimeout(draftTimer);await write.catch(()=>{});await store.remove(draftId);},dispose(){disposed=true;clearTimeout(draftTimer);halt().catch(()=>{}).finally(()=>{checkpoint().catch(()=>{});external?.dispose();release();});root.document.removeEventListener('visibilitychange',visibility);root.removeEventListener('beforeunload',unload);player?.querySelectorAll('audio').forEach(a=>a.pause());player?.remove();},get events(){return line.events;}};
}
async function replay(host,s){
 validate(s);style();const box=el('section');box.className='chn-seq';const canvas=el('canvas');canvas.width=s.width;canvas.height=s.height;const ctx=canvas.getContext('2d'),base=new Image();base.src=s.base;await base.decode();const audio=el('audio');audio.controls=false;audio.hidden=true;if(s.audio)audio.src=s.audio.data;const seek=el('input');seek.type='range';seek.min='0';seek.max=String(s.duration);seek.value='0';seek.style.maxWidth='none';seek.style.width='100%';seek.setAttribute('aria-label','Momento de la explicación');const play=el('button','Reproducir secuencia'),label=el('div','0:00');play.type='button';box.append(canvas,seek,play,label);if(s.audio)box.append(audio);host.append(box);let raf=0,playing=false,wall=0,start=0;
 function show(t){t=Math.max(0,Math.min(s.duration,t));seek.value=String(t);ctx.clearRect(0,0,s.width,s.height);ctx.drawImage(base,0,0);draw(ctx,s.events,t);label.textContent=(t/1000).toFixed(1)+' s / '+(s.duration/1000).toFixed(1)+' s';}
 const audioEnd=s.audio?(s.events.find(e=>e.type==='audio-end')?.t??s.duration):0;
 function pause(){playing=false;cancelAnimationFrame(raf);audio.pause();play.textContent='Continuar';}
 function tick(){if(!box.isConnected){pause();return;}let t=start+performance.now()-wall;
  if(s.audio&&t>=s.audio.offset&&t<audioEnd){if(audio.paused&&!audio.ended){audio.currentTime=Math.max(0,(t-s.audio.offset)/1000);audio.play().catch(()=>pause());}if(!audio.paused){t=s.audio.offset+audio.currentTime*1000;start=t;wall=performance.now();}}
  show(t);if(t>=s.duration){pause();play.textContent='Reproducir secuencia';return;}if(playing)raf=requestAnimationFrame(tick);
 }
 play.onclick=()=>{if(playing){pause();return;}start=Number(seek.value);if(start>=s.duration)start=0;wall=performance.now();if(s.audio)audio.currentTime=Math.max(0,(start-s.audio.offset)/1000);playing=true;play.textContent='Pausar';tick();};
 seek.oninput=()=>{pause();show(Number(seek.value));if(s.audio)audio.currentTime=Math.max(0,(Number(seek.value)-s.audio.offset)/1000);};
 audio.onplay=()=>{if(!playing){start=s.audio.offset+audio.currentTime*1000;wall=performance.now();playing=true;play.textContent='Pausar';tick();}};
 audio.onended=()=>{if(playing){start=audioEnd;wall=performance.now();}};
 show(0);return box;
}
return {VERSION,MAX_BYTES,timeline,visibleStrokes,draw,validate,normalizeAudio,audioType,draftStore,mount,replay};
});

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
  if(seen.hash){if(seen.id!==ch.id)return {state:'uncertain'};if(seen.hash!==sha256)return {state:'conflict'};return {state:'received',id:ch.id,hash:sha256};}
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

/* END CHINCHE SEQUENCE SHARED */
(function(){if(typeof window==='undefined')return;var pending;window.YodChincheCapture=function(){if(window.html2canvas)return Promise.resolve(window.html2canvas);if(pending)return pending;pending=new Promise(function(resolve,reject){var s=document.createElement('script'),timer=setTimeout(function(){reject(Error('Captura no disponible'));},8000);s.src='https://yodesarrollomx.github.io/yod-portal/vendor/html2canvas.min.js?v=1.4.1';s.async=true;s.onload=function(){clearTimeout(timer);window.html2canvas?resolve(window.html2canvas):reject(Error('Captura no disponible'));};s.onerror=function(){clearTimeout(timer);reject(Error('Captura no disponible'));};document.head.appendChild(s);});return pending;};})();

/* ═══════════════════════════════════════════════════════════════════════════
   LA CHINCHE · capturador de pendientes de YOD OS
   ───────────────────────────────────────────────────────────────────────────
   Picas donde algo está mal, señalas, dictas qué quieres, y se clava. Se van
   acumulando. Luego escoges varios y sale UN encargo que Claude lee completo.

   Decisiones que no son negociables y por qué:
   · Todo vive en el navegador (IndexedDB). Clavar NO toca la red: funciona sin
     señal y es instantáneo. Acumular es local por naturaleza.
   · localStorage se toca UNA sola vez y solo para un número (el conteo de la
     pastilla). Ni un byte de imagen: ese origen ya carga la clave del portero y
     la memoria de carriles de seis boards, y llenarlo los rompe a todos.
   · La foto se RECORTA alrededor del clic. Medido en este mismo Chrome: el
     lienzo completo en PNG pesa 1,586 KB y solo caben 3; el recorte en JPEG
     pesa 112 KB y caben ~45. Y además se entiende mejor, porque ya viene
     enfocado en lo que señalaste.
   · Fuera del tablero no se finge una foto. El camino de serializar HTML falla
     EN SILENCIO —entrega imágenes mudas sin lanzar error— y clavarías veinte
     pendientes creyendo que quedaron señalados. Ahí se guarda el contexto real
     del DOM, que para un formulario es más exacto que una foto.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
"use strict";
if (window.YODChinche) return;

var BD = "yodChinche", VER = 1, LSN = "yod_chinche_n";
var db = null, PANT = "os", CTX = {}, abierta = false;
// Guards are ephemeral callbacks, never stored or transmitted. A 3D draft cannot
// auto-send after reload or under another person without its live composer guard.
var despachoGuards = new Map();
var botonesObservados = false;
var SUPERFICIES_PRIVADAS = ['despacho-trabajo','despacho-corcho','despacho-hilo'];
function rutaTecnica(el){
  var partes = [];
  while (el && el.nodeType === 1) {
    var tag = el.tagName.toLowerCase(), index = 1, prev = el.previousElementSibling;
    while (prev) { if (prev.tagName === el.tagName) index++; prev = prev.previousElementSibling; }
    if (index > 9999) return '';
    partes.unshift(tag + ':nth-of-type(' + index + ')');
    el = el.parentElement;
  }
  var ruta = partes.join(' > ');
  return ruta.length <= 600 ? ruta : '';
}
function codigoInterfaz(objeto){
  if (!objeto || objeto.tipo !== 'interfaz-privada' || SUPERFICIES_PRIVADAS.indexOf(objeto.superficie) === -1 ||
      typeof objeto.ruta !== 'string' || objeto.ruta.length > 600 ||
      !/^[a-z][a-z0-9-]*:nth-of-type\([1-9][0-9]{0,3}\)(?: > [a-z][a-z0-9-]*:nth-of-type\([1-9][0-9]{0,3}\))*$/.test(objeto.ruta) ||
      !(objeto.tarjeta === null || Number.isInteger(objeto.tarjeta) && objeto.tarjeta >= 0 && objeto.tarjeta <= 9999)) return '';
  return 'Interfaz | superficie=' + objeto.superficie + ' | control=' + objeto.ruta + ' | tarjeta=' + (objeto.tarjeta === null ? 'general' : objeto.tarjeta);
}
function etiquetaAnotacion(op){
  var labels = {'despacho-trabajo':'Mi trabajo','despacho-corcho':'Mi corcho','despacho-hilo':'Detalle del encargo',
    office:'Oficina',areas:'Áreas',help:'Ayuda',agent:'Agente',chat:'Conversación',tasks:'Revisión del trabajo',evidence:'Evidencia',sources:'Fuentes',browser:'Navegador',ppp:'PPP',knowledge:'Conocimiento',library:'Biblioteca',activity:'Actividad',goals:'Objetivos',permissions:'Permisos',visits:'Visitas',environment:'Entorno',circle:'Círculo',residents:'Puesto del agente',profile:'Perfil',voice:'Voz',terminal:'Terminal'};
  var obj=op.objeto || {},ui=obj.despacho3d && obj.despacho3d.target.ui;
  if(ui)return 'Despacho virtual · ' + (labels[ui.surface] || 'Interfaz') + (ui.item === null ? '' : ' · Tarjeta ' + (ui.item+1));
  if(obj.tipo === 'interfaz-privada')return (labels[obj.superficie] || 'Interfaz') + (obj.tarjeta === null ? '' : ' · Tarjeta ' + (obj.tarjeta+1));
  return op.seccion || 'El punto señalado';
}
function guardDespacho(ch){
  if (!ch || !ch.objeto || !ch.objeto.despacho3d) return true;
  var guard = despachoGuards.get(ch.id);
  try { return typeof guard === "function" && guard() === true; } catch (e) { return false; }
}
function codigoDespacho(objeto){
  if (!objeto || objeto.tipo !== "despacho3d" || !objeto.despacho3d) return "";
  var api = window.YodDespachoChinches;
  return api && typeof api.formatContext === "function" ? api.formatContext(objeto.despacho3d) : "";
}

/* ── el número de la pastilla se lee de localStorage para pintarlo YA,
      sin esperar a que IndexedDB abra ── */
function leerN(){ try { return parseInt(localStorage.getItem(LSN) || "0", 10) || 0; } catch (e) { return 0; } }
function guardarN(n){
  try { localStorage.setItem(LSN, String(n)); } catch (e) {}
  /* embebido en YOD OS: la pastilla vive en el documento padre; avisarle */
  try { if (window.parent !== window) window.parent.postMessage({ yodChinche: n }, location.origin); } catch (e) {}
}

/* ── quién está clavando: la identidad validada del OS si la hay ── */
function quien(){
  if (typeof CTX.quien === "function") return String(CTX.quien());
  if (CTX.localOnly) return "Usuario de la presentación · sin identidad verificada";
  try {
    var d = JSON.parse(sessionStorage.getItem("yod_id_v1") || "null");
    var n = d && d.nombre ? String(d.nombre).trim() : "";
    if (n) return n;
  } catch (e) {}
  return "Alejandro";
}

function abrirBD(){
  return new Promise(function (ok, mal) {
    if (db) return ok(db);
    var p = indexedDB.open(BD, VER);
    p.onupgradeneeded = function (e) {
      var d = e.target.result;
      if (!d.objectStoreNames.contains("chinches")) {
        var s = d.createObjectStore("chinches", { keyPath: "id" });
        s.createIndex("estado", "estado"); s.createIndex("creado", "creado");
      }
      if (!d.objectStoreNames.contains("fotos")) d.createObjectStore("fotos", { keyPath: "id" });
    };
    /* iPhone: dentro del marco de YOD OS la base a veces NUNCA contesta (ni éxito ni
       error). Sin tope, «Clavar» se quedaba colgado y fallaba. */
    var tope = setTimeout(function(){ mal({ name: "la base del aparato no contestó" }); }, 4000);
    p.onsuccess = function (e) {
      clearTimeout(tope); db = e.target.result;
      db.onclose = function(){ db = null; };          /* Safari la cierra al ir a segundo plano */
      db.onversionchange = function(){ try { db.close(); } catch (x) {} db = null; };
      ok(db);
    };
    p.onerror = function () { clearTimeout(tope); mal(p.error); };
    p.onblocked = function () { clearTimeout(tope); mal({ name: "la base está ocupada en otra pestaña" }); };
  });
}
function tx(almacenes, modo){
  try { return db.transaction(almacenes, modo); }
  catch (e) { db = null; throw e; }   /* conexión muerta: la siguiente vez se reabre */
}
function pedir(req){ return new Promise(function(ok,mal){ req.onsuccess=function(){ok(req.result);}; req.onerror=function(){mal(req.error);}; }); }

async function todas(){
  await abrirBD();
  var r = await pedir(tx(["chinches"], "readonly").objectStore("chinches").getAll());
  return r.sort(function (a, b) { return (a.creado < b.creado) ? 1 : -1; });
}
async function foto(id){
  await abrirBD();
  var f = await pedir(tx(["fotos"], "readonly").objectStore("fotos").get(id));
  if (f) ["full","mini"].forEach(function(k){
    if (f[k] && !(f[k] instanceof Blob)) f[k] = new Blob([f[k]], { type: f[k+"Mime"] || "image/jpeg" });
  });
  return f;
}
async function guardar(ch, blobFull, blobMini){
  await abrirBD();
  if (!guardDespacho(ch)) throw new Error("La sesión del Despacho cambió");
  // ArrayBuffer avoids WebKit's Blob-to-IDB file preparation failure; schema and IDs stay the same.
  var full = CTX.fotosPortables && blobFull ? await blobFull.arrayBuffer() : blobFull;
  var chica = CTX.fotosPortables && blobMini ? await blobMini.arrayBuffer() : blobMini;
  var t = tx(["chinches", "fotos"], "readwrite");
  t.objectStore("chinches").put(ch);
  if (blobFull || blobMini) t.objectStore("fotos").put({ id: ch.id, full: full, mini: chica, fullMime: blobFull && blobFull.type, miniMime: blobMini && blobMini.type });
  return new Promise(function (ok, mal) {
    t.oncomplete = async function () { guardarN((await pendientes()).length); pintarPastilla(); ok(); };
    t.onerror = function(){ mal(t.error); };
  });
}
async function borrar(id){
  await abrirBD();
  var t = tx(["chinches", "fotos"], "readwrite");
  t.objectStore("chinches").delete(id); t.objectStore("fotos").delete(id);
  return new Promise(function (ok) {
    t.oncomplete = async function () { guardarN((await pendientes()).length); pintarPastilla(); ok(); };
    t.onerror = function(){ ok(); }; t.onabort = function(){ ok(); };
  });
}
/* ═══ ENVÍO DIRECTO (24-sep, Alejandro: «directo, nada de mandar después; que se vayan guardando
   y cuando las vayas leyendo vayas reparando») ═══
   Toda chinche de un tablero sale sola al Sheet de la Sala (acción «produccion», la misma que usa la
   Sala) con la llave del YOD OS que ya vive en este aparato. El puente horario de sala-edicion la
   vuelve issue 📌 y el revisor diario la trabaja. Si no hay llave o no hay red, se queda «nueva» y se
   reintenta al abrir cualquier tablero; «Mandar a Claude» sigue como respaldo manual. La Sala tiene
   su propio gancho (CTX.alClavar) y no pasa por aquí. */
// Public presentation: delivery is explicit through the device share sheet.
var GAS_SALA = "";
function llaveOS(){
  if (CTX.localOnly || !GAS_SALA) return "";
  try { return localStorage.getItem("pyod_clave_v1") || localStorage.getItem("sala_clave") || ""; } catch (e) { return ""; }
}
async function marcar(id, campos){
  await abrirBD();
  var t = tx(["chinches"], "readwrite"), s = t.objectStore("chinches");
  return new Promise(function (ok) {
    var g = s.get(id);
    g.onsuccess = function(){ var c = g.result; if (c) { Object.keys(campos).forEach(function(k){ c[k] = campos[k]; }); s.put(c); } };
    t.oncomplete = async function () { guardarN((await pendientes()).length); pintarPastilla(); ok(); };
    t.onerror = function(){ ok(); }; t.onabort = function(){ ok(); };
  });
}
async function enviarDirecto(ch){
  if(CTX.localOnly)return false;
  if (ch && ch.secuencia) {
    try { var receipt=await window.YodChincheEntrega.client().send(ch,function(){return guardDespacho(ch);});
      if(receipt.state==='received'){await marcar(ch.id,{estado:'mandada',delivery:receipt,mandada:new Date().toISOString(),via:'secuencia-v1'});return true;}
      enviarDirecto.motivo=receipt.state==='waiting'?'el servidor aún no tiene almacenamiento de secuencias activo':'falta confirmar el paquete completo';return false;
    } catch(e){enviarDirecto.motivo='no se confirmó el paquete completo';return false;}
  }
  if (CTX.localOnly || !GAS_SALA) { enviarDirecto.motivo = "esta presentación conserva revisiones locales"; return false; }
  if (!guardDespacho(ch)) { enviarDirecto.motivo = "el borrador 3D necesita revisión en su sesión autorizada"; return false; }
  var llave = llaveOS();
  if (!ch || ch.estado === "mandada") return false;
  if (!llave) { enviarDirecto.motivo = "no hay llave del YOD OS en este navegador"; return false; }
  var d = new Date(), p2 = function(n){ return (n < 10 ? "0" : "") + n; };
  var el = ch.elemento || {};
  var detalle = JSON.stringify({ id: ch.id, folio: ch.folio || "", texto: ch.texto, tipo: ch.tipo || "", repo: ch.repo, pantalla: ch.pantalla,
    vista: (ch.repo || "") + "/" + (ch.pantalla || ""), url: ch.url, quien: ch.quien,
    elemento: { css: el.css || (ch.ancla && ch.ancla.css) || "", texto: (el.texto || "").slice(0, 300), seccion: el.seccion || "" },
    objeto: ch.objeto || null, codigo: ch.codigo || "" });
  var envio = { accion: "produccion", clave: llave, fecha: d.getFullYear() + "-" + p2(d.getMonth()+1) + "-" + p2(d.getDate()),
    pieza: "ENCARGO · chinche · " + (ch.repo || "") + "/" + (ch.pantalla || ""), estado: "pendiente", detalle: detalle, enlace: ch.url || "" };
  try {
    var ctl = new AbortController(), tt = setTimeout(function(){ ctl.abort(); }, 20000);
    if (!guardDespacho(ch)) { clearTimeout(tt); return false; }
    var r = await fetch(GAS_SALA, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(envio), signal: ctl.signal });
    clearTimeout(tt);
    var j = null; try { j = JSON.parse(await r.text()); } catch (e) {}
    if (!guardDespacho(ch)) return false;
    if (!r.ok || !j || j.error) { enviarDirecto.motivo = "la Sala contestó: " + ((j && j.error) || ("HTTP " + r.status)); return false; }
    if (db) try { await conTopeError(marcar(ch.id, { estado: "mandada", mandada: new Date().toISOString(), via: "directo" }), 4000, "base"); } catch (e) {}
    return true;
  } catch (e) { enviarDirecto.motivo = "sin red hacia la Sala (" + ((e && e.name) || "error") + ")"; return false; }
}
async function enviarPendientes(){
  if (CTX.localOnly || !GAS_SALA || CTX.alClavar || !llaveOS()) return;
  try { var ps = await pendientes(); for (var i = 0; i < ps.length; i++) await enviarDirecto(ps[i]); } catch (e) {}
}

async function pendientes(){ return (await todas()).filter(function (c) { return c.estado !== "mandada"; }); }

/* ── identificadores legibles y ordenables ── */
function sello(d){
  function p(n){ return (n < 10 ? "0" : "") + n; }
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
function nuevoId(d){
  function p(n){ return (n < 10 ? "0" : "") + n; }
  var r = Math.random().toString(16).slice(2, 6);
  return "CHN-" + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + "-" + r;
}
/* ── el repo al que pertenece la pantalla: en yodesarrollomx.github.io cada repo
      vive en su carpeta (/potenciales-yod/…, /yod-portal/…); la raíz es el repo del sitio.
      Todas comparten ORIGEN y por eso comparten la pila: cada chinche guarda el suyo. ── */
var ORG = "yodesarrollomx";
function repoDe(url){
  try {
    var u = new URL(url, location.href);
    if (/github\.io$/.test(u.hostname)) {
      var seg = u.pathname.split("/").filter(Boolean)[0] || "";
      return seg && !/\.html?$/.test(seg) ? seg : u.hostname;
    }
  } catch (e) {}
  return "";
}
/* CH-2 · el folio del proyecto donde se clavó: por el tablero de ese proyecto
   (registro yod-portal/os/proyectos.js) o por lo que diga la pantalla. */
function folioActual(){
  try {
    var RP = window.YodProyectos; if (!RP) return CTX.folio || "";
    var aqui = location.href.split("#")[0];
    var p = RP.lista.filter(function(x){ return x.tablero && aqui.indexOf(x.tablero) === 0; })[0];
    if (!p && CTX.proyecto) p = RP.buscar(CTX.proyecto);
    return (p && p.folio) || CTX.folio || "";
  } catch (e) { return ""; }
}
function repoActual(){ return CTX.repo || repoDe(location.href) || "yod-portal"; }
function repoDeChinche(c){ return c.repo || repoDe(c.url || "") || "yod-portal"; }
function aparato(){
  var u = navigator.userAgent;
  return /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : "Mac";
}

/* ═══ LA FOTO · compone las dos capas del lienzo, marca el punto y recorta ═══ */
function capturarLienzo(cx,cy){
 var base=CTX.canvas,luz=CTX.luz;if(!base)return null;
 var scale=Math.min(1,1920/base.width,1920/base.height),c=document.createElement('canvas');c.width=Math.max(1,Math.round(base.width*scale));c.height=Math.max(1,Math.round(base.height*scale));var g=c.getContext('2d');g.drawImage(base,0,0,c.width,c.height);if(luz)g.drawImage(luz,0,0,c.width,c.height);flecha(g,cx*scale,cy*scale);return {canvas:c,x0:0,y0:0,ancho:base.width,alto:base.height};
}
/* la flecha se dibuja con sombra para que se lea sobre cualquier fondo */
function flecha(g, x, y){
  g.save();
  g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 6; g.shadowOffsetY = 2;
  g.strokeStyle = "#D93A34"; g.lineWidth = 3.5; g.lineCap = "round";
  g.beginPath(); g.arc(x, y, 19, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(x + 15, y + 15); g.lineTo(x + 52, y + 52); g.stroke();
  g.fillStyle = "#D93A34";
  g.beginPath(); g.moveTo(x + 14, y + 14); g.lineTo(x + 30, y + 18); g.lineTo(x + 18, y + 30); g.closePath(); g.fill();
  g.restore();
}
/* ═══ LA TARJETA · fuera del lienzo no se finge una foto: se dibuja el dato ═══ */
function tarjetaContexto(info){
  var c = document.createElement("canvas"); c.width = 640; c.height = 420;
  var g = c.getContext("2d");
  g.fillStyle = "#FCF8EE"; g.fillRect(0, 0, 640, 420);
  g.strokeStyle = "#8B7A57"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 637, 417);
  g.fillStyle = "#8B7A57"; g.fillRect(0, 0, 640, 6);
  g.fillStyle = "#2E2A22"; g.textAlign = "left";
  g.font = "800 26px 'Helvetica Neue',Arial,sans-serif";
  g.fillText(info.pantalla || "pantalla", 26, 56);
  g.font = "600 15px 'Helvetica Neue',Arial,sans-serif"; g.fillStyle = "#6B6151";
  g.fillText(info.seccion || "", 26, 82);
  var y = 124;
  g.font = "700 13px ui-monospace,Menlo,monospace"; g.fillStyle = "#8B7A57";
  g.fillText("ELEMENTO", 26, y); y += 20;
  g.font = "500 14px ui-monospace,Menlo,monospace"; g.fillStyle = "#2E2A22";
  cortar(g, info.css || "—", 26, y, 588, 18, 2); y += 46;
  if (info.texto) {
    g.font = "700 13px ui-monospace,Menlo,monospace"; g.fillStyle = "#8B7A57";
    g.fillText("DICE", 26, y); y += 20;
    g.font = "600 16px 'Helvetica Neue',Arial,sans-serif"; g.fillStyle = "#2E2A22";
    cortar(g, info.texto, 26, y, 588, 20, 2); y += 48;
  }
  var vals = info.valores || {};
  var ks = Object.keys(vals).filter(function (k) { return String(vals[k] || "").trim(); });
  if (ks.length) {
    g.font = "700 13px ui-monospace,Menlo,monospace"; g.fillStyle = "#8B7A57";
    g.fillText("LO QUE ESTABA ESCRITO", 26, y); y += 20;
    g.font = "500 14px ui-monospace,Menlo,monospace"; g.fillStyle = "#2E2A22";
    ks.slice(0, 5).forEach(function (k) { cortar(g, k + ": " + vals[k], 26, y, 588, 18, 1); y += 20; });
  }
  g.fillStyle = "#1F2430"; g.fillRect(0, 366, 640, 54);
  g.fillStyle = "#E8EAED"; g.font = "600 14px 'Helvetica Neue',Arial,sans-serif";
  g.fillText("sin foto · contexto capturado del formulario", 26, 398);
  return c;
}
function cortar(g, txt, x, y, ancho, alto, maxLineas){
  var pal = String(txt).split(/\s+/), linea = "", n = 0;
  for (var i = 0; i < pal.length; i++) {
    var t = linea ? linea + " " + pal[i] : pal[i];
    if (g.measureText(t).width > ancho && linea) {
      g.fillText(linea, x, y + n * alto); linea = pal[i]; n++;
      if (n >= maxLineas) { g.fillText(linea.slice(0, 46) + "…", x, y + n * alto); return; }
    } else linea = t;
  }
  g.fillText(linea, x, y + n * alto);
}
/* 23-sep (su captura: el celular se quedó en «Clavando…» para siempre): en iPhone toBlob a veces
   NUNCA llama de vuelta, y guardar una foto (Blob) en IndexedDB puede colgarse. Nada aquí puede
   esperar sin límite: sin foto a los 3 s, y si la base no contesta se guarda sólo el texto. */
function conTope(p, ms, valor){
  return Promise.race([p, new Promise(function (ok) { setTimeout(function(){ ok(valor); }, ms); })]);
}
function conTopeError(p, ms, motivo){
  return Promise.race([p, new Promise(function (ok, mal) { setTimeout(function(){ mal({ name: motivo }); }, ms); })]);
}
function aBlob(canvas, calidad){
  return conTope(new Promise(function (ok) {
    try { canvas.toBlob(function (b) { ok(b); }, "image/jpeg", calidad || 0.7); } catch (e) { ok(null); }
  }), 3000, null);
}
function mini(canvas){
  var m = document.createElement("canvas"); m.width = 220;
  m.height = Math.round(canvas.height * (220 / canvas.width));
  m.getContext("2d").drawImage(canvas, 0, 0, m.width, m.height);
  return m;
}

/* ═══ DÓNDE VIVE ESO EN EL CÓDIGO · tabla estática. Si no hay entrada se omite;
      nunca se inventa. ═══ */
var MAPA = {
  "tablero|canica":  "tablero.html → fichaHTML() y listaHTML(); las canicas se dibujan en canica()/cuenta()",
  "tablero|grupo":   "tablero.html → listaHTML(); el ×N se dibuja en el render de la charola",
  "tablero|montón de canicas": "tablero.html → listaHTML(); el ×N se dibuja en el render de la charola",
  "tablero|":        "tablero.html → todo se dibuja en canvas; empieza por pintar() y las tablas KPIHEX/ORIG/PROJ",
  "tablero|hex":     "tablero.html → hexTile() y las tablas KPIHEX_TOP / KPIHEX_BOT",
  "tablero|torre":   "tablero.html → origenes() y la tabla ORIG",
  "tablero|maqueta": "tablero.html → proyectos() y la tabla PROJ",
  "tablero|charola": "tablero.html → crmSurcos() / crmAbaco() y setLeadsCRM()",
  "obra|":           "obra.html → pintarEstado() / pintarCaptura() / pintarBandeja()",
  "os|":             "os/index.html + os/app.js"
};
function dondeVive(pantalla, clase){
  return MAPA[pantalla + "|" + (clase || "")] || MAPA[pantalla + "|"] || "";
}

/* ═══════════════════════ LA PASTILLA ═══════════════════════ */
var pastilla = null;
function pintarPastilla(){
  if (!pastilla) return;
  var n = leerN();
  pastilla.textContent = n ? "📌 " + n : "📌";
  pastilla.className = "chn-pastilla" + (n >= 40 ? " llena" : n ? " con" : "");
  pastilla.title = n ? n + " pendientes clavados · tócalo para mandarlos" : "Clavar un pendiente de esta pantalla";
}

/* ═══════════════════════ LA HOJA DE ANOTAR ═══════════════════════ */
function hoja(html, alto){
  var v = document.createElement("div");
  v.className = "chn-velo";
  v.innerHTML = '<div class="chn-hoja" style="max-height:' + (alto || "72vh") + '">' + html + "</div>";
  var modal = Array.from(document.querySelectorAll('dialog[open]')).filter(function(d){ try { return d.matches(':modal'); } catch(e) { return false; } }).pop();
  v._focus = document.activeElement;
  (modal || document.body).appendChild(v);
  if (modal) {
    v._modal = modal;
    v._cancelModal = function(e){ e.preventDefault(); var ta=v.querySelector('.chn-txt'); if ((v._secuencia && v._secuencia.hasContent()) || (ta && ta.value.trim())) { if(ta) ta.focus(); } else cerrar(v); };
    modal.addEventListener('cancel',v._cancelModal);
  }
  document.body.classList.add("chn-abierto");   // cada pantalla esconde lo suyo
  try { if (typeof CTX.alAbrir === "function") CTX.alAbrir(); } catch (e) {}
  abierta = true;
  v._urls = [];   /* objectURLs de ESTA hoja: cerrar() los revoca todos */
  v.addEventListener("click", function (e) {
    if (e.target !== v) return;
    /* un dictado a medias no se tira por un toque de más junto al teclado */
    var ta = v.querySelector(".chn-txt");
    if ((v._secuencia && v._secuencia.hasContent()) || (ta && ta.value.trim())) { if (ta) ta.focus(); return; }
    cerrar(v);
  });
  /* rAF no corre con la pestaña atrás: sin el respaldo, la hoja se queda
     sin su clase y desplazada 14px para siempre */
  var enc = function(){ v.classList.add("on"); };
  requestAnimationFrame(enc); setTimeout(enc, 90);
  return v;
}
function cerrar(v){
  if (v._secuencia) v._secuencia.dispose();
  v.querySelectorAll('audio').forEach(function(a){a.pause();});
  v.classList.remove("on"); abierta = false;
  if (v._modal) v._modal.removeEventListener('cancel',v._cancelModal);
  (v._urls || []).forEach(function(u){ try { URL.revokeObjectURL(u); } catch(e){} });
  v._urls = [];
  /* si hay otra hoja debajo (entregar encima de la pila), la clase se queda */
  if (document.querySelectorAll(".chn-velo").length <= 1)
    document.body.classList.remove("chn-abierto");
  try { if (typeof CTX.alCerrar === "function") CTX.alCerrar(); } catch (e) {}
  setTimeout(function(){ v.remove(); try { if (v._focus && v._focus.isConnected) v._focus.focus(); } catch(e) {} }, 180);
}
function aviso(t){
  var a = document.createElement("div");
  a.className = "chn-aviso"; a.textContent = t;
  document.body.appendChild(a);
  var enc = function(){ a.classList.add("on"); };
  requestAnimationFrame(enc); setTimeout(enc, 90);
  setTimeout(function(){ a.classList.remove("on"); setTimeout(function(){ a.remove(); }, 250); }, 1600);
}

/* anotar() lo llama el tablero cuando picas "Pedir cambio aquí", o la pastilla
   en cualquier otra pantalla. */
async function anotar(op){
  op = op || {};
  var esDespacho = op.clase === "despacho3d", cancelada = false, guardId = null;
  function vigente(){
    if (!esDespacho) return true;
    try { return !cancelada && typeof op.puedeGuardar === "function" && op.puedeGuardar() === true; } catch (e) { return false; }
  }
  if (esDespacho && (!vigente() || !codigoDespacho(op.objeto))) return null;
  var screenCapture = !op.sinCaptura && !(CTX.canvas && op.x != null) ? window.YodChincheCapture().then(function(capture){return capture(document.body,{backgroundColor:'#f7f5ed',useCORS:true,allowTaint:false,logging:false,scale:Math.min(1,1920/innerWidth,1920/innerHeight),width:innerWidth,height:innerHeight,x:scrollX,y:scrollY,windowWidth:innerWidth,windowHeight:innerHeight,ignoreElements:function(n){return !!(n.closest&&n.closest('.chn-velo,.chn-seq,[data-private-capture]'));}});}).catch(function(){return null;}):null;
  var d = new Date();
  var esLienzo = !op.sinCaptura && !!(CTX.canvas && op.x != null && op.y != null);
  var cap = esLienzo ? capturarLienzo(op.x, op.y) : null;
  var lienzo = op.sinCaptura ? null : cap ? cap.canvas : tarjetaContexto({
    pantalla: PANT, seccion: op.seccion || (CTX.seccion ? CTX.seccion() : ""),
    css: op.css || "", texto: op.texto || "", valores: op.valores || (CTX.valores ? CTX.valores() : {})
  });

  /* la hoja se pinta y el foco se pide DENTRO del gesto: si hubiera un await
     antes, iOS ya no sube el teclado (ni el micrófono que promete el texto).
     La foto llega un instante después, al <img> ya puesto. */
  var v = hoja(
    '<div class="chn-tit">¿Qué quieres que cambie aquí?</div>' +
    (op.sinCaptura ? '<p class="chn-nota">Estás señalando: ' + esc(etiquetaAnotacion(op)) + '</p>' : '') +
    '<img class="chn-foto" alt="lo que señalaste">' +
    '<div class="chn-chips">' +
      ['Cambiar','Quitar','Agregar','Está mal'].map(function(t){
        return '<button type="button" class="chn-chip" data-v="' + t + '">' + t + '</button>'; }).join("") +
    '</div>' +
    '<textarea class="chn-txt" placeholder="Escríbelo o pica 🎙 Dictar y dilo en voz alta."></textarea>' +
    '<div class="chn-pie"><button type="button" class="chn-btn2" data-x>Cancelar</button>' +
    '<button type="button" class="chn-btn2 chn-mic" data-mic>🎙 Dictar</button>' +
    '<button type="button" class="chn-btn" data-ok>Clavar</button></div>', "86vh");

  var ta = v.querySelector(".chn-txt"), tipo = "";
  try { ta.focus(); } catch(e){}
  dictado(v.querySelector("[data-mic]"), ta, v);
  var baseSeq = lienzo;
  if (!baseSeq) { baseSeq = document.createElement('canvas'); baseSeq.width=960; baseSeq.height=540;
    var bg=baseSeq.getContext('2d'); bg.fillStyle='#f7f5ed';bg.fillRect(0,0,960,540);bg.fillStyle='#263c30';bg.font='20px sans-serif';bg.fillText('Superficie privada · referencia técnica conservada',24,40); }
  v.querySelector('.chn-foto').remove();
  var seqHost=document.createElement('div');v.querySelector('.chn-chips').before(seqHost);
  function mountRecorded(base,kind){if(!v.isConnected)return;seqHost.textContent='';v._secuencia=window.YodChincheSecuencia.mount(seqHost,base,{baseKind:kind,draftContext:function(){return {texto:ta.value,tipo:tipo};},restoreContext:function(c){if(c&&typeof c.texto==='string'){ta.value=c.texto;tipo=String(c.tipo||tipo);}}});if(kind==='context-card'){var warning=document.createElement('p');warning.textContent='Referencia de contexto: la captura de pantalla no estuvo disponible.';seqHost.prepend(warning);}}
  if(screenCapture){seqHost.textContent='Preparando captura de pantalla…';screenCapture.then(function(c){mountRecorded(c||baseSeq,c?'capture':'context-card');});}
  else mountRecorded(baseSeq,op.sinCaptura?'technical-context':esLienzo?'capture':'context-card');
  // Voice recording owns the microphone; legacy transcription is not recording.
  v.querySelector('[data-mic]').hidden=true;
  ta.placeholder='Comentario opcional. También puedes grabar tu explicación mientras dibujas.';
  v.querySelectorAll(".chn-chip").forEach(function (b) {
    b.onclick = function () {
      v.querySelectorAll(".chn-chip").forEach(function(o){ o.classList.remove("on"); });
      b.classList.add("on"); tipo = b.dataset.v.toLowerCase();
      if (!ta.value.trim()) { ta.value = b.dataset.v + " "; }
      ta.focus();
    };
  });
  function cancelar(){ cancelada = true; if (guardId) despachoGuards.delete(guardId); cerrar(v); }
  v.querySelector("[data-x]").onclick = async function(){try{if(v._secuencia&&v._secuencia.hasContent())await v._secuencia.preserve();cancelar();}catch(e){aviso("No cierres todavía: descarga el respaldo para conservar la explicación.");}};
  v.querySelector("[data-ok]").onclick = async function () {
    if (!vigente()) { cancelar(); aviso("La sesión del Despacho cambió; abre de nuevo la petición"); return; }
    var texto = ta.value.trim();
    if (!texto && v._secuencia && v._secuencia.hasContent()) texto = "Explicación de voz y dibujo adjunta";
    if (!texto) { ta.focus(); ta.placeholder = "Escribe qué quieres que cambie…"; return; }
    var btn = this;
    btn.disabled = true; btn.textContent = "Clavando…";
    var ch = {
      id: nuevoId(d), creado: d.toISOString(), sello: sello(d), quien: quien(),
      texto: texto, tipo: tipo, estado: "nueva",
      pantalla: PANT, repo: repoActual(), url: op.sinUrlParams ? location.origin + location.pathname : location.href.split("#")[0], aparato: aparato(), folio: op.sinFolio ? '' : folioActual(),
      vista: op.vista || (CTX.vista ? CTX.vista() : ""),
      modo: esLienzo ? "lienzo" : "contexto",
      ancla: esLienzo
        ? { x: +(op.x / CTX.canvas.width).toFixed(4), y: +(op.y / CTX.canvas.height).toFixed(4),
            clase: op.clase || "", css: "" }
        : { x: null, y: null, clase: op.clase || "", css: op.css || "" },
      objeto: op.objeto || null,
      elemento: esLienzo ? null : {
        css: op.css || "", texto: op.texto || "",
        seccion: op.seccion || (CTX.seccion ? CTX.seccion() : ""),
        valores: op.valores || (CTX.valores ? CTX.valores() : {})
      },
      codigo: [dondeVive(PANT, op.clase || ""), codigoDespacho(op.objeto), codigoInterfaz(op.objeto)].filter(Boolean).join(" · ")
    };
    if (esDespacho) { guardId = ch.id; despachoGuards.set(ch.id, vigente); }
    try { if (typeof CTX.alAntesClavar === "function") CTX.alAntesClavar(ch); } catch(e) {}
    try {
      if(!v._secuencia)throw Error('Espera a que termine la captura');
      if(v._secuencia.hasContent()) ch.secuencia = await v._secuencia.value();
      await window.YodChincheEntrega.bind(ch);
      var full = op.sinCaptura ? null : await aBlob(v._secuencia.canvas, 0.7), chica = full ? await aBlob(mini(v._secuencia.canvas), 0.6) : null;
      if (!vigente()) { cancelar(); return; }
      try {
        await conTopeError(guardar(ch, full, chica), 6000, "la base del aparato no contestó");
      } catch (e1) {
        /* segundo intento sin fotos: el texto es lo que importa (si la base ni abrió, no se insiste) */
        if (ch.secuencia || !db) throw e1;
        if (!vigente()) { cancelar(); return; }
        await conTopeError(guardar(ch, null, null), 6000, "la base del aparato no contestó");
      }
      if (!vigente()) { cancelar(); return; }
      if(v._secuencia&&typeof v._secuencia.markSaved==='function')await v._secuencia.markSaved().catch(function(){});
      cerrar(v);
      aviso("Clavado · llevas " + leerN());
      /* 15-sep: la página que hospeda la Chinche puede querer enterarse al instante (la Sala de
         Edición manda cada chinche al Sheet como ENCARGO, y /sala la cosecha sin esperar un zip).
         Opcional y a prueba de errores: si el gancho truena, la chinche ya quedó clavada igual. */
      try { if (typeof CTX.alClavar === "function") CTX.alClavar(ch); } catch (e) {}
      if (!CTX.localOnly && typeof CTX.alClavar !== "function") {
        enviarDirecto(ch).then(function (ok) {
          if (!vigente()) return;
          aviso(ok ? "Clavado y enviado a Claude · lo revisa en la ronda diaria"
                   : "Clavado · se manda solo en cuanto haya señal (o con «Mandar a Claude»)");
        });
      }
    } catch (e) {
      if (!vigente()) { cancelar(); return; }
      if (ch.secuencia || v._secuencia) {if(typeof CTX.alErrorGuardado==='function')CTX.alErrorGuardado(e);btn.disabled=false;btn.textContent='Clavar';aviso('No se completó el guardado: '+(e.message||e.name||'error')+'. Usa Recuperar borrador o Descargar respaldo; la explicación sigue aquí.');return;}
      // Embedded hosts own their delivery. Never silently fall back to Sala or email.
      if (CTX.localOnly || typeof CTX.alClavar === "function") {
        btn.disabled = false; btn.textContent = "Clavar";
        if (typeof CTX.alErrorGuardado === "function") CTX.alErrorGuardado(e);
        aviso("No se pudo guardar. Conserva el comentario y vuelve a intentar.");
        return;
      }
      /* La base del aparato falló (iPhone dentro del marco): el destino real es la Sala,
         así que se manda DIRECTO. Solo si eso también falla se avisa que no quedó. */
      db = null;
      btn.textContent = "Mandando directo…";
      var ok = false;
      try { ch.estado = "nueva"; ok = await enviarDirecto(ch); } catch (e2) {}
      if (!vigente()) { cancelar(); return; }
      if (ok) { cerrar(v); aviso("Enviado directo a Claude · lo revisa en la ronda diaria"); return; }
      /* cuota llena o base cerrada y sin red: NO fingir que quedó. El texto sigue en la
         hoja para copiarlo a mano. */
      btn.disabled = false; btn.textContent = "Clavar";
      aviso("NO se pudo guardar ni mandar (" + (enviarDirecto.motivo || (e && e.name) || "error") + ") · usa ✉ Correo");
      /* último recurso que siempre existe: el correo del propio teléfono, con todo el contexto */
      if (!v.querySelector("[data-mail]")) {
        var m = document.createElement("a");
        m.className = "chn-btn2"; m.setAttribute("data-mail", "");
        m.style.cssText = "display:block;text-align:center;margin-top:10px;text-decoration:none";
        m.textContent = "✉ Mandarlo por correo";
        m.href = "mailto:<EMAIL>?subject=" + encodeURIComponent("📌 Chinche · " + (ch.repo || "") + "/" + (ch.pantalla || "")) +
          "&body=" + encodeURIComponent(texto + "\n\n— Dónde: " + (ch.url || "") + "\n— Elemento: " + ((ch.elemento && (ch.elemento.seccion || ch.elemento.texto)) || "") + "\n— " + ch.sello);
        v.querySelector(".chn-pie").after(m);
      }
    }
  };
  return { cancel:cancelar };
}

/* ═══ SEÑALAR · para las pantallas que no son lienzo ═══
   En el tablero se pica una canica y ya se sabe qué señaló. En obra.html y en
   YOD OS no hay canicas: hay filas, tarjetas y botones. Este modo deja tocar
   cualquier cosa de la pantalla y se queda con lo que ESA cosa dice —no con
   una foto—, porque para un renglón de catálogo el texto exacto vale más que
   un pixelazo, y porque serializar el HTML a imagen falla en silencio. */
var senalando = null;
function ruta(el){
  var p = [], n = el, saltos = 0;
  while (n && n.nodeType === 1 && saltos < 3) {
    var t = n.tagName.toLowerCase();
    if (n.id) { p.unshift(t + "#" + n.id); break; }
    var cl = (n.className && typeof n.className === "string")
      ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    p.unshift(t + cl); n = n.parentElement; saltos++;
  }
  return p.join(" ");
}
function seccionDe(el){
  /* primero el bloque más cercano que se nombra a sí mismo: si no, el bucle
     de abajo devuelve el PRIMER encabezado del documento (el saludo del hero)
     para cosas que no tienen encabezado propio, como la barra o el menú */
  var b = el.closest && el.closest("section,article,nav,aside,header,[data-seccion],[aria-labelledby],[aria-label]");
  while (b) {
    var etq = "";
    if (b.getAttribute("data-seccion")) etq = b.getAttribute("data-seccion");
    else if (b.getAttribute("aria-labelledby")) {
      var r = document.getElementById(b.getAttribute("aria-labelledby"));
      if (r) etq = legible(r);
    } else if (b.getAttribute("aria-label")) etq = b.getAttribute("aria-label");
    if (etq && etq.trim()) return etq.trim().slice(0, 80);
    b = b.parentElement && b.parentElement.closest
      ? b.parentElement.closest("section,article,nav,aside,header,[data-seccion],[aria-labelledby],[aria-label]")
      : null;
  }
  var n = el;
  while (n && n !== document.body) {
    var h = n.querySelector && n.querySelector("h1,h2,h3,h4,[data-seccion]");
    if (h && legible(h)) return legible(h).slice(0, 80);
    n = n.parentElement;
  }
  var t = document.querySelector("h1,h2");
  return t ? legible(t).slice(0, 80) : "";
}
/* lo que estaba escrito adentro: pares etiqueta→valor si los hay, si no las
   primeras celdas. Sirve para reconocer el renglón aunque cambie de lugar. */
/* innerText y no textContent: textContent pega los hijos sin respirar y
   entrega "Pinturano empieza0.0%" en vez de "Pintura no empieza 0.0%" */
function legible(el){
  var t = (el.innerText != null ? el.innerText : el.textContent) || "";
  return t.replace(/\s+/g, " ").trim();
}
function valoresDe(el){
  var v = {}, n = 0;
  el.querySelectorAll("th,td,dt,dd,label,[data-k],[data-v]").forEach(function (c) {
    if (n >= 6) return;
    var t = legible(c);
    if (!t || t.length > 80) return;
    v["c" + (++n)] = t;
  });
  if (!n) {
    var t = legible(el);
    if (t) v.c1 = t.slice(0, 120);
  }
  return v;
}
/* Shared opt-in cards use a technical anchor. Their private contents never become
   a context image or an automatic issue attachment. The human writes the request. */
function anotarElemento(el){
  if (!el || !el.closest) return Promise.resolve(null);
  var privado = el.closest('[data-chinche-privado="true"]');
  if (privado) {
    var scope = el.closest('[data-chinche-surface]') || privado;
    var surface = scope.getAttribute('data-chinche-surface');
    if (SUPERFICIES_PRIVADAS.indexOf(surface) === -1) surface = 'despacho-trabajo';
    var card = el.closest('[data-chinche-item]'), raw = card && card.getAttribute('data-chinche-item');
    var item = raw !== null && raw !== '' && /^[0-9]{1,4}$/.test(raw) ? Number(raw) : null;
    var objeto = {tipo:'interfaz-privada',superficie:surface,ruta:rutaTecnica(el),tarjeta:item};
    if (!codigoInterfaz(objeto)) { aviso('No pude identificar ese control. Señala de nuevo.'); return Promise.resolve(null); }
    return anotar({css:objeto.ruta,texto:'Interfaz privada · ' + surface,seccion:surface,valores:{referencia:codigoInterfaz(objeto)},
      clase:'interfaz-privada',objeto:objeto,vista:surface,sinCaptura:true,sinFolio:true,sinUrlParams:true});
  }
  return anotar({css:rutaTecnica(el) || ruta(el),texto:legible(el).slice(0,160),seccion:seccionDe(el),valores:valoresDe(el),clase:el.tagName.toLowerCase()});
}
function instalarBotones(){
  if (botonesObservados) return;
  botonesObservados = true;
  function agregar(){
    document.querySelectorAll('[data-chinche-card]').forEach(function(card){
      if (card.matches('button,a') || card.closest('[class*="chn-"]') || card.querySelector('[data-chinche-abrir],[data-chinche-personal]')) return;
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-chinche-abrir','');
      b.className = 'yod-pin-card'; b.textContent = '📌 Pedir cambio'; b.setAttribute('aria-label','Pedir un cambio en esta tarjeta');
      card.appendChild(b);
    });
  }
  window.addEventListener('click',function(e){
    var b = e.target.closest && e.target.closest('[data-chinche-abrir]');
    if (!b || b.disabled) return;
    var card = b.closest('[data-chinche-card]'); if (!card) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (senalando) senalando();
    if (!abierta) anotarElemento(card);
  },true);
  agregar();
  if (typeof MutationObserver !== 'undefined') new MutationObserver(agregar).observe(document.body,{childList:true,subtree:true});
}
/* Los tableros embebidos (iframe del mismo origen) traen su propia Chinche. Un toque
   dentro del iframe NUNCA llega a este documento: por eso en el cel "no dejaba
   seleccionar" nada. Al señalar aquí, se enciende también el modo señalar adentro. */
function marcosHijos(){
  var out = [];
  try {
    document.querySelectorAll("iframe").forEach(function (f) {
      try {
        var r = f.getBoundingClientRect();
        if (!r.width || !r.height || f.hidden) return;
        var w = f.contentWindow;
        if (w && w.YODChinche && w.YODChinche.senalar) out.push(w);
      } catch (e) {}   /* otro origen: no se puede, se queda el aviso de siempre */
    });
  } catch (e) {}
  return out;
}
function modoSenalar(){
  if (senalando) return;
  var hijos=marcosHijos(); hijos.forEach(function(w){try{w.YODChinche.senalar();}catch(e){}});
  var marco=document.createElement("div"); marco.className="chn-marco";
  var pista=document.createElement("button"); pista.type="button"; pista.className="chn-pista";
  pista.textContent="Toca exactamente lo que quieres cambiar · aquí para salir";
  var modal = Array.from(document.querySelectorAll('dialog[open]')).filter(function(d){ try { return d.matches(':modal'); } catch(e) { return false; } }).pop();
  (modal || document.body).appendChild(marco);(modal || document.body).appendChild(pista);
  function punto(ev){var t=(ev.changedTouches&&ev.changedTouches[0])||(ev.touches&&ev.touches[0]);return{x:t?t.clientX:ev.clientX,y:t?t.clientY:ev.clientY};}
  function bajo(ev){var p=punto(ev);if(p.x==null||p.y==null||isNaN(p.x))return null;return document.elementFromPoint(p.x,p.y);}
  function mio(el){return!!(el&&el.closest&&el.closest('[class*="chn-"],[data-chinche-abrir]'));}
  function area(r){return Math.max(0,r.width)*Math.max(0,r.height);}
  function visible(el){if(!el||el.nodeType!==1)return false;var r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>=8&&r.height>=8&&s.display!=="none"&&s.visibility!=="hidden"&&s.pointerEvents!=="none";}
  /* Elegir la unidad visual útil evita seleccionar una tarjeta/sección completa
     cuando el dedo cayó sobre un texto, KPI, renglón o control concreto. */
  function unidad(el,x,y){
    if(!el||mio(el))return el;
    var sel='button,a,input,select,textarea,label,summary,td,th,li,[role="button"],[role="tab"],[data-card],[data-k],[data-v],.card,.kpi,.stat,.metric,.tile,.chip,.pill,.row,.fila,.item';
    var directo=el.closest&&el.closest(sel);
    if(directo&&visible(directo)){var rd=directo.getBoundingClientRect();if(rd.width<=Math.max(520,innerWidth*.94)&&rd.height<=Math.max(240,innerHeight*.42))return directo;}
    var cur=el,viewport=Math.max(1,innerWidth*innerHeight),mejor=el;
    while(cur&&cur!==document.body&&cur!==document.documentElement){
      if(visible(cur)){var r=cur.getBoundingClientRect(),a=area(r);if(a<=viewport*.28&&r.height<=Math.max(260,innerHeight*.45))mejor=cur;else break;}
      cur=cur.parentElement;
    }
    var rb=mejor&&mejor.getBoundingClientRect();
    if(rb&&area(rb)>viewport*.28){
      var candidatos=[].slice.call(mejor.querySelectorAll(sel)).filter(visible).filter(function(n){var r=n.getBoundingClientRect();return x>=r.left-8&&x<=r.right+8&&y>=r.top-8&&y<=r.bottom+8;}).sort(function(a,b){return area(a.getBoundingClientRect())-area(b.getBoundingClientRect());});
      if(candidatos[0])mejor=candidatos[0];
    }
    return mejor||el;
  }
  function objetivo(ev){var raw=bajo(ev);if(!raw)return null;var p=punto(ev);return unidad(raw,p.x,p.y);}
  function resaltar(el){if(!el||mio(el))return;var r=el.getBoundingClientRect();marco.style.top=r.top+"px";marco.style.left=r.left+"px";marco.style.width=r.width+"px";marco.style.height=r.height+"px";marco._el=el;}
  function mover(ev){resaltar(objetivo(ev));}
  var t0=null;
  function marcar(ev){var t=ev.touches&&ev.touches[0];t0=t?{x:t.clientX,y:t.clientY,ms:Date.now()}:null;resaltar(objetivo(ev));}
  function tomar(ev){
    if(ev.type==="touchend"){var t=ev.changedTouches&&ev.changedTouches[0];if(!t0||!t||Math.abs(t.clientX-t0.x)>10||Math.abs(t.clientY-t0.y)>10||Date.now()-t0.ms>900){t0=null;return;}t0=null;}
    var raw=bajo(ev);if(!raw)return;if(raw.closest&&raw.closest(".chn-pista")){ev.preventDefault();salir();return;}if(mio(raw))return;
    if(raw.tagName==="IFRAME"){ev.preventDefault();ev.stopPropagation();salir();aviso("La chinche de ese tablero se activa dentro del marco");return;}
    var p=punto(ev),el=unidad(raw,p.x,p.y);if(!el||mio(el))return;
    ev.preventDefault();ev.stopImmediatePropagation();salir();
    anotarElemento(el);
  }
  function tecla(ev){if(ev.key==="Escape")salir();}
  function salir(){senalando=null;hijos.forEach(function(w){try{w.YODChinche.salirSenalar();}catch(e){}});hijos=[];try{if(window.parent!==window&&window.parent.YODChinche)window.parent.YODChinche.salirSenalar();}catch(e){}document.removeEventListener("mousemove",mover,true);document.removeEventListener("touchmove",mover,true);document.removeEventListener("touchstart",marcar,true);window.removeEventListener("click",tomar,true);window.removeEventListener("touchend",tomar,true);document.removeEventListener("keydown",tecla,true);marco.remove();pista.remove();}
  senalando=salir;document.addEventListener("mousemove",mover,true);document.addEventListener("touchmove",mover,true);document.addEventListener("touchstart",marcar,true);window.addEventListener("click",tomar,true);window.addEventListener("touchend",tomar,true);document.addEventListener("keydown",tecla,true);
}

/* ═══ DICTAR · voz a texto con el reconocimiento del navegador (Chrome/Android,
      Safari iOS 14.5+). Escribe en vivo en el texto; lo que ya estaba se respeta. ═══ */
function dictado(btn, ta, hojaV){
  if (!btn) return;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    btn.onclick = function(){ ta.focus(); aviso("Este navegador no transcribe: usa el 🎤 del teclado"); };
    return;
  }
  var rec = null, base = "", oyendo = false;
  function parar(){ oyendo = false; btn.textContent = "🎙 Dictar"; btn.classList.remove("on"); try { rec && rec.stop(); } catch (e) {} }
  btn.onclick = function(){
    if (oyendo) { parar(); return; }
    rec = new SR();
    rec.lang = "es-MX"; rec.continuous = true; rec.interimResults = true;
    base = ta.value ? ta.value.replace(/\s*$/, " ") : "";
    rec.onresult = function(ev){
      var fin = "", par = "";
      for (var i = 0; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) fin += t; else par += t;
      }
      ta.value = base + fin + par;
    };
    rec.onerror = function(ev){
      parar();
      aviso(ev.error === "not-allowed" || ev.error === "service-not-allowed"
        ? "Permite el micrófono para esta página y vuelve a picar 🎙"
        : "No se oyó bien (" + ev.error + "). Pica 🎙 otra vez");
    };
    rec.onend = function(){ if (oyendo) parar(); };
    try { rec.start(); oyendo = true; btn.textContent = "■ Parar"; btn.classList.add("on"); }
    catch (e) { aviso("No arrancó el micrófono"); }
  };
  /* que no se quede oyendo si se cierra la hoja */
  var obs = new MutationObserver(function(){ if (!hojaV.isConnected) { parar(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true });
}

/* ═══════════════════════ LA PILA ═══════════════════════ */
async function pila(){
  if (CTX.localOnly) { aviso("Abre Revisiones desde el menú de esta presentación."); return; }
  var list = await todas();
  var vivas = list.filter(function(c){ return c.estado !== "mandada"; });
  var idas  = list.filter(function(c){ return c.estado === "mandada"; });
  if (!vivas.length && !idas.length) {
    /* sin lienzo no hay nada que fotografiar todavía: primero se señala.
       En el tablero todo ES lienzo: la ruta buena es picar la canica. */
    if (!CTX.canvas) return modoSenalar();
    aviso("Pica una canica y usa ✎ Pedir cambio aquí");
    return;
  }

  var v = hoja('<div class="chn-cab"><b>' + vivas.length + '</b> ' +
      (vivas.length === 1 ? "chinche" : "chinches") +
      (idas.length ? ' <span class="chn-gris">· ' + idas.length + " ya mandadas</span>" : "") +
      '<button type="button" class="chn-todos" data-todos>Todos</button></div>' +
    (CTX.canvas ? "" :
      '<button type="button" class="chn-senalar" data-senalar>&#9998; Señalar algo de esta pantalla</button>') +
    '<div class="chn-lista" data-lista></div>' +
    '<div class="chn-amarre"><input type="text" data-amarre placeholder="¿Algo que amarre a todos? (opcional)"></div>' +
    '<div class="chn-pie"><button type="button" class="chn-btn2" data-x>Cerrar</button>' +
    '<button type="button" class="chn-btn" data-pedir>Pedir el cambio</button></div>', "90vh");

  var cont = v.querySelector("[data-lista]");
  var grupos = {};
  vivas.concat(idas).forEach(function (c) { (grupos[c.pantalla] = grupos[c.pantalla] || []).push(c); });
  var html = "";
  Object.keys(grupos).forEach(function (p) {
    html += '<div class="chn-grupo">' + p + ' · ' + grupos[p].length + "</div>";
    grupos[p].forEach(function (c) {
      var ida = c.estado === "mandada";
      html += '<label class="chn-fila' + (ida ? " ida" : "") + '" data-id="' + c.id + '">' +
        '<input type="checkbox" ' + (ida ? "" : "checked") + ' data-sel="' + c.id + '">' +
        '<span class="chn-mini" data-mini="' + c.id + '"></span>' +
        '<span class="chn-cuerpo"><span class="chn-frase">' + esc(c.texto) + "</span>" +
        '<span class="chn-meta">' + [c.pantalla, c.vista, c.objeto && c.objeto.id, c.sello]
          .filter(Boolean).map(esc).join(" · ") + (ida ? " · ya mandada" : "") + "</span></span>" +
        '<button type="button" class="chn-borra" data-borra="' + c.id + '" title="Borrar">×</button></label>';
    });
  });
  cont.innerHTML = html;
  list.filter(function(c){return !!c.secuencia;}).forEach(function(c){
    var row=cont.querySelector('[data-id="'+c.id+'"]');if(!row)return;
    var play=document.createElement('button');play.type='button';play.className='chn-btn2';play.textContent='Reproducir voz y dibujo';
    play.onclick=function(e){e.preventDefault();e.stopPropagation();var h=hoja('<div class="chn-tit">Explicación sincronizada</div><div data-replay></div><button type="button" class="chn-btn2" data-close-replay>Cerrar</button>','94vh');window.YodChincheSecuencia.replay(h.querySelector('[data-replay]'),c.secuencia).catch(function(){aviso('No se pudo abrir la secuencia');});h.querySelector('[data-close-replay]').onclick=function(){h.querySelectorAll('audio').forEach(function(a){a.pause();});cerrar(h);};};row.appendChild(play);
  });

  list.forEach(async function (c) {
    var f = await foto(c.id);
    var el = cont.querySelector('[data-mini="' + c.id + '"]');
    if (!el) return;
    if (f && f.mini) { var u = URL.createObjectURL(f.mini); v._urls.push(u); el.style.backgroundImage = "url(" + u + ")"; }
    else el.textContent = "sin foto";
  });

  cont.querySelectorAll("[data-borra]").forEach(function (b) {
    b.onclick = async function (e) {
      e.preventDefault(); e.stopPropagation();
      await borrar(b.dataset.borra);
      var f = b.closest(".chn-fila"); if (f) f.remove();
      repintarCuentas();
    };
  });
  /* al borrar con × hay que recontar: si no, la cabecera sigue diciendo "3
     chinches" con la lista ya vacía y contradice a la pastilla */
  function repintarCuentas(){
    var filas = cont.querySelectorAll(".chn-fila");
    if (!filas.length) { cerrar(v); aviso("Sin pendientes"); return; }
    var nv = cont.querySelectorAll(".chn-fila:not(.ida)").length;
    var ni = filas.length - nv;
    var cab = v.querySelector(".chn-cab b");
    if (cab) {
      cab.textContent = String(nv);
      if (cab.nextSibling) cab.nextSibling.textContent = " " + (nv === 1 ? "chinche" : "chinches");
    }
    var gr = v.querySelector(".chn-cab .chn-gris");
    if (gr) { if (ni) gr.textContent = "· " + ni + " ya mandadas"; else gr.remove(); }
    [].forEach.call(cont.querySelectorAll(".chn-grupo"), function (g) {
      var n = 0, x = g.nextElementSibling;
      while (x && x.classList.contains("chn-fila")) { n++; x = x.nextElementSibling; }
      if (!n) g.remove();
      else g.textContent = g.textContent.replace(/ · \d+$/, " · " + n);
    });
  }

  v.querySelector("[data-todos]").onclick = function () {
    /* solo las vivas: las mandadas ya soltaron su foto grande y reincluirlas
       produce encargos que prometen capturas que no van */
    var cs = cont.querySelectorAll(".chn-fila:not(.ida) [data-sel]");
    var alguno = [].some.call(cs, function(x){ return !x.checked; });
    [].forEach.call(cs, function (x) { x.checked = alguno; });
  };
  v.querySelector("[data-x]").onclick = function(){ cerrar(v); };
  var bs = v.querySelector("[data-senalar]");
  if (bs) bs.onclick = function () {
    /* en el tablero ya se señala picando la canica; aquí es para todo lo demás */
    cerrar(v); setTimeout(modoSenalar, 220);
  };
  v.querySelector("[data-pedir]").onclick = async function () {
    var ids = [].filter.call(cont.querySelectorAll("[data-sel]"), function(x){ return x.checked; })
                 .map(function(x){ return x.dataset.sel; });
    if (!ids.length) { aviso("No escogiste ninguna"); return; }
    var amarre = v.querySelector("[data-amarre]").value.trim();
    /* la pila se queda abierta mientras se empaca: si se cerrara ya, la
       pastilla vuelve a ser tocable y se apilan hojas */
    var btn = this; btn.disabled = true; btn.textContent = "Armando el encargo…";
    try { await entregar(ids, amarre, v); }
    catch (e) {
      btn.disabled = false; btn.textContent = "Pedir el cambio";
      aviso("No se pudo armar: " + ((e && e.message) || "error"));
    }
  };
}
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
  return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]; }); }

/* ═══════════════════════ EL ENCARGO ═══════════════════════ */
function nombreEncargo(d){
  function p(n){ return (n<10?"0":"")+n; }
  return "YOD-E-" + d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
}
async function armarTexto(ids, amarre){
  var list = (await todas()).filter(function(c){ return ids.indexOf(c.id) > -1; })
                            .sort(function(a,b){ return a.creado < b.creado ? -1 : 1; });
  var d = new Date(), nom = nombreEncargo(d);
  /* PRIMERO se averigua qué fotos existen de verdad: el texto y el zip salen
     de esta misma lista, así que no pueden contradecirse. Una mandada ya
     soltó su .jpg grande; queda la miniatura y el texto lo dice. */
  var fotos = {}, nf0 = 0;
  for (var i = 0; i < list.length; i++) {
    if (list[i].modo !== "lienzo") continue;
    var f = await foto(list[i].id);
    var b = f && (f.full || f.mini);
    nf0++;
    fotos[list[i].id] = b
      ? { nombre: nom + "-" + nf0 + ".jpg", blob: b, esMini: !(f && f.full) }
      : null;
  }
  var conFoto = Object.keys(fotos).filter(function(k){ return fotos[k]; }).length;
  var L = [];
  L.push("# Encargo " + nom + " · " + list.length + (list.length===1?" cambio":" cambios"));
  L.push(quien() + " · " + sello(d) + " (America/Hermosillo) · desde " + aparato());
  var repos = list.map(repoDeChinche).filter(function(r, i, a){ return a.indexOf(r) === i; });
  L.push("Repo: " + repos.map(function(r){ return ORG + "/" + r; }).join(", ") +
         " · publicado en " + repos.map(function(r){ return r.indexOf(".") > -1 ? r : ORG + ".github.io/" + r + "/"; }).join(", "));
  L.push("Capturas junto a este archivo: " + conFoto);
  L.push("");
  if (amarre) { L.push("**Lo que quiero con todo esto:** " + amarre); L.push(""); }
  list.forEach(function (c, i) {
    L.push("────────────────────────────────────────────────────────────────");
    L.push("## " + (i+1) + " · " + (c.tipo ? c.tipo.toUpperCase() : "CAMBIO") + " · " +
           repoDeChinche(c) + " · " + c.pantalla + (c.vista ? ' · vista "' + c.vista + '"' : ""));
    if (c.url) L.push("- **Página:** " + c.url);
    if (c.folio) L.push("- **Proyecto (folio):** " + c.folio);
    L.push("");
    L.push("**Dice " + (c.quien || "Alejandro") + ':** "' + c.texto + '"');
    L.push("");
    if (c.modo === "lienzo") {
      L.push("- **Punto exacto:** fracción x=" + c.ancla.x + " y=" + c.ancla.y + " del lienzo" +
             (c.ancla.clase ? " · señaló un " + c.ancla.clase : ""));
      if (c.objeto) {
        var o = c.objeto, partes = [];
        ["id","tipo","zona","st","nodo","origen","filtro","resp","dias","valor","accion"].forEach(function (k) {
          if (o[k] != null && o[k] !== "") partes.push(k + " " + o[k]);
        });
        L.push("- **Objeto que tenía enfrente:** " + partes.join(" · "));
      }
      var ft = fotos[c.id];
      if (ft) L.push("- **Captura:** " + ft.nombre +
                     (ft.esMini ? " (miniatura: la grande se soltó al mandarla antes)" : ""));
      else L.push("- **Captura:** ya no está (se soltó al mandarla antes); usa el Punto exacto");
    } else {
      var e = c.elemento || {};
      if (e.seccion) L.push("- **Sección:** " + e.seccion);
      if (e.css)     L.push("- **Elemento:** `" + e.css + "`");
      if (e.texto)   L.push('- **Dice el elemento:** "' + e.texto + '"');
      var vs = e.valores || {}, ks = Object.keys(vs).filter(function(k){ return String(vs[k]||"").trim(); });
      if (ks.length) L.push("- **Lo que estaba escrito:** " + ks.map(function(k){ return k + "=" + JSON.stringify(vs[k]); }).join(" · "));
      L.push("- **Sin captura de píxeles** (esta pantalla no es lienzo; el contexto de arriba es el dato real)");
    }
    var geometria = codigoDespacho(c.objeto);
    if (geometria) L.push("- **Contexto geométrico del Despacho:** " + geometria);
    if (c.codigo) L.push("- **Dónde vive eso en el código:** " + c.codigo);
    L.push("- Clavado el " + c.sello + " · desde " + c.aparato + " · id " + c.id);
    L.push("");
  });
  L.push("────────────────────────────────────────────────────────────────");
  L.push("### Cómo leer esto, Claude");
  L.push("");
  L.push('- **"Dice ..." es textual.** No lo interpretes de más ni lo pulas.');
  if (list.some(function(c){ return c.modo === "lienzo"; })) {
    L.push('- **"Objeto" es dato del sistema**, no opinión: es el mismo objeto que el tablero tenía en la mano al picar.');
    L.push("- **La flecha roja de la foto no viaja en el texto.** Para saber a qué apunta usa \"Punto exacto\",");
    L.push("  que es la fracción del clic real sobre el lienzo. Si los .jpg están junto al .md, ábrelos y ahí sí la ves.");
    L.push("- **El tablero cenital es un canvas 2D con homografía:** no hay DOM que inspeccionar adentro, todo se");
    L.push("  dibuja con paths y fillText. La ficha que sale al picar sí es HTML, encima del lienzo.");
  }
  if (list.some(function(c){ return c.modo !== "lienzo"; }))
    L.push('- **"Sección", "Elemento" y "Lo que estaba escrito"** son el DOM real de la página al clavar: búscalos en el archivo de "Página".');
  L.push("- Si algo no se entiende, pregunta por su número antes de tocar nada.");
  return { nombre: nom, texto: L.join("\n"), lista: list, fotos: fotos };
}
/* ═══ MANDAR A CLAUDE · un issue por repo, ya escrito ═══
   El issue es la cola que el revisor diario lee (etiqueta «chinche»). Sin llaves en la
   página: GitHub abre el formulario con título, cuerpo y etiqueta puestos y él solo toca
   «Submit». Las fotos no caben en una URL; el issue lo dice y el .zip sigue a la mano. */
var MAX_CUERPO = 5500;
/* GitHub contesta «Bad request» a URLs de más de ~8 KB, y lo que cuenta es la URL YA
   codificada: un acento vale 6 caracteres y un salto de línea 3, así que 5,500 de texto
   pueden ser 12,000 de URL (bug 23-sep: dos chinches de 1,500 y 2,000). Arriba de este
   tope el encargo viaja por el portapapeles y la URL lleva sólo el título. */
var MAX_URL = 6000;
async function armarIssues(ids, amarre){
  var list = (await todas()).filter(function(c){ return ids.indexOf(c.id) > -1; });
  var grupos = {};
  list.forEach(function(c){ var r = repoDeChinche(c); (grupos[r] = grupos[r] || []).push(c.id); });
  var out = [];
  for (var repo in grupos) {
    var t = await armarTexto(grupos[repo], amarre);
    var cuerpo = t.texto, conFoto = Object.keys(t.fotos || {}).filter(function(k){ return t.fotos[k]; }).length;
    if (conFoto) cuerpo += "\n\n> Hay " + conFoto + " captura(s) que no caben en el issue: pídeselas a " + quien() + " (vienen en " + t.nombre + ".zip).";
    if (cuerpo.length > MAX_CUERPO) cuerpo = cuerpo.slice(0, MAX_CUERPO) + "\n\n…(recortado: el encargo completo está en " + t.nombre + ".md; pídeselo a " + quien() + ")";
    var primera = t.lista[0], n = t.lista.length;
    var titulo = "📌 " + (n > 1 ? n + " chinches · " : "") + primera.pantalla + " · " +
                 primera.texto.replace(/\s+/g, " ").slice(0, 70);
    var base = "https://github.com/" + (CTX.org || ORG) + "/" + repo + "/issues/new?labels=chinche&title=" + encodeURIComponent(titulo);
    var url = base + "&body=" + encodeURIComponent(cuerpo), largo = url.length > MAX_URL;
    var completo = t.texto + (conFoto ? "\n\n> Hay " + conFoto + " captura(s) en " + t.nombre + ".zip; pídeselas a " + quien() + "." : "");
    if (largo) url = base + "&body=" + encodeURIComponent("Pega aquí el encargo (Cmd/Ctrl+V): ya está en tu portapapeles.");
    out.push({ repo: repo, ids: grupos[repo], n: n, url: url, largo: largo, texto: completo });
  }
  return out;
}
async function entregar(ids, amarre, vAnterior){
  var r = await armarTexto(ids, amarre);
  var issues = [];
  try { issues = await armarIssues(ids, amarre); } catch (e) { issues = []; }
  /* el paquete se arma ANTES de pintar la hoja, igual que el texto del
     portapapeles y por la misma razón: `await` se come el gesto del usuario y
     Chrome bloquea la descarga en silencio —la hoja se cerraba como si hubiera
     funcionado y no bajaba nada—. Con el blob ya listo, el botón es un clic
     seco dentro del gesto. */
  var piezas = null, zip = null, fallo = "";
  try { piezas = piezasDe(r); zip = await armarZip(piezas); }
  catch (e) { fallo = (e && e.message) ? e.message : "no se pudo empacar"; }
  /* compartir archivos no existe en todos lados: el botón solo sale si el
     aparato DICE que puede (en macOS Chrome navigator.share existe pero
     rechaza archivos: botón muerto sin este filtro) */
  var archivos = (piezas || []).map(function (p) {
    return new File([p.blob], p.nombre, { type: p.blob.type });
  });
  var puedeCompartir = !!(navigator.share && navigator.canShare &&
                          archivos.length && navigator.canShare({ files: archivos }));
  if (vAnterior) cerrar(vAnterior);   /* la pila se despide justo cuando esta hoja entra */
  var v = hoja('<div class="chn-tit">Encargo listo · ' + r.lista.length +
      (r.lista.length===1?" cambio":" cambios") + "</div>" +
    '<div class="chn-nota">Se llama <b>' + r.nombre + '</b>. <b>Mandar a Claude</b> abre el pendiente en GitHub ya escrito: ' +
      'toca «Submit» y el revisor diario lo corrige y te contesta ahí. O escoge otra vía:</div>' +
    (issues.length ? '<div class="chn-ops">' + issues.map(function (it, i) {
      return '<a class="chn-btn" style="text-align:center;text-decoration:none" target="_blank" rel="noopener" data-issue="' + i + '" href="' +
        esc(it.url) + '">Mandar a Claude' + (issues.length > 1 ? " · " + esc(it.repo) + " (" + it.n + ")" : "") + "</a>"; }).join("") + "</div>" : "") +
    '<div class="chn-ops">' +
      '<button type="button" class="chn-btn" data-copiar>Copiar la orden</button>' +
      '<button type="button" class="chn-btn2" data-bajar>Bajar a la Mac</button>' +
      (puedeCompartir ? '<button type="button" class="chn-btn2" data-compartir>Compartir</button>' : "") +
    "</div>" +
    '<pre class="chn-pre">' + esc(r.texto.slice(0, 1200)) + (r.texto.length > 1200 ? "\n…" : "") + "</pre>" +
    '<div class="chn-pie"><button type="button" class="chn-btn2" data-x>Cerrar</button></div>', "88vh");

  /* el texto YA está armado antes de pintar la hoja: si se leyera la base al
     tocar el botón, Safari bloquea el portapapeles por salirse del gesto —
     y falla SOLO en el celular, que es el peor tipo de falla. */
  v.querySelectorAll("[data-issue]").forEach(function (a) {
    a.onclick = function () {
      var it = issues[+a.dataset.issue];
      /* encargo largo: va por el portapapeles (texto ya armado, dentro del gesto) y
         GitHub abre sólo con el título */
      if (it.largo) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(it.texto).then(function () {
            aviso("Encargo largo: ya está en tu portapapeles · pégalo en el cuerpo del issue");
          }, function () { aviso("No dejó copiar: usa «Copiar la orden» y pégalo en GitHub"); });
        } else aviso("No dejó copiar: usa «Copiar la orden» y pégalo en GitHub");
      }
      /* NO se marca como mandada al abrir: si GitHub falla o no se toca «Submit», la pila
         se queda viva. Se marca sólo cuando él confirma que el issue quedó creado. */
      a.textContent = it.largo ? "Abierto · pega el encargo (Cmd/Ctrl+V) y toca «Submit»" : "Abierto en GitHub · toca «Submit» allá";
      a.style.opacity = ".6";
      var ok = document.createElement("button");
      ok.type = "button"; ok.className = "chn-btn2"; ok.textContent = "Ya quedó el issue en GitHub ✓";
      ok.onclick = function () { marcarIdas(it.ids, false); ok.disabled = true; ok.textContent = "Marcadas como mandadas"; };
      if (!a.nextSibling || !a.nextSibling.dataset || a.nextSibling.dataset.okIssue === undefined) {
        ok.dataset.okIssue = a.dataset.issue; a.parentNode.insertBefore(ok, a.nextSibling);
      }
    };
  });
  v.querySelector("[data-copiar]").onclick = async function () {
    /* copiar lleva SOLO texto: las fotos grandes se quedan guardadas para
       poder bajar el zip después */
    try { await navigator.clipboard.writeText(r.texto); }
    catch (e) { aviso("No dejó copiar; usa Bajar a la Mac"); return; }
    cerrar(v); aviso("Copiado · pégalo en Claude");
    marcarIdas(ids, false);
  };
  v.querySelector("[data-bajar]").onclick = function () {
    if (zip) {
      bajar(zip, r.nombre + ".zip");
      aviso("En ~/Downloads · dime «lee el encargo»");
      marcarIdas(ids, true); cerrar(v);
    } else {
      /* el empaque falló: baja el texto pero NO se marca nada — la pila queda
         intacta, con sus fotos, para reintentar cuando haya memoria */
      bajar(new Blob([r.texto], { type: "text/markdown" }), r.nombre + ".md");
      aviso("Bajó solo el texto (" + fallo + ") · la pila queda para reintentar");
    }
  };
  var comp = v.querySelector("[data-compartir]");
  if (comp) comp.onclick = function () {
    /* prearmado: navigator.share exige gesto vivo igual que la descarga */
    navigator.share({ files: archivos, title: r.nombre })
      .then(function(){ marcarIdas(ids, true); cerrar(v); })
      .catch(function (err) {
        /* AbortError = él canceló, eso no se regaña */
        if (err && err.name !== "AbortError") aviso("No se pudo compartir (" + err.name + "); usa Bajar a la Mac");
      });
  };
  v.querySelector("[data-x]").onclick = function(){ cerrar(v); };
}
/* ═══ UN SOLO ARCHIVO · ZIP sin comprimir, armado a mano ═══
   Chrome bloquea la descarga múltiple: baja el primer archivo y los demás los
   corta en silencio —comprobado: bajó el .md y ninguna de las 3 fotos—. Y el
   `await` entre descargas rompe la cadena del gesto, que es la otra mitad del
   problema. Un solo archivo esquiva las dos cosas. Sin comprimir porque los
   JPEG ya vienen comprimidos: apretarlos otra vez no ahorra y sí tarda. */
var TCRC = (function () {
  var t = new Uint32Array(256);
  for (var i = 0; i < 256; i++) { var c = i;
    for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0; }
  return t;
})();
function crc32(u8){
  var c = 0xFFFFFFFF;
  for (var i = 0; i < u8.length; i++) c = TCRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function fechaDOS(d){
  return { h: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF,
           f: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF };
}
async function armarZip(archivos){
  var d = fechaDOS(new Date()), partes = [], centro = [], off = 0;
  for (var i = 0; i < archivos.length; i++) {
    var nom = new TextEncoder().encode(archivos[i].nombre);
    var dat = new Uint8Array(await archivos[i].blob.arrayBuffer());
    var crc = crc32(dat);
    var lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x800, true);
    lh.setUint16(8, 0, true); lh.setUint16(10, d.h, true); lh.setUint16(12, d.f, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, dat.length, true); lh.setUint32(22, dat.length, true);
    lh.setUint16(26, nom.length, true); lh.setUint16(28, 0, true);
    partes.push(lh.buffer, nom, dat);
    var ce = new DataView(new ArrayBuffer(46));
    ce.setUint32(0, 0x02014b50, true); ce.setUint16(4, 20, true); ce.setUint16(6, 20, true);
    ce.setUint16(8, 0x800, true); ce.setUint16(10, 0, true); ce.setUint16(12, d.h, true);
    ce.setUint16(14, d.f, true); ce.setUint32(16, crc, true); ce.setUint32(20, dat.length, true);
    ce.setUint32(24, dat.length, true); ce.setUint16(28, nom.length, true);
    ce.setUint16(30, 0, true); ce.setUint16(32, 0, true); ce.setUint16(34, 0, true);
    ce.setUint16(36, 0, true); ce.setUint32(38, 0, true); ce.setUint32(42, off, true);
    centro.push(ce.buffer, nom);
    off += 30 + nom.length + dat.length;
  }
  var tamCentro = centro.reduce(function (a, p) { return a + (p.byteLength || p.length); }, 0);
  var fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(4, 0, true); fin.setUint16(6, 0, true);
  fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentro, true); fin.setUint32(16, off, true); fin.setUint16(20, 0, true);
  return new Blob(partes.concat(centro, [fin.buffer]), { type: "application/zip" });
}
/* junta el encargo entero: el texto y las MISMAS fotos que el texto promete */
function piezasDe(r){
  var piezas = [{ nombre: r.nombre + ".md", blob: new Blob([r.texto], { type: "text/markdown" }) }];
  r.lista.forEach(function(ch){if(ch.secuencia)piezas.push({nombre:ch.id+'-secuencia.json',blob:new Blob([JSON.stringify(ch)],{type:'application/json'})});});
  Object.keys(r.fotos || {}).forEach(function (id) {
    var ft = r.fotos[id];
    if (ft) piezas.push({ nombre: ft.nombre, blob: ft.blob });
  });
  return piezas;
}
function bajar(blob, nombre){
  var u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  /* 3 min: en iOS el diálogo de descarga espera al usuario y 4 s lo mataban */
  setTimeout(function(){ URL.revokeObjectURL(u); }, 180000);
}
/* mandadas: NO se borran. Se van al fondo de la pila, para que se pueda decir
   "los que te mandé el martes" y sigan ahí. La foto grande se suelta SOLO si
   este camino de entrega la llevó de verdad (zip o compartir); copiar la orden
   solo lleva texto, así que las fotos se quedan para el zip de después.
   Y todo se lee ANTES de abrir la transacción de escritura: WebKit desactiva
   una transacción de IndexedDB si cedes el microtask a media vuelta. */
async function marcarIdas(ids, soltarFotos){
  await abrirBD();
  var chs = [], fts = [];
  for (var i = 0; i < ids.length; i++) {
    var c = await pedir(tx(["chinches"], "readonly").objectStore("chinches").get(ids[i]));
    if (c) chs.push(c);
    if (soltarFotos) {
      var f = await pedir(tx(["fotos"], "readonly").objectStore("fotos").get(ids[i]));
      if (f && f.full) fts.push(f);
    }
  }
  var ahora = new Date().toISOString();
  var t = tx(["chinches", "fotos"], "readwrite");
  var s = t.objectStore("chinches"), fs = t.objectStore("fotos");
  chs.forEach(function (c) { c.estado = "mandada"; c.mandada = ahora; s.put(c); });
  fts.forEach(function (f) { f.full = null; fs.put(f); });   // conserva la miniatura
  return new Promise(function (ok) {
    t.oncomplete = async function () { guardarN((await pendientes()).length); pintarPastilla(); ok(); };
    t.onerror = function(){ ok(); }; t.onabort = function(){ ok(); };
  });
}

/* ═══════════════════════ ESTILO ═══════════════════════ */
function estilo(){
  var s = document.createElement("style");
  s.textContent = [
/* 436+: encima de porteros (obra z:50, tablero z:60), del cajón móvil de
   YOD OS (scrim 205, sidebar 210) y de la máscara del Embudo/Sala (400);
   debajo de los botones del Portero (1300) y de su reja (2147483000) */
".chn-pastilla{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:436;",
" min-width:44px;height:44px;padding:0 12px;border-radius:22px;border:1px solid rgba(46,36,18,.35);",
" background:rgba(241,228,196,.82);color:#2E2A22;font:800 14px/44px 'Helvetica Neue',Arial,sans-serif;",
" text-align:center;cursor:pointer;backdrop-filter:blur(6px);box-shadow:0 3px 14px rgba(0,0,0,.22);",
" -webkit-tap-highlight-color:transparent}",
".chn-pastilla.con{background:#E8A02B;color:#231C0E}",
".chn-pastilla.llena{background:#D93A34;color:#fff}",
/* el Portero pone su 🌙 en right:14px;bottom:14px y, si eres admin, el ⚙️ en
   bottom:64px — la pastilla se sube para que se vean los tres */
"body:has(#temaBtn) .chn-pastilla{bottom:calc(64px + env(safe-area-inset-bottom,0px))}",
"body:has(#engraneBtn) .chn-pastilla{bottom:calc(114px + env(safe-area-inset-bottom,0px))}",
".chn-velo{position:fixed;inset:0;z-index:440;background:rgba(12,10,6,.55);display:flex;align-items:flex-end;",
" justify-content:center}",
".chn-hoja{width:min(680px,100%);background:#F6F1E4;border-radius:16px 16px 0 0;padding:18px 18px",
" calc(18px + env(safe-area-inset-bottom,0px));overflow:auto;transition:transform .18s;",
" font-family:'Helvetica Neue',Arial,sans-serif;color:#2E2A22}",
".chn-hoja,.chn-hoja *{box-sizing:border-box}",
".chn-velo:not(.on) .chn-hoja{transform:translateY(14px)}",
".chn-mic.on{background:#D93A34;color:#fff;border-color:#D93A34}",
".chn-marco{position:fixed;z-index:438;pointer-events:none;border:2px solid #D93A34;",
" background:rgba(217,58,52,.12);border-radius:4px;transition:top .06s,left .06s,width .06s,height .06s}",
".chn-pista{position:fixed;z-index:442;border:0;cursor:pointer;left:50%;transform:translateX(-50%);bottom:22px;",
" background:#2E2A22;color:#F6F1E4;font:600 13px/1 'Helvetica Neue',Arial;padding:10px 16px;",
" border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.3)}",
".chn-senalar{display:block;width:100%;margin:0 0 12px;padding:11px;background:#EFE7D4;",
" border:1px dashed #8B7A57;border-radius:9px;color:#5A4C30;cursor:pointer;",
" font:700 14px/1 'Helvetica Neue',Arial}",
".chn-senalar:hover{background:#E7DCC2}",
".yod-pin-card{display:inline-flex;align-items:center;min-height:44px;margin-top:8px;padding:8px 12px;border:1px solid #8B7A57;border-radius:10px;background:#EFE7D4;color:#2E2A22;cursor:pointer;font:600 13px 'Helvetica Neue',Arial,sans-serif}",
".yod-pin-card:focus-visible{outline:3px solid #D93A34;outline-offset:3px}",
".chn-tit{font:700 19px/1.25 'Helvetica Neue',Arial;margin:0 0 12px}",
".chn-nota{font-size:14px;color:#6B6151;margin:0 0 12px}",
".chn-foto{width:100%;border-radius:8px;border:1px solid rgba(90,76,48,.4);display:block;margin-bottom:12px}",
".chn-chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}",
".chn-chip{padding:9px 14px;border-radius:18px;border:1px solid rgba(90,76,48,.45);background:#EFE7D5;",
" font:700 14px 'Helvetica Neue',Arial;color:#2E2A22;cursor:pointer}",
".chn-chip.on{background:#2E2A22;color:#F6F1E4;border-color:#2E2A22}",
".chn-txt{width:100%;min-height:96px;padding:12px;border-radius:10px;border:1px solid rgba(90,76,48,.45);",
" background:#FCF8EE;font:400 16px/1.45 'Helvetica Neue',Arial;color:#2E2A22;resize:vertical}",
".chn-pie{display:flex;gap:10px;margin-top:14px}",
".chn-btn{flex:1;padding:15px;border:none;border-radius:11px;background:#2E2A22;color:#F6F1E4;",
" font:800 16px 'Helvetica Neue',Arial;cursor:pointer}",
".chn-btn2{padding:15px 18px;border:1px solid rgba(90,76,48,.45);border-radius:11px;background:transparent;",
" color:#2E2A22;font:700 15px 'Helvetica Neue',Arial;cursor:pointer}",
".chn-btn:disabled{opacity:.55}",
".chn-cab{font:600 15px 'Helvetica Neue',Arial;margin-bottom:10px;display:flex;align-items:center;gap:8px}",
".chn-cab b{font-size:20px}",
".chn-gris{color:#8B8375}",
".chn-todos{margin-left:auto;padding:7px 13px;border:1px solid rgba(90,76,48,.45);border-radius:16px;",
" background:transparent;font:700 13px 'Helvetica Neue',Arial;cursor:pointer;color:#2E2A22}",
".chn-lista{max-height:52vh;overflow:auto;margin-bottom:12px}",
".chn-grupo{font:800 11px 'Helvetica Neue',Arial;letter-spacing:.12em;text-transform:uppercase;",
" color:#8B7A57;margin:14px 0 6px;border-bottom:1px solid rgba(139,122,87,.3);padding-bottom:4px}",
".chn-fila{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid rgba(139,122,87,.18)}",
".chn-fila.ida{opacity:.5}",
".chn-fila input{width:22px;height:22px;flex:none;margin-top:3px;accent-color:#2E2A22}",
".chn-mini{width:64px;height:44px;flex:none;border-radius:5px;background:#E3DAC4 center/cover no-repeat;",
" border:1px solid rgba(90,76,48,.3);font:600 9px/44px 'Helvetica Neue',Arial;color:#8B8375;text-align:center}",
".chn-cuerpo{flex:1;min-width:0}",
".chn-frase{display:block;font:600 15px/1.32 'Helvetica Neue',Arial}",
".chn-meta{display:block;font:500 11.5px ui-monospace,Menlo,monospace;color:#8B8375;margin-top:3px}",
".chn-borra{border:none;background:transparent;color:#B08B6A;font-size:22px;line-height:1;cursor:pointer;",
" padding:0 4px;flex:none}",
".chn-amarre input{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(90,76,48,.45);",
" background:#FCF8EE;font:400 16px 'Helvetica Neue',Arial;color:#2E2A22}",
".chn-ops{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px}",
".chn-ops .chn-btn{flex:1 1 45%}",
".chn-pre{background:#EFE7D5;border:1px solid rgba(90,76,48,.35);border-radius:9px;padding:11px;",
" font:500 11.5px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;max-height:32vh;overflow:auto;color:#3A342A}",
".chn-aviso{position:fixed;left:50%;bottom:calc(72px + env(safe-area-inset-bottom,0px));transform:translate(-50%,10px);",
" z-index:444;background:#2E2A22;color:#F6F1E4;padding:11px 20px;border-radius:22px;",
" font:700 14px 'Helvetica Neue',Arial;opacity:0;transition:.22s;pointer-events:none}",
".chn-aviso.on{opacity:1;transform:translate(-50%,0)}",
"@media (prefers-reduced-motion:reduce){.chn-velo,.chn-hoja,.chn-aviso{transition:none}}"
  ].join("");
  document.head.appendChild(s);
}

/* ═══════════════════════ ARRANQUE ═══════════════════════ */
function init(op){
  op = op || {};
  PANT = op.pantalla || "os";
  CTX = op;
  estilo();
  instalarBotones();
  if (op.sinPastilla) { pintarPastilla(); return; }
  addEventListener("message", function (ev) {
    /* solo el conteo, y solo si es un número, y solo del mismo origen */
    if (ev.origin !== location.origin) return;
    if (ev.data && typeof ev.data.yodChinche === "number") {
      guardarN(ev.data.yodChinche); pintarPastilla();
    }
  });
  pastilla = document.createElement("button");
  pastilla.type = "button";
  pastilla.setAttribute("aria-label", "Pendientes de cambio");
  pastilla.onclick = function () {
    if (senalando) { senalando(); return; }        /* la salida que sí existe en el cel */
    if (abierta) return;
    pila().catch(function (e) {
      aviso("No abre la base de pendientes (" + ((e && e.name) || "error") + ")");
    });
  };
  document.body.appendChild(pastilla);
  pintarPastilla();
  abrirBD().then(async function(){ guardarN((await pendientes()).length); pintarPastilla(); setTimeout(enviarPendientes, 1500); })
    .catch(function () {
      /* navegación privada o almacenamiento bloqueado: que no finja un conteo */
      if (pastilla) { pastilla.textContent = "📌 ×"; pastilla.title = "La base de pendientes no abre en este navegador"; }
    });
}

window.YODChinche = { version: "d14-presentation-1", localOnlyReady: true, reproducir:async function(id,host){var list=await todas(),ch=list.find(function(x){return x.id===id;});if(!ch||!ch.secuencia)throw Error("No hay secuencia local");return window.YodChincheSecuencia.replay(host,ch.secuencia);},
  init: init, preparar: abrirBD, anotar: anotar, anotarElemento: anotarElemento, pila: pila, senalar: modoSenalar, cuantas: leerN,
  salirSenalar: function(){ if (senalando) senalando(); } };
})();
