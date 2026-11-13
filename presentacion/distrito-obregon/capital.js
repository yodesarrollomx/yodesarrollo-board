// Escena «Qué aporta cada quien» (índice 6): ecuación de aportaciones A/B con objetos, sin cifras.
// Devuelve el SVG de la capa semántica para desktop (m=false, 1100×730) o móvil (m=true, 480×740).
// Revelado: G(0) el suelo se valúa; suelo, trabajo y riesgo son tres valores (data-until=".5": visible hasta el progreso .5 y oculto desde .7, antes de que el terreno viaje a la fila A) ·
// fila A (data-reveal="1" data-span="0.3": entra de .7 a 1) · fila B y su diferencia (data-reveal="2" data-span="0.3": entra de 1.7 a 2): primero A, luego B · G(3) fórmula y siguiente paso.
// Colores por función: aportación = K.solution · valuación y modelo = K.plan · lo que reciben = K.outcome · tachado = K.risk · siguiente paso = K.action.
// Objetos: el terreno de la fila A es el objeto persistente `land` de drawings.js (héroe en el paso 1, fila A desde el paso 2);
// aquí solo se dibujan sus copias estáticas de la fila B y el resto de figuras Hairline (coordination, capital, document).
// Fuentes: [story.js capital m1…m4], [story.js capital caution], [story.js decision m1], [story.js validacion m1], [meaning.js SB08 capital].
import {K,E,T,P,G,B} from './diagram-kit.js?v=YOD-SB11';
import {icon} from './icons.js?v=YOD-SB11';
import {figure} from './figures.js?v=YOD-SB11';
import {parcelFigurePath} from './territory.js?v=YOD-SB11';

// Textos alternativos públicos. Las variantes con más detalle quedan apagadas hasta tener autorización.
const VB_VALUACION=false;
const VB_SPONSOR=false;
const TXT_VALUACION=VB_VALUACION?['Por peritos independientes','aceptados por la banca']:['Valuación acordada','entre las partes'];
const TXT_EQUIPO_B=VB_SPONSOR?['honorarios preferentes y participación','si se superan metas pactadas']:['por producto o fase'];

