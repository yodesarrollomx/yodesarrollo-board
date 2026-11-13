// Escena «Cómo nace una nave» (índice 3): hilo con objetos, de la empresa a la nave en su terreno.
// Devuelve el SVG de la capa semántica para desktop (m=false, 1100×730) o móvil (m=true, 480×740). Sin cifras en pantalla.
// Revelado: cada paso k queda completo en el progreso k−1 y entra durante la aproximación (data-reveal + data-span);
// lo propio de un paso se va con data-until antes de que entre el siguiente (las guías, la carta y los rótulos de la empresa salen antes de que los objetos se muevan hacia la compuerta, en 1.5): paso 1 visible desde el inicio · paso 2 entra entre 0.6 y 1 ·
// paso 3 entra entre 1.6 y 2 y se va en 2.6 · paso 4 entra entre 2.6 y 3.
// Colores por función: preguntas de la empresa = K.problem (una sola línea) · acciones de la alianza y requisitos = K.plan ·
// compuerta y compatibilidad = K.risk · aprobaciones y nave sólida = K.outcome. No se usa K.solution.
// Objetos: terreno, alianza (team), empresa (office), carta/contrato (document), nave, compuerta (gate) y efectivo (capital)
// son los objetos persistentes de drawings.js (state(3)); aquí solo se dibujan rótulos, íconos, guías y marcas.
// Fuentes: [story.js demanda m1…m4], [story.js demanda caution], [story.js capital m2 «ustedes aportan suelo»], [story.js participacion m1].
import {K,E,T,P} from './diagram-kit.js?v=YOD-SB11';
import {icon} from './icons.js?v=YOD-SB11';

// Textos alternativos públicos. Las variantes con más detalle quedan apagadas hasta tener autorización.
const VB_BANCO=false;
const VB_AJUSTE=false;
const VB_PREGUNTA=false;
const TXT_BANCO=VB_BANCO?['El banco decide ','con sus propios criterios']:['Se estudia el ','financiamiento'];
const TXT_AJUSTE='si no son compatibles, se ajusta el proyecto';
const TXT_PREGUNTA='¿Qué tiene que pasar antes de construir en su terreno?';
const DY=70;
const CAUTELA='No se presume demanda contratada, financiamiento aprobado ni rentabilidad.';

// Íconos y trazos de conexión llevan marca propia (data-icon, data-link) para poder revisarlos.
const IC=(n,x,y,sz,c)=>`<g data-icon="${n}">${icon(n,x,y,sz,c)}</g>`;
const LK=(...p)=>`<g data-link="1">${p.join('')}</g>`;
// Grupo con atributos de revelado: data-reveal=n y data-span=s (aparece entre n−s y n); data-until=u (se va entre u y u+0.2).
const W=(attrs,s)=>`<g ${attrs}>${s}</g>`;
const IN=(n,span=.4)=>`data-reveal="${n}" data-span="${span}"`;
// Texto de dos renglones en un mismo elemento; el espacio final del primero conserva el texto continuo.
const T2=(x,y,a,b,size,c,anchor='middle',lh=Math.round(size*1.25))=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" text-anchor="${anchor}"><tspan x="${x}" dy="0">${E(a)}</tspan><tspan x="${x}" dy="${lh}">${E(b)}</tspan></text>`;
// Punta de flecha en (X,Y) para un trazo que llega con dirección (dx,dy).
const HEAD=(X,Y,dx,dy,c)=>{const l=Math.hypot(dx,dy),ux=-dx/l,uy=-dy/l,px=-uy,py=ux,r=n=>Math.round(n*10)/10;return P(`M${r(X+ux*8+px*4)} ${r(Y+uy*8+py*4)} L${X} ${Y} L${r(X+ux*8-px*4)} ${r(Y+uy*8-py*4)}`,c,1.5)};

// Seis requisitos [story.js demanda m2: «superficie, altura, patios, andenes, energía y plazo»].
const REQ=[['dimensions','superficie'],['arrow-autofit-height','altura'],['truck','patios'],['truck-loading','andenes'],['bolt','energía'],['clock','plazo']];
// Cuatro aprobaciones [story.js demanda m4: «técnicas, comerciales, legales y financieras»].
const APR=['Técnicas','Comerciales','Legales','Financieras'];

