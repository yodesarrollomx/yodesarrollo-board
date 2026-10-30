import {roads,source as mapSource} from './basemap.js?v=YOD-SB08';
import {parcel} from './parcel.js?v=YOD-SB08';
import {mapLabels} from './map-labels.js?v=YOD-SB08';
// Escena "ubicacion": traza OSM empaquetada (metros locales, X este, Y abajo) + contorno del terreno.
// Las calles se crean UNA vez en metros dentro de #map-world; la cámara solo cambia un transform.
// Rótulos de calle, colindancias, chinchetas y columna de datos: ver paintMapLabels().
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r1=n=>Math.round(n*10)/10,r2=n=>Math.round(n*100)/100,r3=n=>Math.round(n*1000)/1000;
const PAPER='#eeeede',MUTED='#6b7972',INK='#253e3b',ATTRIBUTION='© OpenStreetMap contributors · ODbL';
// Cajas del mapa en el viewBox de la escena (desktop 1100x730, móvil 480x740).
const BOXES={d:{x:24,y:130,w:700,h:530},m:{x:16,y:160,w:448,h:330}};
const boxFor=m=>m?BOXES.m:BOXES.d;
// Cámara del momento M1 (ciudad): centro en metros locales y escala px/m.
const CITY={d:{x:150,y:160,s:.22},m:{x:150,y:160,s:.135}};
const SCALES=[1000,500,250,100];

// ---- Geometría del contorno (metros locales) ----
const outline=parcel.outline,n=outline.length;
let area2=0,cxs=0,cys=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
for(let k=0;k<n;k++){const [x0,y0]=outline[k],[x1,y1]=outline[(k+1)%n],c=x0*y1-x1*y0;area2+=c;cxs+=(x0+x1)*c;cys+=(y0+y1)*c;minX=Math.min(minX,x0);maxX=Math.max(maxX,x0);minY=Math.min(minY,y0);maxY=Math.max(maxY,y0)}
const centroid=area2?[cxs/(3*area2),cys/(3*area2)]:[(minX+maxX)/2,(minY+maxY)/2];
const parcelH=maxY-minY||1,parcelW=maxX-minX||1;
export const parcelGeometry=()=>({centroid:[...centroid],height:parcelH,width:parcelW,bbox:[minX,minY,maxX,maxY]});

// ---- Cámaras M1..M4 por formato ----
const camCache={};
function camsFor(m){const key=m?'m':'d';if(camCache[key])return camCache[key];const box=boxFor(m),city=m?CITY.m:CITY.d;
 // M2: alto del contorno x 1.28 = alto de la caja (y que el ancho también quepa).
 const s2=Math.min(box.h/(parcelH*1.28),box.w/(parcelW*1.28));
 return camCache[key]=[{x:city.x,y:city.y,s:city.s},{x:centroid[0],y:centroid[1],s:s2},{x:centroid[0],y:centroid[1],s:s2},{x:centroid[0],y:centroid[1],s:s2*.85}]}

// Posición y escala del objeto persistente `land` en M4: centroide en el centro de la caja, figura de 200 u de alto.
export function parcelScreen(m){const box=boxFor(m),c=camsFor(m)[3];return {x:box.x+box.w/2,y:box.y+box.h/2,scale:c.s*parcelH/200}}
// Contorno centrado en el centroide, normalizado a 200 u de alto, Y hacia abajo.
export function parcelFigurePath(){const k=200/parcelH;return outline.map((p,j)=>(j?'L':'M')+r2((p[0]-centroid[0])*k)+' '+r2((p[1]-centroid[1])*k)).join('')+'Z'}