const NAME='Yo Desarrollo';
// Íconos y trazos de conexión llevan marca propia (data-icon, data-link) para poder revisarlos.
const IC=(n,x,y,sz,c)=>`<g data-icon="${n}">${icon(n,x,y,sz,c)}</g>`;
const LK=(...p)=>`<g data-link="1">${p.join('')}</g>`;
// Flecha horizontal con punta a la derecha.
const HA=(x,y,w,c)=>LK(P(`M${x} ${y} H${x+w}`,c,1.5),P(`M${x+w-6} ${y-4} L${x+w} ${y} L${x+w-6} ${y+4}`,c,1.5));
// Flecha vertical con punta hacia abajo.
const VA=(x,y,Y,c)=>LK(P(`M${x} ${y} V${Y}`,c,1.5),P(`M${x-4} ${Y-7} L${x} ${Y} L${x+4} ${Y-7}`,c,1.5));
// Grupo de revelado con ventana propia: data-reveal=n y data-span (duración del fundido en pasos).
const GS=(n,span,s)=>`<g data-reveal="${n}" data-span="${span}">${s}</g>`;
// Figura Hairline estática en (x,y) a escala s.
const FG=(kind,x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">${figure(kind)}</g>`;
// Silueta plana del predio (la misma del objeto persistente `land` de drawings.js) para la copia estática de la fila B.
const LAND=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path class="sil" vector-effect="non-scaling-stroke" d="${parcelFigurePath()}"/></g>`;
// Texto con un tramo tachado en el mismo renglón [story.js capital m1: «no se pueden confundir en una sola cifra»].
const STRIKE=(x,y,a,b,size,ca,cb)=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle"><tspan data-strike text-decoration="line-through" fill="${ca}">${E(a)}</tspan><tspan fill="${cb}"> ${E(b)}</tspan></text>`;
// Pie de figura: primer renglón destacado y renglones de apoyo en gris.
const PIE=(x,y,lines,c,s1,s2,lh)=>T(x,y,lines[0],s1,c)+lines.slice(1).map((l,i)=>T(x,y+lh*(i+1),l,s2,K.muted)).join('');

function desktop(){
 let o='';
 // Etiqueta de contexto, siempre visible [story.js capital caution; story.js decision m1].
 o+=`<g data-context="1">${T(1080,150,'Aplica a los negocios complementarios · las naves BTS siguen siendo patrimonio de ustedes',13,K.muted,'end')}</g>`;

 // Paso 1: el terreno (objeto persistente, héroe en (550,345)) se valúa; suelo, trabajo y riesgo son tres valores [story.js capital m1].
 const vals=[['map-2','Suelo',380,48],['users-group','Trabajo',550,66],['alert-triangle','Riesgo',720,54]];
 o+=`<g data-until=".5">`+G(0,
  `<g data-valuation="1">${LK(P('M398 304 H492',K.muted,1.2))}${T(390,300,'La tierra de cada negocio',20,K.ink,'end')}${T(390,322,'delimitada',14,K.muted,'end')}`
  +`${LK(P('M688 300 H602',K.plan,1.2))}${IC('certificate',703,292,26,K.plan)}${T(726,292,'Se valúa',20,K.plan,'start')}${T(726,314,TXT_VALUACION.join(' '),14,K.ink,'start')}</g>`
  +`<g data-values="1">`+vals.map(([n,s,x,w])=>{const x0=x-(26+8+w)/2;return `<g data-value="${n}">${IC(n,x0+13,556,26,K.ink)}${T(x0+34,562,s,18,K.ink,'start')}</g>`}).join('')
  +IC('equal-not',463,556,18,K.risk)+IC('equal-not',637,556,18,K.risk)
  +STRIKE(550,600,'Una sola cifra','no los mezcla',16,K.risk,K.ink)+`</g>`)+`</g>`;

 // Pasos 2 y 3: dos filas con la misma rejilla. Suelo x=150 · trabajo x=330 · capital x=500 · modelo x=690.
 const row=(id,y,label)=>{
  const py=y+55;
  const land=id==='A'?'':LAND(150,y,.38);
  const cap=id==='A'
   ?`<ellipse cx="500" cy="${y}" rx="38" ry="31" fill="none" stroke="${K.solution}" stroke-width="1.5" stroke-dasharray="5 5"/><g opacity=".35">${FG('capital',500,y,.6)}</g>`
   :FG('capital',500,y,.6)+P(`M${500-24} ${y+14} q24 4 48 0`,K.outcome,2.5);
  const capPie=id==='A'?['Capital por conseguir','inversionistas · deuda','comercialización']:['Efectivo de ustedes','reconocido por separado'];
  return `<g data-row="${id}">`
   +T(176,y-44,label,14,K.solution,'start')
   +`<g data-gives="suelo">${land}${PIE(150,py,['Suelo valuado','de ustedes'],K.solution,15,12,17)}</g>`
   +`<g data-gives="trabajo">${FG('coordination',330,y,.6)}${PIE(330,py,['Trabajo desarrollador','de la alianza'],K.solution,15,12,17)}</g>`
   +`<g data-gives="capital">${cap}${PIE(500,py,capPie,K.solution,15,12,16)}</g>`
   +`<g data-gives="modelo">${FG('document',690,y,.6)}${PIE(690,py,['Modelo de la fase','qué efectivo','y de dónde'],K.plan,15,12,16)}</g>`
   +T(240,y+9,'+',24,K.muted)+T(415,y+9,'+',24,K.muted)+HA(548,y,98,K.plan)
   +`</g>`};
 // «Recibe»: título, detalle y matiz en tres niveles; ícono a la izquierda.
 const recv=(who,ic,y,l1,l2,l3)=>`<g data-receives="${who}">${IC(ic,800,y-5,22,K.outcome)}${T(820,y,l1,16,K.outcome,'start')}${T(820,y+18,l2,14,K.ink,'start')}${l3.map((t,i)=>T(820,y+35+i*16,t,12,K.muted,'start')).join('')}</g>`;
 o+=GS(1,0.3,row('A',300,'A · USTEDES APORTAN SUELO')
  +recv('ustedes','users-group',284,'Ustedes','derechos económicos',['por su suelo valuado'])
  +recv('equipo','chart-arrows',350,NAME,'honorarios y participación',['por producto o fase']));
 o+=GS(2,0.3,row('B',470,'B · SUELO + EFECTIVO DE USTEDES')
  +recv('ustedes','users-group',446,'Ustedes','derechos por suelo + efectivo',['pueden cambiar según valuación,','riesgos y acuerdos'])
  +recv('equipo','chart-arrows',522,NAME,'honorarios y participación',TXT_EQUIPO_B)
  +`<g data-difference="1">${LK(P('M500 400 V454',K.plan,1.5),P('M496 407 L500 400 L504 407',K.plan,1.5),P('M496 447 L500 454 L504 447',K.plan,1.5))}${T(514,422,'La diferencia:',14,K.plan,'start')}${T(514,440,'quién pone el efectivo',14,K.plan,'start')}</g>`);

 // Paso 4: los dos modelos convergen en la fórmula; primero se modela y después se pacta [story.js capital m4].
 o+=G(3,LK(P('M724 300 H770',K.plan,1.5),P('M724 470 H770',K.plan,1.5))+VA(770,300,570,K.plan)
  +`<g data-formula="1">${B(550,572,1000,46,K.plan)}${IC('math-function',84,595,26,K.plan)}${T(575,601,'Suelo valuado + trabajo + capital  →  modelo  →  honorarios, participación y reglas',19,K.plan)}</g>`
  +T(550,642,'Un negocio entendible antes de comprometerlo.',18,K.action)
  );
 return o;
}

function mobile(){
 let o='';
 o+=`<g data-context="1">${T(24,172,'Aplica a los complementarios; las BTS siguen siendo de ustedes.',12,K.muted,'start')}</g>`;

 // Paso 1 [story.js capital m1]: el terreno (héroe en (240,300)) se valúa y se separan tres valores.
 const vals=[['map-2','Suelo',110,38],['users-group','Trabajo',240,50],['alert-triangle','Riesgo',370,40]];
 o+=`<g data-until=".5">`+G(0,
  `<g data-valuation="1">${T(194,292,'La tierra de cada negocio',15,K.ink,'end')}${T(194,310,'delimitada',13,K.muted,'end')}`
  +`${IC('certificate',296,292,20,K.plan)}${T(312,298,'Se valúa',16,K.plan,'start')}${T(286,320,TXT_VALUACION[0],13,K.ink,'start')}${T(286,336,TXT_VALUACION[1],13,K.ink,'start')}</g>`
  +`<g data-values="1">`+vals.map(([n,s,x,w])=>{const x0=x-(20+6+w)/2;return `<g data-value="${n}">${IC(n,x0+10,466,20,K.ink)}${T(x0+26,471,s,14,K.ink,'start')}</g>`}).join('')
  +IC('equal-not',176,466,14,K.risk)+IC('equal-not',306,466,14,K.risk)
  +STRIKE(240,505,'Una sola cifra','no los mezcla',13,K.risk,K.ink)+`</g>`)+`</g>`;

 // Pasos 2 y 3: filas A y B con figuras de escala .33 en x 50/150/250/350.
 const row=(id,y,label,rec)=>{
  const land=id==='A'?'':LAND(50,y,.26);
  const cap=id==='A'
   ?`<ellipse cx="250" cy="${y}" rx="22" ry="19" fill="none" stroke="${K.solution}" stroke-width="1.2" stroke-dasharray="4 4"/><g opacity=".35">${FG('capital',250,y,.36)}</g>`
   :FG('capital',250,y,.36)+P(`M${250-14} ${y+9} q14 3 28 0`,K.outcome,2);
  return `<g data-row="${id}">`
   +T(24,y-38,label,13,K.solution,'start')
   +`<g data-gives="suelo">${land}${T(50,y+37,'Suelo',13,K.solution)}</g>`
   +`<g data-gives="trabajo">${FG('coordination',150,y,.36)}${T(150,y+37,'Trabajo',13,K.solution)}</g>`
   +`<g data-gives="capital">${cap}${T(250,y+37,'Capital',13,K.solution)}</g>`
   +`<g data-gives="modelo">${FG('document',350,y,.36)}${T(350,y+37,'Modelo',13,K.plan)}</g>`
   +T(100,y+6,'+',18,K.muted)+T(200,y+6,'+',18,K.muted)+HA(284,y,44,K.plan)
   +`<g data-receives="ustedes">${IC('users-group',30,y+59,16,K.outcome)}${T(46,y+64,rec,13,K.outcome,'start')}</g>`
   +`<g data-receives="equipo">${IC('chart-arrows',30,y+81,16,K.outcome)}${T(46,y+86,NAME+': honorarios y participación',13,K.outcome,'start')}</g>`
   +`</g>`};
 o+=GS(1,0.3,row('A',250,'A · USTEDES APORTAN SUELO','Ustedes: derechos por su suelo'));
 o+=GS(2,0.3,row('B',430,'B · SUELO + EFECTIVO DE USTEDES','Ustedes: por suelo + efectivo')
  +`<g data-difference="1">${LK(P('M282 346 V372',K.plan,1.5),P('M278 353 L282 346 L286 353',K.plan,1.5),P('M278 365 L282 372 L286 365',K.plan,1.5))}${T(294,356,'Diferencia:',13,K.plan,'start')}${T(294,372,'quién pone el efectivo',13,K.plan,'start')}</g>`);

 // Paso 4 [story.js capital m4].
 o+=G(3,LK(P('M367 250 H432',K.plan,1.5),P('M367 430 H432',K.plan,1.5))+VA(432,250,581,K.plan)
  +`<g data-formula="1">${B(240,582,440,60,K.plan)}${T(240,607,'Suelo + trabajo + capital → modelo',14,K.plan)}${T(240,626,'→ honorarios, participación y reglas',14,K.plan)}</g>`
  +T(240,670,'Un negocio entendible antes de comprometerlo.',15,K.action));
 return o;
}

export function capital(m){return m?mobile():desktop();}
