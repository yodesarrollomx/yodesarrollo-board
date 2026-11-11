const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../brokers-core.js'),CRM=require('../brokers-crm.js'),S=require('../brokers-server.js');
const fixture=()=>({contract:'brokers.v1',revision:1,actor:{id:'director',name:'Persona Directora',role:'direccion'},capabilities:{write:true,agree_participation:true},brokers:[{id:'b',name:'Broker Otro'},{id:'d',name:'Persona Directora Completa'}],contacts:[{id:'c1',name:'Mismo nombre',broker_ids:['d']},{id:'c2',name:'Mismo nombre',broker_ids:['d']},{id:'c3',name:'Prospecto sin terreno',broker_ids:['d']}],opportunities:[{id:'o1',contact_id:'c1',terrain_id:'t1',broker_ids:['d'],title:'Primero'},{id:'o2',contact_id:'c1',terrain_id:'t2',broker_ids:['d'],title:'Segundo'},{id:'o3',contact_id:'c2',terrain_id:'t3',broker_ids:['d']},{id:'o4',broker_ids:['d']},{id:'foreign',contact_id:'c1',broker_ids:['b']}],activities:[{id:'a',opportunity_id:'foreign'}],participations:[]});
test('un cliente reúne varios asuntos sin fusionar terrenos ni homónimos; incluye prospectos sin asunto',()=>{
 const s=fixture(),before=JSON.stringify(s),groups=C.clientGroups(s,'d','','','');assert.equal(groups.length,4);const c=groups.find(g=>g.contact?.id==='c1');assert.equal(c.cases.length,2);assert.equal(c.records.length,2);assert.equal(c.activities.length,0);assert.equal(groups.find(g=>g.contact?.id==='c3').records.length,0);assert.equal(JSON.stringify(s),before);assert.equal(C.clientGroups(s,'d','Segundo','','').length,1);
});
test('la tarjeta propia ordena presentación sin mutar actor; coincidencias ambiguas no se resuelven',()=>{
 const s=fixture();assert.equal(C.ownPortfolio(s).id,'d');assert.equal(s.actor.id,'director');s.brokers.push({id:'d2',name:'Persona Directora Distinta'});assert.equal(C.ownPortfolio(s),null);s.actor.broker_id='d';assert.equal(C.ownPortfolio(s).id,'d');
});
test('asignación nominal conserva id y texto; etiquetas heredadas no se convierten en una persona',()=>{
 const s=fixture(),encoded=C.encodeStep('person:d','[YOD] Revisar el predio');assert.deepEqual(C.nextStep(encoded),{owner:'person:d',text:'Revisar el predio'});assert.equal(C.ownerLabel(s,encoded),'Persona Directora Completa');assert.match(C.ownerLabel(s,'[YOD] Revisar'),/persona por definir/);assert.equal(C.encodeStep('person:mal\nID','Hacer'),'Hacer');assert.equal(C.ownerLabel(s,'[Persona:missing] Revisar'),'Responsable registrado');
});
test('estado PPP y decisión son explícitos y compatibles con el backend; no modifican stage',()=>{
 const s=fixture(),notes=CRM.encodeCase('Texto previo\n[Preevaluación: EV-synthetic]','Listo',true);const raw={id:'o1',title:'Primero',kind:'Terreno',stage:'En revisión',contact_id:'c1',broker_ids:['d'],notes,next_action:C.encodeStep('person:d','Presentar PPP'),next_date:'2030-01-01'};
 const changes=S.prepare(s,s.actor,{kind:'opportunity',record:raw,expected_revision:1},{now:'2026-10-17T12:00:00Z',uuid:()=> 'u'});assert.equal(changes[0].record.stage,'En revisión');assert.deepEqual(CRM.caseInfo(changes[0].record),{text:'Texto previo\n[Preevaluación: EV-synthetic]',ppp_status:'Listo',decision:true});assert.equal(CRM.caseInfo({ppp_url:'exists'}).ppp_status,'Por confirmar');
});
test('reprogramar conserva historia y solo reemplaza el plan del mismo asunto',()=>{
 const activity=(id,status,day,replaces,date)=>({id,opportunity_id:'o1',date,note:CRM.encode(id,{v:1,type:'Reunión',status,occurred_at:day,replaces})});
 const old=activity('old','Programado','2030-01-01','','2026-10-17T01:00:00Z'),next=activity('next','Programado','2030-01-02','old','2026-10-17T02:00:00Z');
 assert.deepEqual(CRM.calendarEvents([old,next]).map(e=>e.id),['next']);assert.equal(CRM.history([old,next]).length,2);assert.equal(CRM.calendarEvents([old,{...next,opportunity_id:'o2'}]).length,2);
 const done=activity('done','Realizado','2030-01-02','next','2026-10-17T03:00:00Z');assert.deepEqual(CRM.calendarEvents([old,next,done]).map(e=>e.id),['done']);
});
test('orden MD/MB sólo presenta carteras existentes; acentos, apellidos y desconocidos permanecen estables',()=>{
 const s=fixture();s.actor.broker_id='d';s.brokers=[{id:'u',name:'Otra persona'},{id:'l',name:'Lupita Pauls'},{id:'a',name:'Alejandro Franco'},{id:'d',name:'Persona Directora'},{id:'e',name:'Éduardo Lara'},{id:'v',name:'Otra más'}];const before=JSON.stringify(s);
 assert.deepEqual(C.orderedPortfolios(s,['Eduardo Lara','Alejandro Franco','Lupita']).map(b=>b.id),['d','e','a','l','u','v']);assert.equal(JSON.stringify(s),before);
});

test('«Mi equipo» enlista primero la MD propia y luego las MB confirmadas en su orden; integrantes al final (CHN-20261013-1214-93b3)',()=>{
 const s=fixture();s.actor={id:'director',name:'Alejandro Puebla',role:'direccion',broker_id:'BR-ALEJANDRO-PUEBLA'};
 s.brokers=[{id:'BR-SAYRI-FRAIJO',name:'Sayri Fraijo'},{id:'BR-LUPITA',name:'Lupita Pauls'},{id:'BR-ALEJANDRO-FRANCO',name:'Alejandro Franco'},{id:'BR-EDUARDO-LARA',name:'Eduardo Lara'},{id:'BR-ALEJANDRO-PUEBLA',name:'Alejandro Puebla Gayón'}];
 const before=JSON.stringify(s);
 assert.deepEqual(C.orderedPortfolios(s,C.teamOrder).map(b=>C.portfolioRoleLabel(b.id)+' '+b.name),['MD Alejandro Puebla Gayón','MB Eduardo Lara','MB Alejandro Franco','MB Lupita Pauls','Integrante Sayri Fraijo']);
 assert.ok(Object.isFrozen(C.teamOrder));assert.throws(()=>{'use strict';C.teamOrder.push('Otra');});assert.equal(JSON.stringify(s),before);
});

test('etiqueta comercial sólo por ID confirmado; Sayri y homónimos quedan integrantes',()=>{
 assert.equal(C.portfolioRoleLabel('BR-ALEJANDRO-PUEBLA'),'MD');
 for(const id of ['BR-EDUARDO-LARA','BR-ALEJANDRO-FRANCO','BR-LUPITA'])assert.equal(C.portfolioRoleLabel(id),'MB');
 for(const id of ['BR-SAYRI-FRAIJO','Alejandro Puebla Gayón','Eduardo Lara','direccion','nuevo','',null,undefined])assert.equal(C.portfolioRoleLabel(id),'Integrante');
});
