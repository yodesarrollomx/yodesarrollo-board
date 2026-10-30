// A different diagram grammar for each relationship. Figures are not placeholders.
import {K,T,P,G,A,H,B} from './diagram-kit.js?v=YOD-SB11';
import {participacion} from './network.js?v=YOD-SB11';
import {retribucion} from './flows.js?v=YOD-SB11';
import {complementos} from './districts.js?v=YOD-SB11';
import {capital} from './capital.js?v=YOD-SB11';
import {demanda} from './demand.js?v=YOD-SB11';
export function meaning(index,m){const W=m?480:1100,C=W/2,L=m?122:285,R=m?358:815,S=m?17:23,small=m?14:18;let o='';
 if(index===1){
 // Patrimonio SB07: BTS y complementos. Las figuras Hairline (nave, plaza, office, hotel, club, pocket) las coloca drawings.js; aquí solo texto y guías.
 // Textos tomados de las escenas patrimonio, demanda, retribución y complementos (story.js); la tercera línea de cada fila viene de assets/concepto-fuente.webp y solo se muestra en desktop.
 // Franja reservada: drawings.js pinta la etiqueta del paso en y=H-42 (tope ≈ H-63 en desktop, H-58 en móvil) y «GUION VISUAL» en H-12; todo este bloque termina ≥ 6 px arriba (desktop y ≤ 661, móvil y ≤ 676).
 const sub='#6b7972',BT=K.outcome,CO=K.solution;
 o+=T(m?262:585,m?196:172,'Una propiedad · 24.7584 ha',m?15:18,sub,'start');
 if(!m){
 // Eje del panel BTS: x=392 (encabezado, definición, patios y cadena comparten eje, a la derecha de la nave en x=160). La conclusión G1 abarca todo el panel (eje 285).
 // Filas de complementos: nombre y0 (19), necesidad y0+19.5 (15), tercera línea y0+36 (13); y0 = 285 + 58.5·fila. Figuras (origen, x=612): 298, 359, 423, 473, 536.
 const cx=392,rows=[['Plaza y servicios','Servicios cotidianos de la zona','Restaurantes · bancos · cafetería · farmacia · conveniencia'],['Oficinas flex y showrooms','Proveedores y empresas','Showrooms industriales · oficinas · salas de juntas'],['Hotel de negocios','Visitas de trabajo','Para viajeros de negocios y visitantes'],['Industrial Club','Relaciones y encuentros','Restaurante · gimnasio · alberca · pádel/tenis · spa · salas de juntas'],['Bodegas pocket de 250 a 500 m²','Operaciones más pequeñas','Módulos flexibles y funcionales']];
 o+=P(`M550 198 V206 H${cx} V214 M550 206 H815 V214`,CO,2);
 o+=G(0,T(cx,240,'NAVES A LA MEDIDA · BTS',22,BT)+T(cx,262,'Built-To-Suit: se proyecta para las',16)+T(cx,282,'necesidades de una empresa.',16)+T(cx,299,'Patios de maniobra · andenes ·',13,sub)+T(cx,316,'infraestructura para gran escala',13,sub)
  +T(cx,346,'Una empresa necesita una nave',19)+T(cx,366,'superficie, altura, andenes, energía y plazo',15,sub)
  +A(cx,375,cx,391,BT)+T(cx,416,'Se proyecta a su medida',19)
  +A(cx,426,cx,442,BT)+T(cx,468,'Contrato de arrendamiento',19)
  +A(cx,478,cx,494,BT)+T(cx,520,'Rentas a largo plazo',19,BT));
 o+=G(1,H(L,544,440,BT)+T(L,571,'Los propietarios conservan el inmueble y sus rentas.',19,BT)+T(L,595,'Conseguir un usuario no convierte al equipo en dueño.',15,sub));
 o+=G(2,T(R,240,'COMPLEMENTOS',22,CO)+T(R,262,'Negocios que atienden necesidades del entorno industrial.',16)
  +rows.map((a,j)=>{const y=285+j*58.5;return T(650,y,a[0],19,K.ink,'start')+T(650,y+19.5,a[1],15,sub,'start')+T(650,y+36,a[2],13,sub,'start')}).join('')
  +T(R,579,'Asociación desarrolladora con reglas por producto',18,CO)+T(R,598,'Cada uno debe probar demanda, operador y viabilidad.',15));
 o+=G(3,P('M550 226 V603',K.muted,1,'4 7')+B(C,609,1000,52,K.risk)+T(C,633,'Cada negocio necesita su propia cuenta.',20,K.risk)+T(C,653,'No se venden las naves para pagar lo demás: cada componente justifica su demanda, capital, obligaciones y resultado.',15));
 }else{
 // Móvil: todo ≥15 (≥12 px en 390 de ancho); se omiten las necesidades grises. Filas cada 28 (y = 474…586); figuras (origen, x=40) 5 px sobre cada fila: 469, 497, 525, 553, 581.
 const rows=['Plaza y servicios','Oficinas flex y showrooms','Hotel de negocios','Industrial Club','Bodegas pocket de 250 a 500 m²'];
 o+=P('M240 212 V217',CO,2);
 o+=G(0,T(C,236,'NAVES A LA MEDIDA · BTS',16,BT)+T(C,255,'Built-To-Suit: se proyecta para las necesidades de una empresa.',15)
  +T(160,280,'Una empresa necesita una nave',15,K.ink,'start')+A(166,288,166,296,BT)+T(160,314,'Se proyecta a su medida',15,K.ink,'start')+A(166,322,166,330,BT)+T(160,348,'Contrato de arrendamiento',15,K.ink,'start')+A(166,356,166,364,BT)+T(160,382,'Rentas a largo plazo',15,BT,'start'));
 o+=G(1,H(C,397,360,BT)+T(C,421,'Los propietarios conservan el inmueble y sus rentas.',15,BT));
 o+=G(2,T(C,450,'COMPLEMENTOS',16,CO)+rows.map((a,j)=>T(70,474+j*28,a,15,K.ink,'start')).join('')
  +T(C,607,'Asociación desarrolladora con reglas por producto',15,CO)+T(C,626,'Cada uno debe probar demanda, operador y viabilidad.',15));
 o+=G(3,B(C,642,440,34,K.risk)+T(C,664,'Cada negocio necesita su propia cuenta.',16,K.risk));
 }
 }
 if(index===2)o+=participacion(m);
 if(index===3)o+=demanda(m);
 if(index===4)o+=retribucion(m);
 if(index===5)o+=complementos(m);
 if(index===6)o+=capital(m);
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
// reveal(root, progress): aparición y salida por paso.
// - data-reveal="n": aparece (opacidad suavizada y desplazamiento vertical de 12 px) cuando el progreso llega a n.
// - data-span="s" (junto a data-reveal): ancho de la entrada; opacidad = smoothstep((progress − n + s) / s), es decir, aparece entre n − s y n. Sin data-span equivale a s = 1.
// - data-until="n": se desvanece al avanzar; opacidad = 1 − smoothstep((progress − n) / 0.2), es decir, visible hasta el progreso n y oculto del todo en n + 0.2.
// - Si el elemento lleva ambos atributos, la opacidad es el producto de las dos; el desplazamiento solo depende de data-reveal.
export function reveal(root,progress){const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};for(const e of root.querySelectorAll('[data-reveal],[data-until]')){let t=1;if(e.dataset.reveal!==undefined){const n=Number(e.dataset.reveal),sp=e.dataset.span!==undefined?Number(e.dataset.span):1;t=smooth((progress-n+sp)/sp);e.setAttribute('transform',`translate(0 ${(1-t)*12})`);}if(e.dataset.until!==undefined)t*=1-smooth((progress-Number(e.dataset.until))/0.2);e.setAttribute('opacity',t);}}
