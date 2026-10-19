// One persistent SVG scene graph. Scroll interpolates object poses; it never swaps slides.
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C={ink:'#273d39',blue:'#526b6a',green:'#778477',gold:'#8b7b66',purple:'#716c76'};
const txt=(x,y,s,size=18,c=C.ink,anchor='middle')=>`<text x="${x}" y="${y}" fill="${c}" font-size="${size}" text-anchor="${anchor}">${esc(s)}</text>`;
function wrap(s,n){let a=[''];for(const w of s.split(' ')){let i=a.length-1;if((a[i]+' '+w).trim().length>n)a.push(w);else a[i]+=(a[i]?' ':'')+w}return a}
const path=(d,c,fill='none',w=2)=>`<path d="${d}" stroke="${c}" fill="${fill}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const house=(x,y,s,c=C.blue)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M-85 -25 L5 -65 L90 -25 L0 15 Z',c,c+'20')}${path('M-85 -25 V40 L0 80 V15 M0 80 L90 40 V-25',c,c+'0b')}${path('M-65 0 L-24 19 V60 L-65 41 Z',c,c+'28')}${[0,1,2,3].map(i=>path(`M-61 ${8+i*8} l32 15`,c,'none',1)).join('')}${path('M20 18 L65 -2 V26 L20 46 Z',c,'#fffdf7',1.5)}</g>`;
const bodies={
 land:path('M-195 0 L-5 -92 L195 0 L5 92 Z',C.ink,'#e6eadb',1.7)+path('M-195 0 V13 L5 107 L195 13 V0',C.ink,'#dce2d3',1.1)+path('M-150 8 L15 -72 M-70 47 L95 -33', '#b5c2ae','none',1),
 nave:house(0,0,1),
 complementos:house(-60,-15,.42,C.green)+house(35,-42,.5,C.green)+house(72,28,.4,C.green)+house(-12,68,.34,C.green)+house(-65,56,.3,C.green),
 documento:path('M-44 -64 H24 L44 -44 V64 H-44 Z',C.purple,'#fffdf7')+path('M24 -64 V-44 H44 M-27 -25 H25 M-27 -10 H25 M-27 5 H10 M-27 35 Q-6 20 23 35',C.purple),
 capital:`<ellipse cx="0" cy="32" rx="43" ry="15" fill="#b7833420" stroke="${C.gold}" stroke-width="2"/>`+path('M-43 31 V10 M43 31 V10',C.gold)+`<ellipse cx="0" cy="10" rx="43" ry="15" fill="#fff7e5" stroke="${C.gold}" stroke-width="2"/>`+path('M-36 4 V-16 M36 4 V-16',C.gold)+`<ellipse cx="0" cy="-16" rx="36" ry="14" fill="#fff7e5" stroke="${C.gold}" stroke-width="2"/>`+txt(0,-10,'$',23,C.gold),
 personas:`<circle cx="-21" cy="-22" r="15" fill="#297e9410" stroke="${C.blue}" stroke-width="2"/><circle cx="21" cy="-15" r="13" fill="#297e9410" stroke="${C.blue}" stroke-width="2"/>`+path('M-49 39 V16 Q-49 -1 -21 -1 Q7 -1 7 16 V39 M7 8 Q47 0 47 26 V39',C.blue),
};
let host,svg,groups={},lastM;
export function mount(el,mobile){host=el;lastM=mobile;el.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" role="img"><defs><pattern id="paper-dot" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#9ca99a" opacity=".15"/></pattern></defs><rect width="100%" height="100%" fill="#f8f6ee"/><rect width="100%" height="100%" fill="url(#paper-dot)"/><g id="scene-heading"></g><g id="scene-under"></g>${Object.entries(bodies).map(([id,body])=>`<g data-object="${id}">${body}</g>`).join('')}<g id="scene-labels"></g></svg>`;svg=el.querySelector('svg');groups=Object.fromEntries([...svg.querySelectorAll('[data-object]')].map(g=>[g.dataset.object,g]));}
const p=(x,y,s=1,o=1)=>[x,y,s,o];
function pose(scene,m){const cx=m?240:500, y=m?330:325;const left=m?130:290,right=m?350:740;
const a={land:p(cx,y+40,m?.95:1.45,.8),nave:p(cx,y,m?.9:1.35),complementos:p(right,y+100,.55,0),documento:p(right,y,.8,0),capital:p(left,y,.85,0),personas:p(left,y,.8,0)};
switch(scene){case 0:a.nave=p(cx-25,y,.95);a.complementos=p(cx+105,y+20,.55,.65);break;
case 1:a.land=p(cx,y+75,1,.25);a.nave=p(m?170:370,y,1.15);a.documento=p(right,y-8,.9);a.personas=p(m?110:190,y-105,.65);a.complementos[3]=0;break;
case 2:a.land=p(left,y+80,.7,.2);a.nave=p(left,y-.0,.85);a.personas=p(right,y-90,.85);a.capital=p(right,y+15,.85);a.documento=p(right,y+130,.75);break;
case 3:a.land=p(cx,y+25,m?1:1.65);a.nave=p(left,y-10,.8);a.complementos=p(right-15,y+35,m?.7:1.15);break;
case 4:a.land=p(left,y+40,.8);a.nave=p(left,y-5,.55,.45);a.complementos=p(left+35,y+30,.5);a.capital=p(right,y-30,1.2);a.documento=p(right,y+115,.75);break;
case 5:a.land=p(cx,y+50,m?1.05:1.65,.45);a.nave=p(left,y,.8);a.complementos=p(right,y,.75);a.documento=p(cx,y+130,.6);break;
case 6:a.land=p(cx,y+80,.65,.25);a.nave=p(cx-24,y+90,.35);a.complementos=p(cx+50,y+105,.3);a.documento=p(cx,y-30,1.25);break;
case 7:a.land=p(cx,y+70,.7,.35);a.nave=p(left,y+20,.65);a.complementos=p(right,y+20,.65);a.capital=p(right+12,y+155,.5,.65);a.documento=p(cx,y-80,.9);break;}
if(!m)a.land[1]=Math.min(a.land[1],480-a.land[2]*107);return a;}
const ease=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
export function paint(story,position,mobile){if(!svg||lastM!==mobile)mount(host,mobile);const W=mobile?480:1000,H=mobile?710:640,max=story.scenes.length-1,idx=Math.min(max,Math.floor(position/4)),local=position-idx*4,scene=story.scenes[idx],t=idx===max?0:ease(Math.max(0,Math.min(1,(local-3)/1))),a=pose(idx,mobile),b=pose(Math.min(max,idx+1),mobile);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('aria-label',scene.title+' '+scene.takeaway);
for(const id in groups){let q=a[id].map((v,i)=>mix(v,b[id][i],t));if(idx===0&&id==='nave')q[3]*=Math.min(1,.15+local*.75);if(idx===0&&id==='complementos')q[3]*=Math.max(0,Math.min(1,local-1.5));if(idx===1&&['documento','personas'].includes(id))q[3]*=Math.min(1,.15+local*.65);if(idx===2&&id==='documento')q[3]*=Math.max(.1,Math.min(1,local-1.5));if(idx===3&&id==='complementos')q[3]*=Math.min(1,.3+local*.35);if(idx===5&&id==='documento')q[3]*=Math.max(.15,Math.min(1,local-1.5));if(idx===4&&id==='capital')q[3]*=Math.max(.15,Math.min(1,(local-1)*.9));groups[id].setAttribute('transform',`translate(${q[0]} ${q[1]}) scale(${q[2]})`);groups[id].setAttribute('opacity',q[3]);}
const lines=wrap(scene.title,mobile?28:55);svg.querySelector('#scene-heading').innerHTML=txt(mobile?24:40,28,scene.narrativeRole.toUpperCase()+' · '+scene.label,11,story.palette[scene.topic].color,'start')+lines.map((s,i)=>txt(mobile?24:40,70+i*39,s,mobile?32:39,C.ink,'start')).join('')+path(`M${mobile?25:42} ${82+lines.length*39} q80 3 180 -2`,story.palette[scene.topic].color,'none',3);
let labels='',under='',cx=W/2;const foot=mobile?590:525;const text=(x,y,s,c=C.ink,size=17)=>txt(x,y,s,size,c);
const l=mobile?130:290,r=mobile?350:740;
if(idx===0){labels+=text(cx,mobile?205:200,'24.7584 ha',C.ink,32)+text(cx,mobile?230:227,'247,584 m² · base comercial',C.ink,14)+text(l,foot,'Patrimonio BTS',C.blue)+text(r,foot,'Complementos',C.green);}
if(idx===1){labels+=text(mobile?170:370,465,'Nave a la medida',C.blue)+text(r,440,'Requerimientos',C.purple,15)+text(r,460,'y contrato',C.purple,15);labels+=text(cx,foot,'Demanda → contrato → inversión',C.blue,mobile?19:24);}
if(idx===2){labels+=text(l,430,'Inmueble',C.blue)+text(r,195,'Propietarios',C.blue)+text(r,395,'Renta del activo',C.blue,15)+text(r,545,'Servicios pactados',C.purple,15);under+=path(`M${l+70} 300 Q${cx} 225 ${r-50} 235`,C.blue)+path(`M${r-50} 235 l8 0 -2 8`,C.blue);}
if(idx===3){labels+=text(l,220,'BTS patrimonial',C.blue)+text(r,220,'Asociación',C.green);const words=['Plaza + servicios · Hotel','Negocios · Industrial Club','Pocket · 250–500 m²'];labels+=words.map((s,i)=>text(cx,foot-20+i*25,s,C.green,mobile?17:20)).join('');}
if(idx===4){labels+=text(l,220,'A · Tierra',C.green,21)+text(r,220,'B · + Efectivo',C.gold,21)+text(cx,foot+12,'Valorar → modelar → acordar',C.gold,mobile?20:25);}
if(idx===5){under+=`<rect x="${l-103}" y="239" width="206" height="190" rx="28" stroke="${C.blue}" fill="none" stroke-dasharray="4 7"/><rect x="${r-103}" y="239" width="206" height="190" rx="28" stroke="${C.green}" fill="none" stroke-dasharray="4 7"/>`;labels+=text(l,220,'BTS',C.blue)+text(r,220,'Complementos',C.green)+text(cx,foot+15,'Cuentas · Autorizaciones · Reportes',C.purple,mobile?17:23);}
if(idx===6){const names=['Diagnóstico','Mercado','Modelo','Acuerdos'];names.forEach((s,i)=>{const x=mobile?(i%2?365:115):180+i*215,y=mobile?(i<2?205:510):500;const active=i<=Math.floor(local);labels+=text(x,y,s,active?C.purple:'#929b91',mobile?17:19);under+=path(`M${x-58} ${y+15} v-5 h116 v5`,active?C.purple:'#cbd0c7');});}
if(idx===7){labels+=text(cx,185,'Carta de intención',C.purple,20)+text(l,450,'Conservar BTS',C.blue,16)+text(r,450,'Explorar asociación',C.green,16)+text(cx,foot+35,'Acordar alcance y periodo de estudio',C.purple,mobile?18:24);}
const bottom=mobile?660:594;labels+=wrap(scene.takeaway,mobile?47:90).map((s,i)=>text(cx,bottom+i*22,s,C.ink,mobile?17:19)).join('');labels+=text(cx,H-8,'ESQUEMA CONCEPTUAL · NO ES UN PLANO NI UNA AUTORIZACIÓN', '#737c72',9);svg.querySelector('#scene-labels').innerHTML=labels;svg.querySelector('#scene-labels').setAttribute('opacity',1-t);svg.querySelector('#scene-under').innerHTML=under;svg.querySelector('#scene-under').setAttribute('opacity',1-t);
}
