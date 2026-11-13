/* Personal layout only. Business records and presentation content never enter this model. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;root.YODBoardCore=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x)),empty=()=>({schema:1,items:[],groups:[]});
 const point=n=>Math.round(Math.max(0,Math.min(12000,Number(n)||0)));
 function reconcile(layout,ids){const out=copy(layout||empty()),known=new Set(ids);out.items=out.items.filter(i=>known.has(i.id));for(const id of ids)if(!out.items.some(i=>i.id===id)){const n=out.items.length;out.items.push({id,x:40+(n%3)*300,y:40+Math.floor(n/3)*300,group:''});}return out;}
 function move(layout,id,x,y){const out=copy(layout),i=out.items.find(i=>i.id===id)||out.groups.find(i=>i.id===id);if(i){i.x=point(x);i.y=point(y);}return out;}
 function group(layout,ids,{id,name,kind,x=40,y=40}){const out=copy(layout);if(!['folder','stack'].includes(kind)||!name.trim())throw Error('Escribe un nombre.');if(out.groups.length>=100)throw Error('La mesa admite hasta 100 grupos.');if(out.groups.some(g=>g.id===id))throw Error('El grupo ya existe.');out.groups.push({id,name:name.trim().slice(0,100),kind,x:point(x),y:point(y)});for(const i of out.items)if(ids.includes(i.id))i.group=id;return out;}
 function into(layout,id,groupId){const out=copy(layout);if(!out.groups.some(g=>g.id===groupId))return out;const item=out.items.find(i=>i.id===id);if(item)item.group=groupId;return out;}
 function vacant(layout,exclude=''){for(let n=0;n<1000;n++){const x=40+(n%3)*300,y=40+Math.floor(n/3)*300;if(![...layout.items.filter(i=>!i.group&&i.id!==exclude),...layout.groups].some(i=>Math.abs(i.x-x)<290&&Math.abs(i.y-y)<280))return {x,y};}return {x:40,y:12000};}
 function release(layout,id){const out=copy(layout),i=out.items.find(i=>i.id===id);if(i&&i.group){const pos=vacant(out,id);i.group='';i.x=pos.x;i.y=pos.y;}return out;}
 function dissolve(layout,id){let out=copy(layout);for(const i of out.items.filter(i=>i.group===id))out=release(out,i.id);out.groups=out.groups.filter(g=>g.id!==id);return out;}
 return {vacant,copy,empty,reconcile,move,group,into,release,dissolve,point};
});