// ---- Markup ----
// Clase y capa de cada kind de §2.1. Capa = orden de dibujo (de abajo hacia arriba).
const KIND={landuse:['k-l',0],water:['k-wa',1],building:['k-b',2],canal:['k-w',3],drain:['k-w',3],path:['k-f',4],track:['k-f',4],pedestrian:['k-f',4],residential:['k-r',5],unclassified:['k-r',5],service:['k-r',5],tertiary:['k-s',6],tertiary_link:['k-s',6],secondary:['k-p',7],secondary_link:['k-p',7],primary:['k-p',7],primary_link:['k-p',7],rail:['k-rail',8],trunk:['k-t',9],trunk_link:['k-t',9]};
const POLY=new Set(['landuse','water','building']);
const CSS=`#territory .k-t,#territory .k-p,#territory .k-s,#territory .k-r,#territory .k-f,#territory .k-rail,#territory .k-w,#territory .k-wa,#territory .k-b,#territory .k-l{vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round;fill:none}`+
 `#territory .k-t{stroke:#9c885b;stroke-width:7}#territory .k-p{stroke:#b4a27a;stroke-width:4}#territory .k-s{stroke:#b9c3b5;stroke-width:2.5}#territory .k-r{stroke:#d2d8ca;stroke-width:1}#territory .k-f{stroke:#dfe3d6;stroke-width:1}`+
 `#territory .k-rail{stroke:${MUTED};stroke-width:1.4;stroke-dasharray:6 4;stroke-linecap:butt}#territory .k-w{stroke:#9cc3c4;stroke-width:2}#territory .k-wa{fill:#cfe3e3;stroke:none}`+
 `#territory .k-b{fill:#e2e0d3;stroke:none}#territory .k-l{fill:#e6ebd8;fill-opacity:.6;stroke:none}`+
 `#territory #map-parcel{vector-effect:non-scaling-stroke;stroke-width:2.4;stroke-linejoin:round}`+
 `#territory #map-parcel[data-status=conceptual]{fill:#ad4c46;fill-opacity:.12;stroke:#ad4c46;stroke-dasharray:9 6}`+
 `#territory #map-parcel[data-status=kmz]{fill:#d4e0c5;fill-opacity:.55;stroke:#294c3f}`+
 `#territory .halo{paint-order:stroke;stroke:${PAPER};stroke-width:4px;stroke-linejoin:round}`;
function roadPath(p,closed){let d='';for(let k=0;k<p.length;k++)d+=(k?'L':'M')+r1(p[k][0])+' '+r1(p[k][1]);return d+(closed?'Z':'')}
export function territoryMarkup(m){const box=boxFor(m),roadsSvg=roads.map((r,k)=>{const kc=KIND[r.kind]||KIND.residential;return [kc[1],`<path class="${kc[0]}" data-road="${k}" data-kind="${esc(r.kind)}" d="${roadPath(r.p,POLY.has(r.kind))}"/>`]}).sort((a,b)=>a[0]-b[0]).map(a=>a[1]).join('');
 const status=parcel.status==='kmz'?'kmz':'conceptual',doc=parcel.docPoint||[0,0];
 const fx=box.x+box.w-26,fy=box.y,bx=box.x+20,by=box.y+box.h-26;
 return `<g id="territory" aria-label="Traza urbana de Ciudad Obregón con el contorno del terreno" data-source="${esc(mapSource||'')}"><style>${CSS}</style>`+
 `<defs><clipPath id="map-clip"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="14"/></clipPath></defs>`+
 `<g id="map-frame" clip-path="url(#map-clip)"><rect id="map-paper" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${PAPER}"/>`+
 `<g id="map-world"><g id="map-roads">${roadsSvg}</g><path id="map-parcel" data-status="${status}" d="${roadPath(outline,true)}"/></g>`+
 `<g id="map-doc" opacity="0"><circle r="9" fill="${PAPER}"/><circle r="5" fill="#ad4c46"/></g>`+
 `<g id="map-labels"></g>`+// rótulos de calle, colindancias y chinchetas (ver paintMapLabels)
 `<g id="map-furniture"><text x="${fx}" y="${fy+32}" font-size="14" text-anchor="middle" fill="${INK}" class="halo">N</text><path d="M${fx} ${fy+66}v-23m-5 7 5-7 5 7" stroke="${INK}" stroke-width="1.6" fill="none"/>`+
 `<g id="map-scale" transform="translate(${bx} ${by})"><line id="sc-main" x1="0" y1="0" x2="100" y2="0" stroke="${INK}" stroke-width="1.6"/><line x1="0" y1="-7" x2="0" y2="0" stroke="${INK}" stroke-width="1.6"/><line id="sc-end" x1="100" y1="-7" x2="100" y2="0" stroke="${INK}" stroke-width="1.6"/><text id="sc-text" x="0" y="-11" font-size="12" fill="${INK}" class="halo">500 m</text></g>`+
 `<text id="map-attribution" x="${box.x+box.w-10}" y="${box.y+box.h-10}" font-size="10" text-anchor="end" fill="${MUTED}" class="halo">${esc(ATTRIBUTION)}</text></g></g>`+
 `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="14" fill="none" stroke="#c9cfbf"/><g id="map-panel"></g></g>`}

