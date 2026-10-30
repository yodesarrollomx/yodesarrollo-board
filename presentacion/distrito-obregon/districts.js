// Escena «Por qué un distrito» (complementos): cadena operación → necesidad → producto → filtro → ruta → siguiente paso.
// Colores por función: necesidad = K.problem, producto = K.solution, filtro y ruta = K.plan, siguiente paso = K.action.
// Revelado: G(0) operación y cinco necesidades · G(1) plaza y oficinas · G(2) hotel, club y bodegas pocket · G(3) filtro, ruta y siguiente paso.
// Las figuras Hairline (nave, plaza, office, hotel, club, pocket) las coloca drawings.js: nave (150,380); plaza, office, hotel, club y pocket en x=620, filas y=250/318/386/454/522.
// Solo se muestra la cifra «250 a 500 m²» del guion; sin porcentajes ni montos. Fuentes: [story.js complementos m1…m4].
import {K,E,T,P,G,A,B} from './diagram-kit.js?v=YOD-SB09';
import {icon} from './icons.js?v=YOD-SB09';

const RULE='#d6ddcf';
// Íconos y trazos de conexión llevan marca propia (data-icon, data-link) para poder revisarlos.
const IC=(n,x,y,sz,c)=>`<g data-icon="${n}">${icon(n,x,y,sz,c)}</g>`;
const LK=(...p)=>`<g data-link="1">${p.join('')}</g>`;
// Flecha corta horizontal.
const HA=(x,y,w,c)=>LK(P(`M${x} ${y} H${x+w}`,c,1.5),P(`M${x+w-6} ${y-4} L${x+w} ${y} L${x+w-6} ${y+4}`,c,1.5));
// Texto de dos renglones en un mismo elemento; el espacio final del primero conserva el texto continuo.
const T2=(x,y,a,b,size,c,anchor='start',lh=Math.round(size*1.25))=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" text-anchor="${anchor}"><tspan x="${x}" dy="0">${E(a)}</tspan><tspan x="${x}" dy="${lh}">${E(b)}</tspan></text>`;

// Cinco necesidades [meaning.js SB08; story.js complementos m1–m3] y el producto que podría responder a cada una [story.js complementos m2, m3].
const ROWS=[
 {need:'servicios',ic:'tools-kitchen-2',n:'Servicios cotidianos',prod:'plaza',p:['Plaza y servicios'],g:1,y:250,pw:136},
 {need:'reuniones',ic:'presentation',n:'Reuniones y representación',prod:'office',p:['Oficinas flex y showrooms'],g:1,y:318,pw:217},
 {need:'visitas',ic:'luggage',n:'Visitas de trabajo',prod:'hotel',p:['Hotel de negocios'],g:2,y:386,pw:150},
 {need:'encuentros',ic:'users-group',n:'Relaciones y encuentros',prod:'club',p:['Industrial Club'],g:2,y:454,pw:120},
 {need:'pequenas',ic:'package',n:'Operaciones más pequeñas',prod:'pocket',p:['Bodegas pocket de ','250 a 500 m²'],g:2,y:522,pw:161}
];
const PRINCIPLE=['Llenar el terreno de productos','→ cada negocio debe demostrar a quién sirve y cómo se sostiene.'];

