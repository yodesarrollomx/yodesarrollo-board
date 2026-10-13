const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../brokers-crm.js'),Core=require('../brokers-core.js');
const event=(id,status,date,extra={})=>({id,opportunity_id:'o',date:'2030-02-10T18:00:00Z',author_name:'Recorder',note:C.encode('Conversation '+id,{v:1,type:'Reunión',status,occurred_at:date,...extra})});
test('legacy notes and invalid envelopes remain visible, without invented participants or dates',()=>{
 const a=C.decode({id:'legacy',date:'2030-01-02T02:00:00Z',note:'Existing note'});assert.equal(a.text,'Existing note');assert.equal(a.day,'2030-01-01');assert.equal(a.participants,'');
 const bad='Note'+C.marker+'{"v":99}';assert.equal(C.decode({id:'bad',note:bad}).text,bad);assert.equal(C.decode({id:'none',note:'undated'}).day,'');
});
test('actual occurrence and source are separate from recording, future plans stay plans',()=>{
 const a=event('a','Realizado','2030-01-08',{participants:'PG; YOD',source:'Meeting summary',source_url:'https://docs.google.com/document/d/synthetic/edit',stage:'En revisión'}),b=event('b','Programado','2030-03-15');
 const d=C.decode(a);assert.equal(d.day,'2030-01-08');assert.equal(d.recorded_at,a.date);assert.equal(d.stage,'En revisión');assert.equal(C.history([a,b])[0].id,'b');assert.equal(C.monthGrid('2030-03',[b]).find(d=>d.day==='2030-03-15').planned,1);
});
test('only explicit same-opportunity terminal result closes scheduled calendar entry; history remains',()=>{
 const a=event('a','Programado','2030-03-15'),b=event('b','Realizado','2030-03-17',{replaces:'a'}),other={...event('x','Cancelado','2030-03-15',{replaces:'a'}),opportunity_id:'other'};
 assert.deepEqual(C.calendarEvents([a,other]).map(e=>e.id),['a']);assert.deepEqual(C.calendarEvents([a,b]).map(e=>e.id),['b']);assert.equal(C.history([a,b]).length,2);
 assert.equal(C.calendarEvents([a,event('c','Cancelado','2030-03-15',{replaces:'a'})]).length,0);
});
test('calendar weekday alignment, leap dates and month transitions',()=>{
 const grid=C.monthGrid('2032-02',[]);assert.equal(grid.filter(d=>d.day).length,29);assert.equal(C.day('2032-02-29'),'2032-02-29');assert.equal(C.day('2030-02-29'),'');assert.equal(C.shiftMonth('2030-12',1),'2031-01');assert.equal(C.shiftMonth('2030-01',-1),'2029-12');assert.throws(()=>C.monthGrid('2030-13',[]));
});
test('metadata length, sources and dates validated; ownership prefix PG stays a label',()=>{
 assert.throws(()=>C.encode('text',{v:1,type:'Reunión',status:'Realizado',occurred_at:'bad'}));assert.throws(()=>C.encode('text',{v:1,type:'Reunión',status:'Realizado',occurred_at:'2030-01-01',source_url:'javascript:alert(1)'}));assert.throws(()=>C.encode('x'.repeat(3950),{v:1,type:'Reunión',status:'Realizado',occurred_at:'2030-01-01'}));
 assert.equal(Core.encodeStep('PG','Revisar concepto'),'[PG] Revisar concepto');assert.equal(Core.nextStep('[PG] Revisar').owner,'PG');
});
const op={id:'o',ppp_id:'p1',ppp_url:'https://yodesarrollomx.github.io/potenciales-yod/macrolotes.html?open=p1'};
const caseData={caso_id:'p1',version:7,ts_actualizado:'2030-01-02T20:00:00Z',superficie_ha:3,tir_dev_pct:26.1,utilidad:1200000,meses_totales:24,inEquity:500000,inCostoNave:7000,faltante_capital:0,escenarios_json:JSON.stringify([{id:'s1',nombre:'Reference',activo:false,inputs:{inEquity:9000}},{id:'s2',nombre:'Saved active',activo:true,inputs:{inEquity:500000}}])};
test('PPP reference requires exact canonical ID, host and allowed model',()=>{
 assert.deepEqual(C.pppReference(op),{id:'p1',type:'macrolotes'});for(const ppp_url of ['https://example.com/macrolotes.html?open=p1','https://yodesarrollomx.github.io/potenciales-yod/macrolotes.html?open=p2','https://yodesarrollomx.github.io/other/macrolotes.html?open=p1'])assert.equal(C.pppReference({...op,ppp_url}),null);
});
test('saved PPP displays original outputs and differentiates capital ceiling/funding gap; no alternative recalculation',()=>{
 const data=C.savedPPP(caseData,C.pppReference(op));assert.equal(data.version,'7');assert.equal(data.scenarios.length,2);assert.equal(data.scenario,'Saved active');assert.match(data.cards[1].text,/26.1%/);assert.match(data.cards[2].text,/Capital máximo \$500,000/);assert.match(data.cards[2].text,/Faltante de capital \$0/);assert.ok(!data.cards.some(c=>c.text.includes('9,000')));
 const blank=C.savedPPP({caso_id:'p1',version:1},C.pppReference(op));assert.equal(blank.cards.every(c=>!c.text),true);assert.throws(()=>C.savedPPP({...caseData,caso_id:'p2'},C.pppReference(op)));
});
test('PPP client performs only canonical GET, shares in-flight read, invalidates cache across sessions',async()=>{
 let token='one',calls=[];const client=C.createPPPClient({url:'https://script.google.com/macros/s/synthetic/exec',token:()=>token,fetch:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({ok:true,caso:caseData})};}});
 const [a,b]=await Promise.all([client.read(op),client.read(op)]);assert.deepEqual(a,b);assert.equal(calls.length,1);assert.equal(calls[0].opts.method,'GET');assert.equal(new URL(calls[0].url).searchParams.get('id'),'p1');await client.read(op);assert.equal(calls.length,1);
 token='two';client.invalidate();await client.read(op);assert.equal(calls.length,2);assert.equal(new URL(calls[1].url).searchParams.get('k'),'two');
});
test('late PPP response from old session never populates a current view; denied and missing config are recoverable',async()=>{
 let token='one',resolve;const client=C.createPPPClient({url:'https://script.google.com/exec',token:()=>token,fetch:()=>new Promise(r=>resolve=r)});const pending=client.read(op);token='two';client.invalidate();resolve({ok:true,json:async()=>({ok:true,caso:caseData})});await assert.rejects(pending,/sesión/);
 const empty=C.createPPPClient({url:'',token:()=>token,fetch:()=>{throw Error('should not fetch');}});await assert.rejects(empty.read(op),/Abre el plan/);
});