// ---- Pintado ----
const reduceQuery=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion:reduce)'):null;
const refs=new WeakMap(),ctx={m:false,i:0,t:0,beat:0,fade:0,w:[0,0,0],box:null,cam:{x:0,y:0,s:1},reduced:false,toScreen:null};
// Escribe solo si cambia (evita trabajo de estilo repetido en cada cuadro).
function put(el,name,v){const c=el.__c||(el.__c={});if(c[name]!==v){c[name]=v;el.setAttribute(name,v)}}
function grab(root){let r=refs.get(root);if(r)return r;const g=root.id==='territory'?root:root.querySelector('#territory');
 const q=s=>g.querySelector(s);r={g,world:q('#map-world'),roads:q('#map-roads'),doc:q('#map-doc'),sMain:q('#sc-main'),sEnd:q('#sc-end'),sText:q('#sc-text'),labels:q('#map-labels'),panel:q('#map-panel')};refs.set(root,r);return r}
// Cámara en t (0..3.99) dentro de la escena: cada paso b->b+1 se interpola con ease en [b+0.55, b+1.0].
// Con prefers-reduced-motion la cámara salta al paso sin animarse.
function cameraAt(m,t,reduced,w){const cs=camsFor(m);let x=cs[0].x,y=cs[0].y,ls=Math.log(cs[0].s);
 for(let k=0;k<3;k++){const q=reduced?(t>=k+1?1:0):ease((t-k-.55)/.45);w[k]=q;if(q>0){x=mix(x,cs[k+1].x,q);y=mix(y,cs[k+1].y,q);ls=mix(ls,Math.log(cs[k+1].s),q)}}
 return {x,y,s:Math.exp(ls)}}
