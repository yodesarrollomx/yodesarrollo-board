(function () {
  'use strict';
  const C = window.BrokersCore, CRM = window.BrokersCRM, $ = id => document.getElementById(id);
  // Set only after contrasting the existing live backend and publishing brokers.v1.
  // No separate database, public fixture or whole-board fallback is permitted.
  const config = window.YDR_BROKERS_CONFIG || {};
  let requestedBroker = new URLSearchParams(window.location.search).get('masterbroker') || '';
  let manageRequested = new URLSearchParams(window.location.search).get('mode') === 'manage';
  let preview = false, managing = false, caseState = '', detailTab = 'history', attention = '', liveSnapshot = null;
  const openClients = new Set(), openTeam = new Set();
  const expanded = new Set(), pppData = new Map();
  let calendarMonth = '', calendarDay = '', calendarOpen = false, crmGeneration = 0;
  const token = () => { try { return localStorage.getItem('pyod_clave_v1') || ''; } catch (_) { return ''; } };
  const evaluator = window.BrokerEvaluator.create(config,token,window.fetch.bind(window));
  const pppClient = CRM.createPPPClient({url:()=>config.pppUrl || config.evaluatorUrl,token,fetch:window.fetch.bind(window)});
  let evaluationReturnHandled=false;
  const client = C.createClient({ url: config.url, token, fetch: window.fetch.bind(window) });
  let snapshot = null, tab = '', broker = '', query = '', stage = '', selected = '', busy = false, edit = null, loadedToken = '';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Hermosillo', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const options = (items, value) => items.map(x => { const id = typeof x === 'string' ? x : x.id, name = typeof x === 'string' ? x : x.name; return `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(name)}</option>`; }).join('');
  const link = (url, label) => C.safeLink(url) ? `<a target="_blank" rel="noopener noreferrer" href="${esc(C.safeLink(url))}">${esc(label)} ↗</a>` : '';
  const canEdit = () => snapshot && snapshot.capabilities && snapshot.capabilities.write === true;
  const isPersonal = () => snapshot && (snapshot.actor.role === 'broker' || managing);
  const profileName = () => managing ? (snapshot.brokers[0] || {}).name || 'Masterbroker' : snapshot.actor.name;
  function applySnapshot(live) {
    liveSnapshot = C.validateSnapshot(live);
    managing = !!requestedBroker && manageRequested && live.actor.role === 'direccion';
    preview = !!requestedBroker && !managing && live.actor.role === 'direccion';
    snapshot = C.workspaceSnapshot(live,requestedBroker,managing);
    broker = requestedBroker || '';
    if (!tab) tab = live.actor.role === 'direccion' && !requestedBroker ? 'brokers' : 'opportunities';
  }
  function accessNotice(message = '') {
    const base = 'brokers.html?embed=1&masterbroker=' + encodeURIComponent(requestedBroker);
    $('notice').textContent = message || (preview ? 'Vista previa de ' + profileName() + '. Explora sin modificar expedientes.' : managing ? 'Gestión de la cartera de ' + profileName() + ' · guardas como ' + snapshot.actor.name + ' (Dirección).' : '');
    if (preview || managing) { const a = document.createElement('a'); a.href = base + (preview ? '&mode=manage' : ''); a.textContent = preview ? 'Gestionar esta cartera como Dirección →' : 'Ver experiencia del Masterbroker →'; $('notice').append(' ',a); }
  }
  const canAgree = () => canEdit() && snapshot.actor.role === 'direccion' && snapshot.capabilities.agree_participation === true;
  const names = ids => (ids || []).map(id => (snapshot.brokers.find(b => b.id === id) || {}).name || 'Masterbroker').join(' · ');
  const current = () => C.visible(snapshot, broker, query, stage);
  function clear() { crmGeneration++; expanded.clear(); pppData.clear(); pppClient.invalidate(); calendarMonth='';calendarDay='';calendarOpen=false; $('identity').textContent = ''; snapshot = null; liveSnapshot = null; preview = false; managing = false; loadedToken = ''; selected = ''; $('workspace').replaceChildren(); $('workspace').hidden = true; if ($('editor').open) $('editor').close(); edit = null; }
  async function load() {
    if (busy) return;
    busy = true; clear(); $('notice').textContent = 'Validando tu acceso y leyendo la cartera…';
    try { const live = await client.load(); applySnapshot(live); loadedToken = token(); accessNotice(); render(); await receiveEvaluation(); }
    catch (e) { clear(); $('notice').textContent = e.message; const b = document.createElement('button'); b.textContent = 'Volver a intentar'; b.onclick = load; $('notice').append(' ', b); }
    finally { busy = false; }
  }
  const people = () => (liveSnapshot || snapshot).brokers;
  const ownerChoices = () => [{id:'',name:'Seleccionar responsable'},...people().map(b=>({id:'person:'+b.id,name:b.name})),...(!people().some(b=>b.id===snapshot.actor.id)?[{id:'person:'+snapshot.actor.id,name:snapshot.actor.name}]:[]),{id:'Masterbroker',name:'Masterbroker · sin persona definida'},{id:'YOD',name:'YoDesarrollo · sin persona definida'},{id:'PG',name:'PG'}];
  function selectPortfolio(id) {
    requestedBroker=id;manageRequested=!!id;tab=id?'opportunities':'brokers';selected='';query='';stage='';caseState='';attention='';calendarDay='';openClients.clear();expanded.clear();
    applySnapshot(liveSnapshot);
    const u=new URL(location.href);if(id){u.searchParams.set('masterbroker',id);u.searchParams.set('mode','manage');}else{u.searchParams.delete('masterbroker');u.searchParams.delete('mode');}history.replaceState({},'',u.href);
    accessNotice();render();
  }
  const groups = () => C.caseGroups(snapshot,broker,query,stage,caseState);
  const groupFor = id => C.caseGroups(snapshot,broker,'','','').find(g=>g.records.some(o=>o.id===id));
  const dateLabel = value => {
    if (!value) return '';
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T12:00:00-07:00' : value);
    return Number.isNaN(d.valueOf()) ? String(value) : new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Hermosillo'}).format(d);
  };
  function render() {
    if (!snapshot || token() !== loadedToken) { clear(); return; }
    $('identity').textContent = snapshot.actor.role==='direccion' ? snapshot.actor.name+' · Master Developer' : (profileName() || '')+' · Master Broker';
    $('workspace').hidden = false;
    $('brokers').classList.toggle('personal-workspace',isPersonal());
    const direction = snapshot.actor.role === 'direccion' && !managing;
    const navigation = [[...(direction?['brokers','Mi portal']:['opportunities','Mis clientes'])],...(direction?[['opportunities','Todos los clientes']]:[]),['contacts','Red de contactos'],['offer','Material'],['participations','Acuerdos']];
    const isList = !selected && !['offer','brokers'].includes(tab);
    $('workspace').innerHTML = `${liveSnapshot.actor.role==='direccion'&&requestedBroker?'<nav class="portfolio-breadcrumb" aria-label="Cartera actual"><button data-plaza="1">← Mi portal</button><span>'+esc(profileName())+'</span><small>Gestionas como '+esc(liveSnapshot.actor.name)+'</small></nav>':''}<nav class="module-tabs" aria-label="Masterbrokers">${navigation.map(([id,label])=>`<button data-tab="${id}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}<button class="refresh" data-action="refresh" aria-label="Actualizar cartera">↻</button></nav>${isList?`<div class="toolbar"><input id="search" type="search" aria-label="Buscar en esta sección" placeholder="Buscar expediente o contacto" value="${esc(query)}">${direction?`<select id="broker-filter" aria-label="Masterbroker"><option value="">Todo el equipo</option>${options(snapshot.brokers,broker)}</select>`:''}${tab==='opportunities'?`<select id="state-filter" aria-label="Estado"><option value="">Todos</option><option value="open" ${caseState==='open'?'selected':''}>Abiertos</option><option value="closed" ${caseState==='closed'?'selected':''}>Cerrados</option></select><select id="stage-filter" aria-label="Etapa"><option value="">Todas las etapas</option>${options(C.stages,stage)}</select>`:''}${canEdit()&&['opportunities','contacts'].includes(tab)?`<details class="create-menu"><summary>+ Agregar</summary><div>${!preview&&tab==='opportunities'?'<button data-preevaluate="new">Preevaluar terreno</button>':''}<button data-new="${tab==='contacts'?'contact':'opportunity'}">${tab==='contacts'?'Contacto':'Oportunidad'}</button></div></details>`:''}</div>`:''}<div id="content"></div>`;
    const content = $('content');
    if (tab === 'opportunities') content.innerHTML = selected ? detail(snapshot.opportunities.find(o=>o.id===selected)) : portfolio();
    if (tab === 'contacts') content.innerHTML = contactsView();
    if (tab === 'offer') content.innerHTML = materialView();
    if (tab === 'participations') content.innerHTML = agreementsView();
    if (tab === 'brokers') content.innerHTML = teamView();
    if ($('search')) $('search').addEventListener('input', e => { query=e.target.value; const pos=e.target.selectionStart; render(); $('search').focus(); try{$('search').setSelectionRange(pos,pos);}catch(_){} });
    if ($('broker-filter')) $('broker-filter').onchange=e=>{selectPortfolio(e.target.value);};
    if ($('stage-filter')) $('stage-filter').onchange=e=>{stage=e.target.value;render();};
    if ($('state-filter')) $('state-filter').onchange=e=>{caseState=e.target.value;render();};
    hydratePPP();
    document.querySelectorAll('.agenda-panel').forEach(d=>d.addEventListener('toggle',()=>{calendarOpen=d.open;}));
    if ($('record-select')) $('record-select').onchange=e=>{selected=e.target.value;render();};
  }
  function table(headers, rows, label) {
    return `<div class="table-scroll" role="region" aria-label="${esc(label)}" tabindex="0"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty-cell">No hay registros en esta vista.</td></tr>`}</tbody></table></div>`;
  }
  function caseHistory(g){return CRM.history(g.activities);}
  function lastFact(g){return caseHistory(g).find(e=>e.status==='Realizado');}
  function pppMount(o,full=false){
    if(!CRM.pppReference(o))return '<span class="muted">PPP por vincular</span>';
    const item=pppData.get(o.ppp_id);
    if(!item)return `<div data-ppp-mount="${esc(o.id)}" data-full="${full?'1':'0'}" aria-live="polite">Leyendo versión guardada…</div>`;
    return pppHTML(o,item,full);
  }
  function pppHTML(o,item,full){
    if(item.error)return `<div class="ppp-observation"><span class="muted">${esc(item.error)}</span> ${link(o.ppp_url,'Abrir PPP')} <button class="text-button" data-ppp-retry="${esc(o.id)}">Reintentar</button></div>`;
    const p=item.value,head=`v${esc(p.version)}${p.scenario?' · '+esc(p.scenario):''}${p.updated?' · '+esc(dateLabel(p.updated)):''}`;
    const cards=p.cards.filter(c=>c.text);
    if(full)return `<details class="ppp-drawer"><summary>Plan de potencial · ${head}</summary><section class="ppp-observation"><div class="row"><h3>Plan de potencial</h3>${link(o.ppp_url,'Abrir PPP')}</div><p class="secondary">Guardado ${head}</p><dl class="ppp-headlines">${cards.map(c=>`<div><dt>${esc(c.title)}</dt><dd>${esc(c.text)}</dd></div>`).join('')}</dl>${cards.length?'':'<p class="muted">Este plan no tiene un resumen guardado disponible.</p>'}${p.scenarios.length>1?`<details class="version-list"><summary>${p.scenarios.length} versiones guardadas</summary><p>${esc(p.scenarios.map(v=>v.name+(v.active?' (activa)':'')).join(' · '))}</p><small>Los resultados mostrados corresponden al resumen guardado del caso. Abre el PPP para comparar las otras versiones.</small></details>`:''}</section></details>`;
    const spatial=p.cards[0].text||'Espacio y producto: consultar PPP',economy=[p.cards[1].text,p.cards[2].text].filter(Boolean).join(' · ');
    return `<div class="ppp-compact"><p><span class="mini-label">PPP ${head}</span> ${esc(spatial)}</p><p><span class="mini-label">Capital · rendimiento</span> ${esc(economy||'Consultar PPP')}</p></div>`;
  }
  async function hydratePPP(){
    const own=crmGeneration,ownToken=loadedToken;
    for(const mount of document.querySelectorAll('[data-ppp-mount]')){
      const o=snapshot?.opportunities.find(o=>o.id===mount.dataset.pppMount);if(!o)continue;
      try{const value=await pppClient.read(o);if(own!==crmGeneration||!snapshot||token()!==ownToken)return;if(value)pppData.set(o.ppp_id,{value});}
      catch(e){if(own!==crmGeneration||!snapshot||token()!==ownToken)return;pppData.set(o.ppp_id,{error:e.message});}
      if(mount.isConnected&&pppData.has(o.ppp_id))mount.outerHTML=pppHTML(o,pppData.get(o.ppp_id),mount.dataset.full==='1');
    }
  }
  function calendar(rows){
    if(!calendarMonth)calendarMonth=today().slice(0,7);
    const cells=CRM.monthGrid(calendarMonth,rows),label=new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(calendarMonth+'-01T12:00:00Z'));
    return `<section class="crm-calendar" aria-label="Calendario de actividades"><header><button data-calendar-move="-1" aria-label="Mes anterior">‹</button><strong>${esc(label)}</strong><button data-calendar-move="1" aria-label="Mes siguiente">›</button></header><div class="calendar-grid">${['L','M','M','J','V','S','D'].map((d,i)=>`<span class="weekday" aria-label="${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][i]}">${d}</span>`).join('')}${cells.map(c=>c.day?`<button data-calendar-day="${c.day}" class="calendar-day ${c.day===today()?'is-today':''} ${c.day===calendarDay?'is-selected':''}" aria-pressed="${c.day===calendarDay}" aria-label="${c.day}: ${c.actual} realizadas, ${c.planned} programadas o propuestas"><span>${c.label}</span><span class="calendar-dots">${c.actual?'<i class="dot actual"></i>':''}${c.planned?'<i class="dot planned"></i>':''}</span></button>`:'<span class="blank-day"></span>').join('')}</div><p class="calendar-key"><i class="dot actual"></i> Realizado <i class="dot planned"></i> Programado / propuesto</p>${calendarDay?`<button class="text-button" data-calendar-clear="1">${esc(dateLabel(calendarDay))} · Ver todo el historial</button>`:''}</section>`;
  }
  function timeline(rows,withCase=false){
    const all=CRM.history(rows),activeIds=new Set(CRM.calendarEvents(rows).map(e=>e.id)),events=calendarDay?all.filter(e=>e.day===calendarDay):all;
    return `<ol class="timeline">${events.map(a=>`<li data-activity="${esc(a.id)}"><div class="timeline-meta"><time>${esc(dateLabel(a.meta?.occurred_at||a.date)||'Fecha no registrada')}</time><span>${esc(a.type)}${a.status!=='Realizado'?' · '+esc(a.status):''}</span>${withCase?`<span>${esc((snapshot.opportunities.find(o=>o.id===a.opportunity_id)||{}).title)}</span>`:''}</div><p class="pre-wrap">${esc(a.text)}</p><div class="event-provenance">${a.participants?`<span>${esc(a.participants)}</span>`:''}${a.source?`<span>${esc(a.source)}</span>`:''}${link(a.source_url,'Fuente')}${a.stage?`<span>${esc(a.stage)}</span>`:''}</div>${a.next_action?`<div class="event-next">Sigue: ${esc(C.nextStep(a.next_action).text)}${a.next_date?' · '+esc(dateLabel(a.next_date)):''}</div>`:''}<small class="capture-meta">Registró ${esc(a.author_name||'Sin autor registrado')}${a.date?' · '+esc(dateLabel(a.date)):''}</small>${['Programado','Propuesto'].includes(a.status)&&activeIds.has(a.id)&&canEdit()&&!preview?`<div class="planned-actions"><button class="text-button" data-resolve-event="${esc(a.id)}" data-result="Realizado">Registrar resultado</button><button class="text-button" data-resolve-event="${esc(a.id)}" data-result="Programado">Reprogramar</button><button class="text-button" data-resolve-event="${esc(a.id)}" data-result="Cancelado">Cancelar</button></div>`:''}</li>`).join('')}</ol>${events.length?'':'<p class="empty-cell">'+(calendarDay?'Sin actividades este día.':'Aún no hay avances registrados.')+'</p>'}`;
  }
  function controlRows(rows){
    const d=C.dailyControl(rows,today());
    return {...d,decision:d.all.filter(o=>CRM.caseInfo(o).decision)};
  }
  function attentionBar(rows){
    const d=controlRows(rows);
    return `<div class="attention-bar" aria-label="Prioridades">${[['decision',snapshot.actor.role==='direccion'?'Requiere mi decisión':'Requiere Dirección'],['today','Hoy'],['overdue','Vencidos'],['unplanned','Por organizar']].map(([key,label])=>`<button data-attention="${key}" aria-pressed="${attention===key}"><strong>${d[key].length}</strong> ${label}</button>`).join('')}${attention?'<button class="text-button" data-attention="all">Ver todos</button>':''}</div>`;
  }
  function caseRow(g,index){
    const o=g.records.find(r=>C.agenda(g.records,'')[0]?.id===r.id)||g.records[0],a=lastFact(g),step=C.nextStep(o.next_action),open=expanded.has(g.key),info=CRM.caseInfo(o);
    return `<article class="case-row" data-case="${esc(g.key)}"><div class="case-bar"><button class="case-toggle" data-expand="${esc(o.id)}" aria-expanded="${open}" aria-controls="case-preview-${index}"><span class="case-chevron" aria-hidden="true">${open?'⌄':'›'}</span><span class="case-cell"><strong>${esc(o.title)}</strong><span class="secondary">${esc(o.location||o.kind)}${g.records.length>1?' · '+g.records.length+' gestiones':''}</span></span><span class="status">${esc(o.stage)}</span></button><div class="case-last"><span class="one-line">${esc(a?.text||'Sin avance registrado')}</span><span class="secondary">${a?esc(dateLabel(a.meta?.occurred_at||a.date)):''}</span></div><button class="open-board" data-open="${esc(o.id)}">Ver tablero →</button></div><div class="case-next"><span><b>Sigue:</b> ${esc(step.text||'Definir siguiente paso')}</span><span>${esc(C.ownerLabel(liveSnapshot,o.next_action))} · ${esc(o.next_date?dateLabel(o.next_date):'Sin fecha acordada')}</span>${C.overdue(o,today())?'<span class="due-tag">Vencido</span>':''}${info.decision?'<span class="due-tag">Requiere decisión</span>':''}<span class="ppp-stage ${CRM.pppReference(o)?'linked':''}">${CRM.pppReference(o)?link(o.ppp_url,'Plan de potencial'):'PPP por vincular'}${info.ppp_status!=='Por confirmar'?' · '+esc(info.ppp_status):''}</span></div>${open?`<section class="case-preview" id="case-preview-${index}" aria-label="Resumen de ${esc(o.title)}">${pppMount(o)}<p><span class="mini-label">Propietario / referencia</span> ${esc(g.contacts.filter(c=>c.type==='Propietario').map(c=>c.name).join(' · ')||'Por vincular')}</p><p>${link(o.ppp_url,'Abrir PPP')} ${link(o.documents_url,'Documentos')}</p><p><span class="mini-label">En qué quedó</span> ${esc(a?.text||'Sin avance registrado')}</p></section>`:''}</article>`;
  }
  function portfolio(){
    const allRows=C.visible(snapshot,broker,'',''),d=controlRows(allRows),allowed=attention?new Set((d[attention]||[]).map(o=>o.id)):null;
    const list=C.clientGroups(snapshot,broker,query,stage,caseState).filter(g=>!allowed||g.records.some(o=>allowed.has(o.id)));
    const rows=[...new Map(list.flatMap(g=>g.activities).map(a=>[a.id,a])).values()];
    return `<div class="section-heading"><div><h2>${esc(managing?profileName():'Clientes y prospectos')}</h2><p class="secondary">${list.filter(g=>g.contact).length} clientes vinculados · ${list.reduce((n,g)=>n+g.cases.length,0)} asuntos${list.some(g=>!g.contact)?' · Hay asuntos pendientes de vincular a un cliente':''}</p></div></div>${attentionBar(allRows)}<details class="agenda-panel" ${calendarOpen?'open':''}><summary>Calendario y avances</summary><div class="crm-layout">${calendar(rows)}<div>${timeline(rows,true)}</div></div></details><div class="client-list">${list.map((g,i)=>{
      if(!g.contact)return `<section class="unlinked-client"><p class="mini-label">Cliente por vincular</p>${g.cases.map((c,j)=>caseRow(c,i+'-'+j)).join('')}</section>`;
      const open=openClients.has(g.key),next=C.agenda(g.records,'')[0]||g.records[0]||{},fact=lastFact(g);
      return `<article class="client-row" data-client="${esc(g.contact.id)}"><button class="client-toggle" data-client-toggle="${esc(g.key)}" aria-expanded="${open}"><span class="case-chevron">${open?'⌄':'›'}</span><span><strong>${esc(g.contact.name)}</strong><span class="secondary">${esc([g.contact.company,g.contact.phone,g.contact.email].filter(Boolean).join(' · '))}</span><span class="secondary">${esc(g.cases.map(c=>c.records[0].title).join(' · '))}</span></span><span class="client-count">${g.cases.length} asunto${g.cases.length===1?'':'s'}</span></button><div class="client-summary"><p>${esc(fact?.text||'Sin avance registrado')}</p><p><b>Sigue:</b> ${esc(C.nextStep(next.next_action).text||'Definir siguiente paso')} · ${esc(C.ownerLabel(liveSnapshot,next.next_action))} · ${esc(next.next_date?dateLabel(next.next_date):'Sin fecha')}</p></div>${open?`<section class="client-cases" aria-label="Asuntos de ${esc(g.contact.name)}">${g.cases.map((c,j)=>caseRow(c,i+'-'+j)).join('')}<button class="text-button" data-client-new="${esc(g.contact.id)}">+ Asunto para este cliente</button></section>`:''}</article>`;
    }).join('')||'<p class="empty-cell">No hay clientes o asuntos que coincidan con esta vista.</p>'}</div>`;
  }
  function contactsView() {
    const contacts=snapshot.contacts.filter(c=>(!broker||(c.broker_ids||[]).includes(broker))&&[c.name,c.company,c.email,c.phone].join(' ').toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
    return table(['Contacto','Relación','Expedientes',''],contacts.map(c=>{
      const related=C.caseGroups(snapshot,broker,'','','').filter(g=>g.contacts.some(x=>x.id===c.id));
      return `<tr><td><strong>${esc(c.name)}</strong><span class="secondary">${esc([c.company,c.email,c.phone].filter(Boolean).join(' · '))}</span></td><td>${esc(c.type)}</td><td>${related.map(g=>`<button class="text-button" data-open="${esc(g.records[0].id)}">${esc(g.records[0].title)}</button>`).join('')}</td><td>${canEdit()?`<button data-edit-contact="${esc(c.id)}">Editar</button>`:''}</td></tr>`;
    }).join(''),'Contactos');
  }
  let publicPresentation=null, publicPresentationRequest=null;
  function publicMaterialCard(){
    queueMicrotask(hydratePublicMaterial);
    return '<section id="public-presentation" class="public-presentation" aria-live="polite"><p>Preparando material de presentación…</p></section>';
  }
  async function hydratePublicMaterial(){
    const ownToken=loadedToken, mount=$('public-presentation');
    if(!mount||!snapshot||tab!=='offer'||token()!==ownToken)return;
    try{
      if(!publicPresentation){if(!publicPresentationRequest)publicPresentationRequest=window.YodPublicCopy().then(window.InvestorStoryCore.normalize);publicPresentation=await publicPresentationRequest;}
      if(!snapshot||tab!=='offer'||token()!==ownToken||$('public-presentation')!==mount)return;
      const c=publicPresentation,u=C.safeLink(c.material_profile);
      if(!u||new URL(u).hostname!=='yodesarrollomx.github.io')throw Error('Enlace no disponible.');
      mount.innerHTML='<div><p class="eyebrow">PARA PRESENTAR</p><h3>'+esc(c.material_title)+'</h3><p>'+esc(c.material_body)+'</p></div><div class="presentation-actions"><a class="button primary" target="_blank" rel="noopener noreferrer" href="'+esc(u)+'">'+esc(c.material_open)+' ↗</a><button type="button" data-copy-story>'+esc(c.material_copy)+'</button><span class="secondary" data-copy-status role="status"></span></div>';
      mount.querySelector('[data-copy-story]').onclick=async()=>{
        const status=mount.querySelector('[data-copy-status]');
        try{await navigator.clipboard.writeText(u);status.textContent='Enlace copiado.';}
        catch(_){mount.querySelector('[data-copy-story]').hidden=true;const input=document.createElement('input');input.value=u;input.readOnly=true;input.setAttribute('aria-label','Enlace de presentación');mount.querySelector('.presentation-actions').append(input);input.focus();input.select();status.textContent='Selecciona y copia el enlace.';}
      };
    }catch(_){
      publicPresentationRequest=null;
      if(snapshot&&tab==='offer'&&token()===ownToken&&$('public-presentation')===mount){mount.innerHTML='<p>No se pudo cargar el material de presentación.</p><button type="button">Volver a intentar</button>';mount.querySelector('button').onclick=hydratePublicMaterial;}
    }
  }
  function materialView() {
    const all=C.caseGroups(snapshot,broker,'','','');
    return `<div class="section-heading"><h2>Material</h2><a class="button" href="index.html">Carpeta comercial ↗</a></div>`+publicMaterialCard()+table(['Expediente','Material',''],all.map(g=>{
      const links=groupLinks(g);
      return links?`<tr><td><strong>${esc(g.records[0].title)}</strong></td><td class="material-links">${links}</td><td><button data-open="${esc(g.records[0].id)}">Ver tablero →</button></td></tr>`:'';
    }).join(''),'Material por expediente');
  }
  function agreementsView() {
    const ids=new Set(current().map(o=>o.id));
    const parts=snapshot.participations.filter(p=>ids.has(p.opportunity_id)&&(!broker||p.broker_id===broker));
    return table(['Expediente','Participación','Estado',''],parts.map(p=>`<tr><td><strong>${esc((snapshot.opportunities.find(o=>o.id===p.opportunity_id)||{}).title)}</strong><span class="secondary">${esc(names([p.broker_id]))}</span></td><td>${esc(p.terms)} ${link(p.agreement_url,'Acuerdo')}</td><td>${esc(p.status)}</td><td><button data-open="${esc(p.opportunity_id)}">Ver tablero →</button></td></tr>`).join(''),'Acuerdos');
  }
  const initials = name => String(name||'').trim().split(/\s+/).slice(0,2).map(n=>n[0]||'').join('').toUpperCase();
  function portfolioStats(b) {
    const clients=C.clientGroups(snapshot,b.id,'','',''), rows=C.visible(snapshot,b.id,'',''), ids=new Set(rows.map(o=>o.id));
    return {clients:clients.filter(c=>c.contact), rows, control:controlRows(rows), history:CRM.history(snapshot.activities.filter(a=>ids.has(a.opportunity_id))), ppp:new Set(rows.filter(o=>CRM.pppReference(o)).map(o=>o.ppp_id)).size};
  }
  function teamView() {
    const own=C.ownPortfolio(snapshot), team=snapshot.brokers.filter(b=>b.id!==own?.id), ownStats=own?portfolioStats(own):null;
    const cases=C.caseGroups(snapshot,'','','',''), linked=cases.filter(g=>g.records.some(o=>CRM.pppReference(o))).length;
    const recent=CRM.history(snapshot.activities).filter(e=>e.status==='Realizado').slice(0,4);
    return `<section class="developer-hero"><div class="hero-identity"><span class="person-avatar hero-avatar" aria-hidden="true">${esc(initials(snapshot.actor.name))}</span><div><p class="eyebrow">MI PORTAL · SONORA</p><h2>${esc(snapshot.actor.name)}</h2><p>Master Developer <span class="role-dot">·</span> Dirección de plaza</p></div></div><div class="hero-caption">Tu equipo. Tus clientes.<br><strong>El siguiente paso, claro.</strong></div></section>
    <section class="overview-metrics" aria-label="Resumen de la plaza"><div><span>Equipo</span><strong>${team.length}</strong><small>responsables de cartera</small></div><div><span>Clientes y contactos</span><strong>${snapshot.contacts.length}</strong><small>en tu red autorizada</small></div><div><span>Asuntos</span><strong>${cases.length}</strong><small>expedientes independientes</small></div><div><span>Planes vinculados</span><strong>${linked}<em> / ${cases.length}</em></strong><small>con referencia al PPP</small></div></section>
    ${attentionBar(snapshot.opportunities)}
    <div class="direction-layout"><section class="direction-main">${own?`<article class="portfolio-card own-portfolio"><div class="own-heading"><span class="person-avatar" aria-hidden="true">${esc(initials(own.name))}</span><div><p class="eyebrow">MI CARTERA · MASTER DEVELOPER</p><h3>${esc(own.name)}</h3><p>${ownStats.clients.length} clientes · ${ownStats.rows.length} asuntos</p></div><button class="primary" data-broker="${esc(own.id)}">Mis clientes →</button></div>${!ownStats.rows.length?'<p class="own-empty">Aquí se reúnen los clientes y asuntos que te están asignados.</p>':''}</article>`:''}
    <div class="team-section-heading"><div><p class="eyebrow">LA RED QUE DESARROLLAMOS</p><h3>Mi equipo</h3></div><span>Despliega una cartera para ver sus asuntos</span></div>
    <section class="portfolio-grid" aria-label="Responsables de cartera">${team.map((b,i)=>{
      const x=portfolioStats(b),open=openTeam.has(b.id),last=x.history.find(e=>e.status==='Realizado');
      const clientCases=C.caseGroups(snapshot,b.id,'','','');
      return `<article class="portfolio-card team-card" data-team="${esc(b.id)}"><div class="team-card-top"><button class="team-toggle" data-team-toggle="${esc(b.id)}" aria-expanded="${open}" aria-controls="team-cases-${i}"><span class="person-avatar avatar-${i%4}" aria-hidden="true">${esc(initials(b.name))}</span><span class="team-person"><strong>${esc(b.name)}</strong><span class="secondary">${x.clients.length} clientes · ${x.rows.length} asuntos · ${x.ppp} PPP</span></span><span class="team-chevron" aria-hidden="true">${open?'−':'+'}</span></button><button data-broker="${esc(b.id)}" class="team-enter">Ver clientes →</button></div><div class="team-state"><span class="access-state ${b.active?'active':''}">${b.active?'Acceso individual activo':'Acceso individual pendiente'}</span>${x.control.overdue.length?`<span class="due-tag">${x.control.overdue.length} vencidos</span>`:x.control.unplanned.length?`<span>${x.control.unplanned.length} por organizar</span>`:'<span>Sin compromisos vencidos</span>'}<span class="portfolio-last">${last?'Movimiento · '+esc(dateLabel(last.meta?.occurred_at||last.date)):'Sin avances registrados'}</span></div>${open?`<section class="team-cases" id="team-cases-${i}" aria-label="Cartera de ${esc(b.name)}">${clientCases.length?clientCases.map(g=>{const o=g.records[0],c=snapshot.contacts.find(c=>c.id===o.contact_id);return `<div class="team-case"><div><strong>${esc(o.title)}</strong><span class="secondary">${esc(c?.name||'Cliente por vincular')} · ${esc(o.stage)}</span></div><span class="team-ppp">${CRM.pppReference(o)?link(o.ppp_url,'PPP'):'PPP por vincular'}</span><button data-open="${esc(o.id)}" class="open-board">Ver tablero →</button></div>`;}).join(''):'<p class="empty-cell">Esta cartera aún no tiene asuntos asignados.</p>'}</section>`:''}</article>`;
    }).join('')}</section></section>
    <aside class="direction-aside"><section class="activity-panel"><div class="panel-heading"><span class="eyebrow">LO MÁS RECIENTE</span><h3>Actividad del equipo</h3></div>${recent.map(a=>{const o=snapshot.opportunities.find(o=>o.id===a.opportunity_id);return `<button class="recent-event" data-open="${esc(a.opportunity_id)}"><span class="recent-dot"></span><span><time>${esc(dateLabel(a.meta?.occurred_at||a.date))}</time><strong>${esc(o?.title||'Expediente')}</strong><span class="recent-excerpt">${esc(a.text)}</span><small>${esc(a.source||a.type)}</small></span></button>`;}).join('')||'<p class="empty-cell">Los avances del equipo aparecerán aquí con su fecha y origen.</p>'}</section><section class="coverage-panel"><h3>Expedientes conectados</h3><p><strong>${linked}</strong> de ${cases.length} asuntos tienen PPP vinculado.</p><div class="coverage-track" role="img" aria-label="${linked} de ${cases.length} asuntos con PPP"><span style="width:${cases.length?linked/cases.length*100:0}%"></span></div><p class="secondary">El plan y sus versiones se consultan desde el expediente.</p><button class="text-button" data-tab="opportunities">Revisar todos los asuntos →</button></section></aside></div>`;
  }
  function groupLinks(g) {
    const seen=new Set();
    return g.records.flatMap(o=>[['ppp_url','Plan de potencial'],['documents_url','Documentos'],['project_url','Proyecto']].map(([key,label])=>{
      const url=C.safeLink(o[key]); if(!url||seen.has(url))return '';seen.add(url);return link(url,g.records.length>1?`${label} · ${o.title}`:label);
    })).join('');
  }
  function detail(o) {
    const g=o&&groupFor(o.id); if(!g)return '<p>Expediente no disponible.</p>';
    const contact=snapshot.contacts.find(c=>c.id===o.contact_id), step=C.nextStep(o.next_action);
    const parts=snapshot.participations.filter(p=>p.opportunity_id===o.id);
    let body='';
    if(detailTab==='history')body=`<section class="case-now" aria-label="Estado y siguiente paso"><div><p class="eyebrow">01 · EN QUÉ ESTAMOS</p><h3>${esc(o.stage)}</h3><p>${esc(lastFact(g)?.text||'Aún no hay un avance documentado.')}</p></div><div><p class="eyebrow">02 · QUÉ SIGUE</p><h3>${esc(C.ownerLabel(liveSnapshot,o.next_action))}</h3><p>${esc(step.text||'Definir el siguiente paso')}</p><span class="next-date">${esc(o.next_date?dateLabel(o.next_date):'Fecha por acordar')}</span></div><div><p class="eyebrow">03 · PLAN DE POTENCIAL</p><h3>${CRM.pppReference(o)?'Plan vinculado':'Pendiente de vincular'}</h3><p>${CRM.pppReference(o)?link(o.ppp_url,'Abrir plan de potencial'):'Asocia el PPP existente al editar este asunto.'}</p>${pppMount(o,true)}</div></section><div class="history-heading"><h3>Historia del asunto</h3><p class="secondary">Hechos, conversaciones y acuerdos con su fuente</p></div><div class="crm-layout"><div>${calendar(g.activities)}</div><div>${timeline(g.activities,g.records.length>1)}</div></div>`;
    if(detailTab==='records')body=table(['Gestión','Contacto','Estado',''],g.records.map(r=>`<tr><td><strong>${esc(r.title)}</strong><span class="secondary">${esc(r.kind)}</span></td><td>${esc((snapshot.contacts.find(c=>c.id===r.contact_id)||{}).name)}</td><td>${esc(r.stage)}</td><td><button data-select-record="${esc(r.id)}" ${r.id===selected?'disabled':''}>${r.id===selected?'Seleccionado':'Seleccionar'}</button></td></tr>`).join(''),'Gestiones relacionadas')+`<section class="record-info">${o.source_status?`<p>${esc(o.source_status)}</p>`:''}${CRM.caseInfo(o).text?`<p class="pre-wrap">${esc(CRM.caseInfo(o).text)}</p>`:''}${contact?`<p>${esc([contact.name,contact.company,contact.email,contact.phone].filter(Boolean).join(' · '))}</p>`:''}${canEdit()?`<button data-edit-opportunity="${esc(o.id)}">Editar registro</button>`:''}</section>`;
    if(detailTab==='material')body=`<div class="material-links">${groupLinks(g)||'<p class="empty-cell">No hay material vinculado.</p>'}</div>`;
    if(detailTab==='agreements')body=`${parts.map(p=>`<section class="agreement-item"><div class="row"><strong>${esc(names([p.broker_id]))}</strong><span class="status">${esc(p.status)}</span></div>${p.terms?`<p class="pre-wrap">${esc(p.terms)}</p>`:''}${link(p.agreement_url,'Ver acuerdo')}${canAgree()?`<button data-edit-participation="${esc(p.id)}">Editar acuerdo</button>`:''}</section>`).join('')}${canAgree()?'<button data-new="participation">+ Acuerdo</button>':''}`;
    return `<article class="detail"><button class="text-button" data-action="back">← Cartera</button><div class="detail-heading"><div><h2>${esc(g.records[0].title)}</h2>${g.contacts.length?`<p class="muted">${esc(g.contacts.map(c=>c.name).join(' · '))}</p>`:''}</div><div class="detail-actions">${canEdit()?'<button data-edit-opportunity="'+esc(o.id)+'">Editar asunto</button><button class="primary" data-followup="true">+ Avance</button><button data-schedule="true">Programar reunión</button>':''}${canEdit()&&!preview?`<details class="create-menu case-tools"><summary>Más</summary><div><button data-preevaluate="current">${window.BrokerEvaluator.caseId(o.notes)?'Abrir preevaluación':'Preevaluar terreno'}</button>${o.terrain_id||o.ppp_id?'<button data-related="true">+ Gestión</button>':''}</div></details>`:''}</div></div>${g.records.length>1?`<label class="record-picker"><span>Registro activo</span><select id="record-select">${options(g.records.map(r=>({id:r.id,name:r.title+' · '+r.kind})),o.id)}</select></label>`:''}<div class="record-status"><span class="status">${esc(o.stage)}</span>${step.text?`<span>${esc(step.text)}</span>`:''}${o.next_date?`<time>${esc(dateLabel(o.next_date))}</time>`:''}${step.owner?`<span class="muted">${esc(C.ownerLabel(liveSnapshot,o.next_action))}</span>`:''}</div><nav class="detail-tabs" aria-label="Expediente">${[['history','Historial'],['records',`Gestiones (${g.records.length})`],['material','Material'],['agreements','Acuerdos']].map(([id,label])=>`<button data-detail-tab="${id}" aria-current="${detailTab===id?'page':'false'}">${label}</button>`).join('')}</nav><div class="detail-body">${body}</div></article>`;
  }


  async function receiveEvaluation(){
    const params=new URLSearchParams(location.search),id=params.get('preevaluacion');
    if(!id||evaluationReturnHandled||preview||!canEdit())return;
    evaluationReturnHandled=true;
    try{
      const ev=await evaluator.summary(id);
      if(!snapshot.brokers.some(b=>b.id===ev.broker_id))throw Error('La evaluación no corresponde a esta cartera.');
      const target=params.get('opportunity'),linked=snapshot.opportunities.filter(o=>window.BrokerEvaluator.caseId(o.notes)===ev.id);
      if(linked.length>1)throw Error('Hay más de un registro vinculado. Abre el expediente que deseas actualizar.');
      const existing=target?snapshot.opportunities.find(o=>o.id===target):linked[0];
      if(target&&!existing)throw Error('El expediente de regreso no está en tu cartera.');
      editor('opportunity',window.BrokerEvaluator.recordFromEvaluation(ev,existing));
      $('form-title').textContent=existing?'Vincular preevaluación al terreno':'Registrar terreno preevaluado';
      $('form-error').textContent='La preevaluación ya está en Drive. Revisa el siguiente paso y guarda para incorporarla a tu cartera.';
      const u=new URL(location.href);u.searchParams.delete('preevaluacion');u.searchParams.delete('opportunity');history.replaceState({},'',u.href);
    }catch(e){$('notice').textContent=e.message;}
  }
  function chooseEvaluation(kind){
    if(!canEdit()||preview)return;
    const o=kind==='current'?snapshot.opportunities.find(o=>o.id===selected):null;
    const available=snapshot.brokers.filter(b=>!o||(o.broker_ids||[]).includes(b.id));
    const id=snapshot.actor.role==='broker'?snapshot.actor.id:managing?requestedBroker:broker;
    if(id&&available.some(b=>b.id===id)){launchEvaluation(id,o);return;}
    if(available.length===1){launchEvaluation(available[0].id,o);return;}
    edit=null;$('form-title').textContent='Cartera para la preevaluación';
    $('fields').innerHTML='<p>Selecciona la cartera donde se guardará este terreno.</p><label>Masterbroker<select id="evaluation-broker">'+options(available,'')+'</select></label><button type="button" id="launch-evaluation" class="primary">Abrir mapa →</button>';
    $('form-error').textContent='';$('save-record').hidden=true;$('editor').showModal();
    $('launch-evaluation').onclick=()=>{const chosen=$('evaluation-broker').value;$('editor').close();$('save-record').hidden=false;launchEvaluation(chosen,o);};
  }
  async function launchEvaluation(brokerId,o){
    const win=window.open('about:blank','_blank');
    if(!win){$('notice').textContent='Permite abrir la pestaña de preevaluación y vuelve a pulsar el botón.';return;}
    win.opener=null;win.document.body.textContent='Abriendo tu preevaluación…';
    busy=true;$('notice').textContent='Validando tu cartera para abrir el mapa…';
    try{win.location.replace(await evaluator.launch({broker_id:brokerId,opportunity_id:o?.id||'',case_id:window.BrokerEvaluator.caseId(o?.notes)}));accessNotice('Preevaluación abierta. Al guardar podrás regresar para registrar el terreno.');}
    catch(e){win.close();$('notice').textContent=e.message;}
    finally{busy=false;}
  }

  function field(name, label, value, type = 'text', choices, required = false) {
    return `<label><span>${esc(label)}</span>${choices ? `<select name="${name}" ${required ? 'required' : ''}>${options(choices,value || '')}</select>` : type === 'textarea' ? `<textarea name="${name}" maxlength="4000" ${required ? 'required' : ''}>${esc(value)}</textarea>` : `<input name="${name}" type="${type}" value="${esc(value)}" maxlength="1000" ${required ? 'required' : ''}>`}</label>`;
  }
  function editor(kind, record) {
    $('save-record').hidden=false;
    if (!canEdit() || (kind === 'participation' && !canAgree())) return;
    if (['activity','participation'].includes(kind) && !snapshot.opportunities.some(o => o.id === selected)) return;
    const r = record || (kind === 'activity' ? snapshot.opportunities.find(o=>o.id===selected) || {} : {}); edit = { kind, id: kind === 'activity' ? undefined : r.id, revision: snapshot.revision, requestId: crypto.randomUUID(), submitted: null };
    $('form-title').textContent = ({contact:'Contacto',opportunity:'Oportunidad',activity:'Registrar revisión',participation:'Participación'})[kind];
    let fields = '';
    if (kind === 'contact') fields = field('name','Nombre',r.name,'text',null,true) + field('type','Relación',r.type,'text',['Propietario','Inversionista','Aliado','Contacto']) + field('company','Empresa',r.company) + field('email','Correo',r.email,'email') + field('phone','Teléfono',r.phone,'tel') + field('notes','Notas',r.notes,'textarea');
    if (kind === 'opportunity') fields = field('title','Nombre de la oportunidad',r.title,'text',null,true) + field('kind','Tipo',r.kind,'text',['Terreno','Capital','Codesarrollo','Plan de potencial']) + field('contact_id','Contacto',r.contact_id,'text',[{id:'',name:'Por vincular'},...snapshot.contacts]) + field('location','Ubicación',r.location) + field('terrain_id','ID del terreno existente',r.terrain_id) + field('ppp_id','ID del PPP existente',r.ppp_id) + field('ppp_url','Enlace al PPP',r.ppp_url,'url') + field('documents_url','Carpeta del expediente',r.documents_url,'url') + field('project_url','Enlace al proyecto',r.project_url,'url') + field('stage','Etapa',r.stage || 'Recibido','text',C.stages) + field('next_owner','¿Quién gestiona el siguiente paso?',C.nextStep(r.next_action).owner,'text',ownerChoices(),true) + field('next_action','¿Qué debe pasar ahora?',C.nextStep(r.next_action).text,'text',null,true) + field('next_date','Fecha de seguimiento',r.next_date,'date',null,true) + field('notes','Notas',CRM.caseInfo(r).text,'textarea')+field('ppp_status','Estado del PPP',CRM.caseInfo(r).ppp_status,'text',CRM.pppStates)+field('decision','¿Requiere decisión de Dirección?',CRM.caseInfo(r).decision?'yes':'no','text',[{id:'no',name:'No'},{id:'yes',name:'Sí · pendiente de Dirección'}]);
    if (['contact','opportunity'].includes(kind) && snapshot.actor.role === 'direccion') fields += `<label><span>Masterbrokers vinculados</span><select name="broker_ids" multiple required>${snapshot.brokers.map(b => `<option value="${esc(b.id)}" ${(r.broker_ids || [broker]).includes(b.id) ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>`;
    if (kind === 'activity') fields = field('note','Avance, solicitud o respuesta',r.note,'textarea',null,true) + field('next_owner','¿Quién gestiona el siguiente paso?',C.nextStep(r.next_action).owner,'text',ownerChoices(),true) + field('next_action','Entregable o siguiente acción',C.nextStep(r.next_action).text,'text',null,true) + field('next_date','Fecha acordada de seguimiento',r.next_date,'date',null,true);
    if(kind==='activity'){
      const m=r.crm||{v:1,type:'Seguimiento',status:'Realizado',occurred_at:today()};
      fields=field('note',m.status==='Programado'?'¿Para qué nos reunimos?':'¿Qué se dijo / en qué quedó?',r.note,'textarea',null,true)+`<div class="crm-form-row">${field('crm_date','Fecha del hecho / reunión',CRM.day(m.occurred_at)||today(),'date',null,true)}${field('crm_type','Tipo',m.type,'text',CRM.types)}</div>`+field('crm_participants','Quiénes · PG, YOD, Masterbroker…',m.participants)+`<details class="form-advanced"><summary>Fuente y registro</summary>${field('crm_source','Origen',m.source||'Registro en tablero')}${field('crm_source_url','Referencia',m.source_url,'url')}${field('crm_status','Registro',m.status,'text',CRM.statuses)}</details>`+field('next_owner','Responsable del siguiente paso',C.nextStep(r.next_action).owner,'text',ownerChoices(),true)+field('next_action','Siguiente paso',C.nextStep(r.next_action).text,'text',null,true)+field('next_date','Fecha de seguimiento',r.next_date,'date',null,true);
      edit.crm=m;
    }
    if (kind === 'participation') fields = field('broker_id','Masterbroker',r.broker_id,'text',snapshot.brokers.filter(b => (snapshot.opportunities.find(o => o.id === selected).broker_ids || []).includes(b.id) && (!r.id || b.id === r.broker_id)),true) + field('status','Estado',r.status || 'Por definir','text',C.participationStates.slice(r.id ? C.participationStates.indexOf(r.status) : 0,(r.id ? C.participationStates.indexOf(r.status) : 0)+2)) + field('terms','Condiciones y base de cálculo',r.terms,'textarea',null,true) + field('agreement_url','Documento de acuerdo',r.agreement_url,'url');
    $('fields').innerHTML = (kind === 'activity' && r.note ? '<p class="form-intro">La solicitud quedará en el expediente y en los pendientes de YoDesarrollo. Describe el análisis que necesitas y acuerda la fecha; no se envía un mensaje externo.</p>' : kind === 'opportunity' ? '<p class="form-intro">Registra la oportunidad y acuerda el primer paso. Los enlaces y datos del terreno pueden completarse después.</p>' : '') + fields;
    if (kind === 'opportunity') {
      const advanced = document.createElement('details'); advanced.className = 'form-advanced'; advanced.innerHTML = '<summary>Vincular terreno, PPP y documentos existentes</summary>';
      for (const name of ['terrain_id','ppp_id','ppp_url','documents_url','project_url']) { const input = $('fields').querySelector(`[name="${name}"]`); if(input) advanced.append(input.closest('label')); }
      $('fields').append(advanced);
    }
    if (kind === 'opportunity' && Object.prototype.hasOwnProperty.call(r,'source_status')) {
      const note = document.createElement('p'); note.className = 'muted'; note.textContent = 'El nombre, los enlaces y el broker provienen de la cartera existente. Aquí se actualizan el seguimiento y la relación con el contacto.'; $('fields').prepend(note);
      for (const name of ['title','ppp_id','ppp_url','documents_url','broker_ids']) { const el = $('fields').querySelector(`[name="${name}"]`); if (!el) continue; if (el.tagName === 'SELECT') el.disabled = true; else el.readOnly = true; }
      edit.canonicalBrokers = r.broker_ids;
    }
    if (managing && r.id && ['contact','opportunity'].includes(kind)) edit.canonicalBrokers = r.broker_ids;
    if (edit.kind === 'activity' && !r.crm) { const outcome = document.createElement('div'); outcome.innerHTML = field('outcome','Resultado de la conversación','','text',[{id:'',name:'Seleccionar si aplica'},'Obtuve respuesta','Necesita más información','Sin respuesta','Solicité análisis a YOD','Recibí respuesta de YOD']); $('fields').prepend(outcome); }
    $('form-error').textContent = preview ? 'Estás explorando la vista del Masterbroker. No se guardan cambios desde esta vista previa.' : ''; $('save-record').disabled = preview; $('save-record').textContent = preview ? 'Guardado deshabilitado en vista previa' : 'Guardar'; $('editor').showModal();
  }
  $('workspace').onclick = e => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if(b.dataset.plaza){selectPortfolio('');return;}
    if(b.dataset.teamToggle){const id=b.dataset.teamToggle;openTeam.has(id)?openTeam.delete(id):openTeam.add(id);render();return;}
    if(b.dataset.attention){attention=b.dataset.attention==='all'?'':b.dataset.attention;tab='opportunities';selected='';query='';stage='';caseState='';render();return;}
    if(b.dataset.clientToggle){const key=b.dataset.clientToggle;openClients.has(key)?openClients.delete(key):openClients.add(key);render();return;}
    if(b.dataset.clientNew){const c=snapshot.contacts.find(c=>c.id===b.dataset.clientNew);editor('opportunity',{contact_id:c.id,broker_ids:c.broker_ids});return;}
    if(b.dataset.expand){const g=groupFor(b.dataset.expand);if(g){expanded.has(g.key)?expanded.delete(g.key):expanded.add(g.key);render();}return;}
    if(b.dataset.pppRetry){const o=snapshot.opportunities.find(o=>o.id===b.dataset.pppRetry);if(o){pppData.delete(o.ppp_id);pppClient.invalidate();render();}return;}
    if(b.dataset.calendarMove){calendarMonth=CRM.shiftMonth(calendarMonth||today().slice(0,7),Number(b.dataset.calendarMove));calendarDay='';render();return;}
    if(b.dataset.calendarDay){calendarDay=calendarDay===b.dataset.calendarDay?'':b.dataset.calendarDay;render();return;}
    if(b.dataset.calendarClear){calendarDay='';render();return;}
    if(b.dataset.schedule){const o=snapshot.opportunities.find(o=>o.id===selected);editor('activity',{next_action:C.encodeStep(C.nextStep(o.next_action).owner,'Reunión de seguimiento'),next_date:calendarDay||o.next_date,crm:{v:1,type:'Reunión',status:'Programado',occurred_at:calendarDay||o.next_date||today(),participants:''}});return;}
    if(b.dataset.resolveEvent){const a=snapshot.activities.find(a=>a.id===b.dataset.resolveEvent);if(!a)return;const event=CRM.decode(a),o=snapshot.opportunities.find(o=>o.id===a.opportunity_id);selected=o.id;editor('activity',{note:b.dataset.result==='Cancelado'?'Reunión cancelada.':b.dataset.result==='Programado'?event.text:'',next_action:o.next_action,next_date:o.next_date,crm:{...event.meta,v:1,type:event.type,status:b.dataset.result,occurred_at:today(),replaces:a.id}});return;}
    if (b.dataset.preevaluate) { chooseEvaluation(b.dataset.preevaluate); return; }
    if (b.dataset.tab) { attention=''; caseState = ''; detailTab = 'history'; tab = b.dataset.tab; selected = ''; query = ''; stage = ''; render(); }
    if (b.dataset.open) { selected = b.dataset.open; tab = 'opportunities'; detailTab = 'history'; calendarDay=''; render(); }
    if (b.dataset.quickFollowup) { selected = b.dataset.quickFollowup; const o = snapshot.opportunities.find(x=>x.id===selected); editor('activity',{next_action:o.next_action,next_date:o.next_date}); }
    if (b.dataset.start) editor('opportunity',{kind:b.dataset.start});
    if (b.dataset.detailTab) { detailTab=b.dataset.detailTab; render(); }
    if (b.dataset.selectRecord) { selected=b.dataset.selectRecord; render(); }
    if (b.dataset.related) { const o=snapshot.opportunities.find(r=>r.id===selected); editor('opportunity',{kind:'Plan de potencial',terrain_id:o.terrain_id,ppp_id:o.ppp_id,location:o.location,broker_ids:o.broker_ids}); }
    if (b.dataset.prepare) { selected = b.dataset.prepare; tab = 'opportunities'; query = ''; stage = ''; render(); }
    if (b.dataset.followup) { const o=snapshot.opportunities.find(x=>x.id===selected); editor('activity',{next_action:o.next_action,next_date:o.next_date}); }
    if (b.dataset.agreementRequest) editor('activity',{note:'Solicitud a Dirección: definir y documentar mi participación en esta oportunidad. ',next_action:'[YOD] Revisar condiciones de participación con el Masterbroker'});
    if (b.dataset.request) editor('activity', {note:'Solicitud de análisis a YoDesarrollo: ',next_action:'[YOD] Revisar solicitud y definir entregable'});
    if (b.dataset.offerContact) editor('contact',{notes:'Interés en producto inmobiliario. Producto, disponibilidad y condiciones por confirmar con YoDesarrollo.'});
    if (b.dataset.broker) { selectPortfolio(b.dataset.broker); return; }
    if (b.dataset.action === 'refresh') load();
    if (b.dataset.action === 'back') { selected = ''; render(); }
    if (b.dataset.new) editor(b.dataset.new);
    if (b.dataset.editParticipation) { const p = snapshot.participations.find(p => p.id === b.dataset.editParticipation); selected = p.opportunity_id; editor('participation',p); }
    if (b.dataset.editContact) editor('contact',snapshot.contacts.find(c => c.id === b.dataset.editContact));
    if (b.dataset.editOpportunity) editor('opportunity',snapshot.opportunities.find(o => o.id === b.dataset.editOpportunity));
  };
  const close = () => { if (!busy) { $('editor').close(); edit = null; } };
  $('close-editor').onclick = close; $('cancel-editor').onclick = close;
  $('editor').addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  $('record-form').onsubmit = async e => {
    e.preventDefault(); if (preview || busy || !edit || !snapshot) return;
    const fd = new FormData(e.target), record = Object.fromEntries(fd);
    if (Object.prototype.hasOwnProperty.call(record,'outcome')) { if(record.outcome) record.note = record.outcome + ': ' + record.note; delete record.outcome; }
    if(edit.kind==='activity'){
      const m={...edit.crm,v:1,type:record.crm_type,status:record.crm_status,occurred_at:record.crm_date,participants:record.crm_participants,source:record.crm_source,source_url:record.crm_source_url,stage:snapshot.opportunities.find(o=>o.id===selected)?.stage||''};
      try{record.note=CRM.encode(record.note,m);}catch(err){$('form-error').textContent=err.message;return;}
      for(const k of Object.keys(record))if(k.startsWith('crm_'))delete record[k];
    }
    if(edit.kind==='opportunity'){try{record.notes=CRM.encodeCase(record.notes,record.ppp_status,record.decision==='yes');}catch(err){$('form-error').textContent=err.message;return;}delete record.ppp_status;delete record.decision;}
    if (record.next_action !== undefined) { record.next_action = C.encodeStep(record.next_owner,record.next_action); delete record.next_owner; }
    if (edit.id) record.id = edit.id;
    if (['contact','opportunity'].includes(edit.kind)) record.broker_ids = snapshot.actor.role === 'direccion' ? fd.getAll('broker_ids') : [snapshot.actor.id];
    if (edit.canonicalBrokers) record.broker_ids = edit.canonicalBrokers;
    if (['activity','participation'].includes(edit.kind)) record.opportunity_id = selected;
    for (const key of ['ppp_url','documents_url','project_url','agreement_url']) if (record[key] && !C.safeLink(record[key])) { $('form-error').textContent = 'Usa un enlace HTTPS de Yod OS o Google Drive.'; return; }
    const body = JSON.stringify(record);
    if (edit.submitted && edit.submitted !== body) { $('form-error').textContent = 'Primero actualiza la cartera para comprobar el intento anterior. No se enviará una segunda versión sin verificar.'; return; }
    edit.submitted = body; busy = true; $('save-record').disabled = true; $('form-error').textContent = 'Guardando…';
    try { const result = await client.save(edit.kind,record,edit.revision,edit.requestId); applySnapshot(result); pppClient.invalidate(); pppData.clear(); loadedToken = token(); $('editor').close(); const savedKind=edit.kind; edit = null; if(savedKind==='opportunity'){tab='opportunities';selected='';query='';stage='';} if(savedKind==='contact'){tab='contacts';query='';} accessNotice('Guardado.'); render(); }
    catch (err) { $('form-error').textContent = err.message; if (token() !== loadedToken) { clear(); $('notice').textContent = 'La sesión cambió. Vuelve a entrar.'; } }
    finally { busy = false; $('save-record').disabled = false; }
  };
  window.addEventListener('storage', e => { if (e.key === 'pyod_clave_v1' || e.key === null) { client.invalidate(); clear(); $('notice').textContent = 'La sesión cambió. Actualiza para validar tu acceso.'; } });
  window.addEventListener('focus', () => { if (token() && token() !== loadedToken) { client.invalidate(); clear(); load(); } });
  load();
})();
