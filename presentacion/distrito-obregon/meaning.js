// A different diagram grammar for each relationship. Figures are not placeholders.
const K={ink:'#253e3b',muted:'#65756c',problem:'#ad4c46',solution:'#806397',plan:'#866143',risk:'#987419',outcome:'#297e94',action:'#517a43'};
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const T=(x,y,s,size=18,c=K.ink,a='middle')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" text-anchor="${a}">${E(s)}</text>`;
const P=(d,c=K.muted,w=1.5,dash='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;
const G=(n,s)=>`<g data-reveal="${n}">${s}</g>`;
const A=(x,y,X,Y,c=K.plan)=>P(`M${x} ${y} L${X} ${Y}`,c)+P(`M${X-4} ${Y-7} L${X} ${Y} L${X+4} ${Y-7}`,c);
const H=(x,y,w,c)=>P(`M${x-w/2} ${y} q${w/2} 4 ${w} 0`,c,2.5);
const B=(x,y,w,h,c)=>`<rect x="${x-w/2}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c}08" stroke="${c}" stroke-width="1.2"/>`;
export function meaning(index,m){const W=m?480:1100,C=W/2,L=m?122:285,R=m?358:815,S=m?17:23,small=m?14:18;let o='';
 if(index===1){
 o+=T(C,190,'UNA PROPIEDAD · DOS DESTINOS ECONÓMICOS',m?17:22,K.solution)+P(`M${C} 210 V235 H${L} V265 M${C} 235 H${R} V265`,K.solution,2);
 o+=T(L,290,'Naves a la medida',S)+T(L,316,'BTS · arrendamiento',small,K.muted)+H(L,332,m?180:320,K.outcome);
 o+=G(1,A(L,342,L,395,K.outcome)+T(L,420,'Inmuebles + rentas',S,K.outcome)+T(L,446,'Beneficio de la familia',small));
 o+=G(2,T(R,290,'Complementos',S)+T(R,316,'Negocios por desarrollar',small,K.muted)+H(R,332,m?180:320,K.solution)+A(R,342,R,395,K.solution)+T(R,420,'Asociación por producto',m?16:S,K.solution)+T(R,446,'Tierra + desarrollo + capital',m?13:small));
 o+=G(3,P(`M${C} 270 V490`,K.muted,1,'4 7')+B(C,535,m?420:820,85,K.risk)+T(C,566,'Cada negocio necesita su financiamiento.',m?18:25,K.risk)+T(C,595,'Conservar las BTS no equivale a venderlas para pagar el resto.',m?13:19));
 }
 if(index===2){
 o+=T(C,190,'Familia Parada · propietarios',m?25:31)+T(C,218,'Conserva las decisiones y autoriza compromisos',m?15:20,K.outcome)+A(C,235,C,273,K.solution);
 o+=B(C,280,m?330:580,78,K.solution)+T(C,310,'Yo Desarrollo · Puebla / PG · Eduardo Lara',m?16:24,K.solution)+T(C,337,'Un equipo que integra el desarrollo',m?16:21);
 const nodes=[['Usuarios y mercado','Prospectar · negociar'],['Proyecto y permisos','Definir · coordinar'],['Finanzas y capital','Modelar · estructurar'],['Jurídico y ejecución','Acordar · controlar']];
 nodes.forEach((a,j)=>{const x=m?(j%2?R:L):175+j*250,y=m?(j<2?440:570):475;const n=j<2?1:2;o+=G(n,P(`M${C} 360 Q${x} 390 ${x} ${y-24}`,K.solution)+T(x,y,a[0],m?16:21)+T(x,y+27,a[1],m?13:17,K.muted)+H(x,y+40,m?185:210,K.solution));});
 o+=G(3,T(C,650,'La coordinación resuelve interfaces; la familia no pierde el control.',m?13:22,K.outcome));
 }
 if(index===3){
 o+=T(C,190,'LA NAVE DEBE ENCAJAR CON UN USUARIO',m?17:23,K.problem);
 const req=['Operación y carga','Alturas y maniobras','Servicios y plazo'];req.forEach((s,j)=>o+=T(L,250+j*35,s,m?15:21,K.ink));
 o+=G(1,P(`M${m?215:460} 270 H${m?248:590}`,K.plan,2)+T(m?265:640,252,'Define',small,K.plan)+T(R,438,'Una nave a la medida',m?16:22,K.solution));
 o+=G(2,B(C,480,m?420:840,88,K.risk)+T(C,511,'Contrato del usuario + presupuesto + capital',m?17:24,K.risk)+T(C,541,'Las tres condiciones deben sostener la misma operación.',m?13:19));
 o+=G(3,A(C,580,C,615,K.action)+T(C,647,'Invertir en la fase que sí tiene fundamento',m?18:27,K.action));
 }
 if(index===4){
 o+=T(L,190,'RENTA DEL ACTIVO',m?18:24,K.outcome)+T(R,190,'PAGO POR EL TRABAJO',m?16:24,K.plan);
 o+=T(L,250,'Usuario industrial',S)+A(L,270,L,315,K.outcome)+T(L,342,'Contrato de arrendamiento',m?14:21);
 o+=G(1,A(L,360,L,405,K.outcome)+T(L,432,'Ingreso del inmueble',S,K.outcome)+T(L,461,'− obligaciones y operación',m?13:18)+T(L,505,'Beneficio del propietario',m?15:23,K.outcome));
 o+=G(2,T(R,250,'Servicios autorizados',S)+A(R,270,R,315,K.plan)+T(R,342,'Colocación / gerencia',m?15:21)+A(R,360,R,405,K.plan)+T(R,432,'Hito y honorario pactado',m?15:22,K.plan)+T(R,461,'Pago al equipo por su alcance',m?13:18));
 o+=G(3,H(C,560,m?410:880,K.risk)+T(C,600,'Conseguir usuarios no da propiedad automática de las BTS.',m?14:23,K.risk)+T(C,629,'La participación en complementos se pacta por separado.',m?14:20));
 }
 if(index===5){
 o+=T(C,190,'DE LA NECESIDAD AL PRODUCTO',m?19:25,K.solution)+T(L,225,'La actividad necesita…',m?15:21,K.problem)+T(R,225,'Podría resolverse con…',m?14:21,K.solution);
 const rows=[['Servicios cotidianos','Comercio y servicios'],['Visitas de trabajo','Hotel de negocios'],['Reuniones y representación','Oficinas / showrooms'],['Relaciones y encuentros','Industrial Club'],['Operaciones más pequeñas','Bodegas de 250–500 m²']];
 rows.forEach((a,j)=>{const y=280+j*62,n=j<2?1:2;o+=G(n,T(L,y,a[0],m?13:20)+P(`M${m?223:490} ${y-5} H${m?252:610}`,K.solution,2)+P(`M${m?247:604} ${y-10} l6 5 -6 5`,K.solution)+T(R,y,a[1],m?13:20,K.solution)+P(`M${m?28:100} ${y+21} H${W-(m?28:100)}`, '#d6ddcf',1));});
 o+=G(3,B(C,610,m?420:900,58,K.plan)+T(C,645,'Cada producto debe probar demanda, operador y viabilidad.',m?13:22,K.plan));
 }
 if(index===6){
 o+=T(L,190,'A · TIERRA',m?23:30,K.solution)+T(R,190,'B · TIERRA + CAPITAL',m?18:30,K.solution);
 for(const x of[L,R])o+=B(x,220,m?194:380,65,K.ink)+T(x,247,'Suelo delimitado',S)+T(x,272,'Valuación acordada',small,K.muted);
 o+=G(1,T(L,325,'+ trabajo desarrollador',m?14:21,K.plan)+T(R,325,'+ trabajo desarrollador',m?14:21,K.plan));
 o+=G(2,B(R,350,m?194:380,62,K.outcome)+T(R,376,'+ efectivo del propietario',m?13:21,K.outcome)+T(R,398,'Reconocido por separado',m?12:17)+T(L,376,'Capital de otras fuentes',m?14:21)+T(L,401,'Por conseguir y acordar',m?13:17,K.muted));
 o+=G(3,P(`M${L} 440 V470 H${R} V440 M${C} 470 V500`,K.plan,2)+T(C,532,'Modelo + riesgo + aportaciones + trabajo',m?18:27,K.plan)+T(C,572,'Participaciones y obligaciones pactadas',m?19:28,K.action)+T(C,612,'El dibujo compara componentes; no representa porcentajes.',m?13:18,K.muted));
 }
 if(index===7){
 o+=T(C,185,'PROTEGER EL CONJUNTO SIN MEZCLAR LOS RIESGOS',m?15:25,K.risk);
 for(const [x,name]of[[L,'BTS patrimonial'],[R,'Complementos']])o+=B(x,230,m?200:390,245,K.risk)+T(x,266,name,S)+P(`M${x-(m?85:165)} 286 h${m?170:330}`,K.risk)+T(x,322,'Activos identificados',m?14:21)+T(x,355,'Cuentas y obligaciones',m?14:21)+G(1,T(x,402,'Presupuesto propio',m?14:21)+T(x,435,'Reportes por componente',m?13:19));
 o+=G(2,P(`M${L} 490 V520 H${R} V490`,K.risk)+B(C,540,m?420:870,76,K.risk)+T(C,570,'DEUDA · GARANTÍAS · VENTAS · CAMBIOS MAYORES',m?13:22,K.risk)+T(C,598,'Requieren la autorización convenida de los propietarios.',m?13:20));
 o+=G(3,T(C,655,'Asociarse con reglas claras de decisión y rendición de cuentas.',m?14:23,K.outcome));
 }
 if(index===8){
 const rows=[['Aportación definida','Partes · superficie · título · valuación'],['Términos cerrados','Participación · honorarios · facultades'],['Asociación firmada','Convenio y estructura jurídica acordada'],['Fases autorizadas','Usuario · presupuesto · capital · permisos']];
 rows.forEach((a,j)=>{const y=225+j*112,n=j;const x=m?68:170;o+=G(n,`<circle cx="${x}" cy="${y}" r="17" fill="#f8f6ee" stroke="${j===2?K.action:K.plan}" stroke-width="2"/>`+T(x,y+6,String(j+1),18,K.plan)+T(x+37,y+4,a[0],m?22:28,K.ink,'start')+T(x+37,y+34,a[1],m?13:20,K.muted,'start')+(j<3?A(x,y+24,x,y+84,K.plan):''));});
 }
 if(index===9){
 o+=T(C,185,'SU PATRIMONIO + NUESTRO BRAZO DESARROLLADOR',m?15:25,K.solution)+T(L,235,'LA FAMILIA APORTA',m?17:23)+T(R,235,'EL EQUIPO APORTA',m?17:23)+H(L,250,m?190:390,K.solution)+H(R,250,m?190:390,K.solution)+T(L,286,'Tierra; capital si lo elige',m?14:22)+T(R,286,'Usuarios y desarrollo integral',m?13:22)+T(L,321,'Conserva beneficio BTS',m?14:22,K.outcome)+T(R,321,'Participa según cada negocio',m?13:21,K.outcome);
 o+=G(1,B(L,365,m?195:390,70,K.solution)+T(L,395,'A · Tierra',m?21:28,K.solution)+T(L,420,'Estructurar otras fuentes',m?13:19)+B(R,365,m?195:390,70,K.solution)+T(R,395,'B · Tierra + capital',m?18:28,K.solution)+T(R,420,'Reconocer aportación adicional',m?12:19));
 o+=G(2,T(C,488,'PARA FIRMA: CUADRO DE TÉRMINOS ACORDADO',m?14:23,K.plan)+T(C,520,'Partes · superficies · valuación · participación',m?15:22)+T(C,547,'Honorarios · facultades · obligaciones',m?15:22));
 o+=G(3,B(C,580,m?420:870,78,K.action)+T(C,612,'Formalizar la asociación',m?25:34,K.action)+T(C,641,'Elegir modalidad y cerrar el convenio entre las partes.',m?13:20));
 }
 return o;
}
export function reveal(root,progress){for(const e of root.querySelectorAll('[data-reveal]')){const n=Number(e.dataset.reveal),x=Math.max(0,Math.min(1,progress-n+1)),t=x*x*(3-2*x);e.setAttribute('opacity',t);e.setAttribute('transform',`translate(0 ${(1-t)*12})`);}}
