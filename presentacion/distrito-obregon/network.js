// Escena «Quién lo articula»: red de integrantes.
// Árbol ortogonal: propietarios → núcleo de la alianza → bus → especialistas en dos grupos.
// Línea continua = integrante de la alianza; línea punteada = especialista por seleccionar o confirmar.
// Revelado: G(0) familia y núcleo · G(1) grupo de mercado y finanzas con leyenda · G(2) proyecto, permisos, obra y operación · G(3) cierre.
import {K,E,T,P,G,B} from './diagram-kit.js?v=YOD-SB11';
import {icon} from './icons.js?v=YOD-SB11';

// El aporte de cada miembro se publica solo cuando se aprueben las frases; mientras tanto, solo nombres.
const SHOW_MEMBER_ROLES=false;

// Nombres y orden: [story.js participacion m1]. Frases de aporte: pendientes de aprobación.
const MEMBERS=[
 {id:'yod',icon:'chart-arrows',name:'Yo Desarrollo',role:['Modelo financiero, estructura','y seguimiento'],roleM:'Modelo y seguimiento'},
 {id:'pg',icon:'ruler-2',name:'Puebla Arquitectos / PG',role:['Plan maestro, arquitectura','y desarrollo'],roleM:'Plan y arquitectura'},
 {id:'lara',icon:'heart-handshake',name:'Eduardo Lara',role:['Origen del proyecto','y relación con propietarios'],roleM:'Origen y relación'}
];

// Grupo 1 [story.js participacion m2]; grupo 2 [story.js participacion m3].
// lines: nombre en renglones (desktop); name: nombre en un renglón (móvil).
const LEFT=[
 {id:'usuarios',icon:'user-search',lines:['Usuarios','industriales'],name:'Usuarios industriales',status:'por-prospectar',label:'por prospectar'},
 {id:'comercializacion',icon:'building-store',lines:['Comercialización'],name:'Comercialización',status:'por-confirmar',label:'por confirmar'},
 {id:'financieros',icon:'building-bank',lines:['Especialistas','financieros'],name:'Especialistas financieros',status:'por-seleccionar',label:'por seleccionar'}
];
const RIGHT=[
 {id:'arquitectura',icon:'building',lines:['Arquitectura','e ingenierías'],name:'Arquitectura e ingenierías',status:'por-seleccionar',label:'por definir alcance'},
 {id:'legal-fiscal',icon:'scale',lines:['Legal','y fiscal'],name:'Legal y fiscal',status:'por-seleccionar',label:'por seleccionar'},
 {id:'permisos',icon:'license',lines:['Gestión','de permisos'],name:'Gestión de permisos',status:'por-seleccionar',label:'por seleccionar'},
 {id:'ejecucion',icon:'crane',lines:['Ejecución','de obra'],name:'Ejecución de obra',status:'por-seleccionar',label:'por seleccionar'},
 {id:'operadores',icon:'tools',lines:['Operadores'],name:'Operadores',status:'por-seleccionar',label:'por seleccionar'}
];

const DASH='5 5';
const node=(id,status,s)=>`<g data-node="${E(id)}" data-status="${E(status)}">${s}</g>`;
// Todo trazo de conexión lleva data-link; todo ícono va envuelto con data-icon.
const link=(d,c,w,dash)=>P(d,c,w,dash).replace('<path ','<path data-link ');
const ico=(name,x,y,size,c)=>`<g data-icon="${name}">${icon(name,x,y,size,c)}</g>`;
// Trazo discontinuo de la leyenda, dibujado como segmentos sueltos (sin stroke-dasharray: no cuenta como conector).
const sample=(x,y,w,c,dashed)=>{let d='';if(dashed){for(let i=0;i<w;i+=10)d+=`M${x+i} ${y}h${Math.min(5,w-i)}`}else d=`M${x} ${y}h${w}`;return link(d,c,1.5)};

