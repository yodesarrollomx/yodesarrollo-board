'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const D=require('../presentacion/registry-core.js');
const S=require('../presentacion/storyboard-core.js');
const storyboard=require('./fixtures/ppp-storyboard.json');
const catalog=require('../presentacion/catalogo.json');
const copy=x=>structuredClone(x);
const presentationId='PRS-SYNTHETIC-PPP';
function version(overrides={}){
 return {presentation_version_id:'PV-SYNTHETIC-1',parent_version_id:null,job_id:'JOB-SYNTHETIC-1',source:{case_id:'CASE-SYNTHETIC',ppp_id:'PPP-SYNTHETIC',viewed_scenario_id:'scenario-viewed',ppp_revision:12,source_revision:'source-r4',snapshot_hash:'a'.repeat(64),model_type:'vertical'},method_version:'presentacion-yod-3.0.0',renderer_version:S.VERSION,storyboard:copy(storyboard),...overrides};
}
function fixture(overrides={}){
 let n=0,now=100000,writes=0,lease=true;
 const records=new Map(catalog.presentations.map(m=>[m.id,D.createRecord(m,now)]));
 const adapter={
  now:()=>now,uuid:()=>`synthetic-uuid-${++n}`,hash:s=>crypto.createHash('sha256').update(s).digest('hex'),
  catalog:()=>[...records.values()].map(r=>copy(r.metadata)),read:id=>copy(records.get(id)),
  write:r=>{writes++;records.set(r.id,copy(r));},
  create:r=>{if(records.has(r.id))throw Error('conflict');writes++;records.set(r.id,copy(r));},
  lock:fn=>fn(),session:()=>null,
  auth:token=>token==='owner'?{ok:true,id:'owner',owner:true}:token==='worker'?{ok:true,id:'owner',worker:true,owner:false}:token==='broker'?{ok:true,id:'broker',owner:false,opportunityIds:['CASE-SYNTHETIC']}:null,
  authorizeGeneration:(actor,p)=>actor.worker===true&&lease&&p.data.version.source.case_id==='CASE-SYNTHETIC',
  normalizeStoryboard:S.normalize,
  projectStoryboard:S.project,
  ...overrides
 };
 const service=D.createService(adapter);
 const call=(op,data={},extra={})=>service.handle({op,id:presentationId,token:op==='register_storyboard'?'worker':'owner',requestId:`synthetic-request-${++n}`,data,...extra});
 return {records,adapter,call,service,get writes(){return writes;},fence:()=>lease=false,clock:value=>now=value,register:(v=version(),expectedRevision=0,extra={})=>call('register_storyboard',{expectedRevision,version:v},extra)};
}

test('registration is unavailable without the existing adapter capabilities and cannot use browser ownership as worker authority',()=>{
 for(const key of ['authorizeGeneration','normalizeStoryboard','create'])assert.equal(fixture({[key]:undefined}).register().error,'backend_not_ready');
 const f=fixture();
 assert.equal(f.register(version(),0,{token:''}).error,'unauthorized');
 assert.equal(f.register(version(),0,{token:'owner',worker:true}).error,'forbidden');
 assert.equal(f.register(version(),0,{token:'broker'}).error,'forbidden');
 assert.equal(f.writes,0);
});

test('a generated version is private, bound to the viewed PPP source, and enters the same catalogue without an invented release',()=>{
 const f=fixture(),ack=f.register();
 assert.equal(ack.ok,true);
 assert.equal(ack.data.revision,1);
 assert.equal(ack.data.releaseRevision,null);
 assert.deepEqual(ack.data.releases,[]);
 assert.equal(ack.data.metadata.public,false);
 assert.equal(ack.data.metadata.shared,false);
 assert.equal(ack.data.metadata.url,`https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/ppp/?id=${presentationId}`);
 assert.equal(ack.data.content_versions[0].version_number,1);
 assert.equal(ack.data.content_versions[0].source.ppp_revision,12);
 assert.equal(ack.data.content_versions[0].source.viewed_scenario_id,'scenario-viewed');
 assert.ok(!('storyboard' in ack.data.content_versions[0]));
 const rows=f.call('catalog').data;
 assert.equal(rows.filter(r=>r.id===presentationId).length,1);
 assert.equal(JSON.stringify(rows).includes(storyboard.decision),false,'catalogue must not download private guion bodies');
 const read=f.call('read_version').data;
 assert.equal(read.presentation_id,presentationId);
 assert.equal(read.version.presentation_version_id,'PV-SYNTHETIC-1');
 assert.deepEqual(read.version.storyboard,S.normalize(storyboard));
 read.version.storyboard.title='Local change';
 assert.equal(f.call('read_version').data.version.storyboard.title,storyboard.title,'read copies cannot mutate a saved version');
});