// Rótulos de calle (anclados a vías por id/nombre + near), etiquetas de colindancia, chinchetas ①–④
// y columna derecha. Recibe el contexto de cámara; escribe en #map-labels y #map-panel de `refs`.
// ctx = {m,i,t,beat,fade,w:[w0,w1,w2],box,cam:{x,y,s},reduced,toScreen(X,Y)->[x,y]}
// ---- Rótulos ----
// Los nodos se crean UNA vez (build); por cuadro solo se escriben transform y opacity/visibility.
const roadById=new Map(roads.map(r=>[r.id,r]));
const COMPASS={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]};
const STREET_INK='#55645c',GAP_SIDE=16;
// Fundido cruzado por paso: lo que sale se apaga en la primera mitad de la ventana y lo que entra aparece en la segunda (no se encima con la cámara en movimiento).
const seq=(lv,w)=>{let o=lv[0];for(let k=0;k<3;k++){const g=lv[k+1];o=mix(o,g,g>=o?clamp((w[k]-.5)*2):clamp(w[k]*2))}return o};
const PANEL_LV=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
const levelsOf=(beats,opacity)=>[0,1,2,3].map(b=>beats.includes(b)?(opacity&&opacity[b]!=null?opacity[b]:1):0);
const resolve=s=>String(s).replace(/\{neighbors\.(\w+)\}/g,(_,k)=>parcel.neighbors?.[k]||'');
const hasNeighbor=need=>!need||!!(parcel.neighbors&&parcel.neighbors[String(need).replace('neighbors.','')]);
// Punto de la vía (por id, o por nombre) más cercano a `near` y ángulo del segmento local, normalizado a [-90,90].
function anchorOn(spec){let road=spec.id&&roadById.get(spec.id);
 if(!road&&spec.name){let bd=Infinity;for(const r of roads)if(r.name===spec.name)for(const p of r.p){const d=Math.hypot(p[0]-spec.near[0],p[1]-spec.near[1]);if(d<bd){bd=d;road=r}}}
 if(!road)return null;let best=null,bd=Infinity;
 for(let k=0;k<road.p.length-1;k++){const a=road.p[k],b=road.p[k+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1,u=clamp(((spec.near[0]-a[0])*dx+(spec.near[1]-a[1])*dy)/l2),x=a[0]+u*dx,y=a[1]+u*dy,d=Math.hypot(spec.near[0]-x,spec.near[1]-y);if(d<bd){bd=d;best=[x,y,dx,dy]}}
 if(!best)return null;let ang=Math.atan2(best[3],best[2])*180/Math.PI;if(ang>90)ang-=180;else if(ang<=-90)ang+=180;return {x:best[0],y:best[1],ang}}
// Cadena de vértices de un lado (recorrida en el sentido del contorno) y su punto medio por longitud.
function chain(side){const [a,b]=parcel.sides[side],pts=[outline[a]];let k=a;for(let g=0;g<n&&k!==b;g++){k=(k+1)%n;pts.push(outline[k])}return pts}
function chainAt(pts,f){let L=0;for(let k=0;k<pts.length-1;k++)L+=Math.hypot(pts[k+1][0]-pts[k][0],pts[k+1][1]-pts[k][1]);let h=L*f;
 for(let k=0;k<pts.length-1;k++){const dx=pts[k+1][0]-pts[k][0],dy=pts[k+1][1]-pts[k][1],l=Math.hypot(dx,dy);if(h<=l||k===pts.length-2){const u=l?h/l:0,x=pts[k][0]+dx*u,y=pts[k][1]+dy*u;let nx=dy/(l||1),ny=-dx/(l||1);if(nx*(x-centroid[0])+ny*(y-centroid[1])<0){nx=-nx;ny=-ny}return {x,y,nx,ny}}h-=l}
 return {x:centroid[0],y:centroid[1],nx:0,ny:-1}}
const chainMid=pts=>chainAt(pts,.5);
const lineSpec=l=>l.altA&&parcel.status==='kmz'?{...l,text:l.altA,wrap:undefined}:l;
function panelLines(m,beat){const src=mapLabels.panel[m?'mobile':'desktop'].find(e=>e[0]===beat)[1];
 if(m&&beat===3){// Móvil M4: 4 líneas (añade "Dos estrategias de negocio:", tomada del texto de escritorio).
  const two=mapLabels.panel.desktop.find(e=>e[0]===3)[1][1];return [{...src[0],dy:26},{...two,size:16,dy:56},{...src[1],dy:85},{...src[2],dy:110}]}
 return src}
// Resuelve posiciones sin encimar (una vez, con la cámara del momento en que el rótulo aparece):
// calles se corren a lo largo de su vía, colindancias a lo largo del lado, la flecha de borde a lo largo del borde.
// Se evitan N, barra de escala, atribución, chinchetas y rótulos ya colocados; si no hay sitio, el rótulo se descarta.
const TANGENT_STEPS=[0];for(let k=1;k<=24;k++)TANGENT_STEPS.push(k*5,-k*5);
function place(defs,m,attrW){const box=boxFor(m),cs=camsFor(m),obs=[[],[],[],[]],dropped=[],x0=box.x+8,x1=box.x+box.w-8,y0=box.y+8,y1=box.y+box.h-8;
 const fx=box.x+box.w-26,bx=box.x+20,by=box.y+box.h-26;
 for(let c=0;c<4;c++)obs[c].push([fx-12,box.y+18,fx+12,box.y+70],[bx-2,by-32,bx+175,by+4],[box.x+box.w-10-attrW-8,box.y+box.h-22,box.x+box.w-10,box.y+box.h-6]);
 const scr=(c,X,Y)=>[box.x+box.w/2+(X-cs[c].x)*cs[c].s,box.y+box.h/2+(Y-cs[c].y)*cs[c].s];
 const hit=(c,cx,cy,hw,hh)=>cx-hw<x0||cx+hw>x1||cy-hh<y0||cy+hh>y1||obs[c].some(o=>cx+hw+2>o[0]&&cx-hw-2<o[2]&&cy+hh+1>o[1]&&cy-hh-1<o[3]);
 const inPoly=(c,x,y)=>{let r=false;for(let i=0,j=n-1;i<n;j=i++){const a=scr(c,outline[i][0],outline[i][1]),b=scr(c,outline[j][0],outline[j][1]);if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])r=!r}return r};
 const insideRect=(c,cx,cy,hw,hh,mg)=>[[-1,-1],[1,-1],[1,1],[-1,1]].every(k=>inPoly(c,cx+k[0]*(hw+mg),cy+k[1]*(hh+mg)));
 const hitD=(d,c,cx,cy,mg)=>(d.inset&&!insideRect(c,cx,cy,d.hw,d.hh,mg))||hit(c,cx,cy,d.hw,d.hh)||(d.lv[1]&&d.lv[2]&&c===1&&hit(2,cx,cy,d.hw,d.hh));
 const camOf=d=>Math.max(0,d.lv.findIndex(v=>v>0));
 {const q=scr(0,(parcel.docPoint||[0,0])[0],(parcel.docPoint||[0,0])[1]);obs[0].push([q[0]-10,q[1]-10,q[0]+10,q[1]+10])}
 for(const d of defs)if(d.kind==='pin'){{const q=scr(2,d.X,d.Y);obs[2].push([q[0]-d.hw,q[1]-d.hh,q[0]+d.hw,q[1]+d.hh])}}
 for(const d of defs)if(d.kind==='edge'){const q=scr(1,d.X,0),ax=Math.min(Math.max(q[0],x0+d.hw+4),x1-d.hw-4);d.cy=y1-8;d.cx=ax;for(const t of TANGENT_STEPS){const x=ax+t;if(!hit(1,x,d.cy,d.hw+4,d.hh)){d.cx=x;break}}obs[1].push([d.cx-d.hw,d.cy-d.hh,d.cx+d.hw,d.cy+d.hh]);obs[2].push(obs[1][obs[1].length-1])}
 const order=defs.filter(d=>d.kind==='street').sort((a,b)=>(b.dir?1:0)-(a.dir?1:0)||b.hh-a.hh).concat(defs.filter(d=>d.kind==='side'));
 for(const d of order){const c=camOf(d);let done=false;
  if(d.kind==='street'){const th=d.ang*Math.PI/180,q=scr(c,d.X,d.Y);for(const t of TANGENT_STEPS){const cx=q[0]+d.ox+t*Math.cos(th),cy=q[1]+d.oy+t*Math.sin(th);if(!hitD(d,c,cx,cy,0)){d.ox+=t*Math.cos(th);d.oy+=t*Math.sin(th);obs[c].push([cx-d.hw,cy-d.hh,cx+d.hw,cy+d.hh]);if(d.lv[1]&&d.lv[2])obs[2].push(obs[c][obs[c].length-1]);done=true;break}}}
  else for(const mg of d.inset?[2,.5]:[0]){if(done)break;for(const f of [.5,.38,.62,.26,.74,.14,.86]){const mid=chainAt(d.pts,f),q=scr(c,mid.x,mid.y),g=d.inset?-Math.max(d.inset,Math.abs(mid.nx)*d.hw+Math.abs(mid.ny)*d.hh+3):Math.abs(mid.nx)*d.hw+Math.abs(mid.ny)*d.hh+GAP_SIDE,cx=q[0]+mid.nx*g,cy=q[1]+mid.ny*g;if(!hitD(d,c,cx,cy,mg)){d.X=mid.x;d.Y=mid.y;d.ox=mid.nx*g;d.oy=mid.ny*g;const r=[cx-d.hw,cy-d.hh,cx+d.hw,cy+d.hh];obs[1].push(r);if(d.lv[2])obs[2].push(r);done=true;break}}}
  if(!done){d.dead=true;d.inside=false;if(!d.key)dropped.push(d.html.replace(/<[^>]+>/g,''))}}
 return dropped}
