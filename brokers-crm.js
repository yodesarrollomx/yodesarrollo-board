/* Mini CRM over brokers.v1. Metadata stays in the existing append-only note.
   Financial values are observations of saved PPP fields, never calculations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.BrokersCRM=api;})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const marker='\n\n[YOD-CRM v1]\n';
  const caseMarker='\n\n[YOD-CASE v1]\n';
  const pppStates=['Por confirmar','En preparación','Listo','Presentado'];
  function caseInfo(o){
    const notes=String(o.notes||''),encoded=notes.startsWith(caseMarker.trimStart())?'\n\n'+notes:notes,i=encoded.lastIndexOf(caseMarker);
    let text=notes,ppp_status='',decision=false;
    if(i>=0)try{const m=JSON.parse(encoded.slice(i+caseMarker.length));if(m.v===1&&pppStates.includes(m.ppp_status)&&typeof m.decision==='boolean'){text=encoded.slice(0,i);ppp_status=m.ppp_status;decision=m.decision;}}catch{}
    return {text,ppp_status:ppp_status||(o.stage==='PPP presentado'?'Presentado':o.stage==='PPP en proceso'?'En preparación':'Por confirmar'),decision};
  }
  function encodeCase(text,ppp_status,decision){
    if(!pppStates.includes(ppp_status))throw Error('Revisa el estado del PPP.');
    const result=String(text||'').trim()+caseMarker+JSON.stringify({v:1,ppp_status,decision:decision===true});
    if(result.length>4000)throw Error('Acorta las notas antes de guardar.');return result;
  }
  const types=['Seguimiento','Reunión','WhatsApp','Documento','Llamada'];
  const statuses=['Realizado','Programado','Propuesto','Cancelado'];
  const timezone='America/Hermosillo';
  const safeUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&['docs.google.com','drive.google.com','yodesarrollomx.github.io'].includes(u.hostname)?u.href:'';}catch{return '';}};
  function day(value){
    if(typeof value!=='string')return '';
    const raw=value.match(/^\d{4}-\d{2}-\d{2}$/);
    if(raw){const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value?value:'';}
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return '';
    const d=new Date(value);return Number.isNaN(d.valueOf())?'':new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  }
  function metadata(m){
    if(!m||m.v!==1||!types.includes(m.type)||!statuses.includes(m.status)||!day(m.occurred_at))throw Error('Completa el tipo y la fecha real de la actividad.');
    const out={v:1,type:m.type,status:m.status,occurred_at:m.occurred_at};
    for(const k of ['participants','source','stage','replaces','source_key'])if(m[k]){
      if(typeof m[k]!=='string'||m[k].length>250||/[\r\n]/.test(m[k]))throw Error('Revisa los datos de la actividad.');out[k]=m[k].trim();
    }
    if(m.source_url){if(!safeUrl(m.source_url))throw Error('Usa una referencia HTTPS de Google Drive o YOD.');out.source_url=safeUrl(m.source_url);}
    return out;
  }
  function encode(text,m){
    const note=String(text||'').trim();if(!note)throw Error('Escribe qué se dijo o qué se propone.');
    const encoded=note+marker+JSON.stringify(metadata(m));
    if(encoded.length>4000)throw Error('Acorta la nota para guardar también su fecha y fuente.');return encoded;
  }
  function decode(a){
    const note=String(a.note||''),i=note.lastIndexOf(marker);
    let text=note,meta=null;
    if(i>=0)try{meta=metadata(JSON.parse(note.slice(i+marker.length)));text=note.slice(0,i);}catch{/* Preserve malformed and legacy notes verbatim. */}
    return {...a,text,meta,day:day(meta?.occurred_at||a.date),status:meta?.status||'Realizado',type:meta?.type||'Seguimiento',recorded_at:a.date||'',participants:meta?.participants||'',source:meta?.source||'',source_url:meta?.source_url||'',stage:meta?.stage||'',replaces:meta?.replaces||''};
  }
  function history(rows){return rows.map(decode).sort((a,b)=>b.day.localeCompare(a.day)||String(b.recorded_at).localeCompare(String(a.recorded_at))||a.id.localeCompare(b.id));}
  function calendarEvents(rows){
    const events=history(rows),byId=new Map(events.map(e=>[e.id,e]));
    // A later event can resolve or reschedule a plan, never delete history.
    const replaced=new Set(events.filter(e=>e.replaces&&e.id!==e.replaces&&byId.get(e.replaces)?.opportunity_id===e.opportunity_id&&String(e.recorded_at)>=String(byId.get(e.replaces)?.recorded_at)&&['Programado','Propuesto'].includes(byId.get(e.replaces)?.status)).map(e=>e.replaces));
    return events.filter(e=>e.day&&e.status!=='Cancelado'&&!replaced.has(e.id));
  }
  // Read-only projection of the append-only history as it stood on one day. Never writes and never invents a date:
  // a missing fact stays '' or null. A result, reschedule or cancellation only counts once it had been recorded by asOf.
  function temporal(rows,asOfDay,current){
    const now=day(new Date().toISOString()),asOf=day(asOfDay)||now,isToday=asOf===now,cur=current&&typeof current==='object'?current:null;
    const events=history(Array.isArray(rows)?rows:[]),byId=new Map(events.map(e=>[e.id,e]));
    const recorded=e=>day(e.recorded_at),known=e=>{const d=recorded(e);return d!==''&&d<=asOf;};
    const replaced=new Set(events.filter(e=>known(e)&&e.replaces&&e.id!==e.replaces).filter(e=>{
      const target=byId.get(e.replaces);return !!target&&target.opportunity_id===e.opportunity_id&&['Programado','Propuesto'].includes(target.status)&&String(e.recorded_at)>=String(target.recorded_at);
    }).map(e=>e.replaces));
    const decorate=e=>({...e,recordedLater:recorded(e)>asOf,correctsId:e.replaces&&e.replaces!==e.id?e.replaces:''});
    const past=events.filter(e=>e.day&&e.day<=asOf).map(decorate),lastFact=past.find(e=>e.status==='Realizado')||null,staged=past.find(e=>e.status==='Realizado'&&e.stage)||null;
    // A plan only exists on a day once it had been recorded; later captures never rewrite that day.
    const plans=events.filter(e=>e.day&&known(e)&&['Programado','Propuesto'].includes(e.status)&&!replaced.has(e.id)).map(e=>({...decorate(e),overdue:e.day<asOf}))
      .sort((a,b)=>a.day.localeCompare(b.day)||String(a.recorded_at).localeCompare(String(b.recorded_at))||a.id.localeCompare(b.id));
    let lastRecordedAt='',latest=-Infinity;
    for(const e of events){const t=Date.parse(e.recorded_at);if(known(e)&&Number.isFinite(t)&&t>latest){latest=t;lastRecordedAt=e.recorded_at;}}
    const live=isToday&&cur;
    return {asOf,isToday,history:past,
      today:{lastFact,stage:live?String(cur.stage||''):(staged?staged.stage:''),nextAction:live?String(cur.next_action||''):String(lastFact?.next_action||''),nextDate:live?String(cur.next_date||''):String(lastFact?.next_date||''),
        decision:live?cur.decision===true:false,source:lastFact?.source||'',sourceUrl:lastFact?.source_url||'',lastRecordedAt,blocker:null},
      plan:{commitments:plans.filter(e=>e.status==='Programado'),proposals:plans.filter(e=>e.status==='Propuesto'),
        currentStep:live&&(cur.next_action||cur.next_date)?{text:String(cur.next_action||''),date:String(cur.next_date||'')}:null}};
  }
  function monthGrid(month,rows){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Mes inválido.');
    const [year,n]=month.split('-').map(Number),first=new Date(Date.UTC(year,n-1,1)),days=new Date(Date.UTC(year,n,0)).getUTCDate();
    const offset=(first.getUTCDay()+6)%7,events=calendarEvents(rows);
    return Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>{
      const d=i-offset+1,key=d>0&&d<=days?month+'-'+String(d).padStart(2,'0'):'';
      const own=key?events.filter(e=>e.day===key):[];
      return {day:key,label:key?d:'',events:own,actual:own.filter(e=>e.status==='Realizado').length,planned:own.filter(e=>e.status!=='Realizado').length};
    });
  }
  function shiftMonth(month,delta){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);}
  const num=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
  const fmt=v=>new Intl.NumberFormat('es-MX',{maximumFractionDigits:1}).format(v);
  const money=v=>num(v)===null?'':('$'+new Intl.NumberFormat('es-MX',{maximumFractionDigits:0}).format(num(v)));
  function pppReference(o){
    try{const u=new URL(safeUrl(o.ppp_url)),match=u.pathname.match(/^\/potenciales-yod\/(macrolotes|patrimonial|residencial|unifamiliar|mixto)\.html$/);
      const id=u.searchParams.get('open');if(u.hostname!=='yodesarrollomx.github.io'||!match||!id||id!==o.ppp_id||!/^[A-Za-z0-9_.:-]{1,200}$/.test(id))return null;
      return {id,type:match[1]};}catch{return null;}
  }
  function savedPPP(obj,ref){
    if(!obj||obj.caso_id!==ref.id||!obj.version)throw Error('No se confirmó la versión guardada de este plan.');
    const source=obj.resumen&&typeof obj.resumen==='object'?{...obj,...obj.resumen}:obj;
    const scenarios=(()=>{try{const a=JSON.parse(obj.escenarios_json||'[]');return Array.isArray(a)?a.filter(v=>v&&typeof v.id==='string'&&typeof v.nombre==='string').slice(0,8).map(v=>({id:v.id,name:v.nombre,active:v.activo===true})):[];}catch{return [];}})();
    const metric=(key,label,unit='')=>num(source[key])===null?'':label+' '+(unit==='$'?money(source[key]):fmt(num(source[key]))+unit);
    const input=(key,label,unit='')=>num(obj[key])===null?'':label+' '+(unit==='$'?money(obj[key]):fmt(num(obj[key]))+unit);
    const pack=(...v)=>v.filter(Boolean).join(' · ');
    const cards=[
      {title:'Espacio y producto',text:pack(metric('superficie_ha','Terreno',' ha'),metric('vendible_m2','Vendible',' m²'),metric('naves','Naves'),metric('macrolotes_n','Macrolotes'),metric('lotes_com_n','Comercio'),metric('lotes_viv_n','Vivienda'))},
      {title:'Rendimiento guardado',text:pack(metric('tir_dev_pct','TIR anual','%'),metric('utilidad','Utilidad','$'),metric('margen_pct','Margen','%'))},
      {title:'Capital y ciclo',text:pack(input('inEquity','Capital máximo','$'),metric('faltante_capital','Faltante de capital','$'),metric('meses_totales','Ciclo',' meses'))},
      {title:'Precio y costo',text:pack(input('inPreNave','Venta nave/m²','$'),input('inRentaNave','Renta nave/m²/mes','$'),input('inCostoNave','Construcción/m²','$'),metric('costo_proyecto','Costo del proyecto','$'))},
      {title:'Financiamiento',text:pack(input('inMaxDeuda','Deuda máxima','$'),input('inPIK','Tasa anual','%'),metric('pico_deuda','Pico de deuda','$'),metric('intereses_mas_fee','Intereses y comisión','$'))},
      {title:'Aportación',text:pack(input('inAporteTierra','Tierra aportada','%'),input('inPctDueno','Participación en utilidad','%'),metric('resultado_dueno','Resultado dueño','$'))}
    ];
    return {id:ref.id,type:ref.type,version:String(obj.version),updated:String(obj.ts_actualizado||''),scenario:scenarios.find(s=>s.active)?.name||'',scenarios,cards};
  }
  function createPPPClient({url,token,fetch,timeout=15000}){
    let generation=0;const cache=new Map(),pending=new Map();
    function invalidate(){generation++;cache.clear();pending.clear();}
    async function read(o){
      const ref=pppReference(o);if(!ref)return null;const ownToken=token(),own=generation,key=ref.type+':'+ref.id;
      if(!ownToken)throw Error('Entra a YOD OS para consultar el plan.');
      if(cache.has(key)){const item=cache.get(key);if(item.token===ownToken)return item.value;invalidate();}
      if(pending.has(key)&&pending.get(key).token===ownToken)return pending.get(key).promise;
      const endpoint=typeof url==='function'?url():url;
      const promise=(async()=>{
        if(!endpoint)throw Error('Abre el plan para consultar sus datos.');
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
        try{const u=new URL(endpoint);u.search=new URLSearchParams({k:ownToken,tipo:ref.type,recurso:'caso',id:ref.id});
          const r=await fetch(u.href,{method:'GET',cache:'no-store',credentials:'omit',signal:controller.signal});
          if(!r.ok)throw Error('No se pudo leer el plan.');const j=await r.json();
          if(own!==generation||token()!==ownToken)throw Error('La sesión cambió; vuelve a abrir el caso.');
          if(!j.ok)throw Error('Abre el PPP para revisar este plan con tu acceso.');
          const value=savedPPP(j.caso,ref);cache.set(key,{token:ownToken,value});return value;
        }finally{clearTimeout(timer);}
      })();pending.set(key,{token:ownToken,promise});try{return await promise;}finally{if(pending.get(key)?.promise===promise)pending.delete(key);}
    }
    return {read,invalidate};
  }
  return {marker,caseMarker,pppStates,caseInfo,encodeCase,types,statuses,day,encode,decode,history,calendarEvents,temporal,monthGrid,shiftMonth,pppReference,savedPPP,createPPPClient};
});
