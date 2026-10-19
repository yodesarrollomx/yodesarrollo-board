// Hairline geometry kernel, unchanged. Labels and the narrative palette belong
// to the presentation, not to the solids. Scroll is the chosen gesture.
import {HL} from './vendor/hairline-kernel.mjs?v=YOD-SB05';
const {Cam,proj,facing,rings,prism,poly,hull,ringAt,open,run,rrect}=HL;
const C=Cam(45,.5,1),P=proj(C),front=facing(C);
const path=(d,cls='sil')=>`<path class="${cls}" d="${d}"/>`;
function block(x,y,w,d,z,h){const [r,i]=rings(x,y,x+w,y+d,3,.8);const p=prism(P,front,r,i,z,z+h);return path(p.sil)+path(p.crease,'crease')}
function roof(x,y,w,d,z,h){const foot=rrect(x,y,x+w,y+d,2,4),top=rrect(x+3,y+3,x+w-3,y+d-3,2,4),inner=rrect(x+4,y+4,x+w-4,y+d-4,1,4);return path(poly(hull(ringAt(P,foot,z).concat(ringAt(P,top,z+h)))))+path(open(ringAt(P,run(inner,front),z+h)),'crease')}
function line(points,cls='crease'){return path(open(points.map(p=>P(...p))),cls)}
export function figure(kind,amount=1){
 const a=Math.max(.02,Math.min(1,amount));let s='';
 if(kind==='nave'||kind==='pocket'){
  const w=kind==='nave'?108:70,d=kind==='nave'?66:46,h=32*a;
  s=block(-w/2,-d/2,w,d,-5,5)+block(-w/2+3,-d/2+3,w-6,d-6,0,h)+roof(-w/2+1,-d/2+1,w-2,d-2,h,5*a);
  for(let i=0;i<3;i++){const x=-w/2+12+i*(w-24)/3;s+=line([[x,d/2-3,0],[x,d/2-3,19*a],[x+14,d/2-3,19*a],[x+14,d/2-3,0]],'detail')+block(x,d/2,14,10,-4,4)}
  if(kind==='nave')s+=block(-20,d/2+14,14,24,-4,7)+block(-20,d/2+30,14,8,3,9);
 }
 if(kind==='hotel'||kind==='office'){
  const levels=kind==='hotel'?4:2;
  s=block(-30,-24,60,48,-4,4);
  for(let i=0;i<levels;i++)s+=block(-24,-19,48,38,i*16*a,14*a);
  s+=roof(-26,-21,52,42,levels*16*a,3)+block(-7,19,14,7,0,12*a);
 }
 if(kind==='plaza'){
  s=block(-56,-24,112,58,-4,4);
  for(let i=0;i<3;i++){s+=block(-51+i*34,-20,30,34,0,22*a)+roof(-53+i*34,-22,34,44,22*a,2);s+=line([[-46+i*34,14,0],[-46+i*34,14,16*a],[-30+i*34,14,16*a],[-30+i*34,14,0]],'detail')}
 }
 if(kind==='club')s=block(-48,-36,96,72,-4,4)+block(-42,-30,84,19,0,18*a)+block(-42,-10,20,40,0,18*a)+block(22,-10,20,40,0,18*a)+block(-13,-2,26,26,0,1)+roof(-44,-32,88,23,18*a,3);
 if(kind==='land'){
  // Outline digitized from the supplied conceptual presentation, NOT surveyed.
  const pts=[[-32,-95],[32,-48],[32,105],[-24,105],[-24,47],[-28,47],[-28,-32],[-32,-32]];
  s=path(poly(pts.map(([x,y])=>P(x,y,-4))))+path(poly(pts.map(([x,y])=>P(x,y,0))),'sil');
 }
 if(kind==='document'){
  s=block(-31,-42,62,84,0,3);for(let i=0;i<4;i++)s+=line([[-20,-25+i*13,3],[20,-25+i*13,3]],'crease');s+=line([[-20,29,3],[-10,24,3],[0,28,3],[17,20,3]],'detail');
 }
 if(kind==='capital'){
  for(let i=0;i<3;i++){const r=HL.circ(25,40),inner=HL.circ(23,40),p=prism(P,front,r,inner,i*7,i*7+5);s+=path(p.sil)+path(p.crease,'crease')}
 }
 if(kind==='coordination'){
  s=block(-55,-42,110,84,-6,4)+block(-22,-20,44,40,5,18);
  [[-44,-25],[26,-25],[-44,18],[26,18]].forEach(([x,y])=>s+=block(x,y,18,16,0,8));
 }
 if(kind==='gate')s=block(-52,-8,12,16,0,56)+block(40,-8,12,16,0,56)+block(-52,-8,104,16,56,10);
 return s;
}
