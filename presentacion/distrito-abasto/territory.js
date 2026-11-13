import {HL} from './vendor/hairline-kernel.mjs?v=YOD-AB02';
import {coordinates,parcels,boundary} from './parcel.js?v=YOD-AB02';
import {roads} from './basemap.js?v=YOD-AB02';
const {Cam,proj,fit,poly,open,rings,prism,facing}=HL;
const pt=id=>[coordinates[id][0]-503250,3208200-coordinates[id][1],0];
const outline=boundary.map(pt),clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=(x,y,text,size=18,anchor='start',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" ${extra}>${esc(text)}</text>`;
// Illustrative program only: dimensions and locations are not an approved master plan.
export const program=[{u:25,v:70,w:130,d:68,h:15},{u:25,v:168,w:130,d:60,h:14},{u:25,v:265,w:130,d:70,h:15},{u:25,v:370,w:130,d:66,h:15},{u:25,v:477,w:130,d:62,h:15},{u:25,v:580,w:60,d:55,h:11},{u:100,v:580,w:55,d:55,h:11},{u:25,v:680,w:130,d:60,h:12}];
const uv=(u,v)=>[502990.7503+.91391*u+.40289*v-503250,3208200-(3207854.8782-.40591*u+.91525*v),0];
function worldRing(r){return r.map(q=>{const p=uv(q.u,q.v);return {...q,u:p[0],v:p[1],nu:.91391*q.nu+.40289*q.nv,nv:.40591*q.nu-.91525*q.nv}})}
export function territoryMarkup(){return `<g id="territory" aria-label="Terreno real: polígonos 5-5 y 5-6"><defs><clipPath id="map-clip"><rect/></clipPath></defs><g id="map-content" clip-path="url(#map-clip)"><rect id="map-paper" fill="#eeeede"/>${roads.map((r,n)=>`<path data-road="${n}" fill="${['building','landuse'].includes(r.kind)?'#e4e6d6':'none'}" stroke="#d0d6c6"/>`).join('')}</g><path id="plot-side" fill="#e6e4d5" stroke="#526e61" stroke-width="1.2"/><g id="parcels">${Object.keys(parcels).map(id=>`<path data-parcel="${id}" fill="${id==='5-5'?'#d4e0c5':'#e6e9d6'}" stroke="#325d4b" stroke-width="1.7"/>`).join('')}</g><path id="plot-edge" fill="none" stroke="#294c3f" stroke-width="2.1"/><g id="site-program">${program.map((p,n)=>`<g data-building="${n}"><path class="sil"/><path class="crease"/></g>`).join('')}</g><g id="map-labels"></g><g id="parcel-notes" fill="#293e34"></g></g>`}
export function paintTerritory(root,i,t,m){
 const active=[0,1,6].includes(i);root.style.display=active?'':'none';if(!active)return;
 const beat=Math.min(3,Math.floor(t)),box=m?{x:18,y:178,w:444,h:360}:{x:25,y:163,w:700,h:480};
 const zoom=i===0?ease(t):1,lift=i===0?ease(t-1):1,build=i===0?ease(t-2):i===1?Math.min(1,.25+ease(t)/2+ease(t-1)/4):1;
 const flatScale=mix(Math.min(box.w/1850,box.h/1600),Math.min(box.w/710,box.h/1030),zoom);
 const flat=p=>[box.x+box.w/2+p[0]*flatScale,box.y+box.h/2+p[1]*flatScale];
 const camera=Cam(45,.5,m? .49:.78);fit(camera,outline,box.x+box.w/2,box.y+box.h/2+10);const iso=proj(camera);
 const P=(x,y,z=0)=>{const a=flat([x,y]),b=iso(x,y,z);return [mix(a[0],b[0],lift),mix(a[1],b[1],lift)]};
 for(const sel of ['#map-clip rect','#map-paper']){const r=root.querySelector(sel);for(const k of ['x','y','width','height'])r.setAttribute(k,box[{width:'w',height:'h'}[k]||k]);r.setAttribute('rx',12)}
 root.querySelector('#map-content').setAttribute('opacity',1-lift);
 if(lift<1)for(const el of root.querySelectorAll('[data-road]')){const r=roads[+el.dataset.road],main=['trunk','primary','secondary','tertiary'].includes(r.kind);el.setAttribute('d',open(r.p.map(p=>flat(p)))+(['building','landuse'].includes(r.kind)?'Z':''));el.setAttribute('stroke',main?'#c2cbb7':r.kind==='water'?'#c3d8d7':'#d5daca');el.setAttribute('stroke-width',main?Math.max(2.5,flatScale*12):1)}
 const top=outline.map(p=>P(...p));root.querySelector('#plot-side').setAttribute('d',poly(HL.hull(top.concat(outline.map(p=>P(p[0],p[1],-13))))));
 root.querySelector('#plot-side').setAttribute('opacity',lift);
 for(const el of root.querySelectorAll('[data-parcel]'))el.setAttribute('d',poly(parcels[el.dataset.parcel].map(id=>P(...pt(id)))));
 root.querySelector('#plot-edge').setAttribute('d',poly(top));
 const buildings=[...root.querySelectorAll('[data-building]')].sort((a,b)=>{const aa=program[+a.dataset.building],bb=program[+b.dataset.building],aP=uv(aa.u,aa.v),bP=uv(bb.u,bb.v);return aP[0]+aP[1]-bP[0]-bP[1]});
 for(const el of buildings){const n=+el.dataset.building,b=program[n],[outer,inner]=rings(b.u,b.v,b.u+b.w,b.v+b.d,3,1.1),localBuild=ease(build*1.8-n*.1);el.setAttribute('opacity',localBuild*lift);const solid=prism(P,facing(camera),worldRing(outer),worldRing(inner),0,b.h*localBuild);el.children[0].setAttribute('d',solid.sil);const projectUV=(u,v,z)=>{const q=uv(u,v);return P(q[0],q[1],z)};let details=solid.crease;details+=open([projectUV(b.u+3,b.v+b.d/2,b.h*localBuild),projectUV(b.u+b.w-3,b.v+b.d/2,b.h*localBuild)]);for(let j=1;j<=3;j++){const v=b.v+j*b.d/4;details+=open([projectUV(b.u+b.w,v-4,0),projectUV(b.u+b.w,v-4,b.h*.55*localBuild),projectUV(b.u+b.w,v+4,b.h*.55*localBuild),projectUV(b.u+b.w,v+4,0)])}el.children[1].setAttribute('d',details);root.querySelector('#site-program').append(el)}
 let labels='';
 if(lift<.99){labels+=txt(box.x+box.w-24,box.y+32,'N',13,'middle')+`<path d="M${box.x+box.w-24} ${box.y+66}v-23m-5 7 5-7 5 7" stroke="#294c3f" fill="none"/>`;const len=zoom>.5?100:250;labels+=`<path d="M${box.x+20} ${box.y+box.h-28}v7h${len*flatScale}v-7" stroke="#294c3f" fill="none"/>`+txt(box.x+20,box.y+box.h-31,len+' m',12);const road=P(-172,95);labels+=txt(road[0]-16,road[1],'Clouthier · MEX 15',m?12:15,'middle',`transform="rotate(-66 ${road[0]-16} ${road[1]})" class="map-label"`);if(zoom<.5){labels+=txt(box.x+22,box.y+30,'HERMOSILLO · SALIDA SUR',m?12:14)+txt(box.x+box.w-20,box.y+box.h-18,'Hacia Guaymas ↓',m?12:15,'end');}}
 if(build<.35){for(const [id,loc] of [['5-5',[110,-240]],['5-6',[-20,160]]]){const q=P(...loc);labels+=txt(q[0],q[1],id,m?18:23,'middle','class="map-label"')}}
 if(zoom>.9){const n=P(...pt('43'));labels+=txt(n[0]-8,n[1]-20,'5-4 · reserva al norte',m?11:15,'end','class="map-label"')}
 if(beat===1&&i===0){for(const id of ['42','45','46','43','49','51','52']){const p=P(...pt(id));labels+=`<circle cx="${p[0]}" cy="${p[1]}" r="2.7" fill="#294c3f"/>`+txt(p[0]+7,p[1]-7,id,10)}}
 root.querySelector('#map-labels').innerHTML=labels;
 const x=m?25:765,y=m?575:218;
 let notes=txt(x,y,'148,377.25 m²',m?29:36)+txt(x,y+27,'Base inicial · polígonos 5-5 + 5-6',m?13:17);
 if(m){notes+=txt(x,y+53,'5-5: 37,830.45 m²   ·   5-6: 110,546.80 m²',12);notes+=txt(x,y+77,lift>.9?'Geometría real · programa conceptual':'Planos originales + cartografía OpenStreetMap',12)}
 else{notes+=txt(x,y+91,'5-5',21)+txt(x,y+120,'37,830.45 m²',23)+txt(x,y+173,'5-6',21)+txt(x,y+202,'110,546.80 m²',23);notes+=txt(x,y+272,lift>.9?'LA MISMA GEOMETRÍA':'FRENTE A CLOUTHIER',13)+txt(x,y+298,lift>.9?'De suelo a distrito.':'Carretera a Guaymas · MEX 15',17)+txt(x,y+325,lift>.9?'Volúmenes sujetos al estudio.':'Hermosillo, Sonora.',15)+txt(x,y+390,'5-4: reserva; lindero por conciliar.',13)}
 root.querySelector('#parcel-notes').innerHTML=notes;
}
