(function(root){
  'use strict';
  const stages=['Recibido','En revisión','PPP en proceso','PPP presentado','En negociación','Formalizado','En pausa','Descartado'];
  const states=['Por definir','Propuesta','Acordada','Devengada','Pagada'];
  const fields={contact:['name','email','phone','company','type','notes'],opportunity:['title','kind','contact_id','location','terrain_id','ppp_id','ppp_url','documents_url','project_url','stage','next_action','next_date','notes'],activity:['opportunity_id','note','next_action','next_date'],participation:['opportunity_id','broker_id','status','terms','agreement_url']};
  const collections={contact:'contacts',opportunity:'opportunities',activity:'activities',participation:'participations'};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function fail(code){throw new Error(code);}
  function text(v){if(v==null)return '';if(typeof v!=='string'||v.length>4000)fail('invalid_field');return v.trim();}
  function link(v){return !v||/^https:\/\/(?:yodesarrollomx\.github\.io|docs\.google\.com|drive\.google\.com)\//.test(v);}
  function date(v){return !v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);}
  function owns(r,a){return a.role==='direccion'||(r.broker_ids||[]).includes(a.id);}
  function actor(identity,brokers){
    if(!identity||identity.ok!==true||!identity.correo||!identity.rol||typeof identity.boards!=='string')fail('unauthorized');
    const codes=identity.boards.toUpperCase().split(/[,|; ]+/), role=identity.rol.toLowerCase(), email=identity.correo.trim().toLowerCase();
    if(role==='admin'||(role==='direccion'&&(codes.includes('*')||codes.includes('IV'))))return {id:email,name:identity.nombre||'Dirección',role:'direccion'};
    if(!codes.includes('IV')&&!codes.includes('*'))fail('forbidden');
    const matches=brokers.filter(b=>b.email&&b.email.toLowerCase()===email&&b.active===true);
    if(matches.length!==1)fail('broker_not_linked');
    return {id:matches[0].id,name:matches[0].name,role:'broker'};
  }
  function snapshot(s,a){
    const opp=s.opportunities.filter(r=>owns(r,a)), ids=new Set(opp.map(r=>r.id));
    return {contract:'brokers.v1',revision:s.revision,actor:a,capabilities:{write:true,agree_participation:a.role==='direccion'},brokers:s.brokers.filter(b=>a.role==='direccion'||b.id===a.id).map(b=>({id:b.id,name:b.name,active:b.active})),contacts:s.contacts.filter(r=>owns(r,a)).map(clone),opportunities:opp.map(clone),activities:s.activities.filter(r=>ids.has(r.opportunity_id)).map(clone),participations:s.participations.filter(r=>ids.has(r.opportunity_id)&&(a.role==='direccion'||r.broker_id===a.id)).map(clone)};
  }
  function prepare(s,a,input,env){
    const kind=input.kind, raw=input.record;
    if(!fields[kind]||!raw||typeof raw!=='object'||Array.isArray(raw))fail('invalid_record');
    if(kind==='participation'&&a.role!=='direccion')fail('forbidden');
    if(input.expected_revision!==s.revision)fail('conflict');
    const rows=s[collections[kind]], existing=raw.id?rows.find(r=>r.id===raw.id):null;
    if(raw.id&&!existing)fail('not_found');
    if(existing&&['contact','opportunity'].includes(kind)&&!owns(existing,a))fail('forbidden');
    if(kind==='activity'&&raw.id)fail('append_only');
    let r=existing?clone(existing):{id:kind==='contact'?'POT-BR-'+env.uuid():kind+'-'+env.uuid()};
    for(const key of fields[kind])if(Object.prototype.hasOwnProperty.call(raw,key))r[key]=text(raw[key]);
    for(const key of ['ppp_url','documents_url','project_url','agreement_url'])if(!link(r[key]))fail('invalid_link');
    if(!date(r.next_date))fail('invalid_date');
    if(['contact','opportunity'].includes(kind)){
      if(a.role==='direccion'){
        if(!Array.isArray(raw.broker_ids)||!raw.broker_ids.length)fail('broker_required');
        r.broker_ids=[...new Set(raw.broker_ids)];
        if(r.broker_ids.some(id=>!s.brokers.some(b=>b.id===id)))fail('invalid_broker');
      }else{
        if(raw.broker_ids&&(!Array.isArray(raw.broker_ids)||raw.broker_ids.length!==1||raw.broker_ids[0]!==a.id))fail('forbidden');
        // A shared record keeps its other owners. Brokers cannot reassign it.
        r.broker_ids=existing?existing.broker_ids.slice():[a.id];
      }
    }
    if(kind==='contact'){
      if(!r.name)fail('name_required');
      if(r.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))fail('invalid_email');
      const normPhone=v=>String(v||'').replace(/\D/g,'');
      if(s.contacts.some(c=>c.id!==r.id&&((r.email&&c.email&&r.email.toLowerCase()===c.email.toLowerCase())||(normPhone(r.phone)&&normPhone(r.phone)===normPhone(c.phone)))))fail('duplicate_contact');
    }
    if(kind==='opportunity'){
      if(!r.title||!r.next_action||!r.next_date||!stages.includes(r.stage))fail('opportunity_incomplete');
      if(!['Terreno','Capital','Codesarrollo','Plan de potencial'].includes(r.kind))fail('invalid_kind');
      if(r.contact_id){const c=s.contacts.find(c=>c.id===r.contact_id);if(!c||!owns(c,a)||r.broker_ids.some(id=>!(c.broker_ids||[]).includes(id)))fail('contact_not_linked');}
      if(!existing){r.origin_broker_id=a.role==='broker'?a.id:r.broker_ids[0];r.created_at=env.now;}
    }
    const changes=[];
    if(['activity','participation'].includes(kind)){
      const o=s.opportunities.find(o=>o.id===r.opportunity_id);
      if(!o||!owns(o,a))fail('forbidden');
      if(kind==='activity'){
        if(!r.note||!r.next_action||!r.next_date)fail('activity_incomplete');
        r.date=env.now;r.author_id=a.id;r.author_name=a.name;
        changes.push({kind:'opportunity',record:Object.assign(clone(o),{last_review:env.now,next_action:r.next_action,next_date:r.next_date,updated_at:env.now})});
      }else{
        if(!o.broker_ids.includes(r.broker_id)||!states.includes(r.status)||!r.terms)fail('invalid_participation');
        if(states.indexOf(r.status)>=2&&!r.agreement_url)fail('evidence_required');
        if(existing&&(r.opportunity_id!==existing.opportunity_id||r.broker_id!==existing.broker_id))fail('immutable_reference');
        if(s.participations.some(p=>p.id!==r.id&&p.opportunity_id===r.opportunity_id&&p.broker_id===r.broker_id))fail('duplicate_participation');
        const before=existing?states.indexOf(existing.status):0, after=states.indexOf(r.status);
        if(after<before||after>before+1)fail('invalid_transition');
        r.confirmed_by=a.id;r.confirmed_at=env.now;
      }
    }
    r.updated_at=env.now;changes.push({kind,record:r});
    return changes;
  }
  function createService(adapter){return {handle:function(p){
    if(!p||!['brokers_snapshot','brokers_save'].includes(p.action))return {ok:false,error:'unknown_action'};
    try{
      // Identity is resolved on every request; no legacy identity cache.
      const identity=adapter.auth(p.k);
      return adapter.lock(function(){
        const s=adapter.read(), a=actor(identity,s.brokers);
        if(p.action==='brokers_snapshot')return {ok:true,data:snapshot(s,a)};
        if(typeof p.request_id!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(p.request_id))fail('invalid_request_id');
        const hash=adapter.hash(JSON.stringify(p.data||{}));
        const receipt=s.receipts.find(x=>x.id===p.request_id&&x.actor_id===a.id);
        if(receipt){if(receipt.hash!==hash)fail('idempotency_mismatch');return {ok:true,request_id:p.request_id,data:snapshot(s,a)};}
        const now=adapter.now(), changes=prepare(s,a,p.data||{},{now,uuid:adapter.uuid});
        adapter.commit(changes,{id:p.request_id,actor_id:a.id,hash,date:now},s);
        const after=adapter.read();return {ok:true,request_id:p.request_id,data:snapshot(after,a)};
      });
    }catch(e){const allowed=['unauthorized','forbidden','broker_not_linked','conflict','not_found','invalid_record','invalid_field','invalid_link','invalid_date','invalid_email','invalid_kind','invalid_broker','broker_required','name_required','contact_not_linked','duplicate_contact','opportunity_incomplete','activity_incomplete','invalid_participation','evidence_required','duplicate_participation','invalid_transition','immutable_reference','append_only','invalid_request_id','idempotency_mismatch','backend_not_ready'];return {ok:false,error:allowed.includes(e.message)?e.message:'service_unavailable'};}
  }};}
  const api={actor,snapshot,prepare,createService,stages,states};
  if(typeof module!=='undefined')module.exports=api;
  root.YodBrokersServer=api;
})(typeof globalThis==='undefined'?this:globalThis);
