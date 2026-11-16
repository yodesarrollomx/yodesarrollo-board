import {mountFirstScene} from './first-scene.mjs?v=YOD-APORTADORES-A1-2';
import {clamp,ease,camera} from './story.mjs?v=YOD-APORTADORES-A1-2';
const NS='http://www.w3.org/2000/svg', el=(name,attrs={})=>{const n=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n};
const mix=(a,b,t)=>a+(b-a)*t;
const interval=(p,a,b)=>ease(clamp((p-a)/(b-a)));
function pathData(shape){const [x,y,w,h]=shape.box;return shape.paths.map(path=>path.commands.map(c=>{if(c.close)return 'Z';let key=Object.keys(c)[0],v=c[key],sx=w/path.width,sy=h/path.height,xy=(a,b)=>`${x+a*sx} ${y+b*sy}`;if(key==='moveTo')return 'M'+xy(v.x,v.y);if(key==='lineTo')return 'L'+xy(v.x,v.y);if(key==='quadBezTo')return 'Q'+xy(v.x1,v.y1)+' '+xy(v.x,v.y);if(key==='cubicBezTo')return 'C'+xy(v.x1,v.y1)+' '+xy(v.x2,v.y2)+' '+xy(v.x,v.y);return ''}).join(' ')).join(' ')}
function shapeNode(shape){const [x,y,w,h]=shape.box;let n;if(shape.text){n=el('text',{x:x+(shape.align==='center'?w/2:shape.align==='right'?w:0),y:y+shape.font*.82,'font-size':shape.font,'text-anchor':shape.align==='center'?'middle':shape.align==='right'?'end':'start'});shape.text.split('\n').forEach((line,i)=>{const s=el('tspan',{x:n.getAttribute('x'),dy:i?shape.font*1.16:0});s.textContent=line;n.append(s)});n.classList.add('art-label');}else if(shape.geometry==='ellipse')n=el('ellipse',{cx:x+w/2,cy:y+h/2,rx:w/2,ry:h/2});else if(shape.geometry==='custom')n=el('path',{d:pathData(shape)});else n=el('rect',{x,y,width:w,height:h,rx:1});if(!shape.text){n.classList.add('ink-stroke');n.setAttribute('stroke-width',Math.max(2.7,shape.width||3));n.setAttribute('fill','none');}n.dataset.shape=shape.i;return n;}
export function mount(container,data){const svg=el('svg',{viewBox:'0 0 1600 900',role:'img','aria-label':'Dibujo progresivo de la alianza entre aportadores',preserveAspectRatio:'xMidYMid meet'});container.append(svg);const first=mountFirstScene(svg);const layers=[],all=[];
 function group(name,shapes,start,end,opts={}){const g=el('g',{'data-object':name});svg.append(g);const nodes=shapes.map(s=>{const n=shapeNode(s);g.append(n);return {n,s,length:s.text?0:n.getTotalLength()}});const item={g,nodes,start,end,...opts};layers.push(item);all.push(item);return item;}
 const part=(s,a,b)=>data[s].shapes.filter(x=>x.i>=a&&x.i<=b);
 const developer=group('desarrollador', [...part(0,3,4),...part(0,2,2),...part(0,5,13)],.13,1,{life:[0,9.45]});
 group('nombre-desarrollador',part(0,53,53),.8,1,{life:[0,4.45]});
 group('propietario-tierra',part(0,32,47),1.15,2,{life:[0,4.45]});
 group('profesionales',part(0,14,31),2.12,3,{life:[0,4.45]});
 group('negocio-tradicional',part(0,48,52),3.1,4,{life:[0,4.45]});
 group('tachadura',part(1,22,23),4.3,5,{life:[4,9.45],color:'#aa4e47'});
 group('tierra',part(1,2,9),5.05,5.55,{life:[4,9.45]});
 group('diseno',part(1,24,30),5.25,5.77,{life:[4,9.45]});
 group('trabajo',part(1,31,39),5.5,6,{life:[4,9.45]});
 group('materiales',part(1,40,50),6.08,6.5,{life:[4,9.45]});
 group('coordinacion',part(1,51,55),6.35,6.85,{life:[4,9.45]});
 group('capital',part(1,56,58),6.6,7,{life:[4,9.45]});
 group('conexiones',part(1,59,63),7.13,8,{life:[4,9.45],color:'#82678f'});
 group('resultado-compartido',part(1,64,64),8.35,9,{life:[4,9.45],color:'#387b94'});
 const circle=group('circulo',part(2,2,11),9.25,10,{life:[9,16.45]});
 const wedge=group('excedente',part(2,12,28),10.1,11,{life:[9,16.45],color:'#387b94'});
 const rays=group('reparto',part(2,29,38),11.12,12,{life:[9,16.45],color:'#82678f'});
 group('etiquetas-reparto',part(2,40,45),9.65,10,{life:[9,13.7]});
 group('titulo-excedente',part(2,39,39),10.65,11,{life:[9,13.7],color:'#387b94'});
 group('excedente-sistema',part(3,33,33),13.35,14,{life:[13,16.45],color:'#387b94'});
 group('flecha-sistema',part(3,34,35),14.07,14.6,{life:[13,16.45],color:'#82678f'});
 group('sistema',part(3,36,36),14.6,15,{life:[13,16.45],color:'#82678f'});
 group('alianza',part(3,37,38),15.1,16,{life:[13,16.45],color:'#82678f'});
 const stages=group('siete-etapas',part(4,2,16),16.2,17,{life:[16,21.55],color:'#987552'});
 group('calidad-avance',part(4,17,22),17.1,18,{life:[16,21.55]});
 group('control-materiales',part(4,23,33),18.1,19,{life:[16,21.55]});
 group('transparencia',part(4,34,36),19.1,20,{life:[16,21.55],color:'#82678f'});
 const curve=group('curva',part(5,2,2),21.6,25,{life:[21,99],color:'#387b94'});
 const base=group('base',part(5,3,3),22.1,23,{life:[21,99]});
 const seed=group('semilla',part(5,4,7),21.3,22,{life:[21,99],color:'#987552'});
 const sprout=group('primer-crecimiento',part(5,8,13),22.15,23,{life:[21,99]});
 const plant=group('segundo-crecimiento',part(5,14,22),23.1,24,{life:[21,99]});
 const bag=group('bolsa',part(5,23,26),24.1,25,{life:[21,99]});
 group('recursos',part(5,27,33),24.45,25,{life:[21,25.65]});
 group('tronco',part(6,27,27),25.12,25.6,{life:[25,99],color:'#987552'});
 group('copa',part(6,28,28),25.5,26,{life:[25,99],color:'#387b94'});
 group('frutos-en-arbol',part(6,29,38),25.7,26,{life:[25,99],color:'#387b94'});
 ['departamentos','locales','lotes','bodegas','casas'].forEach((name,i)=>group(name,part(6,39+i*3,41+i*3),26.1+i,27+i,{life:[25,99],color:'#387b94'}));
 const morphGroups=[curve,base,seed,sprout,plant,bag];
 function morph(n,s,t){const other=data[6].shapes.find(x=>x.i===s.i);if(!other)return;const box=s.box.map((v,i)=>mix(v,other.box[i],t));
  if(n.tagName==='path'){const changed={...s,box:[0,0,1,1],paths:s.paths.map((path,i)=>({width:1,height:1,commands:path.commands.map((c,j)=>{const k=Object.keys(c)[0],v=c[k],b=other.paths[i]?.commands[j]?.[k];if(!b)return c;return {[k]:Object.fromEntries(Object.entries(v).map(([key,val])=>{const x=key.startsWith('x'),axis=x?0:1,size=x?2:3,dim=x?'width':'height';return [key,mix(s.box[axis]+val/path[dim]*s.box[size],other.box[axis]+b[key]/other.paths[i][dim]*other.box[size],t)];}))};})}))};n.setAttribute('d',pathData(changed));}
  else if(n.tagName==='ellipse'){const [x,y,w,h]=box;for(const [k,v] of Object.entries({cx:x+w/2,cy:y+h/2,rx:w/2,ry:h/2}))n.setAttribute(k,v)}else if(n.tagName==='text'){const [x,y,w]=box,font=mix(s.font,other.font,t),tx=x+(s.align==='center'?w/2:s.align==='right'?w:0);n.setAttribute('x',tx);n.setAttribute('y',y+font*.82);n.setAttribute('font-size',font);const lines=(t>.5?other.text:s.text).split('\n');n.querySelectorAll('tspan').forEach((a,i)=>{a.setAttribute('x',tx);a.setAttribute('dy',i?font*1.16:0);a.textContent=lines[i]||'';});}}
 function render(p){const bounds=container.getBoundingClientRect(),vertical=bounds.width/bounds.height<.95,view=p<5?first.view(p,bounds.width,bounds.height,camera(5,bounds.width,bounds.height)):camera(p,bounds.width,bounds.height);first.render(p,vertical);svg.dataset.first=p<4.58?'true':'false';svg.setAttribute('viewBox',view.map(x=>x.toFixed(2)).join(' '));
  for(const {n,s} of stages.nodes)if(/^[1-7]$/.test(s.text||''))n.setAttribute('font-size',Math.max(s.font,14*view[2]/Math.max(1,bounds.width)));
  const compact=interval(p,4,5);developer.g.setAttribute('transform',p<5?first.developer(p,vertical):`translate(${188*compact} ${69*compact}) scale(${1-.4355*compact})`);
  const shrink=interval(p,13,14),scale=1-(1-326/492)*shrink;for(const a of [circle,wedge,rays])a.g.setAttribute('transform',`translate(${-132.073*shrink} ${137.13*shrink}) scale(${scale})`);
  const growth=interval(p,25,26);for(const a of morphGroups)for(const {n,s} of a.nodes)morph(n,s,growth);
  for(const item of all){const [born,die]=item.life||[0,99];let opacity=p<born?0:1-interval(p,die-.32,die);if(['nombre-desarrollador','propietario-tierra','profesionales','negocio-tradicional'].includes(item.g.dataset.object))opacity=0;const t=clamp((p-item.start)/(item.end-item.start));if(t<=0)opacity=0;item.g.style.opacity=opacity;item.g.style.display=opacity<.001?'none':'';if(item.color)item.g.style.color=item.color;
   item.nodes.forEach(({n,s,length},i)=>{const local=ease(clamp(t*(1+Math.min(4,item.nodes.length*.14))-i/item.nodes.length*Math.min(4,item.nodes.length*.14)));if(s.text){n.style.opacity=ease(local);n.style.display=local<.01?'none':'';}else{n.style.strokeDasharray=local===1?'none':length+.1;n.style.strokeDashoffset=local===1?0:(length+.1)*(1-local);n.style.opacity=local>0?1:0;}});
  }
  svg.dataset.position=p.toFixed(4);return svg;
 }
 return {render,svg};
}