test('lost-response replay creates one version and one receipt; changed payload with the same request is rejected',()=>{
 const f=fixture(),data=version(),first=f.register(data,0,{requestId:'fixed-worker-request'});
 const retry=f.register(data,0,{requestId:'fixed-worker-request'});
 assert.equal(retry.ok,true);
 assert.deepEqual(retry.receipt,first.receipt);
 assert.equal(f.writes,1);
 assert.equal(f.register({...data,method_version:'changed'},0,{requestId:'fixed-worker-request'}).error,'idempotency_mismatch');
 assert.equal(f.records.get(presentationId).content_versions.length,1);
});

test('append keeps immutable versions and the source revision separate from registry revision',()=>{
 const f=fixture();f.register();
 const original=copy(f.records.get(presentationId).content_versions[0]);
 const next=version({presentation_version_id:'PV-SYNTHETIC-2',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-SYNTHETIC-2'});
 next.storyboard.title='Revised narrative, same source';
 const second=f.register(next,1);
 assert.equal(second.ok,true);
 assert.equal(second.data.revision,2);
 assert.equal(second.data.content_versions[1].version_number,2);
 assert.equal(second.data.content_versions[1].source.ppp_revision,12);
 assert.deepEqual(f.records.get(presentationId).content_versions[0],original);
 const list=f.call('list_versions').data;
 assert.equal(list.latest_presentation_version_id,'PV-SYNTHETIC-2');
 assert.equal(list.content_versions.length,2);
 assert.equal(list.content_versions[0].title,storyboard.title);assert.equal(list.content_versions[1].title,'Revised narrative, same source');
 assert.ok(list.content_versions.every(v=>!v.storyboard));
 assert.equal(f.call('read_version',{}, {presentation_version_id:'PV-SYNTHETIC-1'}).data.version.storyboard.title,storyboard.title);
});

test('concurrent append and stale parents fail without overwriting either saved narrative',()=>{
 const f=fixture();f.register();
 const next=version({presentation_version_id:'PV-SYNTHETIC-2',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-SYNTHETIC-2'});
 assert.equal(f.register(next,0).error,'conflict');
 assert.equal(f.register({...next,parent_version_id:null},1).error,'conflict');
 assert.equal(f.register(next,1).ok,true);
 assert.equal(f.register({...next,presentation_version_id:'PV-SYNTHETIC-3',job_id:'JOB-SYNTHETIC-3'},2).error,'conflict');
 assert.equal(f.writes,2);
 assert.equal(f.records.get(presentationId).content_versions.length,2);
});

test('a job or presentation-version identity cannot be reused for another content revision',()=>{
 const f=fixture();f.register();
 assert.equal(f.register(version({parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-SYNTHETIC-2'}),1).error,'idempotency_mismatch');
 assert.equal(f.register(version({parent_version_id:'PV-SYNTHETIC-1',presentation_version_id:'PV-SYNTHETIC-2'}),1).error,'idempotency_mismatch');
 assert.equal(f.writes,1);
});

test('a new source revision is allowed but a record cannot cross into another PPP or case',()=>{
 const f=fixture({authorizeGeneration:()=>true});f.register();
 const next=version({presentation_version_id:'PV-SYNTHETIC-2',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-SYNTHETIC-2'});
 assert.equal(f.register({...next,source:{...next.source,case_id:'CASE-OTHER'}},1).error,'source_mismatch');
 assert.equal(f.register({...next,source:{...next.source,ppp_id:'PPP-OTHER'}},1).error,'source_mismatch');
 assert.equal(f.register({...next,source:{...next.source,ppp_revision:13,snapshot_hash:'b'.repeat(64)}},1).ok,true);
 assert.equal(f.call('read_version').data.version.source.ppp_revision,13);
});

test('generation authority is rechecked under the write lock, including an interrupted worker retry',()=>{
 const f=fixture();f.register(version(),0,{requestId:'fixed-worker-request'});f.fence();
 assert.equal(f.register(version(),0,{requestId:'fixed-worker-request'}).error,'forbidden');
 assert.equal(f.register(version({presentation_version_id:'PV-SYNTHETIC-2',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-SYNTHETIC-2'}),1).error,'forbidden');
 assert.equal(f.writes,1);
});

test('sources and typed visual content reject invalid or executable payloads before any write',()=>{
 const brokenSources=[{snapshot_hash:'unknown'},{ppp_revision:-1},{source_revision:''},{model_type:'invented'},{extra:'private-token'}];
 for(const bad of brokenSources){const f=fixture(),v=version();assert.equal(f.register({...v,source:{...v.source,...bad}}).error,'invalid_source');assert.equal(f.writes,0);}
 for(const mutate of [v=>v.storyboard.script='alert(1)',v=>v.storyboard.scenes[0].moments[0].visible_objects=['unknown'],v=>v.storyboard.objects[0].kind='execute']){
  const f=fixture(),v=version();mutate(v);assert.equal(f.register(v).ok,false);assert.equal(f.writes,0);
 }
 const f=fixture();assert.equal(f.register({...version(),method_version:''}).error,'invalid_version');
});

test('public and broker reads cannot reveal generated metadata, source, storyboard or authorization even if flags are accidentally changed',()=>{
 const f=fixture();f.register();
 const stored=f.records.get(presentationId);stored.metadata.public=true;stored.metadata.shared=true;
 assert.equal(f.call('public_catalog',{}, {token:''}).data.some(r=>r.id===presentationId),false);
 for(const op of ['public_release','public_session'])assert.equal(f.call(op,{}, {token:''}).error,'not_found');
 assert.equal(f.call('catalog',{}, {token:'broker'}).data.some(r=>r.id===presentationId),false);
 for(const op of ['read_version','list_versions','inspect','authorize_production']){
  assert.equal(f.call(op,{}, {token:''}).error,'unauthorized');
  assert.equal(f.call(op,{}, {token:'broker'}).error,'forbidden');
 }
 assert.throws(()=>D.publicRelease(stored),/not_found/);
});

test('stage-two authorization requires an explicit owner instruction about an existing version and is distinct from production or publication',()=>{
 const f=fixture();f.register();
 const base={expectedRevision:1,presentation_version_id:'PV-SYNTHETIC-1',instruction:'produce_presentation'};
 assert.equal(f.call('authorize_production',{...base,instruction:'approved'}).error,'invalid_instruction');
 assert.equal(f.call('authorize_production',{...base,presentation_version_id:'PV-MISSING'}).error,'version_not_found');
 assert.equal(f.call('authorize_production',base,{token:'worker'}).error,'forbidden');
 const before=copy(f.records.get(presentationId).content_versions);
 const first=f.call('authorize_production',base,{requestId:'authorize-request'});
 assert.equal(first.ok,true);
 assert.equal(first.data.revision,2);
 assert.equal(first.data.production_authorizations.length,1);
 assert.equal(first.data.production_authorizations[0].presentation_version_id,'PV-SYNTHETIC-1');
 assert.equal(first.data.production_authorizations[0].actor_id,'owner');
 assert.equal(first.data.content_versions[0].status,'ready_for_review');
 assert.equal(first.data.releaseRevision,null);
 assert.deepEqual(f.records.get(presentationId).content_versions,before);
 const retry=f.call('authorize_production',base,{requestId:'authorize-request'});
 assert.deepEqual(retry.receipt,first.receipt);
 assert.equal(f.writes,2);
 assert.equal(f.call('read_version').data.production_authorizations.length,1);
});

test('authorizing again keeps a single authorization identity, while registry revision advances separately from content versions',()=>{
 const f=fixture();f.register();
 const first=f.call('authorize_production',{expectedRevision:1,presentation_version_id:'PV-SYNTHETIC-1',instruction:'produce_presentation'});
 const second=f.call('authorize_production',{expectedRevision:2,presentation_version_id:'PV-SYNTHETIC-1',instruction:'produce_presentation'});
 assert.equal(second.ok,true);
 assert.equal(second.data.production_authorizations.length,1);
 assert.equal(second.receipt.production_authorization_id,first.receipt.production_authorization_id);
 assert.equal(second.data.content_versions.length,1);
 assert.equal(second.data.revision,3);
 assert.equal(f.register(version({presentation_version_id:'PV-SYNTHETIC-2',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-SYNTHETIC-2'}),3).ok,true);
 assert.equal(f.call('read_version').data.production_authorizations.length,0,'an old authorization does not approve a new version');
});

test('legacy edit, linkage, publishing and guided sessions cannot bypass the generated private-version workflow',()=>{
 const f=fixture();f.register();
 for(const op of ['save_draft','link','publish','session_start'])assert.equal(f.call(op,{expectedRevision:1,patch:{title:'Changed'},controllerId:'device-owner'}).error,'generated_operation_not_allowed');
 assert.equal(f.writes,1);
 assert.deepEqual(f.records.get(presentationId).releases,[]);
});

test('generation cannot overwrite an existing legacy presentation or manufacture a missing content version',()=>{
 const f=fixture();
 assert.equal(f.register(version(),1,{id:catalog.presentations[0].id}).error,'invalid_version');
 f.register();
 assert.equal(f.call('read_version',{}, {presentation_version_id:'PV-MISSING'}).error,'version_not_found');
 assert.equal(f.call('read_version',{}, {id:catalog.presentations[0].id}).error,'invalid_version');
 assert.equal(f.writes,1);
});

test('production requires the saved owner authorization for its exact storyboard parent and financial source',()=>{
 const f=fixture();f.register();
 const production=version({presentation_version_id:'PV-PRODUCTION-1',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-PRODUCTION-1',stage:'presentation',production_authorization_id:'PA-MISSING'});
 assert.equal(f.register(production,1).error,'production_not_authorized');
 const auth=f.call('authorize_production',{expectedRevision:1,presentation_version_id:'PV-SYNTHETIC-1',instruction:'produce_presentation'});
 production.production_authorization_id=auth.receipt.production_authorization_id;
 assert.equal(f.register({...production,source:{...production.source,ppp_revision:13}},2).error,'production_not_authorized');
 assert.equal(f.register({...production,source:{...production.source,snapshot_hash:'b'.repeat(64)}},2).error,'production_not_authorized');
 const oldAuth=f.adapter.auth;f.adapter.auth=()=>({ok:true,id:'another-owner',worker:true,owner:false});assert.equal(f.register(production,2).error,'production_not_authorized');f.adapter.auth=oldAuth;
 const result=f.register(production,2);assert.equal(result.ok,true);assert.equal(result.data.metadata.stage,'presentation');assert.equal(result.data.releaseRevision,null);assert.deepEqual(result.data.releases,[]);
 assert.equal(result.data.content_versions[0].stage,'storyboard');assert.equal(result.data.content_versions[1].stage,'presentation');
 assert.equal(f.call('authorize_production',{expectedRevision:3,presentation_version_id:'PV-PRODUCTION-1',instruction:'produce_presentation'}).error,'invalid_instruction');
});

test('the audience projection is owner-authorized, belongs to a produced version and omits private narrative and source references',()=>{
 const f=fixture();f.register();
 assert.equal(f.call('read_projection').error,'production_not_authorized');
 const auth=f.call('authorize_production',{expectedRevision:1,presentation_version_id:'PV-SYNTHETIC-1',instruction:'produce_presentation'});
 assert.equal(f.register(version({presentation_version_id:'PV-PRODUCTION-1',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-PRODUCTION-1',stage:'presentation',production_authorization_id:auth.receipt.production_authorization_id}),2).ok,true);
 for(const token of ['', 'broker'])assert.equal(f.call('read_projection',{}, {token}).ok,false);
 const response=f.call('read_projection');assert.equal(response.ok,true);assert.equal(response.data.presentation_version_id,'PV-PRODUCTION-1');assert.equal(response.data.projection.schema,'yod.presentation.projection.v1');
 const raw=JSON.stringify(response);for(const key of ['"spoken"','"source_ref"','"source"','"question"','"audience"'])assert.equal(raw.includes(key),false,key);
 assert.ok(response.data.projection.scenes.some(s=>s.condition),'material scene conditions remain visible');
 assert.equal(f.call('read_projection',{}, {presentation_version_id:'PV-SYNTHETIC-1'}).error,'production_not_authorized');
 delete f.adapter.projectStoryboard;assert.equal(f.call('read_projection').error,'backend_not_ready');
});

test('an explicitly reviewed historical storyboard can produce a new child without overwriting a later narrative',()=>{
 const f=fixture();f.register();
 f.register(version({presentation_version_id:'PV-SYNTHETIC-2',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-SYNTHETIC-2'}),1);
 const second=copy(f.records.get(presentationId).content_versions[1]);
 const auth=f.call('authorize_production',{expectedRevision:2,presentation_version_id:'PV-SYNTHETIC-1',instruction:'produce_presentation'});
 const production=version({presentation_version_id:'PV-HISTORICAL-PRODUCTION',parent_version_id:'PV-SYNTHETIC-1',job_id:'JOB-HISTORICAL-PRODUCTION',stage:'presentation',production_authorization_id:auth.receipt.production_authorization_id});
 assert.equal(f.register(production,2).error,'conflict','registry CAS remains current even for an older parent');
 const ack=f.register(production,3);assert.equal(ack.ok,true);assert.equal(ack.data.content_versions.length,3);assert.equal(ack.data.content_versions[2].parent_version_id,'PV-SYNTHETIC-1');assert.deepEqual(f.records.get(presentationId).content_versions[1],second);
});

test('generated receipts remain reconcilable after more than one hundred later registry actions',()=>{
 const f=fixture(),v=version(),first=f.register(v,0,{requestId:'original-durable-request'});
 for(let i=0;i<101;i++)assert.equal(f.call('authorize_production',{expectedRevision:i+1,presentation_version_id:'PV-SYNTHETIC-1',instruction:'produce_presentation'}).ok,true);
 const before=f.writes,replay=f.register(v,0,{requestId:'original-durable-request'});assert.equal(replay.ok,true);assert.deepEqual(replay.receipt,first.receipt);assert.equal(f.writes,before);assert.equal(f.records.get(presentationId).content_versions.length,1);
});