function build(refs,m){const meas=document.createElementNS('http://www.w3.org/2000/svg','text');meas.setAttribute('class','halo');meas.setAttribute('visibility','hidden');refs.labels.appendChild(meas);
 const width=(text,size,weight)=>{meas.setAttribute('font-size',size);meas.style.fontWeight=weight||400;meas.textContent=text;let w=0;try{w=meas.getComputedTextLength()}catch(e){}return w||text.length*size*.56};
 const txtNode=(text,size,fill,extra)=>`<text class="halo" font-size="${size}" dy=".35em" text-anchor="middle" fill="${fill}" ${extra||''}>${esc(text)}</text>`;
 const defs=[];
 // Calles y flechas de dirección
 for(const s of mapLabels.streets){if(s.optional===true)continue;const a=anchorOn(s);if(!a)continue;const size=m&&s.sizeMobile?s.sizeMobile:s.size,bold=s.kind==='direction',w=width(s.text,size,bold?700:400);
  let ox=0,oy=0;if(s.offset){const th=a.ang*Math.PI/180,nv=[-Math.sin(th),Math.cos(th)],tw=[0,0];for(const ch of s.offset.toward)if(COMPASS[ch]){tw[0]+=COMPASS[ch][0];tw[1]+=COMPASS[ch][1]}if(nv[0]*tw[0]+nv[1]*tw[1]<0){nv[0]=-nv[0];nv[1]=-nv[1]}ox=nv[0]*(s.offset.px+5);oy=nv[1]*(s.offset.px+5)}
  const c=Math.abs(Math.cos(a.ang*Math.PI/180)),sn=Math.abs(Math.sin(a.ang*Math.PI/180));
  defs.push({kind:'street',dir:bold,X:a.x,Y:a.y,ang:a.ang,ox,oy,hw:(c*w+sn*size)/2,hh:(sn*w+c*size)/2,lv:levelsOf(s.beats),key:s.key,html:txtNode(s.text,size,STREET_INK,bold?'style="font-weight:700"':'')})}
 // Colindancias (fuera del contorno); la posición sobre el lado se resuelve en place().
 for(const s of mapLabels.sides){if(!hasNeighbor(s.needs)||!parcel.sides[s.side])continue;const w=width(s.text,s.size)+s.text.length*s.size*.08;
  defs.push({kind:'side',inset:s.inset&&s.inset.toward==='interior'?s.inset.px:0,pts:chain(s.side),X:0,Y:0,ang:0,ox:0,oy:0,hw:w/2,hh:s.size/2,lv:levelsOf(s.beats,s.opacity),html:txtNode(s.text,s.size,s.color,'letter-spacing=".08em"')})}
 // Flecha de borde "Calle 300 ↓": solo si el rótulo con la clave onlyIfHidden no cabe en la caja.
 for(const e of mapLabels.edges){const st=defs.find(d=>d.kind==='street'&&d.key===e.onlyIfHidden);if(!st)continue;const size=m&&e.sizeMobile?e.sizeMobile:e.size,w=width(e.text,size);
  defs.push({kind:'edge',X:st.X,Y:st.Y,ang:0,ox:0,oy:0,hw:w/2,hh:size/2,lv:levelsOf(e.beats),dep:st,html:txtNode(e.text,size,STREET_INK,'')})}
 // Chinchetas ①–④
 for(const p of mapLabels.pins){let pt;if(p.at==='centroid')pt={x:centroid[0],y:centroid[1]};else if(parcel.sides[p.at])pt=chainMid(chain(p.at));else continue;
  defs.push({kind:'pin',X:pt.x,Y:pt.y,ang:0,ox:0,oy:0,hw:p.r,hh:p.r,lv:levelsOf(p.beats),html:`<circle r="${p.r}" fill="#fffdf7" stroke="${p.color}" stroke-width="2"/><text font-size="${p.size}" dy=".35em" text-anchor="middle" fill="${p.color}" style="font-weight:700">${p.n}</text>`})}

 const attrW=width(ATTRIBUTION,10);
 const dropped=place(defs,m,attrW);
 refs.labels.innerHTML=defs.map((d,k)=>`<g data-lab="${k}" opacity="0" visibility="hidden">${d.html}</g>`).join('');
 const gs=refs.labels.querySelectorAll('[data-lab]');defs.forEach((d,k)=>{d.g=gs[k];if(!d.dead)d.inside=true});
 // Columna de datos (desktop) / bloque inferior (móvil): un <g> por momento.
 const org=mapLabels.panel.origin[m?'mobile':'desktop'],html=[],tr=(l,t)=>l.track?t.length*l.size*l.track:0;
 for(let b=0;b<4;b++){let inner='';const meas2=meas;void meas2;
  for(const raw of panelLines(m,b)){if(!hasNeighbor(raw.needs))continue;const l=lineSpec(raw),text=resolve(l.text);let size=l.size;const weight=l.weight||400,pitch=size*1.22,x=org.x+(l.dx||0),y=org.y+l.dy,maxW=org.w-(l.dx||0);let lines;
   if(Array.isArray(l.wrap))lines=l.wrap.map(resolve);
   else{let sz=size;while(sz>Math.max(13,size-2)&&width(text,sz,weight)+tr(l,text)>maxW)sz-=1;if(sz!==size&&width(text,sz,weight)+tr(l,text)<=maxW){size=sz}
    lines=[];let cur='';for(const wd of text.split(' ')){const t2=cur?cur+' '+wd:wd;if(cur&&width(t2,size,weight)+tr(l,t2)>maxW){lines.push(cur);cur=wd}else cur=t2}lines.push(cur)}
   inner+=`<text font-size="${size}" fill="${l.color}" text-anchor="start" style="font-weight:${weight}"${l.track?` letter-spacing="${l.track}em"`:''}>${lines.map((q,k)=>`<tspan x="${x}" y="${r2(y+k*pitch)}">${esc(q)}</tspan>`).join('')}</text>`}
  html.push(`<g data-panel="${b}" opacity="0" visibility="hidden">${inner}</g>`)}
 meas.remove();refs.panel.innerHTML=html.join('');return {dropped,items:defs,beats:[...refs.panel.querySelectorAll('[data-panel]')]}}