function desktop(){
 let o='';
 // Los objetos de drawings.js suben DY unidades respecto al primer trazado; los rótulos, íconos y guías suben con ellos (la cautela y la pregunta opcional no).
 // Cada paso k queda completo en el progreso k−1 y entra durante la aproximación: IN(k−1,.4) aparece entre k−1.4 y k−1.
 // Lo propio de un paso se va con data-until antes de que entre el siguiente (queda en 0 al llegar a su progreso entero).
 let d='';
 // Siempre visibles: el terreno y el candado tenue del riesgo [story.js capital m2].
 d+=`<g data-land-label="1">${T(110,548,'Su terreno',16,K.muted)}</g>`;
 d+=W('data-until="1.2"',`<g opacity=".55">${IC('lock',800,262,22,K.risk)}</g>`);

 // Paso 1 · encontrar al usuario adecuado [story.js demanda m1].
 d+=`<g data-step="1">`
  +W('data-until="1.2"',
    LK(P('M332 340 H378',K.plan,1.5,'5 5'),P('M442 340 H497',K.plan,1.5,'5 5'))
    +W('data-until=".4"',LK(P('M382 340 H438',K.plan,1.5,'5 5')))
    +T(530,412,'Una empresa que encaje',19)+T(530,434,'qué produce, almacena o distribuye',14,K.muted)
    +LK(P('M503 352 L146 420',K.muted,1.2,'4 5'))+T(262,442,'encaja con la ubicación',13,K.muted))
  +W('data-until=".6"',T(410,322,'La alianza prospecta',15,K.plan))
  // La única línea en K.problem: las preguntas que la empresa debe responder.
  +W('data-until=".6"',IC('user-search',318,465,22,K.problem)+T(336,470,'¿Qué superficie requiere? ¿Qué renta puede sostener?',15,K.problem,'start'))
  +`</g>`;

 // Paso 2 · requerimientos y acuerdos [story.js demanda m2]. Las fichas ocupan x 250–650.
 const xs=REQ.map((_,j)=>250+j*80);
 d+=`<g data-step="2">`
  +W(`${IN(1)} data-until="1.2"`,T(410,282,'Carta de intención',16,K.plan)+T(410,300,'aún no es arrendamiento',13,K.muted))
  +W(`${IN(1)} data-until="1.2"`,xs.map(x=>LK(P(`M${x} 507 V492 H760 V392`,K.plan,1))).join('')+T2(832,366,'la nave que esos ','requisitos definen',14,K.muted,'start'))
  +W(`${IN(1)} data-until="1.8"`,REQ.map(([n,s],j)=>`<g data-requirement="${s}">${IC(n,xs[j],520,22,K.plan)}${T(xs[j],552,s,14,K.plan)}</g>`).join(''))
  +`</g>`;

 // Paso 3 · compuerta: contrato, costo y efectivo deben ser compatibles [story.js demanda m3].
 const foot=(id,x,a,b)=>`<g data-condition="${id}">${T2(x,494,a,b,13,K.ink)}</g>`;
 d+=`<g data-step="3">`
  // Las fichas de requisitos quedan atenuadas (copia sin marca de requisito).
  +W(`${IN(2)} data-until="2.6"`,`<g opacity=".35">`+REQ.map(([n,s],j)=>IC(n,xs[j],520,22,K.plan)+T(xs[j],552,s,14,K.plan)).join('')+`</g>`)
  +W(`data-gate="1" ${IN(2)} data-until="2.6"`,
    T(800,266,'Deben ser compatibles',18,K.risk)
    +foot('contrato',712,'Contrato ','y garantías')+foot('costo',800,'Costo del ','proyecto')+foot('efectivo',892,'Efectivo que ','hará falta')
    +IC('building-bank',925,466,22,K.risk)+T2(944,462,TXT_BANCO[0],TXT_BANCO[1],13,K.ink,'start',16)
    // Retorno: sale a la izquierda del pilar y vuelve a los requisitos; si no son compatibles, el proyecto se ajusta.
    +LK(P('M728 430 C700 440 668 458 655 498',K.risk,1.5,'5 5'),HEAD(655,498,-13,40,K.risk))
    +`<circle cx="675" cy="464" r="12" fill="#f8f6ee"/>`+IC('arrow-back-up',675,464,20,K.risk)
    +(VB_AJUSTE?T(640,452,TXT_AJUSTE,13,K.risk,'end'):''))
  +`</g>`;

 // Paso 4 · se ejecuta la fase aprobada [story.js demanda m4; story.js participacion m1].
 d+=`<g data-step="4">`
  +W(IN(3),IC('lock-open',800,262,22,K.outcome))
  +W(IN(3),T(700,300,'CONDICIONES APROBADAS',12,K.outcome,'start')
    +APR.map((s,j)=>`<g data-approval="${s.toLowerCase()}">${IC('circle-check',711,340+j*35,22,K.outcome)}${T(732,346+j*35,s,18,K.ink,'start')}</g>`).join(''))
  +W(IN(3),T(550,600,'Se construye para una operación concreta, con una estructura de inversión conocida.',19,K.outcome))
  +W(IN(3),IC('users-group',110,290,20,K.outcome)+T(140,295,'Ustedes conservan las decisiones que se pacten.',14,K.ink,'start'))
  +`</g>`;
 o+=`<g transform="translate(0 ${-DY})">${d}</g>`;
 // Cautela y pregunta opcional: posiciones propias, fuera del desplazamiento [story.js demanda caution].
 o+=`<g data-caution="1">${T(550,665,CAUTELA,12,K.muted)}</g>`;
 if(VB_PREGUNTA)o+=W(IN(3),T(1080,150,TXT_PREGUNTA,14,K.muted,'end'));
 return o;
}

