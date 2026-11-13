import {meaning,reveal} from './meaning.js?v=YOD-SB11';
import {figure} from './figures.js?v=YOD-SB11';
import {territoryMarkup,paintTerritory,parcelScreen,parcelFigurePath} from './territory.js?v=YOD-SB11';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ink='#253e3b',muted='#6b7972';
const text=(x,y,s,size=18,color=ink,anchor='middle')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
const line=(d,color=muted,dash='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;
const wrap=(s,n)=>{let a=[''];for(const w of s.split(' ')){const i=a.length-1;if((a[i]+' '+w).trim().length>n)a.push(w);else a[i]+=(a[i]?' ':'')+w}return a};
const kinds={land:'land',nave:'nave',plaza:'plaza',hotel:'hotel',office:'office',club:'club',pocket:'pocket',document:'document',capital:'capital',team:'coordination',gate:'gate'};
let svg,host,lastMobile,groups={},lastKey='',lastShape='',lastLand='',lastLandStyle='',lastMeaning='';
const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t)},mix=(a,b,t)=>a+(b-a)*t;
export function mount(el,mobile){host=el;lastMobile=mobile;lastKey='';lastShape='';lastLand='';lastLandStyle='';lastMeaning='';el.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" role="img"><defs><pattern id="paper" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#60786b" opacity=".13"/></pattern></defs><rect width="100%" height="100%" fill="#f8f6ee"/><rect width="100%" height="100%" fill="url(#paper)"/>${territoryMarkup(mobile)}${Object.entries(kinds).map(([id,k])=>`<g data-object="${id}" opacity="0">${figure(k)}</g>`).join('')}<g id="semantic-layer"></g><g id="scene-labels"></g><g id="scene-heading"></g></svg>`;svg=el.querySelector('svg');groups=Object.fromEntries([...svg.querySelectorAll('[data-object]')].map(e=>[e.dataset.object,e]));}
function state(i,t,m){const W=m?480:1100,C=W/2,R=m?358:815,a={};for(const id in kinds)a[id]=[C,350,1,0];
 if(i===0){const p=parcelScreen(m);a.land=[p.x,p.y,p.scale,t>=3?1:0];}
 if(i===1){const e=ease((t-1.2)/.8);a.land=m?[240,188,.22,1]:[550,165,.30,1];
  a.nave=m?[86,335,.72,1]:[160,430,1.15,1];
  ['plaza','office','hotel','club','pocket'].forEach((id,k)=>a[id]=m?[40,[469,497,525,553,581][k],k<4?.26:.30,e]:[612,[298,359,423,473,536][k],k<4?.40:.48,e]);}
 if(i===3){const e2=ease((t-.5)/.4),e3=ease((t-1.5)/.4),e4=ease((t-2.4)/.5),g=e3;
  const P=m?{land:[55,330,.55],team:[160,230,.32],office:[340,230,.45],doc2:[250,330,.3],nv2:[400,330,.4],gate:[300,520,1],nv3:[300,505,.35],doc3:[255,550,.28],cap:[345,550,.3],nv4:[55,310,.25]}
   :{land:[110,350,.95],team:[290,270,.55],office:[530,270,.75],doc2:[410,280,.5],nv2:[760,280,1],gate:[800,340,1.6],nv3:[800,315,.6],doc3:[715,400,.45],cap:[885,400,.55],nv4:[110,315,.42]};
  const at=(u,v,e)=>u.map((x,k)=>mix(x,v[k],e));
  a.land=[...P.land,1];a.team=[...P.team,1];a.office=[...P.office,1-.6*e4];
  a.document=[...at(P.doc2,P.doc3,e3),e2*(1-e4)];
  a.nave=[...(t<2.4?at(P.nv2,P.nv3,e3):at(P.nv3,P.nv4,e4)),e2];
  a.gate=[...P.gate,g*(1-e4)];a.capital=[...P.cap,g*(1-e4)];}
 if(i===5){a.nave=m?[60,215,.45,1]:[150,380,.95,1];
  ['plaza','office','hotel','club','pocket'].forEach((id,k)=>{const e=ease((t-(k<2?0:1)-.2)/.8);a[id]=m?[40,[270,322,374,426,478][k],.26,0]:[620,[250,318,386,454,522][k],.40,e]})}
 if(i===6){const e=ease((t-.6)/.3);a.land=m?[mix(240,50,e),mix(300,250,e),mix(.95,.26,e),1]:[mix(550,150,e),mix(345,300,e),mix(1.6,.38,e),1];}
 return a;
}
// Contorno plano del terreno (objeto land en i<=1). En la escena 0 imita el trazo del mapa (relevo invisible) y se asienta en la escena 1.
const mixHex=(a,b,t)=>'#'+[1,3,5].map(k=>Math.round(mix(parseInt(a.substr(k,2),16),parseInt(b.substr(k,2),16),t)).toString(16).padStart(2,'0')).join('');
function landStyle(i,tr){if(i!==0)return '';const kmz=svg.querySelector('#map-parcel')?.dataset.status==='kmz';
 return kmz?`vector-effect:non-scaling-stroke;stroke-opacity:${mix(0,1,tr)};stroke:${mixHex('#294c3f','#28433f',tr)};stroke-width:${mix(2.4,1.4,tr)};fill:${mixHex('#d4e0c5','#f8f6ee',tr)};fill-opacity:${mix(0,1,tr)}`
  :`vector-effect:non-scaling-stroke;stroke-opacity:${mix(0,1,tr)};stroke:${mixHex('#ad4c46','#28433f',tr)};stroke-width:${mix(2.4,1.4,tr)};stroke-dasharray:${tr>=1?'none':'9 '+mix(6,0,tr)};fill:${mixHex('#ad4c46','#f8f6ee',tr)};fill-opacity:${mix(0,1,tr)}`}
export function paint(story,position,mobile){if(!svg||lastMobile!==mobile)mount(host,mobile);const i=Math.min(story.scenes.length-1,Math.floor(position/4)),t=position-i*4,s=story.scenes[i],beat=Math.min(3,Math.floor(t)),W=mobile?480:1100,H=mobile?740:730,color=(story.palette[s.moments[beat].role]||{color:'#65756c'}).color,transition=i<story.scenes.length-1?ease((t-3.35)/.65):0;const a=state(i,t,mobile),b=state(Math.min(i+1,story.scenes.length-1),0,mobile);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('aria-label',s.title+' '+s.beats[beat]);
 for(const id in groups){const tr=id==='land'&&i===0?ease((t-3.45)/.55):transition,hold=i===3&&(id==='land'||id==='nave'),q=a[id].map((v,k)=>mix(v,b[id][k],hold&&k<3?0:tr));groups[id].setAttribute('transform',`translate(${q[0]} ${q[1]}) scale(${q[2]})`);groups[id].setAttribute('opacity',q[3]);}
 groups.nave.classList.toggle('ghost',i===3&&t<2.6);
 const landKind=i<=1||i===3||i===6||(i===2&&transition>0)||(i===5&&transition>0)?'flat':'iso';if(landKind!==lastLand){groups.land.innerHTML=landKind==='flat'?`<path class="sil" vector-effect="non-scaling-stroke" d="${parcelFigurePath()}"/>`:figure('land');lastLand=landKind;lastLandStyle='';}
 if(landKind==='flat'){const ls=landStyle(i,transition);if(ls!==lastLandStyle){lastLandStyle=ls;groups.land.firstChild.style.cssText=ls}}const shape=i===3?Math.round((.12+.88*ease((t-.2)/.8))*20)/20:1;if(lastShape!==shape){groups.nave.innerHTML=figure('nave',shape);lastShape=shape;}
 const key=[i,beat,mobile].join(':');if(key!==lastKey){lastKey=key;const title=wrap(s.title,mobile?30:65);svg.querySelector('#scene-heading').innerHTML=text(24,28,s.label.toUpperCase()+' · '+(story.palette[s.moments[beat].role]?.name||'Contexto').toUpperCase(),12,color,'start')+title.map((v,n)=>text(24,68+n*37,v,mobile?29:37,ink,'start')).join('')+line(`M25 ${78+title.length*37} q100 5 245 -2`,color);svg.querySelector('#scene-labels').innerHTML=(i===1&&beat===3?'':text(W/2,H-42,s.beats[beat],mobile?16:21,color))+text(W/2,H-12,'GUION VISUAL · PROPUESTA PARA REVISIÓN',10,muted);}
 const mk=i+':'+mobile;if(mk!==lastMeaning){svg.querySelector('#semantic-layer').innerHTML=i?meaning(i,mobile):'';lastMeaning=mk;}reveal(svg.querySelector('#semantic-layer'),t);svg.querySelector('#semantic-layer').setAttribute('opacity',1-transition);paintTerritory(svg,i,t,mobile);svg.querySelector('#scene-labels').setAttribute('opacity',1-transition);
}