function desktop(){
 const {solution,plan,outcome,muted}=K;
 let o='';
 // Propietarios [story.js participacion m1: «Los propietarios conservan las decisiones que se pacten»].
 const owners=ico('users-group',550,122,28,outcome)+T(550,164,'Familia Parada · propietarios',26)+T(550,189,'Deciden y autorizan los compromisos',17,outcome);
 const thread=link('M550 198V228',outcome,1.5)+T(566,217,'decisiones reservadas',13,muted,'start');
 // Núcleo de la alianza [story.js participacion m1: «articula el trabajo»; patrimonio m3: «asociación desarrolladora»].
 const mx=[360,550,740];
 const core=B(550,228,600,124,solution)+T(266,246,'ALIANZA DESARROLLADORA · COORDINA',12,solution,'start')
  +MEMBERS.map((a,j)=>{
   const x=mx[j],iy=SHOW_MEMBER_ROLES?262:278,ny=SHOW_MEMBER_ROLES?300:318;
   return node(a.id,'alianza',ico(a.icon,x,iy,28,solution)+T(x,ny,a.name,18)+(SHOW_MEMBER_ROLES?a.role.map((r,k)=>T(x,320+k*16,r,14,muted)).join(''):''));
  }).join('');
 o+=G(0,owners+thread+core);
 // Bus continuo: del núcleo baja a y=392 y se reparte hacia ambos grupos; cada especialista cuelga con un tramo punteado.
 const spec=(a,x,c)=>node(a.id,a.status,link(`M${x} 392V440`,c,1.5,DASH)+ico(a.icon,x,462,28,c)+a.lines.map((t,k)=>T(x,500+k*21,t,16)).join('')+T(x,540,a.label,13,muted));
 const lx=[120,240,360],rx=[520,640,760,880,1000];
 o+=G(1,link('M550 352V392H120',solution,1.5)+T(240,382,'MERCADO Y FINANZAS',12,solution)
  +LEFT.map((a,j)=>spec(a,lx[j],solution)).join('')
  +sample(894,196,22,solution,false)+T(920,200,'alianza',13,muted,'start')
  +sample(894,216,22,solution,true)+T(920,220,'por seleccionar o confirmar',13,muted,'start'));
 o+=G(2,link('M550 392H1000',solution,1.5)+T(760,382,'PROYECTO, PERMISOS, OBRA Y OPERACIÓN',12,plan)
  +RIGHT.map((a,j)=>spec(a,rx[j],plan)).join(''));
 // Cierre [story.js participacion m4: «No les proponemos que ustedes administren una lista de proveedores inconexos»; m3: «con alcances, presupuestos y responsabilidades definidos»].
 // El hilo con la familia se engrosa: es el único que llega a ella.
 o+=G(3,link('M550 198V228',outcome,3)+B(550,590,900,70,outcome)
  +T(550,620,'Ustedes tratan con una sola coordinación.',22,outcome)
  +T(550,646,'Cada especialista entra con alcance, presupuesto y responsabilidad definidos.',16));
 return o;
}

function mobile(){
 const {solution,plan,outcome,muted}=K;
 let o='';const d=12; // el núcleo y todo lo de abajo bajan 12 para dejar aire bajo el trazo del encabezado y al hilo con la familia
 const owners=ico('users-group',72,169,22,outcome)+T(240,176,'Familia Parada · propietarios',20)+T(240,197,'Deciden y autorizan los compromisos',14,outcome);
 const mx=[90,240,390];
 const core=B(240,200+d,440,100,solution)+T(36,218+d,'ALIANZA DESARROLLADORA · COORDINA',12,solution,'start')
  +MEMBERS.map((a,j)=>{
   const x=mx[j],iy=(SHOW_MEMBER_ROLES?244:246)+d,ny=(SHOW_MEMBER_ROLES?274:278)+d;
   return node(a.id,'alianza',ico(a.icon,x,iy,22,solution)+T(x,ny,a.name,14)+(SHOW_MEMBER_ROLES?T(x,291+d,a.roleM,12,muted):''));
  }).join('');
 o+=G(0,owners+link('M240 203V'+(200+d),outcome,1.5)+core);
 // Bus vertical bajo el núcleo; cada fila cuelga con un tramo punteado.
 const row=(a,y,c)=>node(a.id,a.status,link(`M30 ${y-5}H44`,c,1.5,DASH)+ico(a.icon,58,y-5,22,c)
  +`<text x="80" y="${y}" font-size="15" fill="${K.ink}" text-anchor="start">${E(a.name)}<tspan font-size="12" fill="${muted}"> · ${E(a.label)}</tspan></text>`);
 o+=G(1,link(`M30 ${300+d}V${415+d}`,solution,1.5)+T(44,325+d,'MERCADO Y FINANZAS',12,solution,'start')
  +LEFT.map((a,j)=>row(a,350+d+j*30,solution)).join(''));
 o+=G(2,link(`M30 ${415+d}V${585+d}`,solution,1.5)+T(44,445+d,'PROYECTO, PERMISOS, OBRA Y OPERACIÓN',12,plan,'start')
  +RIGHT.map((a,j)=>row(a,470+d+j*30,plan)).join(''));
 o+=G(3,link('M240 203V'+(200+d),outcome,3)+B(240,612+d,440,40,outcome)+T(240,638+d,'Ustedes tratan con una sola coordinación.',16,outcome));
 return o;
}

export function participacion(m){return m?mobile():desktop()}
