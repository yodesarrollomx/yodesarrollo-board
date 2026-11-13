import {reviews} from '../storyboard-reviews.js?v=PMD-1.0.0';
let runtime=null,original=null,ready=false;
const A=window.YODPresentationAPI,$=s=>document.querySelector(s);
const toast=document.createElement('div');toast.id='toast';toast.setAttribute('role','status');toast.style.cssText='position:fixed;bottom:80px;left:20px;right:20px;z-index:90;background:#f8f9ef;color:#31533d;padding:12px;border:1px solid #d2ddcc;border-radius:8px;display:none;font:12px/1.5 system-ui';document.body.append(toast);let timer;
function notify(t){toast.textContent=t;toast.style.display='block';clearTimeout(timer);timer=setTimeout(()=>toast.style.display='none',6500);}
const dialog=document.createElement('dialog');dialog.id='reviewsDialog';dialog.className='yod-editor';dialog.innerHTML='<div class="yp-dialog-head"><h2>Chinches del plan</h2><button aria-label="Cerrar">×</button></div><div id="reviewList"></div>';dialog.querySelector('button').onclick=()=>dialog.close();document.body.append(dialog);
function setup(){if(ready||!window.__whiteboard)return;ready=true;const board=window.__whiteboard;original=JSON.parse(JSON.stringify(board.story));const mobile=()=>matchMedia('(max-width:650px), (hover:none) and (pointer:coarse) and (max-width:1000px)').matches;const starts=()=>mobile()?[0,.18,3.85,6.2]:[0,2.35,4.7,7.05];
 function semantic(v){const i=Math.min(16,Math.floor(v/10)),local=v-i*10,ss=starts();let b=3;while(b>0&&local<ss[b])b--;return Math.min(67.999,i*4+b+Math.max(0,Math.min(.999,(local-ss[b])/((ss[b+1]??10)-ss[b]))));}
 function progress(v){v=Math.min(67.999,Math.max(0,v));const i=Math.min(16,Math.floor(v/4)),b=Math.floor(v-i*4),ss=starts();return Math.min(169,i*10+ss[b]+(v-Math.floor(v))*((ss[b+1]??10)-ss[b]));}
 function scene(){const st=board.getState(),s=board.story.chapters[st.chapter];return {...s,label:s.short,beat:st.stage,beats:s.stages.map(x=>x.title),moments:s.stages.map(x=>({spoken:x.body})),presentation:runtime?.frame()};}
 const identity=()=>A.actor()?.owner?A.actor().id:'';const verify=async()=>{try{return (await A.catalog()).actor.owner===true}catch{return false}};
 reviews.init({current:scene,screen:'gaston-madrid-presentation',path:'presentacion/gaston-madrid/',version:'YOD-GASTON-D25-67e6306',source:'PPP Gastón Madrid · A15/D25 · snapshot17-oct-2026',verify,identity,pause(){document.body.classList.add('pin-review-mode')},resume(){document.body.classList.remove('pin-review-mode')},toast:notify});
 const pin=async el=>{if(!await verify())return window.YODPortero?.entrar();return reviews.capture(el||$('#viewport'));};
 $('#pin-button').hidden=true;$('#pin-button').onclick=()=>pin();$('#pin-history').onclick=()=>reviews.history();A.onIdentity(actor=>{$('#pin-button').hidden=!actor?.owner;if(!actor)reviews.clear();});
 runtime=window.YODPresentationRuntime.mount({id:'PRS-GASTON-MADRID',baseVersion:'YOD-GASTON-D25-67e6306',adapter:{
  getPosition:()=>semantic(board.getState().progress),setPosition(v){window.YODPresentationRemoteUpdate=true;try{board.setProgress(progress(v));}finally{window.YODPresentationRemoteUpdate=false}},
  frame(){const s=scene();return {sceneId:s.id,moment:s.beat,label:s.short,spoken:s.stages[s.beat].body,understand:s.title,question:s.question||''}},
  applyPatch(p){for(const s of board.story.chapters){Object.assign(s,JSON.parse(JSON.stringify(original.chapters.find(x=>x.id===s.id))));const v=p.scenes?.[s.id];if(!v)continue;if(v.understand!==undefined)s.title=v.understand;if(v.title!==undefined)s.title=v.title;if(v.question!==undefined)s.question=v.question;for(const [i,m] of Object.entries(v.moments||{})){if(s.stages[i]){if(m.spoken!==undefined)s.stages[i].body=m.spoken;if(m.label!==undefined)s.stages[i].title=m.label;}}}board.refresh();},
  summary(){const s=board.story.chapters.at(-1);return {title:'Gastón Madrid · Plan de potencial',result:s.title,question:s.stages.at(-1).body}},
  pin,history(){reviews.history()},pause(){document.body.classList.add('pin-review-mode')},resume(){document.body.classList.remove('pin-review-mode')},reveal(){$('#index-button').click()}
 }});
 window.YODGastonConstrain=v=>progress(runtime.constrain(semantic(v)));
}
document.addEventListener('yod:gaston-mounted',setup);setup();

// The original, already public proposal stays available without submitting a choice.
function proposalView(){const content=window.YodOfferContent;if(!content)return;const d=document.getElementById('detail-dialog'),body=document.getElementById('detail-body');document.getElementById('detail-kicker').textContent='PROPUESTA · CONTENIDO PUBLICADO';document.getElementById('detail-title').textContent='Entregables y opciones para revisar';body.replaceChildren();const add=(tag,text)=>{if(!text)return;const e=document.createElement(tag);e.textContent=String(text);body.append(e);};add('p','Revisamos el alcance y resolvemos dudas. Esta vista no envía una selección ni acepta condiciones.');for(const x of content.deliveries||[]){add('h3',x.n+' · '+x.title);for(const k of ['when','get','gain','control'])add('p',x[k]);}for(const x of content.offers||[]){add('h3',x.name);for(const k of ['worry','promise','when','terms','payment','next','ask'])add('p',x[k]);for(const item of x.items||[])add('p',typeof item==='string'?item:JSON.stringify(item));}if(!d.open)d.showModal();}
const proposal=document.createElement('button');proposal.textContent='Ver propuesta completa';proposal.className='quiet';proposal.style.cssText='position:fixed;right:16px;top:70px;z-index:25;font-size:11px';proposal.onclick=proposalView;document.body.append(proposal);