function mobile(){
 let o='';
 o+=`<g data-land-label="1">${T(55,400,'Su terreno',12,K.muted)}</g>`;
 o+=W('data-until="1.2"',`<g opacity=".55">${IC('lock',300,520,22,K.risk)}</g>`);
 o+=`<g data-caution="1">${T(240,676,CAUTELA,12,K.muted)}</g>`;

 // Paso 1.
 o+=`<g data-step="1">`
  +W('data-until="1.2"',LK(P('M190 230 H305',K.plan,1.5,'5 5'))+T(340,280,'Una empresa que encaje',13))
  +W('data-until=".6"',T(160,280,'La alianza prospecta',13,K.plan))
  +W('data-until=".6"',IC('user-search',125,297,16,K.problem)+T(140,302,'¿Qué superficie requiere? ¿Qué renta puede sostener?',12,K.problem,'start'))
  +`</g>`;

 // Paso 2: seis requisitos en 2 filas × 3.
 const px=[140,260,380],py=[390,418],fx=j=>px[j%3],fy=j=>py[Math.floor(j/3)];
 o+=`<g data-step="2">`
  +W(`${IN(1)} data-until="1.2"`,T(250,362,'Carta de intención · aún no es arrendamiento',12,K.plan))
  +W(`${IN(1)} data-until="1.8"`,REQ.map(([n,s],j)=>`<g data-requirement="${s}">${IC(n,fx(j),fy(j),18,K.plan)}${T(fx(j)+14,fy(j)+4,s,12,K.plan,'start')}</g>`).join(''))
  +`</g>`;

 // Paso 3: compuerta con contrato, costo y efectivo.
 o+=`<g data-step="3">`
  +W(`${IN(2)} data-until="2.6"`,`<g opacity=".35">`+REQ.map(([n,s],j)=>IC(n,fx(j),fy(j),18,K.plan)+T(fx(j)+14,fy(j)+4,s,12,K.plan,'start')).join('')+`</g>`)
  +W(`data-gate="1" ${IN(2)} data-until="2.6"`,
    T2(412,470,'Deben ser ','compatibles',14,K.risk)
    +`<text x="300" y="584" font-size="12" fill="${K.ink}" text-anchor="middle"><tspan data-condition="contrato">Contrato</tspan> · <tspan data-condition="costo">costo</tspan> · <tspan data-condition="efectivo">efectivo</tspan></text>`
    +LK(P('M258 490 C210 490 150 470 148 436',K.risk,1.5,'5 5'),HEAD(148,436,0,-1,K.risk))
    +`<circle cx="186" cy="476" r="11" fill="#f8f6ee"/>`+IC('arrow-back-up',186,476,18,K.risk))
  +`</g>`;

 // Paso 4.
 const ax=[140,300],ay=[606,632];
 o+=`<g data-step="4">`
  +W(IN(3),IC('lock-open',300,500,24,K.outcome)+IC('users-group',30,436,16,K.outcome)+T2(46,440,'Ustedes conservan ','las decisiones',12,K.ink,'start',15))
  +W(IN(3),T(140,580,'CONDICIONES APROBADAS',12,K.outcome,'start')
    +APR.map((s,j)=>`<g data-approval="${s.toLowerCase()}">${IC('circle-check',ax[j%2]+8,ay[Math.floor(j/2)],16,K.outcome)}${T(ax[j%2]+22,ay[Math.floor(j/2)]+5,s,13,K.ink,'start')}</g>`).join(''))
  +`</g>`;
 return o;
}

export function demanda(m){return m?mobile():desktop();}
