'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../brokers-server.js'),C=require('../brokers-core.js');
const D={id:'d',name:'Dirección',role:'direccion'},A={id:'a',name:'Persona Uno',role:'broker'},B={id:'b',name:'Persona Dos',role:'broker'};
const env={now:'2026-11-16T17:00:00Z',uuid:()=> 'audit-1'};
const viewer='https://yodesarrollomx.github.io/potenciales-yod/visor.html#l='+'a'.repeat(40);
function state(){return {revision:1,brokers:[{id:'a',name:'Persona Uno'},{id:'b',name:'Persona Dos'}],contacts:[{id:'c',name:'Cliente',broker_ids:['a','b']}],opportunities:[{id:'o',title:'Proyecto',kind:'Terreno',stage:'En revisión',ppp_id:'plan-1',contact_id:'c',broker_ids:['a','b'],next_date:'',next_action:''}],activities:[],participations:[],receipts:[]};}
function commit(s,changes){for(const c of changes){const rows=s[{contact:'contacts',opportunity:'opportunities',activity:'activities'}[c.kind]],i=rows.findIndex(r=>r.id===c.record.id);if(i<0)rows.push(c.record);else rows[i]=c.record;}s.revision++;return s;}
function life(s,entity,status,actor=D){return S.prepare(s,actor,{kind:'lifecycle',record:{entity,id:entity==='contact'?'c':'o',status},expected_revision:s.revision},env);}
test('editar registro incompleto no inventa fecha ni responsable; borrado intencional prevalece',()=>{
 const s=state();const changes=S.prepare(s,D,{kind:'opportunity',record:{id:'o',title:'Nombre nuevo',documents_url:'',broker_ids:['a','b']},expected_revision:1},env);
 const o=changes[0].record;assert.equal(o.next_date,'');assert.equal(o.title,'Nombre nuevo');
 S.applySource(o,{id:'o',title:'Nombre viejo',documents_url:'https://docs.google.com/x',ppp_id:'plan-2'});
 assert.equal(o.title,'Nombre nuevo');assert.equal(o.documents_url,'');assert.equal(o.ppp_id,'plan-2');
});
test('archivo, papelera y restauración son globales y conservan historias',()=>{
 const s=state();s.activities=[{id:'old',opportunity_id:'o',note:'Historia real'}];
 commit(s,life(s,'opportunity','archived',A));assert.equal(C.visible(S.snapshot(s,B),'','','').length,0);
 assert.equal(C.visible({...S.snapshot(s,B),recordScope:'archived'},'','','').length,1);
 assert.equal(s.activities[0].note,'Historia real');assert.equal(s.opportunities.length,1);
 commit(s,life(s,'opportunity','trash',B));assert.equal(S.recordStatus(s,s.opportunities[0],'opportunity'),'trash');
 commit(s,life(s,'opportunity','active'));assert.equal(C.visible(S.snapshot(s,A),'','','').length,1);
 assert.equal(s.activities[0].note,'Historia real');
});
test('cliente archivado oculta todos sus asuntos y restaurar no reactiva los previamente archivados',()=>{
 const s=state();commit(s,life(s,'opportunity','archived'));commit(s,life(s,'contact','trash'));
 assert.equal(C.visible(S.snapshot(s,A),'','','').length,0);
 assert.equal(C.visible({...S.snapshot(s,A),recordScope:'trash'},'','','').length,1);
 assert.throws(()=>life(s,'opportunity','active'),/record_inactive/);
 commit(s,life(s,'contact','active'));assert.equal(s.opportunities[0].record_status,'archived');
 assert.equal(C.clientGroups(S.snapshot(s,D),'','','','').length,1);
});
test('alcance y concurrencia se validan también para ciclo de vida',()=>{
 const s=state();assert.throws(()=>life(s,'contact','trash',A),/forbidden/);
 s.opportunities[0].broker_ids=['a'];assert.throws(()=>life(s,'opportunity','trash',B),/forbidden/);
 assert.throws(()=>S.prepare(s,D,{kind:'lifecycle',record:{entity:'opportunity',id:'o',status:'trash'},expected_revision:0},env),/conflict/);
 assert.throws(()=>life(s,'opportunity','purge'),/invalid_record/);
 commit(s,life(s,'opportunity','trash'));assert.throws(()=>S.prepare(s,A,{kind:'opportunity',record:{id:'o',title:'Revivir'},expected_revision:s.revision},env),/record_inactive/);
});
const personas=[['persona_id','nombre'],['p','Persona Uno']];
const head=['proyecto_id','nombre','broker','estado','folio','visor','planes'];
test('puente concilia PPP único aunque cambien nombre y folio, conserva historial',()=>{
 const s=state();S.historyVisors(s,personas,[head,['alias','Otro nombre','p','activo','',viewer,'ppp:plan-1,ppp:plan-2']]);
 assert.equal(s.opportunities.length,1);assert.equal(s.opportunities[0].id,'o');assert.equal(s.opportunities[0].visor_url,viewer);
 assert.deepEqual(JSON.parse(s.opportunities[0].history_ids),['alias']);
 s.opportunities[0].ppp_id='plan-nuevo';s.opportunities[0].record_status='trash';s.opportunities[0].visor_url='';s.opportunities[0].edited_fields='["visor_url"]';
 S.historyVisors(s,personas,[head,['alias','Otro nombre','p','activo','',viewer,'ppp:plan-1']]);
 assert.equal(s.opportunities.length,1);assert.equal(s.opportunities[0].visor_url,'');assert.equal(s.opportunities[0].record_status,'trash');
});
test('folio del terreno concilia; nombre igual sin referencia no fusiona ni cruza permisos',()=>{
 const s=state();s.opportunities[0].terrain_id='PRJ-ONE';
 S.historyVisors(s,personas,[head,['h','Proyecto','p','activo','PRJ-ONE',viewer,'']]);assert.equal(s.opportunities.length,1);
 const other=state();other.opportunities[0].broker_ids=['b'];S.historyVisors(other,personas,[head,['h','Proyecto','p','activo','',viewer,'ppp:plan-1']]);
 assert.equal(other.opportunities.length,2);assert.equal(S.snapshot(other,B).opportunities[0].visor_url,undefined);
 const ambiguous=state();ambiguous.opportunities.push({...ambiguous.opportunities[0],id:'o2'});S.historyVisors(ambiguous,personas,[head,['h','Proyecto','p','activo','',viewer,'ppp:plan-1']]);
 assert.equal(ambiguous.opportunities[0].visor_url,undefined);assert.equal(ambiguous.opportunities[1].visor_url,undefined);
});
test('readback de ciclo de vida exige estado real, no un simple ACK',async()=>{
 const s=state();let reads=0;
 const client=C.createClient({url:'https://example.test',token:()=> 'session',fetch:async(u,opts)=>{const p=JSON.parse(opts.body);reads++;if(p.action==='brokers_snapshot')commit(s,life(s,'opportunity','archived'));return {ok:true,json:async()=>({ok:true,request_id:p.request_id,data:S.snapshot(s,D)})};}});
 const after=await client.save('lifecycle',{entity:'opportunity',id:'o',status:'archived'},1,'request-123');assert.equal(reads,2);assert.equal(after.opportunities[0].record_status,'archived');
});

test('notas extensas conservan su contenido al editar',()=>{const CRM=require('../brokers-crm.js'),note='Dato relevante. '.repeat(500),encoded=CRM.encodeCase(note,'Listo',true);assert.equal(CRM.caseInfo({notes:encoded}).text,note.trim());const s=state();assert.equal(S.prepare(s,D,{kind:'opportunity',record:{id:'o',notes:encoded,broker_ids:['a','b']},expected_revision:1},env)[0].record.notes,encoded);assert.throws(()=>CRM.encodeCase('x'.repeat(30000),'Listo',false));});
