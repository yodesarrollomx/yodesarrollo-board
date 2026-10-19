// Original Hairline kernel; narrative labels and colors are outside the solids.
import {HL} from './vendor/hairline-kernel.mjs?v=YOD-AB01';
const {Cam,proj,facing,rings,prism,poly,hull,ringAt,open,run,rrect,circ}=HL;
const C=Cam(45,.5,1),P=proj(C),front=facing(C);
const path=(d,cls='sil')=>`<path class="${cls}" d="${d}"/>`;
const line=(points,cls='crease')=>path(open(points.map(p=>P(...p))),cls);
function block(x,y,w,d,z,h,r=3){const [outer,inner]=rings(x,y,x+w,y+d,r,.8),p=prism(P,front,outer,inner,z,z+h);return path(p.sil)+path(p.crease,'crease')}
function roof(x,y,w,d,z,h){const foot=rrect(x,y,x+w,y+d,2,4),top=rrect(x+3,y+3,x+w-3,y+d-3,2,4);return path(poly(hull(ringAt(P,foot,z).concat(ringAt(P,top,z+h)))))+path(open(ringAt(P,run(top,front),z+h)),'crease')}
function disc(x,y,z,r,h){const outer=circ(r,40).map(p=>({...p,u:p.u+x,v:p.v+y})),inner=circ(r-.8,40).map(p=>({...p,u:p.u+x,v:p.v+y})),p=prism(P,front,outer,inner,z,z+h);return path(p.sil)+path(p.crease,'crease')}
function person(x=0,y=0){return block(x-10,y-8,20,16,0,23,6)+disc(x,y,28,8,10)}
function building(cold=false){let s=block(-54,-33,108,66,-5,5)+block(-51,-30,102,60,0,35)+roof(-54,-33,108,66,35,5);for(let i=0;i<3;i++){const x=-40+i*30;s+=line([[x,30,0],[x,30,24],[x+19,30,24],[x+19,30,0]],'detail')+block(x,33,19,9,-3,3)}if(cold){s+=block(-37,-20,24,20,41,9)+block(9,-20,24,20,41,9);for(let x of [-25,21])s+=line([[x-6,-10,51],[x+6,-10,51]],'detail')+line([[x,-16,51],[x,-4,51]],'detail')}else{for(let x of [-32,0,32])s+=line([[x,-26,41],[x,24,41]],'crease')}return s}
function truck(short=false){const l=short?52:88;let s=block(-22,-l/2,44,l,1,5)+block(-20,-l/2+3,40,l-24,7,27,5)+block(-20,l/2-22,40,22,7,22,5);s+=line([[-15,l/2,17],[15,l/2,17],[15,l/2,26],[-15,l/2,26],[-15,l/2,17]],'detail');for(let y of [-l/2+14,l/2-12])for(let x of [-23,23]){const q=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;q.push([x,y+7*Math.cos(a),6+7*Math.sin(a)])}s+=path(poly(q.map(p=>P(...p))))}return s}
function document(kind){let s=block(-30,-40,60,80,0,3,2);if(kind==='calendar'){s+=line([[-25,-20,3],[25,-20,3]],'detail');for(let y of [-7,7,21])for(let x of [-18,-2,14])s+=block(x,y,7,5,3,.8,1);for(let x of [-15,15])s+=line([[x,-47,0],[x,-33,4]],'detail')}else{for(let i=0;i<4;i++){s+=line([[-19,-25+i*13,3],[20,-25+i*13,3]],'crease');if(kind==='report')s+=line([[-23,-24+i*13,3],[-20,-21+i*13,3],[-16,-29+i*13,3]],'detail')}if(kind==='document')s+=line([[-18,28,3],[-8,23,3],[0,27,3],[16,20,3]],'detail')}return s}
export function figure(kind){
 if(kind==='warehouse')return building();if(kind==='cold')return building(true);if(kind==='truck')return truck();if(kind==='van')return truck(true);
 if(kind==='land')return block(-105,-68,210,136,-5,5,5)+line([[-90,-54,1],[90,-54,1],[90,54,1],[-90,54,1],[-90,-54,1]],'crease');
 if(kind==='stalls'){let s=block(-58,-25,116,65,-4,4);for(let i=0;i<3;i++){const x=-54+i*37;s+=block(x,-20,32,33,0,24)+roof(x-2,-22,36,47,24,2);s+=line([[x+5,13,0],[x+5,13,17],[x+26,13,17],[x+26,13,0]],'detail')+block(x+2,20,28,10,0,9)}return s}
 if(['document','report','calendar'].includes(kind))return document(kind);
 if(kind==='capital'){let s='';for(let i=0;i<4;i++)s+=disc(0,0,i*7,25,5);return s}
 if(kind==='person')return person();if(kind==='people')return person(-20,-10)+person(20,-10)+person(0,25);
 if(kind==='team'){return person(-36,-35)+person(36,-35)+block(-45,-22,90,65,12,4,9)+document('report').replaceAll('class="sil"','class="sil"')+person(-52,22)+person(52,22)}
 if(kind==='gate')return block(-45,-8,10,16,0,48)+block(35,-8,10,16,0,48)+block(-45,-8,90,16,48,8);
 if(kind==='crane'){return block(-30,-25,60,50,-4,4)+block(-7,-7,14,14,0,104)+block(-57,-8,120,16,104,8)+line([[45,0,103],[45,0,37],[51,0,31]],'detail')+line([[-54,0,113],[0,0,142],[60,0,113]],'detail')+block(-21,-15,42,30,76,20);}
 if(kind==='lens'){const [o,ins]=rings(-30,-30,30,30,29,.8);const p=prism(P,front,o,ins,7,11);return path(p.sil)+path(poly(ringAt(P,circ(21,40),11)),'crease')+block(20,20,12,42,7,5,5)}
 if(kind==='pallet'){let s=block(-28,-23,56,46,-3,3);for(let x of [-23,-7,9])s+=block(x,-20,14,40,0,14);return s}
 return '';
}