const fontState={ready:false,hooked:false};
export function paintMapLabels(refs,ctx){
 if(!refs.lab||(refs.labDirty&&fontState.ready)){refs.lab=build(refs,ctx.m);refs.labDirty=false}
 if(!fontState.hooked&&typeof document!=='undefined'&&document.fonts&&document.fonts.ready){fontState.hooked=true;document.fonts.ready.then(()=>{fontState.ready=true;refs.labDirty=true})}
 const L=refs.lab,{box,cam,w}=ctx,s=cam.s,cx=box.x+box.w/2-cam.x*s,cy=box.y+box.h/2-cam.y*s,x0=box.x+8,x1=box.x+box.w-8,y0=box.y+8,y1=box.y+box.h-8;
 for(const it of L.items){let o=seq(it.lv,w);
  if(it.dead)o=0;else if(it.kind==='edge'){if(it.dep.inside)o=0;else put(it.g,'transform',`translate(${r1(it.cx)} ${r1(it.cy)})`)}
  else{const x=it.X*s+cx+it.ox,y=it.Y*s+cy+it.oy;
   if(it.kind!=='pin'){it.inside=x-it.hw>=x0&&x+it.hw<=x1&&y-it.hh>=y0&&y+it.hh<=y1;if(!it.inside)o=0}
   put(it.g,'transform',it.ang?`translate(${r1(x)} ${r1(y)}) rotate(${r1(it.ang)})`:`translate(${r1(x)} ${r1(y)})`)}
  if(o<=.002){put(it.g,'visibility','hidden');put(it.g,'opacity',0)}else{put(it.g,'visibility','visible');put(it.g,'opacity',r3(o))}}
 for(let b=0;b<4;b++){const o=seq(PANEL_LV[b],w),g=L.beats[b];if(o<=.002){put(g,'visibility','hidden');put(g,'opacity',0)}else{put(g,'visibility','visible');put(g,'opacity',r3(o))}}}
