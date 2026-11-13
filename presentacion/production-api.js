/* Continuation uses the existing Portero exchange and agent. No shared credential
 * is sent to Render and no token is saved by this module. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.YODPresentationProduction=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const fail=code=>{throw Object.assign(Error(code),{code});};
 function create({session,portero,fetchImpl=globalThis.fetch,now=Date.now}){
  let cached=null;
  function current(){const s=session();if(!s?.token||!s?.actor_id)fail('unauthorized');return s;}
  function check(before){const after=current();if(after.token!==before.token||after.actor_id!==before.actor_id)fail('session_changed');}
  async function json(url,body,headers,before){const c=new AbortController(),timer=setTimeout(()=>c.abort(),25000);try{const response=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify(body),credentials:'omit',cache:'no-store',signal:c.signal});check(before);const data=await response.json();check(before);if(!response.ok||data?.ok!==true){if(response.status===401||response.status===403)cached=null;fail(data?.error||'service_unavailable');}return data;}catch(e){if(e.code)throw e;fail('connection_uncertain');}finally{clearTimeout(timer);}}
  async function context(source){
   const s=current();if(cached&&cached.owner.token===s.token&&cached.owner.actor_id===s.actor_id&&cached.board_case_id===source.ppp_id&&cached.expires_at>now()+30000)return cached;
   const endpoint=portero();if(typeof endpoint!=='string'||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint))fail('backend_not_ready');
   const j=await json(endpoint,{tipo:'despacho-v1',operation:'resolvePresentationContext',payload:{board_case_id:source.ppp_id,model_type:source.model_type},k:s.token},{'Content-Type':'text/plain'},s);
   if(j.case_id!==source.case_id||j.board_case_id!==source.ppp_id||!/^https:\/\/[a-z0-9-]{1,63}\.onrender\.com$/.test(j.endpoint||'')||!/^[A-Za-z0-9_-]{20,1024}\.[a-f0-9]{64}$/.test(j.token||'')||!Number.isFinite(j.expires_at)||j.expires_at<=now())fail('invalid_context');
   cached={...j,owner:s};return cached;
  }
  async function call(path,source,payload){const before=current(),ctx=await context(source);check(before);const j=await json(ctx.endpoint+'/presentations/'+path,{case_id:ctx.case_id,source:{board_case_id:source.ppp_id},...payload},{'Content-Type':'application/json',Authorization:'Bearer '+ctx.token},before);if(typeof j.job_id!=='string'||!j.job_id||j.presentation_id!==payload.presentation_id&&payload.presentation_id||j.source?.board_case_id!==source.ppp_id)fail('invalid_response');return j;}
  return {produce:(source,payload)=>call('produce',source,payload),status:(source,job_id)=>call('status',source,{job_id}),forget(){cached=null;}};
 }
 return {create};
});
