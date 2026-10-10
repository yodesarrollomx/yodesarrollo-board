const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../brokers-server.js');
function fixture(){return {revision:1,brokers:[{id:'a',name:'Broker A',email:'a@example.test',active:true},{id:'b',name:'Broker B',email:'b@example.test',active:true}],contacts:[{id:'c1',name:'Contacto A',email:'owner@example.test',broker_ids:['a']},{id:'c2',name:'Contacto B',broker_ids:['b']}],opportunities:[{id:'o1',title:'Terreno A',kind:'Terreno',stage:'Recibido',broker_ids:['a'],contact_id:'c1'},{id:'o2',title:'Terreno B',kind:'Terreno',stage:'Recibido',broker_ids:['b'],contact_id:'c2'}],activities:[],participations:[],receipts:[]};}
const A={id:'a',name:'Broker A',role:'broker'},D={id:'dir',name:'Dirección',role:'direccion'};
const env={now:'2026-10-10T02:00:00Z',uuid:()=> 'synthetic-uuid'};
test('canje exige correo, rol y códigos vigentes; coincidencia única de broker',()=>{
  const s=fixture(),i={ok:true,correo:'a@example.test',nombre:'A',rol:'vista',boards:'IV'};
  assert.equal(S.actor(i,s.brokers).id,'a');
  for(const extra of [{ok:false},{correo:''},{boards:'PT'},{correo:'other@example.test'}])assert.throws(()=>S.actor({...i,...extra},s.brokers));
  s.brokers[0].active=false;assert.throws(()=>S.actor(i,s.brokers));
  s.brokers[0].active=true;s.brokers.push({...s.brokers[0],id:'duplicate'});assert.throws(()=>S.actor(i,s.brokers));
  assert.equal(S.actor({...i,rol:'admin',boards:''},s.brokers).role,'direccion');
});
test('snapshot nunca devuelve expedientes o acuerdos de otro broker',()=>{
  const s=fixture();s.activities=[{id:'h1',opportunity_id:'o1'},{id:'h2',opportunity_id:'o2'}];s.opportunities[0].broker_ids.push('b');s.participations=[{id:'p1',opportunity_id:'o1',broker_id:'a'},{id:'p2',opportunity_id:'o1',broker_id:'b'}];
  const v=S.snapshot(s,A);assert.deepEqual(v.opportunities.map(x=>x.id),['o1']);assert.deepEqual(v.activities.map(x=>x.id),['h1']);assert.deepEqual(v.participations.map(x=>x.id),['p1']);assert.equal(v.brokers[0].email,undefined);assert.equal(S.snapshot(s,D).opportunities.length,2);
});
test('no permite modificar contacto ajeno ni asignarse oportunidades ajenas',()=>{
  for(const [kind,record] of [['contact',{id:'c2',name:'Hijack',broker_ids:['a']}],['opportunity',{id:'o2',title:'Hijack',broker_ids:['a']}],['activity',{opportunity_id:'o2',note:'x',next_action:'x',next_date:'2026-10-11'}]])assert.throws(()=>S.prepare(fixture(),A,{kind,record,expected_revision:1},env),/forbidden/);
});
test('registro compartido conserva relaciones al editarlo un broker',()=>{
  const s=fixture();s.contacts[0].broker_ids=['a','b'];const changes=S.prepare(s,A,{kind:'contact',record:{id:'c1',name:'Nombre actualizado',broker_ids:['a']},expected_revision:1},env);assert.deepEqual(changes[0].record.broker_ids,['a','b']);
});
test('no duplica el contacto canónico por correo o teléfono',()=>{
  for(const record of [{name:'Duplicado',email:'OWNER@example.test'},{name:'Duplicado',phone:'662 123 4567'}]){const s=fixture();s.contacts[0].phone='6621234567';assert.throws(()=>S.prepare(s,A,{kind:'contact',record,expected_revision:1},env),/duplicate_contact/);}
});
test('contacto nuevo obtiene folio y solo asignación propia',()=>{
  const c=S.prepare(fixture(),A,{kind:'contact',record:{name:'Nuevo',broker_ids:['a'],id:undefined},expected_revision:1},env)[0].record;assert.match(c.id,/^POT-BR-/);assert.deepEqual(c.broker_ids,['a']);
  assert.throws(()=>S.prepare(fixture(),A,{kind:'contact',record:{name:'Nuevo',broker_ids:['b']},expected_revision:1},env),/forbidden/);
});
test('oportunidad valida contacto, fecha, etapa y enlaces antes de escribir',()=>{
  const r={title:'Nuevo',kind:'Terreno',stage:'Recibido',contact_id:'c1',next_action:'Revisar',next_date:'2026-10-11',broker_ids:['a']};
  assert.equal(S.prepare(fixture(),A,{kind:'opportunity',record:r,expected_revision:1},env)[0].record.origin_broker_id,'a');
  for(const extra of [{contact_id:'c2'},{next_date:'2026-02-30'},{stage:'Inventada'},{ppp_url:'https://docs.google.com.evil.test/x'},{kind:'otro'}])assert.throws(()=>S.prepare(fixture(),A,{kind:'opportunity',record:{...r,...extra},expected_revision:1},env));
});
test('revisión produce historial y siguiente acción en un único commit',()=>{
  const changes=S.prepare(fixture(),A,{kind:'activity',record:{opportunity_id:'o1',note:'Revisión',next_action:'Visita',next_date:'2026-10-11'},expected_revision:1},env);
  assert.equal(changes.length,2);assert.equal(changes[0].record.last_review,env.now);assert.equal(changes[1].record.author_id,'a');assert.equal(changes[1].record.next_action,changes[0].record.next_action);
});
test('participaciones requieren Dirección, evidencia y transición consecutiva',()=>{
  const base={opportunity_id:'o1',broker_id:'a',status:'Propuesta',terms:'Por acordar'};
  assert.throws(()=>S.prepare(fixture(),A,{kind:'participation',record:base,expected_revision:1},env),/forbidden/);
  assert.equal(S.prepare(fixture(),D,{kind:'participation',record:base,expected_revision:1},env)[0].record.status,'Propuesta');
  const s=fixture();s.participations=[{id:'p1',...base}];assert.throws(()=>S.prepare(s,D,{kind:'participation',record:{id:'p1',...base,status:'Acordada'},expected_revision:1},env),/evidence_required/);
  assert.throws(()=>S.prepare(s,D,{kind:'participation',record:{id:'p1',...base,status:'Pagada',agreement_url:'https://docs.google.com/document/d/example'},expected_revision:1},env),/invalid_transition/);
});
function service(){let state=fixture(),commits=0,auths=0;const adapter={auth:()=>{auths++;return {ok:true,correo:'a@example.test',rol:'vista',boards:'IV'};},lock:f=>f(),read:()=>structuredClone(state),hash:x=>require('node:crypto').createHash('sha256').update(x).digest('hex'),now:()=>env.now,uuid:env.uuid,commit:(changes,receipt)=>{commits++;for(const c of changes){const rows=state[{contact:'contacts',opportunity:'opportunities',activity:'activities',participation:'participations'}[c.kind]],idx=rows.findIndex(r=>r.id===c.record.id);if(idx<0)rows.push(c.record);else rows[idx]=c.record;}state.receipts.push(receipt);state.revision++;}};return {adapter,handler:S.createService(adapter),counts:()=>({commits,auths})};}
test('reintento después de ACK perdido no duplica y revalida acceso',()=>{
  const x=service(),p={action:'brokers_save',k:'session',request_id:'request-one',data:{kind:'contact',record:{name:'Nuevo'},expected_revision:1}};
  assert.equal(x.handler.handle(p).ok,true);assert.equal(x.handler.handle(p).ok,true);assert.deepEqual(x.counts(),{commits:1,auths:2});
  assert.equal(x.handler.handle({...p,data:{...p.data,record:{name:'Otro'}}}).error,'idempotency_mismatch');
  x.adapter.auth=()=>({ok:false});assert.equal(x.handler.handle(p).error,'unauthorized');
});
test('conflicto y fallo atómico nunca confirman guardado',()=>{
  const x=service(),p={action:'brokers_save',k:'session',request_id:'request-two',data:{kind:'contact',record:{name:'Nuevo'},expected_revision:0}};
  assert.equal(x.handler.handle(p).error,'conflict');assert.equal(x.counts().commits,0);
  p.data.expected_revision=1;x.adapter.commit=()=>{throw new Error('provider_error');};assert.equal(x.handler.handle(p).error,'service_unavailable');assert.equal(x.handler.handle({action:'brokers_snapshot',k:'session'}).data.contacts.length,1);
});
