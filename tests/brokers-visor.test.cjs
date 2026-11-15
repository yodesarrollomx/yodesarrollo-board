'use strict';
// «Ver visor»: synthetic data only. The viewer address comes from the history book, never from code.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../brokers-server.js');
const C=require('../brokers-core.js');
const KEY_A='a'.repeat(40),KEY_B='b'.repeat(40);
const visor=key=>'https://yodesarrollomx.github.io/potenciales-yod/visor.html#l='+key;
function state(){return {revision:1,brokers:[{id:'BR-UNO',name:'Persona Uno Ejemplo',email:'uno@example.test',active:true},{id:'BR-DOS',name:'Persona Dos',email:'dos@example.test',active:true},{id:'BR-MD',name:'Dirección Ejemplo',email:'',active:false}],contacts:[],opportunities:[{id:'PRJ-PREVIO',title:'Expediente previo',kind:'Terreno',stage:'En revisión',broker_ids:['BR-UNO'],next_action:'x',next_date:'2026-11-20'},{id:'PRJ-AJENO',title:'Expediente ajeno',kind:'Terreno',stage:'En revisión',broker_ids:['BR-DOS'],next_action:'x',next_date:'2026-11-20'}],activities:[],participations:[],receipts:[]};}
const personas=[['persona_id','nombre','rol','empresa','color','ve','notas'],['uno','Persona Uno','Master Broker','','','su cartera',''],['dos','Persona Dos','Master Broker','','','su cartera',''],['md','Dirección Ejemplo','Master Developer','','','todo','']];
const head=['proyecto_id','nombre','broker','estado','color','orden','descripción','ppp_ref','revisar','folio','visor'];
const A={id:'BR-UNO',name:'Persona Uno Ejemplo',role:'broker'},B={id:'BR-DOS',name:'Persona Dos',role:'broker'},D={id:'dir@example.test',name:'Dirección',role:'direccion'};

test('visorLink acepta sólo el visor en vivo con su liga',()=>{
  assert.equal(C.visorLink({visor_url:visor(KEY_A)}),visor(KEY_A));
  assert.equal(C.visorLink({visor_url:' '+visor(KEY_A)+' '}),visor(KEY_A));
  for(const bad of ['',visor('corta'),'http://yodesarrollomx.github.io/potenciales-yod/visor.html#l='+KEY_A,'https://evil.example/potenciales-yod/visor.html#l='+KEY_A,'https://yodesarrollomx.github.io/potenciales-yod/ppp2.html#l='+KEY_A,visor(KEY_A)+'"><script>','javascript:alert(1)'])
    assert.equal(C.visorLink({visor_url:bad}),'',bad);
  assert.equal(C.visorLink(null),'');assert.equal(C.visorLink({}),'');
});

test('un proyecto con visor aparece en la cartera de su broker y sólo en la suya',()=>{
  const s=S.historyVisors(state(),personas,[head,['nuevo','Proyecto nuevo','uno','activo','','1','Descripción sintética','','','PRJ-NUEVO',visor(KEY_A)]]);
  const mine=S.snapshot(s,A).opportunities.find(o=>o.id==='PRJ-NUEVO');
  assert.ok(mine);assert.equal(mine.visor_url,visor(KEY_A));assert.deepEqual(mine.broker_ids,['BR-UNO']);assert.equal(mine.stage,'PPP en proceso');assert.equal(mine.kind,'Plan de potencial');
  assert.equal(S.snapshot(s,B).opportunities.some(o=>o.visor_url),false,'otro broker no recibe la liga');
  assert.ok(S.snapshot(s,D).opportunities.find(o=>o.id==='PRJ-NUEVO'),'Dirección ve todo');
});

test('sin folio usa un id propio; con folio existente sólo agrega la liga y respeta al dueño',()=>{
  const s=S.historyVisors(state(),personas,[head,['sin-folio','Sin folio','uno','activo','','2','','','','',visor(KEY_A)],['previo','Previo','uno','activo','','3','','','','PRJ-PREVIO',visor(KEY_B)],['ajeno','Ajeno','uno','activo','','4','','','','PRJ-AJENO',visor(KEY_B)]]);
  assert.ok(s.opportunities.find(o=>o.id==='HMB-sin-folio'&&o.visor_url===visor(KEY_A)));
  const previo=s.opportunities.find(o=>o.id==='PRJ-PREVIO');assert.equal(previo.visor_url,visor(KEY_B));assert.equal(previo.title,'Expediente previo');assert.equal(previo.stage,'En revisión');
  assert.equal(s.opportunities.find(o=>o.id==='PRJ-AJENO').visor_url,undefined,'no cruza carteras');
  assert.equal(s.opportunities.filter(o=>o.id==='PRJ-AJENO').length,1);
});

test('ignora renglones sin visor válido, sin broker conocido o con nombre ambiguo',()=>{
  const st=state();st.brokers.push({id:'BR-DOS-B',name:'Persona Dos Bis',email:'',active:false});
  const before=st.opportunities.length;
  S.historyVisors(st,personas,[head,['a','A','uno','activo','','1','','','','PRJ-A',''],['b','B','uno','activo','','1','','','','PRJ-B','https://example.test/x'],['c','C','nadie','activo','','1','','','','PRJ-C',visor(KEY_A)],['d','D','dos','activo','','1','','','','PRJ-D',visor(KEY_A)]]);
  assert.equal(st.opportunities.length,before);
  assert.doesNotThrow(()=>S.historyVisors(state(),[],[]));assert.doesNotThrow(()=>S.historyVisors(state(),undefined,undefined));
});

test('guardar un expediente con visor no escribe la liga en el CRM',()=>{
  const s=S.historyVisors(state(),personas,[head,['nuevo','Proyecto nuevo','uno','activo','','1','','','','PRJ-NUEVO',visor(KEY_A)]]);
  const changes=S.prepare(s,A,{kind:'opportunity',record:{id:'PRJ-NUEVO',title:'Proyecto nuevo',kind:'Plan de potencial',stage:'PPP en proceso',next_action:'Revisar',next_date:'2026-11-20',visor_url:'https://example.test/otra'},expected_revision:1},{now:'2026-11-15T00:00:00Z',uuid:()=>'u'});
  const rec=changes[0].record;assert.equal(rec.visor_url,visor(KEY_A),'el visor no es un campo editable');
});
