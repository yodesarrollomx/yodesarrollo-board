const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../brokers-core.js');
const snapshot = () => ({contract:'brokers.v1',actor:{id:'b1',role:'broker'},revision:1,brokers:[{id:'b1',name:'Broker sintético'}],contacts:[{id:'c1',broker_ids:['b1']}],opportunities:[{id:'o1',title:'Terreno ejemplo',broker_ids:['b1'],contact_id:'c1',stage:'Recibido',next_date:'2026-01-01'}],activities:[],participations:[]});
test('vista previa de Dirección reduce todas las colecciones sin mutar identidad real',()=>{
  const s=snapshot();s.actor={id:'dir',role:'direccion',name:'Dirección'};s.capabilities={write:true,agree_participation:true};s.brokers.push({id:'b2',name:'Otro perfil'});s.contacts.push({id:'c2',broker_ids:['b2']});s.opportunities.push({id:'o2',broker_ids:['b2']});s.activities=[{id:'a1',opportunity_id:'o1'},{id:'a2',opportunity_id:'o2'}];s.participations=[{id:'p1',opportunity_id:'o1',broker_id:'b1'},{id:'p2',opportunity_id:'o1',broker_id:'b2'}];
  const copy=JSON.stringify(s),p=C.previewSnapshot(s,'b1');assert.equal(p.actor.role,'broker');assert.equal(p.actor.id,'b1');for(const key of ['contacts','opportunities','activities','participations','brokers'])assert.equal(p[key].length,1,key);assert.equal(p.capabilities.agree_participation,false);assert.equal(JSON.stringify(s),copy);
});
test('parámetro de vista nunca amplía alcance de un broker ni cae en todos',()=>{
  const s=snapshot();assert.equal(C.previewSnapshot(s,'b1'),s);assert.throws(()=>C.previewSnapshot(s,'b2'),/acceso/);s.actor.role='direccion';assert.throws(()=>C.previewSnapshot(s,'inexistente'),/cartera/);
});
test('responsable explícito conserva textos anteriores sin inferir asignación',()=>{
  assert.deepEqual(C.nextStep('Revisar con YOD'),{owner:'',text:'Revisar con YOD'});
  assert.deepEqual(C.nextStep('[YOD] Entregar análisis'),{owner:'YOD',text:'Entregar análisis'});
  assert.equal(C.encodeStep('Masterbroker','[YOD] Confirmar visita'),'[Masterbroker] Confirmar visita');
  assert.equal(C.encodeStep('Administrador','Leer'),'Leer');
});
test('agenda distingue entregas de YOD y excluye pausas y cierres',()=>{
  const rows=[{id:'legacy',stage:'Recibido',next_action:'Revisar',next_date:''},{id:'yod',stage:'En revisión',next_action:'[YOD] Analizar',next_date:'2026-10-12'},{id:'mb',stage:'Recibido',next_action:'[Masterbroker] Visita',next_date:'2026-10-11'},{id:'closed',stage:'Formalizado',next_action:'[YOD] Listo'}];
  assert.deepEqual(C.agenda(rows,'YOD').map(x=>x.id),['yod']);
  assert.deepEqual(C.agenda(rows,'').map(x=>x.id),['mb','yod','legacy']);
  assert.equal(rows[0].id,'legacy');
});
test('rechaza payload legado y registros ajenos',()=>{assert.throws(()=>C.validateSnapshot({config:{}})); for(const type of ['contacts','opportunities']){const s=snapshot();s[type].push({id:'ajeno',broker_ids:['b2']});assert.throws(()=>C.validateSnapshot(s));}});
test('participaciones e historial no exceden alcance',()=>{const s=snapshot();s.participations=[{id:'p1',broker_id:'b2',opportunity_id:'o1'}];assert.throws(()=>C.validateSnapshot(s));s.participations=[];s.activities=[{id:'a',opportunity_id:'ajeno'}];assert.throws(()=>C.validateSnapshot(s));});
test('dirección admite cartera conjunta y broker ve propia',()=>{const s=snapshot();assert.equal(C.validateSnapshot(s),s);s.actor.role='direccion';s.opportunities.push({id:'o2',broker_ids:['b2']});assert.equal(C.validateSnapshot(s).opportunities.length,2);});
test('filtra búsqueda, broker y etapa sin duplicar oportunidades',()=>{const s=snapshot();assert.equal(C.visible(s,'b1','terreno','Recibido').length,1);assert.equal(C.visible(s,'b2','','').length,0);assert.equal(C.visible(s,'','','Formalizado').length,0);});
test('vencimiento no aplica a cierre ni pausa',()=>{const o=snapshot().opportunities[0];assert.equal(C.overdue(o,'2026-10-09'),true);o.stage='Formalizado';assert.equal(C.overdue(o,'2026-10-09'),false);});
test('enlaces bloquean scripts, hosts suplantados y credenciales',()=>{for(const url of ['javascript:alert(1)','https://docs.google.com.evil.test/','https://x:y@docs.google.com/'])assert.equal(C.safeLink(url),'');assert.match(C.safeLink('https://docs.google.com/document/d/example'),/^https:/);});
test('sin sesión o endpoint no hace red',async()=>{let calls=0;const fetch=()=>{calls++;};await assert.rejects(C.createClient({token:()=>'',url:'x',fetch}).load());await assert.rejects(C.createClient({token:()=> 't',fetch}).load());assert.equal(calls,0);});
test('guardado exige ACK y conserva idempotencia y revisión',async()=>{let body;const client=C.createClient({token:()=> 't',url:'https://example.test',fetch:async(u,o)=>{body=JSON.parse(o.body);return {ok:true,json:async()=>({ok:true,request_id:body.request_id,data:snapshot()})};}});await client.save('opportunity',{id:'o1'},1,'request-1');assert.equal(body.request_id,'request-1');assert.equal(body.data.expected_revision,1);assert.equal(body.action,'brokers_save');});
test('ACK equivocado y conflicto nunca confirman',async()=>{for(const json of [{ok:true,request_id:'otro',data:snapshot()},{ok:false,error:'conflict'}]){const c=C.createClient({token:()=> 't',url:'x',fetch:async()=>({ok:true,json:async()=>json})});await assert.rejects(c.save('contact',{},1,'r'));}});
test('respuesta tardía de sesión anterior se descarta',async()=>{let token='t1';const c=C.createClient({token:()=>token,url:'x',fetch:async()=>{token='t2';return{ok:true,json:async()=>({ok:true,data:snapshot()})};}});await assert.rejects(c.load(),/sesión cambió/);});
test('control diario diferencia fechas, faltantes y responsables sin asignaciones inferidas',()=>{
 const rows=[{id:'v',stage:'Recibido',next_date:'2026-10-08',next_action:'[Masterbroker] Llamar'},{id:'h',stage:'En revisión',next_date:'2026-10-09',next_action:'[YOD] Entregar'},{id:'p',stage:'En revisión',next_date:'2026-10-12',next_action:'Revisar con YOD'},{id:'s',stage:'Recibido',next_action:'[Masterbroker] Visita'},{id:'c',stage:'Formalizado',next_date:'2026-10-01'}];
 const d=C.dailyControl(rows,'2026-10-09');
 for(const [k,ids] of Object.entries({overdue:['v'],today:['h'],upcoming:['p'],unplanned:['p','s'],mine:['v','s'],yod:['h'],closed:['c']}))assert.deepEqual(d[k].map(o=>o.id),ids,k);
 assert.equal(rows[0].id,'v');assert.equal(d.all.length,4);
});
test('gestión acotada conserva al actor Dirección y capacidades reales',()=>{
 const s=snapshot();s.actor={id:'dir',role:'direccion',name:'Dirección'};s.capabilities={write:true,agree_participation:true};s.brokers.push({id:'b2',name:'Otro'});s.opportunities.push({id:'o2',broker_ids:['b2']});
 const m=C.workspaceSnapshot(s,'b1',true);assert.equal(m.actor,s.actor);assert.equal(m.capabilities,s.capabilities);assert.equal(m.opportunities.length,1);assert.equal(m.brokers.length,1);assert.equal(s.opportunities.length,2);
 assert.equal(C.workspaceSnapshot(s,'b1',false).actor.role,'broker');
 const b=snapshot();assert.equal(C.workspaceSnapshot(b,'b1',true),b);assert.throws(()=>C.workspaceSnapshot(b,'b2',true),/acceso/);assert.throws(()=>C.workspaceSnapshot(s,'no-existe',true),/cartera/);
});
