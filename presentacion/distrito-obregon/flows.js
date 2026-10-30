// Escena «Cómo se retribuye»: tabla de flujos (origen, cuándo se genera, concepto, quién lo recibe).
// Cada fila lleva data-flow; los grupos G0–G3 revelan una por paso. Sin cifras ni montos.
import {K,E,T,P,G} from './diagram-kit.js?v=YOD-SB10';
import {icon} from './icons.js?v=YOD-SB10';

const RULE='#d6ddcf';
// Íconos y líneas llevan marca propia (data-icon, data-link) para poder revisarlos.
const IC=(n,x,y,sz,c)=>`<g data-icon="${n}">${icon(n,x,y,sz,c)}</g>`;
const LK=(...p)=>`<g data-link="1">${p.join('')}</g>`;
// Flecha corta horizontal.
const HA=(x,y,w,c)=>LK(P(`M${x} ${y} H${x+w}`,c,1.5),P(`M${x+w-6} ${y-4} L${x+w} ${y} L${x+w-6} ${y+4}`,c,1.5));
// Texto de dos tramos en un solo elemento (para cautela en móvil).
const T2=(x,y,a,b,size,c)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" text-anchor="middle"><tspan x="${x}" dy="0">${E(a)}</tspan><tspan x="${x}" dy="${Math.round(size*1.35)}">${E(b)}</tspan></text>`;
const CAUTION=['Sin porcentajes ni tarifas acordados · ','relaciones económicas, no prelación de pagos.'];

// Filas: id, grupo de revelado, color, origen (ícono + 1–2 líneas), cuándo, concepto, receptor.
const ROWS=[
 {id:'renta',g:0,c:K.outcome,y:250,ic:'building-warehouse',o:['Usuario industrial'],w:['Firma su arrendamiento'],k:['Renta del inmueble','menos obligaciones y financiamiento'],r:['Propietarios','beneficio patrimonial'],
  m:['Usuario industrial → Propietarios','Renta, menos obligaciones y financiamiento']},
 {id:'colocacion',g:1,c:K.plan,y:336,ic:'user-check',o:['Usuario contratado'],w:['Se firma el contrato'],k:['Honorario de colocación','base, momento y monto por escrito'],r:['Equipo que lo originó'],
  m:['Usuario contratado → Equipo que lo originó','Honorario de colocación, pactado por escrito']},
 {id:'gerencia',g:2,c:K.plan,y:430,ic:'clipboard-check',o:['Ustedes lo solicitan'],w:['Alcance y presupuesto propios'],k:['Honorario de gerencia','o estructuración, por hito'],r:['Alianza, si se contrata'],
  m:['Ustedes lo solicitan → Alianza, si se contrata','Honorario de gerencia o estructuración, por hito']},
 {id:'especialistas',g:2,c:K.plan,y:505,ic:'tools',o:['Cada especialista'],w:['Contrato con alcance'],k:['Su presupuesto','dentro del proyecto'],r:['El especialista'],
  m:['Cada especialista → El especialista','Su presupuesto, dentro del proyecto']},
 {id:'complementos',g:3,c:K.solution,y:591,ic:'building-community',o:['Complemento','por producto o fase'],w:['Acuerdo de asociación','de ese producto'],k:['Honorarios de desarrollo','+ participación en resultados'],r:['Integrantes de','esa asociación'],
  m:['Complemento → Integrantes de esa asociación','Honorarios de desarrollo + participación en resultados']}
];

function desktop(){
 const X=[108,306,602,882],AX=[276,572,852];let o='';
 // Encabezados siempre visibles.
 [[70,'ORIGEN'],[X[1],'SE GENERA CUANDO'],[X[2],'CONCEPTO'],[X[3],'LO RECIBE']].forEach(([x,s])=>o+=T(x,200,s,12,K.muted,'start'));
 o+=LK(P('M44 212 H1056',RULE,1));
 const cell=(x,y,l)=>T(x,y,l[0],17,K.ink,'start')+(l[1]?T(x,y+22,l[1],14,K.muted,'start'):'');
 for(const r of ROWS){
  const y=r.y,bh=r.id==='colocacion'?76:50;
  let s=`<rect x="44" y="${y-22}" width="4" height="${bh}" rx="2" fill="${r.c}"/>`;
  s+=IC(r.ic,84,y-1,28,r.c)+cell(X[0],y,r.o);
  s+=cell(X[1],y,r.w)+cell(X[2],y,r.k)+cell(X[3],y,r.r);
  AX.forEach(x=>s+=HA(x,y-5,22,r.c));
  if(r.id==='colocacion')s+=T(X[1],y+46,'Una presentación o contacto no genera propiedad del inmueble.',13,K.muted,'start');
  o+=G(r.g,`<g data-flow="${r.id}">${s}</g>`);
 }
 // Muro: separa la participación en complementos de las rentas de las naves.
 o+=G(3,`<g data-wall="1">${IC('wall',40,548,26,K.risk)}${LK(P('M60 548 H1050',K.risk,2))}${T(60,563,'No se traslada a las rentas de las naves.',14,K.risk,'start')}</g>`);
 o+=T(550,650,CAUTION.join(''),13,K.muted);
 return o;
}

function mobile(){
 const Y0=178,PITCH=84;let o='';
 ROWS.forEach((r,i)=>{
  const top=i===4?542:Y0+i*PITCH;
  const s=`<rect x="20" y="${top}" width="4" height="62" rx="2" fill="${r.c}"/>`+T(36,top+24,r.m[0],15,K.ink,'start')+T(36,top+48,r.m[1],13,K.muted,'start');
  o+=G(r.g,`<g data-flow="${r.id}">${s}</g>`);
 });
 o+=G(3,`<g data-wall="1">${IC('wall',34,521,22,K.risk)}${LK(P('M52 512 H460',K.risk,2))}${T(52,530,'No toca las rentas de las naves.',13,K.risk,'start')}</g>`);
 o+=T2(240,636,CAUTION[0],CAUTION[1],12,K.muted);
 return o;
}

export function retribucion(m){return m?mobile():desktop();}
