// Scene A1: the same developer, land, professionals and business, drawn in layers.
// Progress is the only clock. Scrubbing backwards restores every stroke and position.
import {clamp,ease,fit} from './story.mjs?v=YOD-APORTADORES-A1-2';
const NS='http://www.w3.org/2000/svg';
const ink='#35443e',soft='#899087',paper='#f8f6ef',red='#a34d45';
const lerp=(a,b,t)=>a+(b-a)*t;
const between=(p,a,b)=>ease(clamp((p-a)/(b-a)));
function node(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;}

export function mountFirstScene(svg){
 const root=node('g',{'data-object':'escena-tradicional-redisenada','data-art-version':'A1-SVG-2','aria-label':'Tierra y profesionales aportan al proyecto; el desarrollador concentra el negocio.'});svg.append(root);
 const layers=[];
 const add=(tag,a,t,parent=root)=>{const n=node(tag,a,t);parent.append(n);return n;};
 function layer(name,start,end,place,portraitPlace=place){const g=add('g',{'data-a1-layer':name});const l={g,start,end,place,portraitPlace,nodes:[]};layers.push(l);return l;}
 function path(l,d,{color=ink,width=1.7,fill='none',dash,ghost=false}={}){const n=add('path',{d,fill,stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'},null,l.g);if(dash)n.setAttribute('stroke-dasharray',dash);l.nodes.push({n,length:n.getTotalLength(),fill,dash,ghost});return n;}
 function text(l,x,y,value,{size=27,color=ink,align='start',hand=false,weight=400,spacing=0}={}){const n=add('text',{x,y,fill:color,'font-size':size,'font-family':hand?'Caveat, sans-serif':'DM, sans-serif','font-weight':weight,'letter-spacing':spacing,'text-anchor':align},value,l.g);l.nodes.push({n});return n;}
 function disc(l,x,y,r,fill=paper,stroke=ink){return path(l,`M${x-r} ${y} a${r} ${r} 0 1 0 ${r*2} 0 a${r} ${r} 0 1 0 -${r*2} 0`,{fill,color:stroke});}
 function human(l,x,y,s=1,helmet=false){
  const xy=(a,b)=>`${x+a*s} ${y+b*s}`;
  path(l,`M${xy(-23,0)} Q${xy(-25,-29)} ${xy(0,-32)} Q${xy(25,-29)} ${xy(23,0)} Q${xy(22,25)} ${xy(0,28)} Q${xy(-21,25)} ${xy(-23,0)}`,{fill:paper});
  if(helmet){path(l,`M${xy(-32,-6)} L${xy(32,-6)} M${xy(-24,-7)} Q${xy(-24,-31)} ${xy(-7,-32)} M${xy(7,-32)} Q${xy(24,-31)} ${xy(24,-7)} M${xy(-7,-8)} L${xy(-7,-38)} L${xy(7,-38)} L${xy(7,-8)}`,{width:1.8});}
  else path(l,`M${xy(-22,-5)} Q${xy(-5,-21)} ${xy(11,-15)} L${xy(22,-6)}`,{width:1});
  path(l,`M${xy(-13,25)} L${xy(-33,39)} L${xy(-43,95)} L${xy(36,95)} L${xy(30,41)} L${xy(12,27)} M${xy(-12,31)} L${xy(0,47)} L${xy(13,31)}`,{fill:paper});
  path(l,`M${xy(-26,96)} L${xy(-28,153)} L${xy(-43,153)} M${xy(22,96)} L${xy(25,153)} L${xy(40,153)} M${xy(-33,45)} L${xy(-51,83)} L${xy(-18,96)} M${xy(30,45)} L${xy(51,82)} L${xy(18,96)}`);
 }
 const title=layer('titulo',.15,.6,[95,92,1],[42,70,1]);
 text(title,0,-29,'01 / LA FORMA DE HOY',{size:13,spacing:2.3,color:soft});
 text(title,0,20,'El modelo tradicional.',{size:49,weight:700});
 // The fine registration lines make the drawing feel like an architect's working sheet.
 const ground=layer('mesa-de-proyecto',.25,.95,[630,558,1],[234,345,.49]);
 path(ground,'M-25 15 L180 -70 L405 15 L180 105 Z',{fill:'#e6e7dd',color:'#d8d9cf',width:.7});
 path(ground,'M-25 15 L-25 27 L180 118 L405 27 L405 15 M180 105 L180 118',{color:'#b4baad',width:.8});
 for(let i=0;i<9;i++)path(ground,`M${-2+i*22} ${27+i*9.8} l0 10`,{color:'#bec2b7',width:.5,ghost:true});
 const developerDetail=layer('desarrollador-detalles',.45,1,[370,-20,1],[105,62,.61]);
 path(developerDetail,'M390 269 L451 271 L449 254 L391 252 Z',{fill:'#d6d9cc',color:'none'});
 path(developerDetail,'M349 371 Q324 416 349 470 L364 446 L362 398 Z',{fill:'#e5e5d9',color:'none'});
 path(developerDetail,'M479 391 Q493 426 480 469 L469 459 L472 415 Z',{fill:'#e5e5d9',color:'none'});
 path(developerDetail,'M404 394 L410 435 L400 449 L394 434 Z',{fill:'#5b695d',color:'none'});
 const developerLabel=layer('etiqueta-desarrollador',.72,1,[807,750,1],[360,459,1]);
 text(developerLabel,0,-38,'DESARROLLADOR',{size:18,weight:700,align:'middle',spacing:1.5});
 text(developerLabel,0,-7,'Decide · coordina',{size:25,hand:true,align:'middle',color:soft});
 path(developerLabel,'M-94 9 Q0 16 94 8',{color:soft,width:.7});
 // Land retains its own owner; no invented lot area or financial value.
 const land=layer('tierra',1.13,1.9,[105,165,1],[34,132,.57]);
 path(land,'M0 188 L200 105 L382 189 L181 279 Z',{fill:'#e8e4d4',color:ink,width:1.4});
 path(land,'M0 188 L0 204 L181 295 L382 205 L382 189 M181 279 L181 295',{color:soft,width:.9});
 path(land,'M30 188 L202 119 L351 189 L181 263 Z',{color:'#aaa389',width:1,dash:'4 6'});
 path(land,'M70 192 L204 140 M108 211 L243 157 M145 231 L285 176',{color:'#ccc4aa',width:.7});
 path(land,'M-12 190 l-16 7 m2 7 l-8 -15 M381 215 l20 -7 m-2 -7 l8 15 M-22 201 L178 301 L400 209',{color:'#b3b6a9',width:.6});
 human(land,185,30,.72);
 path(land,'M180 113 L205 103 L223 112 L199 124 Z',{fill:paper,width:1.1});
 text(land,180,348,'TIERRA',{size:25,weight:700,align:'middle',spacing:1.3});
 text(land,180,381,'El propietario aporta',{size:30,hand:true,align:'middle',color:soft});
 const landLink=layer('conexion-tierra',1.65,2,[0,0,1],[0,0,1]);
 const landLine=path(landLink,'M500 365 C560 365 592 362 655 362',{color:soft,width:1.4});
 const landHead=path(landLink,'M642 354 L655 362 L642 370',{color:soft,width:1.4});
 // The two original professional roles are made recognizable with plans and a hard hat.
 const team=layer('profesionales',2.1,2.88,[145,584,1],[38,526,.67]);
 path(team,'M-15 161 L140 106 L348 173 L190 237 Z',{fill:'#edede4',color:'#d5d8cc',width:.8});
 human(team,40,0,.73);human(team,220,14,.73,true);
 path(team,'M7 61 L91 45 L109 82 L26 98 Z M18 66 L82 54 M27 78 L78 67 M38 90 L92 78',{fill:paper,width:1.2});
 path(team,'M171 82 L233 74 L251 96 L185 106 Z M180 83 L193 100 M205 78 L219 100',{fill:paper,width:1.1});
 path(team,'M245 141 L289 124 L326 141 L280 160 Z M245 141 L245 171 L280 189 L326 169 L326 141 M280 160 L280 189',{fill:paper,width:1.1});
 path(team,'M252 151 L273 162 M288 167 L318 154 M252 161 L272 172 M288 177 L318 164',{color:soft,width:.8});
 text(team,138,272,'PROFESIONALES',{size:24,weight:700,align:'middle',spacing:1.1});
 text(team,138,306,'Diseño · trabajo · experiencia',{size:29,hand:true,align:'middle',color:soft});
 const teamLink=layer('conexion-profesionales',2.63,3,[0,0,1],[0,0,1]);
 const teamLine=path(teamLink,'M511 670 C590 666 603 477 666 445',{color:soft,width:1.4});
 const teamHead=path(teamLink,'M652 444 L666 445 L661 458',{color:soft,width:1.4});
 // The project is a conceptual massing, not a proposal or a validated capacity.
 const business=layer('proyecto',3.12,3.75,[1120,205,1],[455,470,.62]);
 path(business,'M-47 312 L139 226 L370 317 L184 405 Z',{fill:'#e8e8df',color:'#bdc3b7',width:.8});
 path(business,'M-47 312 L-47 325 L184 418 L370 330 L370 317 M184 405 L184 418',{color:'#bdc3b7',width:.7});
 // Low volume behind the tower.
 path(business,'M151 191 L241 150 L314 182 L222 226 Z M151 191 L151 307 L222 340 L314 298 L314 182 M222 226 L222 340',{fill:paper,width:1.25});
 for(let r=0;r<4;r++)path(business,`M233 ${242+r*22} L303 ${210+r*22}`,{color:soft,width:.65});
 path(business,'M6 91 L125 38 L234 83 L114 138 Z',{fill:paper,width:1.6});
 path(business,'M6 91 L6 295 L114 345 L114 138 Z',{fill:'#eee9dd',width:1.6});
 path(business,'M114 138 L234 83 L234 290 L114 345 Z',{fill:'#dedfd2',width:1.6});
 path(business,'M28 90 L125 49 L211 84 L114 126 Z',{color:'#a8ad9d',width:.8});
 for(let r=0;r<6;r++){
  let yy=117+r*29;path(business,`M17 ${yy} L104 ${yy+39} M125 ${yy+37} L223 ${yy-8}`,{color:'#929c8d',width:.7});
 }
 for(let c=0;c<4;c++)path(business,`M${26+c*23} ${110+c*10} l0 178 M${135+c*26} ${139-c*12} l0 174`,{color:'#a0a997',width:.65});
 path(business,'M71 324 L71 283 L97 294 L97 336 M139 332 L139 292 L166 280 L166 319',{fill:'#9da792',color:'#788674',width:.8});
 // One small tree locates the scheme; no ornamental animation independent of progress.
 path(business,'M293 326 L293 368 M279 358 L293 368 L307 362',{color:'#7c8b72',width:1.2});
 path(business,'M293 277 C263 276 260 310 273 320 C254 339 275 349 292 344 C318 350 335 327 316 313 C326 291 309 276 293 277 Z',{fill:'#dce0d1',color:'#87947b',width:.9});
 const businessLink=layer('conexion-negocio',3.04,3.48,[0,0,1],[0,0,1]);
 const businessLine=path(businessLink,'M925 350 C984 310 1014 312 1092 332',{color:red,width:2.1});
 const businessHead=path(businessLink,'M1080 319 L1092 332 L1076 339',{color:red,width:2.1});
 const returnLink=layer('retorno-negocio',3.52,3.96,[0,0,1],[0,0,1]);
 const returnLine=path(returnLink,'M1255 715 C1180 806 1000 785 923 705',{color:red,width:1.5});
 const returnHead=path(returnLink,'M924 722 L923 705 L940 712',{color:red,width:1.5});
 const businessLabel=layer('etiqueta-negocio',3.55,4,[1300,676,1],[586,785,1]);
 text(businessLabel,0,-33,'EL NEGOCIO',{size:24,weight:700,align:'middle',color:red,spacing:1.2});
 text(businessLabel,0,4,'Él y sus accionistas',{size:31,hand:true,align:'middle',color:red});
 const concentration=layer('concentracion',3.75,4,[807,190,1],[360,152,1]);
 text(concentration,0,0,'Aquí se concentra',{size:32,hand:true,align:'middle',color:red});
 path(concentration,'M-95 12 Q2 23 94 12',{color:red,width:1});
 const note=layer('nota-conceptual',3.75,4,[1470,864,1],[680,855,1]);
 text(note,0,0,'Esquema conceptual',{size:14,color:soft,align:'end'});

 // The mobile composition is rearranged, not a miniature of the desktop sheet.
 function lineLayout(vertical){
  landLine.setAttribute('d',vertical?'M233 268 C250 268 267 278 283 282':'M500 365 C560 365 592 362 655 362');
  landHead.setAttribute('d',vertical?'M275 273 L283 282 L270 286':'M642 354 L655 362 L642 370');
  teamLine.setAttribute('d',vertical?'M239 598 C284 576 278 408 300 386':'M511 670 C590 666 603 477 666 445');
  teamHead.setAttribute('d',vertical?'M288 389 L300 386 L301 399':'M652 444 L666 445 L661 458');
  businessLine.setAttribute('d',vertical?'M425 310 C511 311 523 372 535 466':'M925 350 C984 310 1014 312 1092 332');
  businessHead.setAttribute('d',vertical?'M526 454 L535 466 L542 452':'M1080 319 L1092 332 L1076 339');
  returnLine.setAttribute('d',vertical?'M555 810 C430 852 334 619 356 494':'M1255 715 C1180 806 1000 785 923 705');
  returnHead.setAttribute('d',vertical?'M346 506 L356 494 L363 509':'M924 722 L923 705 L940 712');
  // Preserve true dash lengths after responsive path replacement.
  for(const l of [landLink,teamLink,businessLink,returnLink])for(const n of l.nodes)n.length=n.n.getTotalLength();
 }
 const mobileLabels=[
  [land,'TIERRA',58,348],[land,'El propietario aporta',54,412,'Propietario'],
  [team,'PROFESIONALES',48,272],[team,'Diseño · trabajo · experiencia',48,332,'Diseño y trabajo'],
  [developerLabel,'DESARROLLADOR',33,-38],[developerLabel,'Decide · coordina',32,-1],
  [businessLabel,'EL NEGOCIO',33,-33]
 ].map(([l,value,size,y,short])=>{const item=l.nodes.find(x=>x.n.textContent===value);return {n:item.n,size,y,short:short||value,value,originalSize:item.n.getAttribute('font-size'),originalY:item.n.getAttribute('y')};});
 let lastVertical;
 function render(p,vertical){
  const life=1-between(p,4.02,4.58);root.style.display=p>=4.58?'none':'';root.style.opacity=life;
  if(lastVertical!==vertical){lineLayout(vertical);for(const v of mobileLabels){v.n.setAttribute('font-size',vertical?v.size:v.originalSize);v.n.setAttribute('y',vertical?v.y:v.originalY);v.n.textContent=vertical?v.short:v.value;}lastVertical=vertical;}
  for(const l of layers){
   const t=clamp((p-l.start)/(l.end-l.start));const [x,y,s]=vertical?l.portraitPlace:l.place;
   const rise=l===business?.2+.8*between(p,3.12,3.85):1;
   l.g.setAttribute('transform',`translate(${x} ${y+400*s*(1-rise)}) scale(${s} ${s*rise})`);
   l.g.style.display=t<=0?'none':'';
   for(let i=0;i<l.nodes.length;i++){
    const item=l.nodes[i],v=ease(clamp(t*1.9-(i/Math.max(1,l.nodes.length-1))*.9));
    if(!item.length){item.n.style.opacity=v;continue;}
    if(item.fill!=='none')item.n.style.fillOpacity=v;
    item.n.style.opacity=v>0?(item.ghost?.6:1):0;
    item.n.style.strokeDasharray=v>=1?(item.dash||'none'):String(item.length+.1);
    item.n.style.strokeDashoffset=v>=1?'0':String((item.length+.1)*(1-v));
   }
  }
 }
 function developer(p,vertical){const t=between(p,4,5),a=vertical?[105,62,.61]:[370,-20,1],b=[188,69,.5645];return `translate(${lerp(a[0],b[0],t)} ${lerp(a[1],b[1],t)}) scale(${lerp(a[2],b[2],t)})`;}
 const landscape=[[80,110,1450,690],[610,175,400,610],[75,150,960,650],[75,155,970,740],[65,60,1460,830]];
 const portrait=[[0,55,720,810],[260,160,205,320],[23,120,440,420],[15,480,310,290],[15,40,690,835]];
 function view(p,width,height,next){const vertical=width/height<.95,boxes=vertical?portrait:landscape,n=Math.min(4,Math.floor(p)),a=fit(boxes[n],width,height,.07),b=n===4?next:fit(boxes[n+1],width,height,.07),t=between(p,n,n+1);return a.map((v,i)=>lerp(v,b[i],t));}
 return {render,developer,view};
}
