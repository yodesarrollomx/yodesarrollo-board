'use strict';
// A single gesture clock drives the illustration. No page-scroll feedback loop.
window.MobileJourney={init(options){
 const $=id=>document.getElementById(id),root=document.documentElement;
 const media=matchMedia('(max-width:650px), (hover:none) and (pointer:coarse) and (max-width:1000px)');
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>v*v*(3-2*v);
 const MAX_RATE=5,MAX_LEAD=.24,TAU=28;
 const sensor=$('journey-sensor'),viewport=$('viewport'),list=$('stage-links');
 let mobile=false,locked=false,drag=null,target=options.getProgress(),raf=0,lastFrame=0,lastDirection=0;
 let speed=0,lastWheel=0,activeChapter=-1,renderedStage='',maxFrameStep=0,releasedAt=0,rotorTravel=0;
 const enabled=()=>mobile||document.body.classList.contains('live-running');
 const canDrive=()=>enabled()&&window.__YodLiveRole!=='guest';
 const buttons=options.chapters.map((chapter,i)=>{const b=document.createElement('button');b.type='button';b.textContent=({optimizar:'Módulos',valor:'Valor',patrimonio:'Retorno',mixto:'Venta y renta',propuesta:'Propuesta'})[chapter.id]||chapter.short;b.dataset.chapter=i;b.setAttribute('aria-label','Ir a '+chapter.short);b.onclick=()=>{options.setProgress(i*10);};list.append(b);return b;});
 function endDrag(){if(!drag)return;const {id,el}=drag;drag=null;releasedAt=performance.now();root.classList.remove('gesture-active');sensor.classList.remove('rotor-active');if(el.hasPointerCapture(id))el.releasePointerCapture(id);}
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;target=options.getProgress();lastFrame=0;speed=0;lastDirection=0;endDrag();releasedAt=0;}
 function sync(p){stop();target=clamp(p,0,options.max);}
 function tick(now){raf=0;if(!canDrive()||locked)return;const dt=Math.min(32,Math.max(1,now-lastFrame));lastFrame=now;const value=options.getProgress(),diff=target-value;
  if(Math.abs(diff)<.001||(!drag&&releasedAt&&now-releasedAt>=90)){if(Math.abs(diff)>0)options.setProgress(target,true);return;}
  const step=Math.sign(diff)*Math.min(Math.abs(diff)*(1-Math.exp(-dt/TAU)),MAX_RATE*dt/1000);
  maxFrameStep=Math.max(maxFrameStep,Math.abs(step));options.setProgress(clamp(value+step,0,options.max),true);raf=requestAnimationFrame(tick);
 }
 function move(delta,elapsed){if(!canDrive()||locked||!delta)return;if(!drag)releasedAt=0;const sign=Math.sign(delta),dt=clamp(elapsed,8,160),actual=options.getProgress();
  if(sign!==lastDirection){target=actual;speed=0;lastDirection=sign;}
  const instant=Math.abs(delta)/dt*1000;speed+=(instant-speed)*(1-Math.exp(-dt/40));
  const acceleration=smooth(clamp((speed-45)/650,0,1)),gain=.0065+.0215*acceleration;
  // Bound pending travel as well as the frame rate: no stored movement at either end.
  target=clamp(target+delta*gain,Math.max(0,actual-MAX_LEAD),Math.min(options.max,actual+MAX_LEAD));
  if(!raf&&Math.abs(target-actual)>.0001){lastFrame=performance.now();raf=requestAnimationFrame(tick);}
 }
 function pointerDown(e){if(e.pointerType==='touch'&&!e.isPrimary){stop();return;}if(!canDrive()||locked||drag||e.button!==0)return;stop();const el=e.currentTarget;drag={id:e.pointerId,el,y:e.clientY,time:e.timeStamp,total:0,started:false};el.setPointerCapture(e.pointerId);root.classList.add('gesture-active');sensor.classList.toggle('rotor-active',el===sensor);}
 function pointerMove(e){if(!drag||drag.id!==e.pointerId||e.currentTarget!==drag.el)return;e.preventDefault();const delta=drag.y-e.clientY,elapsed=e.timeStamp-drag.time;drag.y=e.clientY;drag.time=e.timeStamp;drag.total+=Math.abs(delta);if(!drag.started&&drag.total<2)return;drag.started=true;rotorTravel=(rotorTravel+delta)%12;sensor.style.setProperty('--rotor-travel',rotorTravel+'px');move(delta,elapsed);}
 [sensor,viewport].forEach(el=>{el.addEventListener('pointerdown',pointerDown);el.addEventListener('pointermove',pointerMove);el.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)endDrag();});el.addEventListener('pointercancel',stop);el.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)stop();});});
 $('app-shell').addEventListener('wheel',e=>{if(!canDrive()||locked||e.ctrlKey||e.target.closest('#mobile-rail,dialog,.narration'))return;e.preventDefault();const now=performance.now(),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?250:1);move(clamp(delta,-180,180),lastWheel?now-lastWheel:45);lastWheel=now;},{passive:false});
 sensor.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(locked||!canDrive())return;if(e.key==='Home')options.setProgress(0);else if(e.key==='End')options.setProgress(options.max);else if(e.key.startsWith('Page'))$(e.key==='PageDown'?'next':'prev').click();else options.setProgress(options.getProgress()+(['ArrowUp','ArrowRight'].includes(e.key)?1:-1)*.25);});
 function refreshLock(){const want=enabled()&&(document.body.classList.contains('pin-review-mode')||document.body.classList.contains('chn-abierto')||document.body.classList.contains('map-mode')||[...document.querySelectorAll('dialog')].some(d=>d.open));if(want!==locked){stop();locked=want;}sensor.setAttribute('aria-disabled',String(locked));sensor.tabIndex=locked?-1:0;}
 function keepActiveVisible(){const b=buttons[activeChapter];if(!b||!mobile)return;const left=b.offsetLeft,right=left+b.offsetWidth;if(left<list.scrollLeft)list.scrollLeft=left;else if(right>list.scrollLeft+list.clientWidth)list.scrollLeft=right-list.clientWidth;}
 function captionEdge(){const n=document.querySelector('.narration');n.classList.toggle('has-more',n.scrollTop+n.clientHeight<n.scrollHeight-3);}function listEdges(){}
 function layout(){const was=mobile;mobile=media.matches;stop();root.classList.toggle('mobile-journey',mobile);if(was!==mobile)scrollTo(0,0);$('prev').textContent=mobile?'↑':'←';$('next').textContent=mobile?'↓':'→';options.redraw();requestAnimationFrame(()=>{keepActiveVisible();listEdges();captionEdge();});}
 function render(s){const changed=renderedStage!==s.chapter+':'+s.stage;renderedStage=s.chapter+':'+s.stage;sensor.setAttribute('aria-valuenow',s.progress.toFixed(2));sensor.setAttribute('aria-valuetext',s.title+'. '+s.stepTitle);if(activeChapter!==s.chapter){activeChapter=s.chapter;buttons.forEach((b,i)=>{b.classList.toggle('current',i===activeChapter);if(i===activeChapter)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});if(mobile)keepActiveVisible();listEdges();}if(changed)captionEdge();refreshLock();
 }
 $('mobile-help').onclick=e=>options.openHelp(e.currentTarget);
 $('stage-all').onclick=e=>options.openIndex(e.currentTarget);$('dialog-prev').onclick=()=>{$('index-dialog').close();$('prev').click();};$('dialog-next').onclick=()=>{$('index-dialog').close();$('next').click();};
 list.addEventListener('scroll',listEdges,{passive:true});document.querySelector('.narration').addEventListener('scroll',captionEdge,{passive:true});
 // Live controls and pin composers can be inserted after this controller starts.
 // Observe every dialog's open state, including those added later; closing one
 // must unlock the gesture even when there is no subsequent diagram redraw.
 new MutationObserver(refreshLock).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('close',refreshLock,true);
 new MutationObserver(refreshLock).observe(document.body,{attributes:true,attributeFilter:['class']});addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 addEventListener('resize',layout,{passive:true});media.addEventListener('change',layout);
 if('scrollRestoration' in history)history.scrollRestoration='manual';
 layout();return{sync,render,isMobile:()=>mobile,debug:()=>({mobile,locked,dragging:!!drag,target,speed,maxRate:MAX_RATE,maxLead:MAX_LEAD,maxFrameStep,animating:!!raf})};
}};
