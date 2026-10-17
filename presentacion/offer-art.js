(function(root){'use strict';
const legacyMount=root.YodSliderArt.mount;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);},ramp=(p,a,b)=>smooth((p-a)/(b-a));
const envelope=(p,a,b,c,d)=>ramp(p,a,b)*(1-ramp(p,c,d));
const at=(p,n)=>envelope(p,n-.22,n-.06,n+.08,n+.22);
const keys=[[175,236,.67,1,0,1],[320,225,.15,0,0,0],[320,225,.20,0,0,0],[320,226,1.03,.55,0,1],[173,217,.68,0,1,1],[320,245,1.07,1,1,1],[173,163,.64,1,1,1],[539,77,.23,1,1,.45],[320,123,.42,1,1,1],[320,223,.58,1,1,1],[320,122,.43,1,1,1],[320,245,1.04,1,1,1],[320,94,.34,1,1,1],[162,217,.62,1,1,1],[320,192,.90,1,1,1]];
function pose(p){const i=Math.min(13,Math.floor(p)),t=ramp(p-i,.24,.76);return keys[i].map((v,k)=>mix(v,keys[i+1][k],t));}
function mount(svg,overlay,map){
 let legacy=null,own=false,cfg=null,a=null,g=null,refs={},last=0;
 const NS='http://www.w3.org/2000/svg';
 const el=(tag,attrs={},parent=g)=>{const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));if(parent)parent.append(n);return n;};
 const set=(n,k,v)=>n.setAttribute(k,String(v));
 const path=(cls,parent=g)=>el('path',{class:'offer-line '+cls},parent);
 const group=(name,parent=g)=>el('g',{'data-offer-object':name},parent);
 const opacity=(n,v)=>{v=clamp(v);set(n,'opacity',v.toFixed(4));set(n,'visibility',v<.001?'hidden':'visible');};
 const D=(pts,close=false)=>pts.map((pt,i)=>(i?'L':'M')+pt.map(v=>Number(v).toFixed(3)).join(' ')).join(' ')+(close?'Z':'');
 const line=(n,pts,close=false)=>set(n,'d',D(pts,close));
 const label=(parent,x,y,value,cls='',anchor='middle',limit=32)=>{const n=el('text',{x,y,class:'offer-label '+cls,'text-anchor':anchor},parent);const parts=String(value||'').split(/\s+/);let row='',rows=[];for(const word of parts){if(row&&(row+' '+word).length>limit){rows.push(row);row=word;}else row+=(row?' ':'')+word;}if(row)rows.push(row);rows.forEach((v,i)=>{const t=el('tspan',{x,dy:i?30:0},n);t.textContent=v;});return n;};
 const rule=(parent,x1,y1,x2,y2,cls='')=>{const n=path(cls,parent);line(n,[[x1,y1],[x2,y2]]);return n;};
 const panel=(parent,x,y,w,h)=>el('rect',{x,y,width:w,height:h,rx:2,class:'offer-panel'},parent);
 function house(parent,id){
  const wrap=group(id,parent);if(id==='hero')set(wrap,'data-object','property-p1');
  const floor=group('floorplan',wrap);if(id==='hero')set(floor,'data-object','same-floorplan');
  const r={wrap,floor,ground:path('offer-ground',wrap),front:path('offer-front',wrap),yard:path('offer-yard',floor),walk:path('offer-walk',floor),plan:path('offer-plan',floor),seams:path('offer-partition',floor),entry:path('offer-entry',wrap),landscape:path('offer-landscape',wrap),parts:[]};
  wrap.insertBefore(r.ground,floor);
  for(const i of [1,0]){const part=group('wing-'+i,wrap);r.parts[i]={wrap:part,wall:path('offer-wall',part),side:path('offer-side',part),roof:path('offer-roof',part),parapet:path('offer-parapet',part),openings:path('offer-openings',part)};}
  r.structure=path('offer-structure',wrap);return r;
 }
 function paintHouse(r,x,y,scale,tilt,proposed,height,plan,progress=1){
  const P=(u,v,z=0)=>[x+scale*mix(u*1.12,(u-v)*1.02,tilt),y+scale*(mix(v*1.10,(u+v)*.44,tilt)-z)];
  const poly=(n,pts)=>line(n,pts.map(t=>P(...t)),true),rect=(n,u,v,w,d,z=0)=>poly(n,[[u,v,z],[u+w,v,z],[u+w,v+d,z],[u,v+d,z]]);
  rect(r.ground,-124,-94,248,188);line(r.front,[P(-124,94),P(124,94)]);
  rect(r.yard,76,-77,33,150);rect(r.walk,50,-77,26,150);
  rect(r.plan,-102,-70,152,140);
  let seams='';for(const v of [-12,12])seams+=D([P(-102,v),P(50,v)])+' ';set(r.seams,'d',seams);
  opacity(r.floor,Math.max(plan,proposed*.76));opacity(r.plan,plan);
  opacity(r.seams,proposed);opacity(r.walk,proposed);opacity(r.yard,.28+.72*proposed);
  line(r.entry,[P(63,94),P(63,67),P(44,67)]);
  const h=height*(1-plan*.94),roofLift=plan*62;
  const frontV=mix(-70,12,proposed),frontD=mix(140,58,proposed);
  const boxes=[[-102,frontV,152,frontD,1],[-102,-70,152,58,proposed]];
  boxes.forEach((b,i)=>{const[u,v,w,d,alpha]=b,part=r.parts[i];
   opacity(part.wrap,alpha);poly(part.wall,[[u,v+d,0],[u+w,v+d,0],[u+w,v+d,h],[u,v+d,h]]);
   poly(part.side,[[u+w,v,0],[u+w,v+d,0],[u+w,v+d,h],[u+w,v,h]]);
   rect(part.roof,u,v,w,d,h+roofLift);
   set(part.roof,'fill-opacity',1-plan);opacity(part.roof,1-plan*.82);
   line(part.parapet,[P(u,v+d,h-5),P(u+w,v+d,h-5),P(u+w,v,h-5)]);
   let windows='';for(const u0 of [-82,-22])windows+=D([P(u0,v+d,12),P(u0+33,v+d,12),P(u0+33,v+d,Math.max(13,h-16)),P(u0,v+d,Math.max(13,h-16))],true)+' ';
   set(part.openings,'d',windows);opacity(part.openings,(1-plan)*ramp(progress,.3,.85));
   [part.wall,part.side].forEach(n=>set(n,'fill-opacity',mix(.08,1,progress)));
   set(part.parapet,'opacity',1-plan);
  });
  let skeleton='';for(const u of [-102,-26,50])skeleton+=D([P(u,-70),P(u,-70,height),P(u,70,height),P(u,70)],false)+' ';
  set(r.structure,'d',skeleton);opacity(r.structure,1-progress);
  let garden='';for(const v of [-43,0,43])garden+=D([P(86,v-8),P(99,v-8),P(99,v+8),P(86,v+8)],true)+' ';
  set(r.landscape,'d',garden);opacity(r.landscape,proposed*(1-plan*.45));
 }
 function build(){
  svg.querySelectorAll('[data-film-root],defs[data-film-defs],[data-offer-root]').forEach(n=>n.remove());overlay.replaceChildren();
  svg.setAttribute('viewBox','0 0 640 460');svg.dataset.continuity='single-property';svg.dataset.revision='offer-4';
  const defs=el('defs',{'data-offer-root':''},null);svg.append(defs);const clip=el('clipPath',{id:'offer-map-clip'},defs);el('rect',{x:12,y:12,width:616,height:344},clip);
  g=el('g',{'data-offer-root':'','data-film-root':'','data-intent-stage':'continuous'},null);svg.append(g);
  refs.map=group('territory');set(refs.map,'clip-path','url(#offer-map-clip)');refs.camera=group('map-camera',refs.map);
  if(map)for(const r of map.roads)el('path',{d:r[2],class:'offer-road '+(['primary','trunk','secondary'].includes(r[1])?'offer-major':'')},refs.camera);
  refs.zones=group('search-zones',refs.map);
  [[193,167],[418,164],[315,282]].forEach(([x,y],i)=>{el('ellipse',{cx:x,cy:y,rx:57,ry:41,class:'offer-zone'},refs.zones);label(refs.zones,x,y+10,a.territory.zones[i],'offer-zone-letter');});
  refs.criteria=group('search-criteria');a.territory.criteria.forEach((v,i)=>{label(refs.criteria,118+i*202,397,v,'offer-small');if(i<2)rule(refs.criteria,207+i*202,375,207+i*202,404,'offer-divider');});
  refs.opening=group('offer-overview');refs.openAlt=house(refs.opening,'opening-proposal');
  label(refs.opening,175,371,a.opening.before,'offer-small','middle',22);label(refs.opening,470,371,a.opening.after,'offer-small','middle',22);
  refs.openLink=path('offer-link',refs.opening);line(refs.openLink,[[292,217],[347,217],[338,208],[347,217],[338,226]]);
  label(refs.opening,320,437,a.opening.link,'offer-small offer-accent');
  refs.hero=house(g,'hero');
  refs.property=group('property-caption');label(refs.property,320,407,a.property.existing,'offer-emphasis');
  refs.planLabels=group('plan-decisions');label(refs.planLabels,180,385,a.property.access,'offer-small');label(refs.planLabels,460,385,a.property.patio,'offer-small');
  refs.planAccess=path('offer-leader',refs.planLabels);refs.planPatio=path('offer-leader',refs.planLabels);
  refs.market=group('buyer-decisions');label(refs.market,320,67,a.market.title,'offer-emphasis');a.market.questions.forEach((v,i)=>{label(refs.market,357,157+i*84,v,'offer-small','start',18);rule(refs.market,297,146+i*84,340,146+i*84,'offer-link');});
  refs.product=group('proposed-product');label(refs.product,320,407,a.property.proposal,'offer-emphasis');
  refs.comparison=group('same-scale-comparison');refs.alt=house(refs.comparison,'comparison-project');
  label(refs.comparison,173,264,a.comparison.left,'offer-emphasis');label(refs.comparison,474,264,a.comparison.right,'offer-emphasis');a.comparison.leftTraits.forEach((v,i)=>label(refs.comparison,173,318+i*43,v,'offer-small'));a.comparison.rightTraits.forEach((v,i)=>label(refs.comparison,474,318+i*43,v,'offer-small'));rule(refs.comparison,320,250,320,375,'offer-divider');label(refs.comparison,320,433,a.comparison.question,'offer-small offer-accent');
  refs.account=group('complete-account');
  a.account.rows.forEach((v,i)=>{if(i===3)rule(refs.account,60,307,580,307,'offer-result-rule');label(refs.account,76,115+i*80,v,i===3?'offer-account-result':'offer-account','start');});
  refs.tenure=group('entry-options');
  rule(refs.tenure,320,179,320,205,'offer-link');rule(refs.tenure,164,205,476,205,'offer-link');rule(refs.tenure,164,205,164,229,'offer-link');rule(refs.tenure,476,205,476,229,'offer-link');
  panel(refs.tenure,32,236,274,154);panel(refs.tenure,334,236,274,154);
  label(refs.tenure,169,279,a.tenure.purchase,'offer-emphasis');label(refs.tenure,471,279,a.tenure.contribution,'offer-emphasis');
  label(refs.tenure,169,338,a.tenure.payment,'offer-small');label(refs.tenure,471,338,a.tenure.value,'offer-small','middle',18);
  refs.roles=group('participants');
  label(refs.roles,158,76,a.participation.land,'offer-emphasis');label(refs.roles,482,76,a.participation.capital,'offer-emphasis');
  label(refs.roles,158,112,a.participation.landAction,'offer-small offer-muted','middle',22);label(refs.roles,482,112,a.participation.capitalAction,'offer-small offer-muted','middle',22);
  refs.roleLinks=path('offer-link',refs.roles);
  set(refs.roleLinks,'d',D([[158,143],[158,163],[259,191]])+' '+D([[482,143],[482,163],[381,191]]));
  label(refs.roles,320,350,a.participation.direction,'offer-emphasis');label(refs.roles,320,389,a.participation.directionAction,'offer-small');
  rule(refs.roles,320,285,320,317,'offer-link');
  refs.conditions=group('conditions');
  a.delivery.questions.forEach((v,i)=>{rule(refs.conditions,80,198+i*58,105,198+i*58,'offer-condition-tick');label(refs.conditions,127,208+i*58,v,'offer-row','start');});rule(refs.conditions,320,337,320,356,'offer-link');rule(refs.conditions,163,356,478,356,'offer-link');rule(refs.conditions,163,356,163,377,'offer-link');rule(refs.conditions,478,356,478,377,'offer-link');a.delivery.decisions.forEach((v,i)=>label(refs.conditions,163+i*315,416,v,'offer-small offer-accent','middle',20));
  refs.construction=group('construction');
  a.delivery.steps.forEach((v,i)=>label(refs.construction,110+i*210,413,v,'offer-small','middle',15));
  refs.buildProgress=path('offer-progress',refs.construction);
  refs.sale=group('sale-and-allocation');
  a.delivery.sale.forEach((v,i)=>{label(refs.sale,320,193+i*69,v,i===2?'offer-emphasis':'offer-row');if(i<2)rule(refs.sale,320,206+i*69,320,225+i*69,'offer-link');});
  rule(refs.sale,110,357,530,357,'offer-divider');
  a.delivery.allocation.forEach((v,i)=>label(refs.sale,110+i*210,392,v,'offer-small offer-muted','middle',15));
  refs.terms=group('project-terms');a.closing.questions.forEach((v,i)=>{rule(refs.terms,335,97+i*120,592,97+i*120,'offer-divider');label(refs.terms,338,137+i*120,v,'offer-small','start',20);});
  refs.close=group('invitation');label(refs.close,320,352,a.closing.title,'offer-emphasis');
  a.closing.choice.forEach((v,i)=>label(refs.close,175+i*290,413,v,'offer-small offer-accent'));
  rule(refs.close,320,365,320,382,'offer-link');rule(refs.close,175,382,465,382,'offer-link');
 }
 function draw(p,reduced){
  if(!own){legacy?.draw(p,reduced);return;}p=clamp(p,0,14);last=p;
  svg.dataset.frame=p.toFixed(3);svg.dataset.revision='offer-4';svg.dataset.map=map?'real':'unavailable';
  const k=pose(p),plan=envelope(p,3.24,3.76,4.24,4.76),build=envelope(p,10.24,10.76,11.24,11.76);
  paintHouse(refs.hero,...k.slice(0,5),mix(55,82,k[4]),plan,1-.8*build);opacity(refs.hero.wrap,k[5]);
  opacity(refs.opening,1-ramp(p,.08,.22));paintHouse(refs.openAlt,470,236,.67,1,1,82,0);
  opacity(refs.map,envelope(p,.25,.95,2.35,3.0));
  if(map){const z=mix(.56,.95,ramp(p,1,2.75));set(refs.camera,'transform','translate('+(320-map.focus[0]*z)+' '+(205-map.focus[1]*z*.80)+') scale('+z+' '+z*.80+')');}
  opacity(refs.zones,ramp(p,1.2,2));opacity(refs.criteria,envelope(p,.8,1.5,2.4,3));
  opacity(refs.property,at(p,3));
  opacity(refs.planLabels,0);opacity(refs.market,at(p,4));
  line(refs.planAccess,[[180,359],[180,339],[390,339],[390,300]]);
  line(refs.planPatio,[[460,359],[460,333],[418,333],[418,245]]);
  opacity(refs.product,at(p,5));
  opacity(refs.comparison,at(p,6));paintHouse(refs.alt,474,163,.64,1,.6,82,0);
  opacity(refs.account,at(p,7));
  opacity(refs.tenure,at(p,8));
  opacity(refs.roles,at(p,9));
  opacity(refs.conditions,at(p,10));
  opacity(refs.construction,at(p,11));
  const bx=mix(80,560,ramp(p,10.55,11.7));line(refs.buildProgress,[[80,382],[bx,382]]);
  opacity(refs.sale,at(p,12));
  opacity(refs.terms,at(p,13));opacity(refs.close,ramp(p,13.78,13.94));
 }
 return{configure(c){cfg=c;own=c.surface?.revision==='offer-4';if(!own){if(!legacy)legacy=legacyMount(svg,overlay,map);legacy.configure(c);return;}a=c.surface.art;if(!a)throw Error('The offer artwork requires editorial art configuration.');refs={};build();},
 labels(v,d,s,j){if(!own){legacy?.labels(v,d,s,j);return;}set(g,'data-visual',cfg.scenes[s].steps[j].visual);},draw,
 inspect(){return own?{position:last,rootCount:svg.querySelectorAll('[data-film-root]').length,property:refs.hero.wrap,revision:'offer-4'}:legacy?.inspect();}};
}
root.YodSliderArt={mount};
})(window);
