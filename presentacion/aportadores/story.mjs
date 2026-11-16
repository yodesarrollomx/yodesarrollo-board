// Public stage directions and captions. Private presenter notes stay in the registry.
export const VERSION='YOD-APORTADORES-1';
export const ID='PRS-YOD-APORTADORES';
export const palette={context:'#35443e',problem:'#a34d45',solution:'#82678f',plan:'#987552',result:'#387b94'};
const moment=(label,role,focus,portrait=focus)=>({label,role,focus,portrait});
export const scenes=[
 {id:'tradicional',label:'El modelo tradicional',moments:[
  moment('Una nueva forma de desarrollar juntos.','context',[210,150,1200,680],[160,170,1120,600]),
  moment('El desarrollo tradicional funciona así.','problem',[225,165,760,570],[255,165,350,490]),
  moment('El proyecto necesita tierra.','problem',[260,165,760,610],[590,335,370,440]),
  moment('Y necesita a quienes lo hacen posible.','problem',[35,165,950,700],[40,480,490,370]),
  moment('Muchos aportan. El negocio se concentra.','problem',[40,150,1500,690],[950,160,580,360])]},
 {id:'aportadores',label:'Los aportadores',moments:[
  moment('Cambiemos la forma de organizarnos.','solution',[240,130,460,360],[285,130,320,340]),
  moment('Cada aportación tiene valor.','solution',[35,175,660,650],[50,190,620,650]),
  moment('Coordinación y capital también aportan.','solution',[665,190,460,610],[680,190,450,620]),
  moment('Conectemos esas aportaciones.','solution',[40,140,1500,690],[30,140,1050,710]),
  moment('Participar también del resultado.','result',[40,140,1500,700],[1060,175,490,460])]},
 {id:'excedente',label:'El excedente',moments:[
  moment('Veamos el excedente del proyecto.','context',[190,120,1290,675],[435,155,565,630]),
  moment('Aquí está el excedente.','result',[400,120,650,590],[420,105,430,450]),
  moment('Compartirlo entre los aportadores.','solution',[190,120,1290,675],[465,180,540,550]),
  moment('Según aportaciones y acuerdos.','plan',[190,120,1290,675],[200,125,1260,660])]},
 {id:'sistema',label:'Sistema YoDesarrollo',moments:[
  moment('El reparto necesita un sistema.','solution',[140,155,650,500],[140,145,440,515]),
  moment('Organizar aportaciones y responsabilidades.','solution',[140,150,1400,590],[820,160,720,210]),
  moment('Una alianza para desarrollar juntos.','solution',[140,150,1400,590],[795,340,710,390])]},
 {id:'etapas',label:'Control y transparencia',moments:[
  moment('Un recorrido de siete etapas.','plan',[60,125,1470,620],[50,125,1490,200]),
  moment('Ver la calidad y el avance.','plan',[55,160,900,650],[55,250,410,540]),
  moment('Controlar lo que se compra.','plan',[430,165,1050,620],[465,350,430,440]),
  moment('Compartir la misma información.','solution',[450,165,1090,650],[965,330,570,470]),
  moment('Saber dónde está el proyecto.','result',[50,125,1500,695],[50,125,1500,695])]},
 {id:'semilla',label:'Plan de Potencial',moments:[
  moment('Todo comienza con una posibilidad.','context',[40,545,700,330],[40,545,370,335]),
  moment('Primero, entender el potencial.','plan',[50,420,690,450],[390,405,310,390]),
  moment('Después, desarrollar por etapas.','plan',[435,105,690,725],[820,100,340,690]),
  moment('El proyecto necesita recursos.','plan',[80,105,1440,765],[1200,130,325,670])]},
 {id:'frutos',label:'El árbol y sus frutos',moments:[
  moment('La posibilidad va tomando forma.','result',[60,80,1475,830],[1000,75,475,550]),
  moment('Departamentos.','result',[970,555,580,345],[980,595,215,220]),
  moment('Locales.','result',[970,555,580,345],[1140,590,225,230]),
  moment('Lotes.','result',[970,555,580,345],[1320,590,225,230]),
  moment('Bodegas.','result',[970,555,580,350],[1120,710,230,220]),
  moment('Casas.','result',[970,555,580,350],[1320,710,225,220]),
  moment('Participar de lo que ayudaste a crear.','result',[45,75,1505,835],[55,80,1490,840])]}
];
export const frames=scenes.flatMap((s,scene)=>s.moments.map((m,moment)=>({...m,scene,moment,sceneId:s.id,sceneLabel:s.label})));
export const MAX=frames.length-1;
export const starts=scenes.map((_,i)=>scenes.slice(0,i).reduce((n,s)=>n+s.moments.length,0));
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export function at(position){return frames[Math.min(MAX,Math.max(0,Math.round(position)))];}
export function fit(box,width,height,pad=.08){let [x,y,w,h]=box;w*=1+pad*2;h*=1+pad*2;x-=box[2]*pad;y-=box[3]*pad;const ratio=width/height;if(w/h>ratio){const hh=w/ratio;y-=(hh-h)/2;h=hh}else{const ww=h*ratio;x-=(ww-w)/2;w=ww}return [x,y,w,h];}
export function camera(position,width,height){const n=Math.min(MAX,Math.floor(position)),f=ease(position-n),vertical=width/height<.95,key=vertical?'portrait':'focus';const a=fit(frames[n][key],width,height),b=fit(frames[Math.min(MAX,n+1)][key],width,height);return a.map((v,i)=>v+(b[i]-v)*f);}
