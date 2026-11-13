(function(root){'use strict';
 let runtime=null,base=null;
 function setup(){const api=root.YodSlider?.api,cfg=api?.config();if(!cfg)return;runtime?.dispose();base=JSON.parse(JSON.stringify(cfg));
  runtime=root.YODPresentationRuntime.mount({id:'PRS-YOD-GENERAL',baseVersion:'YOD-GENERAL-9fbcde92543b',adapter:{
   getPosition:()=>api.state().p,
   setPosition(v){root.YODPresentationRemoteUpdate=true;try{api.seek(v,false)}finally{root.YODPresentationRemoteUpdate=false}},
   frame(){const state=api.state(),c=api.config(),s=c.scenes[state.scene],m=s.steps[state.step];return {sceneId:s.id,moment:state.step,label:s.label,spoken:m.caption||m.body||'',understand:s.understand||s.title||'',question:s.question||''}},
   applyPatch(p){const c=api.config();for(const s of c.scenes){const original=base.scenes.find(x=>x.id===s.id);Object.assign(s,JSON.parse(JSON.stringify(original)));const v=p.scenes?.[s.id];if(!v)continue;for(const k of ['title','understand','question'])if(v[k]!==undefined)s[k]=v[k];for(const [i,m] of Object.entries(v.moments||{})){const step=s.steps[i];if(!step)continue;if(m.spoken!==undefined){step.caption=m.spoken;step.body=m.spoken}if(m.label!==undefined)step.heading=m.label;}}api.refresh();if(p.title)document.title=p.title+' · YoDesarrollo';},
   summary(){const c=api.config(),s=c.scenes.at(-1),m=s.steps.at(-1);return {title:'YoDesarrollo · Del terreno al proyecto',result:s.title,question:m.caption||m.body||''}},
   pause(){api.pause();api.seek(api.state().p,false)},resume(){api.resume()},reveal(){document.getElementById('contents')?.click()},
   pin(){root.YodPresentationPins?.start()},history(){root.YodPresentationPins?.history()}
  }});root.YODIntentConstrain=v=>runtime.constrain(v);
 }
 document.addEventListener('yod:intent-mounted',setup);if(root.YodSlider?.api?.config())setup();
})(window);
