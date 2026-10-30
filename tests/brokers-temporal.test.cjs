const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../brokers-crm.js');
const hoy=C.day(new Date().toISOString()),DOC='https://docs.google.com/document/d/synthetic-minuta/edit';
// recorded: 'YYYY-MM-DD' (captured at 11:00 America/Hermosillo, same local day) or a full ISO timestamp.
const stamp=r=>r.length>10?r:r+'T18:00:00Z';
const ev=(id,status,day,recorded,meta={},extra={})=>({id,opportunity_id:'o',date:stamp(recorded),author_id:'u',author_name:'Recorder',next_action:'',next_date:'',...extra,note:C.encode('Hecho '+id,{v:1,type:'Reunión',status,occurred_at:day,...meta})});
const base=()=>[
 ev('f1','Realizado','2026-10-01','2026-10-01',{stage:'Recibido'},{next_action:'[Masterbroker] Reunir documentos',next_date:'2026-10-08'}),
 ev('f2','Realizado','2026-10-10','2026-10-10',{stage:'En revisión',source:'Minuta de revisión',source_url:DOC,participants:'PG; Broker Uno'},{next_action:'[PG] Confirmar reunión',next_date:'2026-10-20'}),
 ev('p1','Programado','2026-10-20','2026-10-11'),
 ev('r1','Realizado','2026-10-21','2026-10-21',{replaces:'p1',stage:'En negociación'},{next_action:'[YOD] Ajustar propuesta',next_date:'2026-10-28'})
];
const ids=list=>list.map(e=>e.id),sorted=list=>ids(list).sort(),find=(list,id)=>list.find(e=>e.id===id);
test('fixed fixture dates lie in the past of the environment clock',()=>assert.ok(hoy>'2026-10-25','The environment clock must be after 2026-10-25'));
test('history keeps only events that happened up to the as-of day (inclusive), newest first, as decoded events',()=>{
 assert.equal(typeof C.temporal,'function');
 const rows=base(),h=d=>ids(C.temporal(rows,d).history);
 assert.deepEqual(h('2026-10-15'),['f2','f1']);assert.deepEqual(h('2026-10-10'),['f2','f1']);assert.deepEqual(h('2026-10-09'),['f1']);assert.deepEqual(h('2026-09-30'),[]);
 assert.deepEqual(h('2026-10-20'),['p1','f2','f1']);assert.deepEqual(h('2026-10-25'),['r1','p1','f2','f1']);
 assert.deepEqual(h('2026-10-25'),C.history(rows).filter(e=>e.day<='2026-10-25').map(e=>e.id));
 const t=C.temporal(rows,'2026-10-15');assert.equal(t.asOf,'2026-10-15');assert.equal(t.isToday,false);
 for(const k of ['history','today','plan'])assert.ok(k in t,k);
 for(const k of ['lastFact','stage','nextAction','nextDate','decision','source','sourceUrl','lastRecordedAt','blocker'])assert.ok(k in t.today,'today.'+k);
 for(const k of ['commitments','proposals','currentStep'])assert.ok(k in t.plan,'plan.'+k);
 const f2=t.history[0];assert.equal(f2.id,'f2');assert.equal(f2.text,'Hecho f2');assert.equal(f2.day,'2026-10-10');assert.equal(f2.status,'Realizado');assert.equal(f2.source,'Minuta de revisión');assert.equal(f2.source_url,DOC);assert.equal(f2.participants,'PG; Broker Uno');assert.equal(f2.stage,'En revisión');
});
test('recordedLater flags facts captured after the as-of day (by local recorded day); correctsId exposes replaces',()=>{
 const rows=[
  ev('a','Realizado','2026-10-05','2026-10-05'),
  ev('late','Realizado','2026-10-08','2026-10-20'),
  ev('fix','Realizado','2026-10-12','2026-10-12',{replaces:'a'}),
  ev('same','Realizado','2026-10-13','2026-10-15T18:00:00Z'),
  ev('tz','Realizado','2026-10-14','2026-10-16T02:00:00Z'),
  ev('next','Realizado','2026-10-14','2026-10-16T18:00:00Z')
 ],at=d=>C.temporal(rows,d).history,later=(d,id)=>find(at(d),id).recordedLater;
 assert.equal(at('2026-10-15').length,6);
 assert.equal(later('2026-10-15','a'),false);assert.equal(later('2026-10-15','late'),true);assert.equal(later('2026-10-15','fix'),false);
 assert.equal(later('2026-10-15','same'),false,'recorded the same day is not "later"');
 assert.equal(later('2026-10-15','tz'),false,'02:00Z on the 16th is still the 15th in America/Hermosillo');
 assert.equal(later('2026-10-15','next'),true);
 assert.equal(later('2026-10-19','late'),true);assert.equal(later('2026-10-20','late'),false);assert.equal(later('2026-10-14','same'),true);
 assert.equal(find(at('2026-10-15'),'fix').correctsId,'a');
 for(const id of ['a','late','same','tz','next'])assert.equal(find(at('2026-10-15'),id).correctsId,'');
 assert.equal(find(at('2026-10-15'),'late').recorded_at,'2026-10-20T18:00:00Z');
});
test('today.stage comes from the latest fact that recorded a stage up to as-of; empty when there is none',()=>{
 const rows=[...base(),ev('f3','Realizado','2026-10-12','2026-10-12',{},{next_action:'[PG] Enviar minuta',next_date:'2026-10-13'})],at=d=>C.temporal(rows,d).today;
 let t=at('2026-10-15');
 assert.equal(t.lastFact.id,'f3');assert.equal(t.lastFact.text,'Hecho f3');assert.equal(t.lastFact.day,'2026-10-12');
 assert.equal(t.stage,'En revisión','f3 recorded no stage: the observed stage is the one from f2');
 assert.equal(t.source,'');assert.equal(t.sourceUrl,'');assert.equal(t.nextAction,'[PG] Enviar minuta');assert.equal(t.nextDate,'2026-10-13');
 t=at('2026-10-11');assert.equal(t.lastFact.id,'f2');assert.equal(t.stage,'En revisión');assert.equal(t.source,'Minuta de revisión');assert.equal(t.sourceUrl,DOC);assert.equal(t.nextAction,'[PG] Confirmar reunión');assert.equal(t.nextDate,'2026-10-20');
 t=at('2026-10-05');assert.equal(t.lastFact.id,'f1');assert.equal(t.stage,'Recibido');assert.equal(t.source,'');assert.equal(t.nextAction,'[Masterbroker] Reunir documentos');
 t=at('2026-10-25');assert.equal(t.lastFact.id,'r1');assert.equal(t.stage,'En negociación');
 t=at('2026-09-30');assert.equal(t.lastFact,null);assert.equal(t.stage,'');assert.equal(t.nextAction,'');assert.equal(t.nextDate,'');assert.equal(t.source,'');assert.equal(t.sourceUrl,'');assert.equal(t.lastRecordedAt,'');
 for(const d of ['2026-09-30','2026-10-05','2026-10-11','2026-10-15','2026-10-25']){assert.equal(at(d).blocker,null,'no blocker field exists');assert.equal(at(d).decision,false,'decision only applies when as-of is today');}
});
test('lastRecordedAt is the latest capture on or before the as-of day, never a later one',()=>{
 const rows=[ev('x','Realizado','2026-10-02','2026-10-02'),ev('y','Realizado','2026-10-05','2026-10-20')],at=d=>C.temporal(rows,d).today.lastRecordedAt;
 assert.equal(at('2026-10-01'),'');assert.equal(C.day(at('2026-10-15')),'2026-10-02');assert.equal(C.day(at('2026-10-25')),'2026-10-20');
 for(const d of ['2026-10-01','2026-10-02','2026-10-05','2026-10-19','2026-10-20','2026-10-30'])assert.ok(at(d)===''||C.day(at(d))<=d,'capture after '+d);
});
test('plans: a scheduled event stays current until a replacement or cancellation REGISTERED on or before the as-of day',()=>{
 const rows=base(),plan=d=>C.temporal(rows,d).plan,c=d=>sorted(plan(d).commitments);
 assert.deepEqual(c('2026-10-15'),['p1']);assert.deepEqual(c('2026-10-20'),['p1']);
 assert.deepEqual(c('2026-10-21'),[],'a result registered the same day already closes the plan');assert.deepEqual(c('2026-10-25'),[]);
 const p1=find(plan('2026-10-15').commitments,'p1');assert.equal(p1.text,'Hecho p1');assert.equal(p1.day,'2026-10-20');assert.equal(p1.status,'Programado');
 assert.deepEqual(plan('2026-10-15').proposals,[]);assert.ok(find(C.temporal(rows,'2026-10-25').history,'p1'),'the replaced plan stays in the history');
 // The result happened before the queried day but was registered after it: on that day the plan is still current.
 const q=[ev('q1','Programado','2026-10-14','2026-10-10'),ev('q2','Realizado','2026-10-14','2026-10-18',{replaces:'q1'})];
 let t=C.temporal(q,'2026-10-15');
 assert.deepEqual(sorted(t.plan.commitments),['q1']);assert.deepEqual(sorted(t.history),['q1','q2']);
 assert.equal(find(t.history,'q2').recordedLater,true);assert.equal(find(t.history,'q2').correctsId,'q1');
 assert.deepEqual(sorted(C.temporal(q,'2026-10-17').plan.commitments),['q1']);
 t=C.temporal(q,'2026-10-18');assert.deepEqual(t.plan.commitments,[]);assert.equal(find(t.history,'q2').recordedLater,false);
 // A cancellation closes the plan from its registration day and is itself never a plan.
 const k=[ev('k1','Programado','2026-10-25','2026-10-10'),ev('k2','Cancelado','2026-10-12','2026-10-12',{replaces:'k1'})];
 assert.deepEqual(sorted(C.temporal(k,'2026-10-11').plan.commitments),['k1']);
 for(const d of ['2026-10-12','2026-10-20',hoy]){const pl=C.temporal(k,d).plan;assert.deepEqual([...pl.commitments,...pl.proposals],[],'cancelled on '+d);}
 assert.equal(find(C.temporal(k,'2026-10-12').history,'k2').status,'Cancelado');
 // Rescheduling: the new plan replaces the old one from its registration day.
 const s=[ev('s1','Programado','2026-10-20','2026-10-05'),ev('s2','Programado','2026-10-27','2026-10-18',{replaces:'s1'})];
 assert.deepEqual(sorted(C.temporal(s,'2026-10-18').plan.commitments),['s2']);assert.deepEqual(sorted(C.temporal(s,'2026-10-25').plan.commitments),['s2']);
 // Commitments (Programado) and proposals (Propuesto) are separate lists; a proposal turned into a commitment leaves the proposals.
 const x=[ev('m1','Programado','2026-10-30','2026-10-05'),ev('n1','Propuesto','2026-11-05','2026-10-06'),ev('n2','Propuesto','2026-11-10','2026-10-06'),ev('m2','Programado','2026-11-10','2026-10-12',{replaces:'n2'})];
 for(const d of ['2026-10-12','2026-10-20']){const pl=C.temporal(x,d).plan;assert.deepEqual(sorted(pl.commitments),['m1','m2']);assert.deepEqual(sorted(pl.proposals),['n1']);assert.ok(pl.commitments.every(e=>e.status==='Programado'));assert.ok(pl.proposals.every(e=>e.status==='Propuesto'));}
});
test('overdue is a flag on plans without a recorded result; it never changes the status',()=>{
 const rows=[ev('f9','Realizado','2026-10-10','2026-10-10'),ev('v1','Programado','2026-10-12','2026-10-05'),ev('v2','Propuesto','2026-10-14','2026-10-05'),ev('v3','Programado','2026-10-15','2026-10-05')];
 let t=C.temporal(rows,'2026-10-15');
 assert.equal(typeof find(t.plan.commitments,'v1').overdue,'boolean');
 assert.equal(find(t.plan.commitments,'v1').overdue,true);assert.equal(find(t.plan.commitments,'v3').overdue,false,'due on the as-of day is not overdue yet');assert.equal(find(t.plan.proposals,'v2').overdue,true);
 assert.equal(find(t.plan.commitments,'v1').status,'Programado');assert.equal(find(t.plan.proposals,'v2').status,'Propuesto');assert.equal(find(t.history,'v1').status,'Programado');
 assert.equal(t.today.lastFact.id,'f9','an overdue plan never becomes the latest fact');
 t=C.temporal(rows,'2026-10-12');for(const e of [...t.plan.commitments,...t.plan.proposals])assert.equal(e.overdue,false,e.id+' on 2026-10-12');
 assert.equal(find(C.temporal(rows,'2026-10-16').plan.commitments,'v3').overdue,true);
 t=C.temporal(rows,hoy);const all=[...t.plan.commitments,...t.plan.proposals];
 assert.deepEqual(sorted(all),['v1','v2','v3']);assert.ok(all.every(e=>e.overdue===true&&e.status!=='Realizado'));assert.equal(t.today.lastFact.id,'f9');
});
test('as-of today applies the current stage, next step and decision of the case; a past day ignores them',()=>{
 const current={stage:'PPP presentado',next_action:'[YOD] Revisar números',next_date:hoy,decision:true,last_review:new Date().toISOString()};
 let t=C.temporal(base(),hoy,current);
 assert.equal(t.asOf,hoy);assert.equal(t.isToday,true);assert.equal(t.today.stage,'PPP presentado','the current stage wins over the stage observed in the last fact');
 assert.equal(t.today.nextAction,'[YOD] Revisar números');assert.equal(t.today.nextDate,hoy);assert.equal(t.today.decision,true);assert.equal(t.today.blocker,null);assert.equal(t.today.lastFact.id,'r1');
 assert.ok(t.plan.currentStep);assert.equal(t.plan.currentStep.date,hoy);assert.match(t.plan.currentStep.text,/Revisar números/);
 t=C.temporal(base(),'',current);assert.equal(t.isToday,true);assert.equal(t.today.stage,'PPP presentado');
 t=C.temporal(base(),'2026-10-25',current);
 assert.equal(t.isToday,false);assert.equal(t.today.stage,'En negociación');assert.equal(t.today.nextAction,'[YOD] Ajustar propuesta');assert.equal(t.today.nextDate,'2026-10-28');assert.equal(t.today.decision,false);assert.equal(t.plan.currentStep,null);
 t=C.temporal(base(),hoy);assert.equal(t.isToday,true);assert.equal(t.today.decision,false);assert.equal(t.today.blocker,null);
});
test('an empty or invalid as-of day falls back to today in America/Hermosillo',()=>{
 for(const bad of ['',undefined,null,'not-a-date','2026-02-30','2026-13-45','15/10/2026',20261015]){const t=C.temporal(base(),bad);assert.equal(t.asOf,hoy,String(bad));assert.equal(t.isToday,true,String(bad));}
 const t=C.temporal(base());assert.equal(t.asOf,hoy);assert.equal(t.isToday,true);assert.equal(C.temporal(base(),'2026-10-15').isToday,false);
});
test('temporal is pure and read-only: no mutation of rows, same result twice, calendarEvents and decode untouched',()=>{
 const deepFreeze=o=>{Object.values(o).forEach(v=>v&&typeof v==='object'&&deepFreeze(v));return Object.freeze(o);};
 const rows=deepFreeze(base()),before=JSON.stringify(rows),current=Object.freeze({stage:'X',next_action:'Y',next_date:'2026-10-16',decision:true,last_review:''});
 const a=C.temporal(rows,'2026-10-15',current),b=C.temporal(rows,'2026-10-15',current);
 assert.deepEqual(a,b);C.temporal(rows,hoy,current);C.temporal(rows,'2026-09-01');
 assert.equal(JSON.stringify(rows),before);assert.equal(C.history(rows).length,4);
 assert.deepEqual(C.calendarEvents(rows).map(e=>e.id),['r1','f2','f1']);assert.equal(C.decode(rows[1]).text,'Hecho f2');
});
test('legacy and malformed notes stay visible in the history from their recorded day, without invented dates or fields',()=>{
 const bad='Nota'+C.marker+'{"v":99}',rows=[{id:'legacy',opportunity_id:'o',date:'2026-10-03T18:00:00Z',note:'Nota anterior sin sobre'},{id:'bad',opportunity_id:'o',date:'2026-10-04T18:00:00Z',note:bad},...base()];
 const h=d=>C.temporal(rows,d).history;
 assert.deepEqual(ids(h('2026-10-02')),['f1']);assert.deepEqual(ids(h('2026-10-05')),['bad','legacy','f1']);
 const legacy=find(h('2026-10-05'),'legacy');assert.equal(legacy.text,'Nota anterior sin sobre');assert.equal(legacy.day,'2026-10-03');assert.equal(legacy.stage,'');assert.equal(legacy.source,'');assert.equal(legacy.recordedLater,false);assert.equal(legacy.correctsId,'');
 assert.equal(find(h('2026-10-05'),'bad').text,bad);
});
// The contract does not state this rule explicitly. Remove or adjust this test if the owner decides otherwise.
test('[contract silent, proposed] a plan captured after the queried day was not yet a plan on that day',()=>{
 const rows=[ev('s1','Programado','2026-10-20','2026-10-05'),ev('s2','Programado','2026-10-27','2026-10-18',{replaces:'s1'}),ev('pr','Propuesto','2026-11-02','2026-10-16')],plan=d=>C.temporal(rows,d).plan;
 assert.deepEqual(sorted(plan('2026-10-10').commitments),['s1']);assert.deepEqual(plan('2026-10-10').proposals,[]);
 assert.deepEqual(sorted(plan('2026-10-17').commitments),['s1']);assert.deepEqual(sorted(plan('2026-10-17').proposals),['pr']);
 assert.deepEqual(sorted(plan('2026-10-18').commitments),['s2']);
});
