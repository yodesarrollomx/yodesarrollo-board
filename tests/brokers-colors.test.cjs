'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../brokers-core.js');
const day='2026-11-16',base={stage:'En revisión',next_date:'2026-11-17',next_action:'[YOD] Revisar datos'};
test('la señal distingue fecha vencida, hoy, decisión y planificación incompleta',()=>{
 assert.deepEqual(C.followupSignal({...base,next_date:'2026-11-15'},day,true),{kind:'overdue',label:'Vencido'});
 assert.equal(C.followupSignal({...base,next_date:day},day,true).kind,'today');
 assert.equal(C.followupSignal(base,day,true).kind,'decision');
 assert.equal(C.followupSignal({...base,next_date:''},day).label,'Sin fecha');
 assert.equal(C.followupSignal({...base,next_action:''},day).label,'Falta siguiente paso');
 assert.equal(C.followupSignal({...base,next_action:'Revisar datos'},day).label,'Sin responsable');
 assert.deepEqual(C.followupSignal(base,day),{kind:'scheduled',label:''});
});
test('pausa, cierre, archivo y papelera nunca heredan vencimiento de una fecha anterior',()=>{
 const o={...base,next_date:'2020-01-01'};
 for(const stage of ['Formalizado','En pausa','Descartado'])assert.deepEqual(C.followupSignal({...o,stage},day,true),{kind:'quiet',label:''});
 assert.deepEqual(C.followupSignal(o,day,true,'archived'),{kind:'archived',label:'Archivado'});
 assert.deepEqual(C.followupSignal(o,day,true,'trash'),{kind:'trash',label:'En papelera'});
 assert.equal(o.stage,'En revisión');assert.equal(o.next_date,'2020-01-01');
});
function luminance(hex){const c=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('ocho paletas distintas conservan texto legible sobre etiquetas y fondos',()=>{
 const css=fs.readFileSync(require.resolve('../brokers.css'),'utf8'),seen=new Set();
 for(const stage of C.stages){
  const body=css.split('[data-stage="'+stage+'"]{')[1]?.split('}')[0];assert.ok(body,stage);
  const color=n=>body.match(new RegExp('--stage-'+n+':(#[0-9a-f]{6})'))[1];
  seen.add(color('soft'));assert.ok(contrast(color('ink'),color('soft'))>=4.5,stage+' badge');
  assert.ok(contrast('#213b34',color('wash'))>=4.5,stage+' title');
  for(const ink of ['#a52c2c','#805600','#674194','#59646c'])assert.ok(contrast(ink,color('wash'))>=4.5,stage+' signal '+ink);
 }
 assert.equal(seen.size,8);
});