function desktop(){
 let o='';
 // Línea de principio, siempre visible: la alternativa descartada va tachada [story.js complementos m1].
 o+=`<g data-principle="1">${T(188,150,PRINCIPLE[0],16,K.risk,'start')}${P('M188 145 H413',K.risk,1.5).replace('<path ','<path data-strike ')}${T(423,150,PRINCIPLE[1],16,K.ink,'start')}</g>`;
 // Paso 1: primero el objeto (la nave, dibujada por drawings.js), luego las etiquetas y el abanico de necesidades.
 o+=G(0,T(150,200,'LA OPERACIÓN',12,K.muted)+T(277,200,'NECESITA…',12,K.muted,'start')
  +T(150,468,'Operación industrial',18)+T(150,490,'naves BTS y sus usuarios',14,K.muted)
  +ROWS.map(r=>{const m=r.y-6;
   return `<g data-need="${r.need}">${LK(P(`M212 380 C246 380 242 ${m} 273 ${m}`,K.problem,1.2))}${IC(r.ic,290,m,26,K.problem)}${T(316,r.y,r.n,18,K.problem,'start')}</g>`}).join(''));
 // Pasos 2 y 3: cada producto tiene su propia fila y su propia línea fina; ninguna llave los agrupa.
 const prod=r=>{const m=r.y-6,two=r.p.length>1;
  const name=two?T2(658,r.y-4,r.p[0],r.p[1],18,K.solution):T(658,r.y,r.p[0],18,K.solution,'start');
  const ry=two?r.y+26:r.y+6;
  return `<g data-product="${r.prod}" data-answers="${r.need}">${HA(560,m,32,K.solution)}${name}${LK(P(`M658 ${ry} H878`,RULE,1))}</g>`};
 o+=G(1,T(658,200,'PODRÍA RESPONDER',12,K.muted,'start')+prod(ROWS[0])+prod(ROWS[1]));
 o+=G(2,prod(ROWS[2])+prod(ROWS[3])+prod(ROWS[4])+T2(658,564,'No todos se desarrollan juntos','ni bajo el mismo modelo.',13,K.muted));
 // Paso 4: los cinco productos pasan por el mismo filtro y salen a una ruta propia [story.js complementos m4].
 const funnel=ROWS.map(r=>{const yy=r.y-6+(r.p.length>1?-2:0),x0=658+r.pw+8;
  return P(`M${x0} ${yy} H884`,K.plan,1.2)}).join('')+P('M884 244 V514 M884 307 H888',K.plan,1.2);
 const gateRows=[['chart-line','Demanda'],['user-check','Operador'],['calculator','Viabilidad']];
 o+=G(3,T(890,200,'SE DECIDE CON',12,K.muted,'start')
  +`<g data-gate="1">${LK(funnel)}${B(990,226,200,162,K.plan)}${T(902,248,'SE DECIDE CON ESTUDIOS',12,K.plan,'start')}`
  +gateRows.map((g,j)=>IC(g[0],915,274+j*40,26,K.plan)+T(940,280+j*40,g[1],18,K.ink,'start')).join('')+`</g>`
  +`<g data-route="1">${LK(A(990,392,990,414,K.plan))}${B(990,418,200,130,K.plan)}${IC('arrows-split',912,440,22,K.plan)}${T2(929,441,'RUTA Y FASE ','POR PRODUCTO',12,K.plan,'start',14)}`
  +T(990,482,'Desarrollar · vender',14)+T(990,500,'arrendar · integrar operador',14)+T2(990,526,'Asociación: se define ','en cada negocio',13,K.plan,'middle',15)+`</g>`
  // El único texto verde de la escena.
  +`<g data-next="1">${B(550,600,1000,40,K.action)}${IC('file-search',232,620,26,K.action)}${T(255,626,'Siguiente paso: estudiar demanda, operador y viabilidad de cada producto.',18,K.action,'start')}</g>`);
 return o;
}

function mobile(){
 let o='';
 // Principio en dos renglones; el primero va tachado.
 o+=`<g data-principle="1">${T(240,172,PRINCIPLE[0],13,K.risk)}${P('M148 168 H332',K.risk,1.5).replace('<path ','<path data-strike ')}${T(240,191,'→ cada negocio demuestra a quién sirve',13,K.ink)}</g>`;
 const ys=[270,322,374,426,478];
 // Las figuras Hairline se ocultan en móvil (drawings.js): la nave queda en (60,215) y el resto es texto.
 o+=G(0,T(110,221,'Operación industrial',14,K.ink,'start')
  +LK(P(`M60 236 V246 H12 V${ys[4]-5}`,K.problem,1.2)+ys.map(y=>P(`M12 ${y-5} H17`,K.problem,1.2)).join(''))
  +ROWS.map((r,j)=>`<g data-need="${r.need}">${IC(r.ic,28,ys[j]-5,20,K.problem)}${T(46,ys[j],r.n,13,K.problem,'start')}</g>`).join(''));
 const prod=(r,j)=>`<g data-product="${r.prod}" data-answers="${r.need}">${T(227,ys[j],'→',14,K.solution)}${T(440,ys[j],r.p.join(''),13,K.solution,'end')}${LK(P(`M20 ${ys[j]+16} H440`,RULE,1))}</g>`;
 o+=G(1,prod(ROWS[0],0)+prod(ROWS[1],1));
 o+=G(2,prod(ROWS[2],2)+prod(ROWS[3],3)+prod(ROWS[4],4)+T(240,512,'No todos juntos ni bajo el mismo modelo.',12,K.muted));
 o+=G(3,`<g data-gate="1">${B(240,528,440,88,K.plan)}${T(240,553,'Se decide con estudios: demanda · operador · viabilidad',14)}</g>`
  +`<g data-route="1">${T(240,575,'Ruta: desarrollar, vender, arrendar o integrar operador',13)}${T(240,597,'Asociación: se define en cada negocio',13,K.plan)}</g>`
  +`<g data-next="1">${B(240,630,440,40,K.action)}${IC('file-search',92,650,22,K.action)}${T(114,655,'Siguiente paso: estudio por producto.',15,K.action,'start')}</g>`);
 return o;
}

export function complementos(m){return m?mobile():desktop();}
