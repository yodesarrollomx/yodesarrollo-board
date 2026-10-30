// Helpers compartidos de los diagramas de Distrito Obregón: color, texto, trazo, grupo de revelado, flecha, subrayado y caja.
export const K={ink:'#253e3b',muted:'#65756c',problem:'#ad4c46',solution:'#806397',plan:'#866143',risk:'#987419',outcome:'#297e94',action:'#517a43'};
export const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const T=(x,y,s,size=18,c=K.ink,a='middle')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" text-anchor="${a}">${E(s)}</text>`;
export const P=(d,c=K.muted,w=1.5,dash='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash?'stroke-dasharray="'+dash+'"':''}/>`;
export const G=(n,s)=>`<g data-reveal="${n}">${s}</g>`;
export const A=(x,y,X,Y,c=K.plan)=>P(`M${x} ${y} L${X} ${Y}`,c)+P(`M${X-4} ${Y-7} L${X} ${Y} L${X+4} ${Y-7}`,c);
export const H=(x,y,w,c)=>P(`M${x-w/2} ${y} q${w/2} 4 ${w} 0`,c,2.5);
export const B=(x,y,w,h,c)=>`<rect x="${x-w/2}" y="${y}" width="${w}" height="${h}" rx="14" fill="${c}08" stroke="${c}" stroke-width="1.2"/>`;
