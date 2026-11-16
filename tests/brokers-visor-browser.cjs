'use strict';
// «Ver visor» en la cartera: datos sintéticos; toda petición externa se intercepta y ningún POST sale a producción.
const {chromium,webkit}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const S=require('../brokers-server.js');
const ROOT=path.join(__dirname,'..'),KEY='c'.repeat(40),VISOR='https://yodesarrollomx.github.io/potenciales-yod/visor.html#l='+KEY;
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json'};
function fresh(){
  const s={revision:1,brokers:[{id:'b1',name:'Broker Uno',email:'one@example.test',active:true},{id:'b2',name:'Broker Dos',email:'two@example.test',active:true}],contacts:[],
    opportunities:[{id:'existing-b2',title:'Expediente de Dos',kind:'Terreno',stage:'Recibido',broker_ids:['b2'],next_action:'[Masterbroker] Revisar fuentes',next_date:'2026-11-20'}],activities:[],participations:[],receipts:[]};
  return S.historyVisors(s,[['persona_id','nombre'],['uno','Broker Uno'],['dos','Broker Dos']],[['proyecto_id','nombre','broker','estado','folio','visor'],['sintetico','Plan sintético','uno','activo','PRJ-SINTETICO',VISOR]]);
}
const identities={'synthetic-b1':{correo:'one@example.test',nombre:'Broker Uno',rol:'vista',boards:'IV'},'synthetic-b2':{correo:'two@example.test',nombre:'Broker Dos',rol:'vista',boards:'IV'},'synthetic-dir':{correo:'dir@example.test',nombre:'Dirección',rol:'admin',boards:'*'}};
const service=S.createService({auth:k=>identities[k]?{ok:true,...identities[k]}:{ok:false},lock:f=>f(),read:fresh,hash:v=>v,now:()=>new Date().toISOString(),uuid:()=>'synthetic',commit:()=>{throw new Error('no writes in this test');}});
(async()=>{
  const server=http.createServer((req,res)=>{const file=path.normalize(new URL(req.url,'http://localhost').pathname).replace(/^[/\\]+/,'');const full=path.join(ROOT,file);
    if(req.method!=='GET'||!full.startsWith(ROOT)||!types[path.extname(file)]||!fs.existsSync(full)){res.writeHead(404);return res.end();}
    res.setHeader('Content-Type',types[path.extname(file)]);res.end(fs.readFileSync(full));}).listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;const posts=[];
  try{
    for(const [engine,type] of Object.entries(process.env.QA_BROWSER==='chromium'?{chromium}:{chromium,webkit})){
      const browser=await type.launch({headless:true});
      try{
        for(const [who,width] of [['synthetic-b1',390],['synthetic-b1',1440],['synthetic-b2',390],['synthetic-dir',1440]]){
          const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
          await ctx.addInitScript(k=>{localStorage.setItem('pyod_clave_v1',k);},who);
          await ctx.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
            if(url.origin===base&&req.method()==='GET')return route.continue();
            if(req.method()!=='POST')return route.fulfill({status:200,contentType:url.pathname.endsWith('.css')?'text/css':'application/javascript',body:''});
            let body={};try{body=JSON.parse(req.postData()||'{}');}catch(_){}
            posts.push(body.action||'');
            const response=['brokers_snapshot','brokers_save'].includes(body.action)&&body.action==='brokers_snapshot'?service.handle({action:body.action,k:body.k}):{ok:false,error:'synthetic'};
            return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});});
          const p=await ctx.newPage(),errors=[];p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));
          await p.goto(base+'/brokers.html');await p.locator('#workspace:not([hidden])').waitFor();
          const label=engine+' '+who+' '+width;
          if(who==='synthetic-b2'){
            await p.getByText('Expediente de Dos',{exact:true}).first().waitFor();
            assert.equal(await p.locator('a.visor-link').count(),0,label+': otro broker no ve el visor');
            assert.equal(await p.getByText('Plan sintético').count(),0,label+': ni el proyecto');
          }else{
            if(who==='synthetic-dir'){const own=p.locator('[data-open-broker="b1"]');if(await own.count())await own.first().click();}
            const card=p.locator('.case-row',{hasText:'Plan sintético'}).first();await card.waitFor();await card.locator('[data-expand]').click();
            const a=card.locator('a.visor-link');
            assert.equal(await a.count(),1,label+': un botón por tarjeta');
            assert.equal(await a.getAttribute('href'),VISOR,label);assert.equal(await a.getAttribute('target'),'_blank',label);
            assert.match(await a.getAttribute('rel'),/noopener/,label);assert.match(await a.innerText(),/Ver visor/,label);
            const box=await a.boundingBox();assert.ok(box&&box.height>=30&&box.x>=0&&box.x+box.width<=width+1,label+': botón visible y tocable');
            assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': sin desbordar');
            await card.locator('.case-main').click();
            const head=p.locator('.detail .detail-actions a.visor-link');await head.waitFor();
            assert.equal(await head.getAttribute('href'),VISOR,label+': también en el encabezado del expediente');
            fs.mkdirSync('visor-review-artifacts',{recursive:true});await p.screenshot({path:'visor-review-artifacts/'+engine+'-'+who.slice(10)+'-'+width+'.png',fullPage:true});
          }
          assert.deepEqual(errors,[],label+': sin errores de página');
          await ctx.close();
        }
      }finally{await browser.close();}
    }
    assert.ok(posts.every(a=>a!=='brokers_save'),'ningún guardado');
    console.log('Ver visor: tarjeta y expediente correctos; otro broker no lo recibe.');
  }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
