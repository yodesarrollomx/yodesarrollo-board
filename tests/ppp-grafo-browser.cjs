'use strict';
// Presentación desde el grafo en navegador real. Todo es sintético: el grafo aprobado sale de una copia de prueba,
// el Portero es un doble local y cualquier otra red se corta. Ninguna llamada llega a producción y nada se escribe.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),G=require('./fixtures/grafo-aprobado.json'),R=G.datos.recetas,APROBADO=G.datos.id,NUEVO='G-20991231-2359',BORRADOR='G-20991230-0915';
const TOKEN='sy-sintetico-0000000000000000',PORTERO='https://script.google.com/macros/s/PORTERODEPRUEBA/exec';
// El rol tal como lo deja portero.js en sessionStorage.pyod_rol: JSON {f: inicio del token, rol}.
const ROL=rol=>JSON.stringify({f:TOKEN.slice(0,14),rol});
const CASO={caso_id:'CASO-SINTETICO',nombre_caso:'Caso sintético',version:7,ts_actualizado:'2026-11-10T18:00:00Z',escenarios_json:JSON.stringify([{id:'a',nombre:'Base',activo:true},{id:'b',nombre:'Alta'}]),
  inTerreno:2500,inEquity:18000000,inAporteTierra:100,resumen:{ventas:182500000,costo_proyecto:141300000,utilidad:41200000,margen_pct:22.6,tir_dev_pct:27.4,moic_dev:1.92,pico_deuda:38000000,resultado_dueno:20600000,
  unidades:64,pisos:8,vendible_viv_m2:4480,meses_totales:38,ticket_promedio:2851000}};
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
function file(url){const pathname=decodeURIComponent(new URL(url).pathname).replace(/^\/yodesarrollo-board/,'');let f=path.join(root,pathname);if(!f.startsWith(root+path.sep))return null;if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');return fs.existsSync(f)?f:null;}
const server=http.createServer((req,res)=>{const f=file('http://localhost'+req.url);if(!f){res.writeHead(404);return res.end('missing');}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});
const cors={'access-control-allow-origin':'*'};

async function main(){
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const errors=[],shots=process.env.QA_ARTIFACTS;if(shots)fs.mkdirSync(shots,{recursive:true});
  // mundo: qué grafo está aprobado, si hay borrador y qué contesta el Portero
  async function context({sesion=true,rol=ROL('admin'),viewport={width:393,height:852},mundo={}}={}){
    const w={aprobado:APROBADO,borrador:null,permiso:true,portero:[],otros:[],...mundo};
    const c=await browser.newContext({viewport,reducedMotion:'reduce'});c.setDefaultTimeout(10000);
    if(sesion)await c.addInitScript(({t,rol})=>{try{localStorage.setItem('pyod_clave_v1',t);sessionStorage.setItem('pyod_rol',rol);}catch{}},{t:TOKEN,rol});
    await c.route('**/*',async route=>{
      const req=route.request(),u=new URL(req.url());
      if(req.method()!=='GET')w.otros.push(req.method()+' '+u.href);
      if(u.hostname==='127.0.0.1')return route.continue();
      if(u.hostname==='yodesarrollomx.github.io'&&u.pathname==='/potenciales-yod/grafo/versiones.json')return route.fulfill({json:{...G.versiones,aprobado:w.aprobado,versiones:[{id:w.aprobado,fecha:'prueba',estado:'aprobado'}]},headers:cors});
      if(u.hostname==='yodesarrollomx.github.io'&&u.pathname==='/potenciales-yod/grafo/datos/'+w.aprobado+'.json')return route.fulfill({json:{...G.datos,id:w.aprobado},headers:cors});
      if(u.hostname==='raw.githubusercontent.com'&&u.pathname==='/yodesarrollomx/potenciales-yod/grafo-datos/borrador.json')return route.fulfill({body:JSON.stringify(w.borrador||{}),contentType:'text/plain',headers:cors});
      if(u.pathname.endsWith('/os/yod-acceso.js'))return route.fulfill({body:`window.YOD_PORTERO={original:${JSON.stringify(PORTERO)}};`,contentType:'text/javascript'});
      if(u.href.startsWith(PORTERO)){w.portero.push(req.method()+' '+u.search);const q=u.searchParams,ok=w.permiso&&req.method()==='GET'&&q.get('k')===TOKEN&&q.get('recurso')==='caso'&&q.get('tipo')==='mixto'&&q.get('id')===CASO.caso_id;
        return route.fulfill({json:ok?{ok:true,caso:CASO}:{ok:false,error:'clave'},headers:cors});}
      if(/\.(js|css)$/.test(u.pathname))return route.fulfill({body:'',contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript'});
      return route.fulfill({status:404,body:'missing',headers:cors});
    });
    return {c,w};
  }
  async function page(c,url,vigilar=true){const p=await c.newPage();if(vigilar){p.on('pageerror',e=>errors.push(url+' · '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(url+' · consola · '+m.text());});}await p.goto(base+url);return p;}
  const cabe=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2);
  const foto=async(p,nombre)=>{if(shots)await p.screenshot({path:path.join(shots,nombre+'.png')});};
  try{
    // 1 · plan real (doble) en tres tamaños: lee una vez, arma, cambia de audiencia y extensión, presenta
    for(const viewport of [{width:393,height:852},{width:844,height:390},{width:1440,height:900}]){
      const {c,w}=await context({viewport}),p=await page(c,'/presentacion/grafo/?caso=CASO-SINTETICO&tipo=mixto');
      await p.locator('#workspace').waitFor({state:'visible'});
      assert.match(await p.locator('#project').innerText(),/Caso sintético/);assert.match(await p.locator('#planVersion').innerText(),/^v7 · Base · /);assert.match(await p.locator('#grafoVersion').innerText(),new RegExp('^'+APROBADO));
      assert.equal(await p.locator('#audiencias button').count(),R.audiencias.length);assert.equal(await p.locator('#audiencias button[aria-pressed=true]').getAttribute('data-audiencia'),'cliente');
      assert.equal(await p.locator('#aviso').isVisible(),false);assert.equal(await p.locator('#ejemplo').isVisible(),false);
      const max=Number(await p.locator('#progress').getAttribute('max'));assert.ok(max>=6);let vistos='';
      for(let n=0;n<=max;n++){await p.locator('#progress').fill(String(n));assert.ok(await p.locator('#stage [data-object]').count()>0,'momento '+n);assert.ok(await cabe(p),'desborde en momento '+n+' a '+viewport.width);vistos+=' '+await p.locator('#facts').innerText();}
      for(const cifra of ['2,500','64','$182,500,000','$41,200,000','22.6'])assert.ok(vistos.includes(cifra),'falta '+cifra);
      assert.match(vistos,/No definido/);assert.ok(!/NaN|undefined|null/.test(vistos));
      await p.locator('#progress').fill('0');await foto(p,'grafo-cliente-'+viewport.width+'x'+viewport.height);
      await p.locator('#next').click();assert.equal(await p.locator('#progress').inputValue(),'1');await p.locator('#prev').click();assert.equal(await p.locator('#progress').inputValue(),'0');assert.equal(await p.locator('#prev').isDisabled(),true);
      const escenas=await p.locator('#stages button').count();
      await p.locator('#audiencias button[data-audiencia=dueno]').click();
      assert.ok((await p.locator('#project').innerText()).startsWith(R.audiencias.find(a=>a.id==='dueno').titulo));assert.match(p.url(),/audiencia=dueno/);assert.equal(await p.locator('#progress').inputValue(),'0');
      await p.locator('#fondo button[data-breve="1"]').click();assert.match(p.url(),/breve=1/);assert.ok(await p.locator('#stages button').count()<=escenas);assert.match(await p.locator('#sourceLabel').innerText(),/versión corta/);
      await p.locator('#audiencias button[data-audiencia=producto]').click();assert.match(await p.locator('#versionBadge').innerText(),/^Para departamentos/);assert.ok(await cabe(p));
      await p.locator('#present').click();assert.equal(await p.locator('#opciones').isVisible(),false);assert.equal(await p.locator('#script').isVisible(),false);assert.ok(await p.locator('#stage [data-object]').count()>0);assert.ok(await cabe(p));
      await foto(p,'grafo-presentando-'+viewport.width+'x'+viewport.height);
      assert.deepEqual(w.portero,['GET ?k='+TOKEN+'&tipo=mixto&recurso=caso&id=CASO-SINTETICO']);assert.deepEqual(w.otros,[]);
      assert.equal(await p.evaluate(()=>localStorage.getItem('pyod_clave_v1')),TOKEN);assert.ok(!p.url().includes(TOKEN));
      // la liga abre lo mismo: audiencia y extensión viajan en la dirección, nunca la credencial ni cifras
      const p2=await page(c,new URL(p.url()).pathname+new URL(p.url()).search);await p2.locator('#workspace').waitFor({state:'visible'});
      assert.equal(await p2.locator('#audiencias button[aria-pressed=true]').getAttribute('data-audiencia'),'producto');assert.equal(await p2.locator('#fondo button[aria-pressed=true]').getAttribute('data-breve'),'1');
      assert.deepEqual([...new URL(p2.url()).searchParams.keys()].sort(),['audiencia','breve','caso','tipo']);
      await c.close();
    }
    // 2 · ejemplo sin sesión en pantalla chica: se ve, se marca como ficticio y no toca al Portero ni muestra aviso
    {const {c,w}=await context({sesion:false,viewport:{width:320,height:640},mundo:{borrador:{id:BORRADOR,pr:70}}}),p=await page(c,'/presentacion/grafo/?demo=1&tipo=residencial&audiencia=dueno');
      await p.locator('#workspace').waitFor({state:'visible'});assert.equal(await p.locator('#ejemplo').isVisible(),true);assert.match(await p.locator('#project').innerText(),/ficticias/);assert.match(await p.locator('#planVersion').innerText(),/de ejemplo/);
      assert.ok(await p.locator('#facts .fact').count()>0);assert.ok(await cabe(p));await p.waitForTimeout(300);assert.equal(await p.locator('#aviso').isVisible(),false);assert.deepEqual(w.portero,[]);assert.deepEqual(w.otros,[]);
      await foto(p,'grafo-ejemplo-320x640');await c.close();}
    // 3 · sin caso: pide la liga del plan, rechaza lo que no es del tablero y abre la buena
    {const {c}=await context(),p=await page(c,'/presentacion/grafo/');await p.locator('#elegir').waitFor({state:'visible'});
      await p.locator('#liga').fill('https://example.com/mixto.html?open=CASO-SINTETICO');await p.locator('#abrirLiga').click();assert.match(await p.locator('#ligaEstado').innerText(),/liga completa del plan/);assert.equal(await p.locator('#workspace').isVisible(),false);
      await p.locator('#liga').fill('https://yodesarrollomx.github.io/potenciales-yod/mixto.html?open=CASO-SINTETICO');await p.locator('#abrirLiga').click();await p.locator('#workspace').waitFor({state:'visible'});assert.match(await p.locator('#project').innerText(),/Caso sintético/);await c.close();}
    // 4 · sin sesión o sin permiso: no se arma nada ni aparece un solo dato del caso
    for(const caso of [{sesion:false,mundo:{},espera:/Entra con tu cuenta de YOD/},{sesion:true,mundo:{permiso:false},espera:/no puede leer este plan/}]){
      const {c,w}=await context({sesion:caso.sesion,mundo:caso.mundo}),p=await page(c,'/presentacion/grafo/?caso=CASO-SINTETICO&tipo=mixto');
      await p.locator('#gateMessage').filter({hasText:caso.espera}).waitFor();assert.equal(await p.locator('#workspace').isVisible(),false);assert.equal(await p.locator('#stage [data-object]').count(),0);
      const html=await p.content();assert.ok(!html.includes('Caso sintético'));assert.ok(!html.includes('182,500,000'));assert.equal(w.portero.length,caso.sesion?1:0);assert.deepEqual(w.otros,[]);
      if(caso.sesion)assert.equal(await p.evaluate(()=>localStorage.getItem('pyod_clave_v1')),TOKEN);
      await c.close();}
    // 5 · borrador: lo abierto no cambia y sólo aparece una pastilla discreta; al aprobarse, ofrece actualizar
    {const {c,w}=await context({mundo:{borrador:{id:BORRADOR,pr:70}}}),p=await page(c,'/presentacion/grafo/?caso=CASO-SINTETICO&tipo=mixto');
      await p.locator('#aviso .yga-boton').waitFor({state:'visible'});assert.equal(await p.locator('#aviso .yga-boton').innerText(),'Otra versión en trabajo');assert.match(await p.locator('#grafoVersion').innerText(),new RegExp('^'+APROBADO));
      const caja=await p.locator('#aviso .yga-boton').boundingBox();assert.ok(caja.height<=34&&caja.width<=220,'la pastilla debe ser pequeña');assert.equal(await p.locator('#aviso .yga-caja').count(),0);
      await p.locator('#aviso .yga-boton').click();const detalle=await p.locator('#aviso .yga-caja').innerText();assert.ok(detalle.includes(BORRADOR)&&detalle.includes(APROBADO));assert.match(detalle,/sigue igual hasta que se apruebe/);
      assert.equal(await p.locator('#aviso .yga-caja a').getAttribute('href'),'https://yodesarrollomx.github.io/potenciales-yod/accesos.html#grafo-sistema');
      const r=await p.locator('#aviso .yga-caja').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=393+1,'el detalle cabe en pantalla');await foto(p,'grafo-aviso-borrador-393x852');
      await p.getByRole('button',{name:'Cerrar'}).click();assert.equal(await p.locator('#aviso .yga-caja').count(),0);
      await p.locator('#present').click();assert.equal(await p.locator('#aviso .yga-boton').isVisible(),true);assert.ok((await p.locator('#aviso .yga-boton').boundingBox()).height<=34);await p.locator('#present').click();
      w.aprobado=NUEVO;w.borrador=null;await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      await p.locator('#aviso .yga-boton').filter({hasText:'Hay un grafo más nuevo'}).waitFor();assert.match(await p.locator('#grafoVersion').innerText(),new RegExp('^'+APROBADO));
      await p.locator('#aviso .yga-boton').click();await p.getByRole('button',{name:'Actualizar al último grafo'}).click();
      await p.locator('#grafoVersion').filter({hasText:NUEVO}).waitFor();await p.locator('#aviso').waitFor({state:'hidden'});assert.match(await p.locator('#project').innerText(),/Caso sintético/);assert.deepEqual(w.otros,[]);await c.close();}
    // 6 · quien no es Dirección (o trae el rol de otro token) ve la misma pastilla, sin liga a Accesos; el borrador cuenta aunque su PR aún no esté abierto.
    //     La palabra sola de antes ('direccion') sigue valiendo.
    for(const [rol,liga] of [[ROL('vista'),0],[JSON.stringify({f:'sy-otro-token0',rol:'admin'}),0],['comercial',0],['direccion',1]]){
      const {c}=await context({rol,mundo:{borrador:{id:BORRADOR,pr:0}}}),p=await page(c,'/presentacion/grafo/?caso=CASO-SINTETICO&tipo=mixto');
      await p.locator('#aviso .yga-boton').click();assert.equal(await p.locator('#aviso .yga-caja a').count(),liga,rol);
      if(!liga)assert.match(await p.locator('#aviso .yga-caja').innerText(),/pide a Dirección/);await c.close();}
    // 7 · Master Brokers y Presentaciones: la pastilla se monta sola, sólo con sesión y sólo si hay borrador
    for(const pagina of ['/brokers.html','/presentaciones.html']){
      {const {c}=await context({mundo:{borrador:{id:BORRADOR,pr:70}}}),p=await page(c,pagina,false),mis=[];p.on('pageerror',e=>{if(/grafo|yga/i.test(e.stack||e.message))mis.push(e.message);});
        const chip=p.locator('[data-grafo-aviso] .yga-boton');await chip.waitFor({state:'visible'});assert.equal(await chip.innerText(),'Otra versión en trabajo');
        const b=await chip.boundingBox();assert.ok(b.height<=34&&b.x>=0&&b.x+b.width<=393+1,pagina+': pastilla fuera de pantalla');
        await chip.click();const r=await p.locator('[data-grafo-aviso] .yga-caja').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=393+1,pagina+': detalle fuera de pantalla');assert.ok(await cabe(p),pagina+': desborde');
        await foto(p,'grafo-aviso'+pagina.replace(/\W+/g,'-')+'393x852');assert.deepEqual(mis,[]);await c.close();}
      {const {c}=await context({mundo:{}}),p=await page(c,pagina,false);await p.waitForTimeout(600);assert.equal(await p.locator('[data-grafo-aviso]').isVisible(),false,pagina+': sin borrador no se muestra');await c.close();}
      {const {c}=await context({sesion:false,mundo:{borrador:{id:BORRADOR,pr:70}}}),p=await page(c,pagina,false);await p.waitForTimeout(600);assert.equal(await p.locator('[data-grafo-aviso]').isVisible(),false,pagina+': sin sesión no se muestra');await c.close();}
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: presentación desde el grafo en tres tamaños, tres audiencias, versión corta, modo presentar, una sola lectura del plan, ejemplo sin sesión, puerta sin datos, borrador sin cambios, actualización al aprobar y pastilla discreta en Master Brokers y Presentaciones.');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