export function paintTerritory(root,i,t,m){const r=grab(root),g=r.g,active=i===0;
 if(!active){if(g.__shown!==false){g.__shown=false;g.style.display='none'}return}
 if(g.__shown!==true){g.__shown=true;g.style.display=''}
 const fade=ease((t-3.35)/.65);put(g,'opacity',r3(1-fade));
 const box=boxFor(m),reduced=!!(reduceQuery&&reduceQuery.matches),cam=cameraAt(m,t,reduced,ctx.w),s=cam.s;
 const ox=box.x+box.w/2-cam.x*s,oy=box.y+box.h/2-cam.y*s;
 put(r.world,'transform',`translate(${r2(ox)} ${r2(oy)}) scale(${Math.round(s*1e5)/1e5})`);
 put(r.roads,'opacity',r3(1-.5*ctx.w[2]));
 // Punto documental: círculo de tamaño fijo en pantalla; se apaga al pasar a M2.
 const d=parcel.docPoint||[0,0];put(r.doc,'transform',`translate(${r2(d[0]*s+ox)} ${r2(d[1]*s+oy)})`);put(r.doc,'opacity',r3(1-ctx.w[0]));
 // Barra de escala: la mayor de 1000/500/250/100 m que mida entre 60 y 160 px.
 let len=SCALES[SCALES.length-1];for(const L of SCALES)if(L*s>=60&&L*s<=160){len=L;break}
 const px=Math.round(len*s*10)/10;put(r.sMain,'x2',px);put(r.sEnd,'x1',px);put(r.sEnd,'x2',px);
 const label=len+' m';if(r.sText.__c?.label!==label){(r.sText.__c||(r.sText.__c={})).label=label;r.sText.textContent=label}
 ctx.m=m;ctx.i=i;ctx.t=t;ctx.beat=Math.min(3,Math.floor(t));ctx.fade=fade;ctx.box=box;ctx.cam=cam;ctx.reduced=reduced;ctx.toScreen=(X,Y)=>[X*s+ox,Y*s+oy];
 paintMapLabels(r,ctx)}
