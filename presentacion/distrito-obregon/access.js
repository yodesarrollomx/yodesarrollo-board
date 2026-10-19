// Existing Portero canje, not a second identity provider. No cached role grants access.
const OWNER_HASH="c27e8a6088a74a82ad2c14ef7ed0d2b4b69d80c4c7bb841c95822980a28c9bad";
let validated='',owner='',listener=()=>{},epoch=0;
const key=()=>localStorage.getItem('pyod_clave_v1')||'';
async function hash(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
function revoke(){validated='';owner='';listener(false)}
async function verify(){const k=key(),mine=++epoch;if(validated&&validated!==k)revoke();if(!k||!window.YOD_PORTERO?.original){revoke();return false;}try{const r=await fetch(window.YOD_PORTERO.original+'?recurso=canje&t='+encodeURIComponent(k),{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(25000)});const d=await r.json();if(mine!==epoch||key()!==k)return false;const email=String(d.correo||'').trim().toLowerCase();if(d.ok!==true||d.token!==k||d.rol!=='admin'||await hash(email)!==OWNER_HASH){revoke();return false}validated=k;owner=OWNER_HASH;listener(true);return true}catch{if(mine===epoch)revoke();return false}}
export const access={verify,identity:()=>validated===key()?owner:'',onChange(fn){listener=fn;fn(false)}};
addEventListener('storage',e=>{if(e.key==='pyod_clave_v1'){revoke();verify()}});addEventListener('focus',()=>verify());document.addEventListener('visibilitychange',()=>{if(!document.hidden)verify()});
