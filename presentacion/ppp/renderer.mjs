import {HL} from '../vendor/hairline-kernel.mjs';

// This adapter consumes typed data. It never evaluates an agent's markup or code.
const NS='http://www.w3.org/2000/svg',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function el(tag,attrs={},parent){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(parent)parent.append(e);return e;}
function label(parent,text,x,y,cls='object-label'){const e=el('text',{x,y,class:cls,'text-anchor':'middle'},parent);e.textContent=text;return e;}
function wrap(parent,text,x,y,width=22,cls='object-label'){
 const lines=[];let line='';for(const word of text.split(/\s+/).flatMap(w=>w.match(new RegExp('.{1,'+width+'}','gu'))||[])){if(line&&(line+' '+word).length>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
 const t=label(parent,'',x,y,cls);lines.forEach((line,i)=>{const s=el('tspan',{x,dy:i?21:0},t);s.textContent=line;});return lines.length;
}
function figure(group,kind,color){
 const C=HL.Cam(42,.5,1),P=HL.proj(C),front=HL.facing(C);
 const path=(d,fill='none',extra={})=>el('path',{d,fill,stroke:color,'stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round',...extra},group);
 if(['land','building','unit'].includes(kind)){
  const size=kind==='land'?70:kind==='unit'?44:52,h=kind==='building'?64:kind==='unit'?24:2;
  HL.fit(C,[[-size,-size,0],[size,size,h]],0,-8);
  const [ring,inner]=HL.rings(-size,-size,size,size,3,1.4),solid=HL.prism(P,front,ring,inner,0,h);
  path(solid.sil,kind==='land'?'#e4e9d9':'#e1e8e8');path(solid.crease);
  if(kind==='land'){path(HL.poly(HL.ringAt(P,HL.rings(-49,-49,49,49,2,1)[0],1)),'none',{'stroke-dasharray':'5 5',opacity:.55});}
  if(kind==='building')for(let z=16;z<h;z+=16)path(HL.open(HL.ringAt(P,HL.run(ring,front),z)),'none',{opacity:.6});
  if(kind==='unit')path(HL.seg(P(-44,0,24),P(44,0,24)));
 }else if(kind==='money'){
  path('M-25 -50Q-15 -39-25 -27C-73 15-57 51 0 51C57 51 73 15 25 -27Q15 -39 25 -50Z','#e8e2cc');path('M-25 -29Q0 -18 25 -29');label(group,'$',0,23,'money-symbol');
 }else if(kind==='person'){
  el('circle',{cx:0,cy:-32,r:22,fill:'#eee2d0',stroke:color,'stroke-width':1.8},group);path('M-47 48C-47-15 47-15 47 48M-17 14V48M17 14V48','#e2e8dd');
 }else if(kind==='document'){
  path('M-40 -55H15L40 -30V55H-40Z','#faf9f2');path('M15 -55V-30H40M-23-10H22M-23 6H22M-23 22H10');
 }
}
export function mount(container,story){
 const svg=el('svg',{role:'img','aria-label':'Diagrama del guion visual',class:'story-svg'});container.replaceChildren(svg);
 const objects=new Map(story.objects.map(o=>[o.id,o]));
 const order={site:['land','person','document','building','unit','money'],comparison:['building','unit','land','document','money','person'],program:['land','building','unit','document','person','money'],cashflow:['land','money','person','building','unit','document'],phases:['document','land','building','money','person','unit'],decision:['person','document','land','money','building','unit']};
 function slots(scene,narrow){const ids=[...new Set(scene.moments.flatMap(m=>m.visible_objects))];if(scene.diagram!=='phases')ids.sort((a,b)=>order[scene.diagram].indexOf(objects.get(a).kind)-order[scene.diagram].indexOf(objects.get(b).kind));return new Map(ids.map((id,i)=>[id,narrow?{x:100+(i%2)*190,y:140+Math.floor(i/2)*220}:{x:170+(i%3)*365,y:140+Math.floor(i/3)*240}]));}
 function render(position){
  const frame=window.YODStoryboard.at(story,position),narrow=container.clientWidth<620,width=narrow?390:1100;
  const current=frame.moment,next=frame.next.moment;
  const blend=frame.fraction,toward=next;
  const ids=[...new Set([...current.visible_objects,...toward.visible_objects])];
  // Stable slots are keyed by object identity within each scene, including its next moments.
  const maxObjects=Math.max(...story.scenes.map(s=>new Set(s.moments.flatMap(m=>m.visible_objects)).size));
  const height=narrow?Math.ceil(maxObjects/2)*220+60:Math.ceil(maxObjects/3)*240+50;
  svg.style.height=(narrow?Math.round(height/width*container.clientWidth):Math.max(340,height))+'px';
  const currentSlots=slots(frame.scene,narrow),nextSlots=slots(frame.next.scene,narrow);
  const positions=new Map(ids.map(id=>{const a=currentSlots.get(id)||nextSlots.get(id),b=nextSlots.get(id)||a;return [id,{x:a.x+(b.x-a.x)*blend,y:a.y+(b.y-a.y)*blend}];}));
  function focusBox(focus){if(focus.length>2)return [0,0,width,height];const ps=focus.map(id=>positions.get(id)).filter(Boolean);const minX=Math.min(...ps.map(p=>p.x))-105,maxX=Math.max(...ps.map(p=>p.x))+105,minY=Math.min(...ps.map(p=>p.y))-90,maxY=Math.max(...ps.map(p=>p.y))+115;let w=Math.max(narrow?370:650,maxX-minX),h=Math.max(narrow?420:370,maxY-minY);const ratio=width/height;if(w/h<ratio)w=h*ratio;else h=w/ratio;return [clamp((minX+maxX-w)/2,0,Math.max(0,width-w)),clamp((minY+maxY-h)/2,0,Math.max(0,height-h)),w,h];}
  const fromBox=focusBox(current.camera.focus),toBox=focusBox(toward.camera.focus),box=fromBox.map((v,i)=>v+(toBox[i]-v)*blend);
  // Derive camera solely from semantic progress; reversal restores identical geometry.
  svg.setAttribute('viewBox',box.join(' '));svg.dataset.camera=box.join(',');svg.dataset.scene=frame.scene.id;svg.dataset.moment=current.id;svg.replaceChildren();
  const defs=el('defs',{},svg),marker=el('marker',{id:'sb-arrow',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'},defs);el('path',{d:'M0 1L8 5L0 9',fill:'none',stroke:'context-stroke','stroke-width':1.5},marker);
  const role=window.YODStoryboard.roles[frame.scene.role];
  const allRelations=[...current.relations.map(r=>({...r,opacity:1-blend})),...toward.relations.map(r=>({...r,opacity:blend}))];
  for(const r of allRelations){const a=positions.get(r.from),b=positions.get(r.to);if(!a||!b||r.opacity<=0)continue;
   const horizontal=Math.abs(a.y-b.y)<1,lane=horizontal?Math.min(a.y,b.y)-105:(a.x===b.x?a.x+(a.x<width/2?95:-95):(a.x+b.x)/2);
   const d=horizontal?`M${a.x} ${a.y-60} C${a.x} ${lane} ${b.x} ${lane} ${b.x} ${b.y-65}`:`M${a.x+(lane>a.x?65:-65)} ${a.y} H${lane} V${b.y} H${b.x+(lane>b.x?65:-65)}`;
   const g=el('g',{opacity:r.opacity,'data-relation':r.from+':'+r.to,'aria-label':objects.get(r.from).label+' → '+objects.get(r.to).label+': '+r.label},svg);const title=el('title',{},g);title.textContent=r.label;el('path',{d,fill:'none',stroke:role.color,'stroke-width':1.8,'marker-end':'url(#sb-arrow)'},g);
  }
  for(const id of ids){const object=objects.get(id),p=positions.get(id);if(!object||!p)continue;const from=current.visible_objects.includes(id)?1:0,to=toward.visible_objects.includes(id)?1:0,opacity=from+(to-from)*blend;const g=el('g',{transform:`translate(${p.x} ${p.y})`,opacity,'data-object':id},svg);figure(g,object.kind,role.color);wrap(g,object.label,0,82,narrow?18:25);}
  svg.setAttribute('aria-label',frame.scene.title+' · '+current.label+' · esquema conceptual');
  return frame;
 }
 return {render,dispose(){container.replaceChildren();},svg};
}
