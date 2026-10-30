(function () {
  'use strict';
  const C = window.BrokersCore, CRM = window.BrokersCRM, $ = id => document.getElementById(id);
  // Set only after contrasting the existing live backend and publishing brokers.v1.
  // No separate database, public fixture or whole-board fallback is permitted.
  const config = window.YDR_BROKERS_CONFIG || {};
  let requestedBroker = new URLSearchParams(window.location.search).get('masterbroker') || '';
  let manageRequested = new URLSearchParams(window.location.search).get('mode') === 'manage';
  let preview = false, managing = false, caseState = '', detailTab = 'history', attention = '', liveSnapshot = null;
  let temporalAsOf = '', temporalPane = 'today';
  const expanded = new Set(), pppData = new Map();
  let calendarMonth = '', calendarDay = '', calendarOpen = false, prospectsOpen = false, crmGeneration = 0;
  const token = () => { try { return localStorage.getItem('pyod_clave_v1') || ''; } catch (_) { return ''; } };
  const evaluator = window.BrokerEvaluator.create(config,token,window.fetch.bind(window));
  const pppClient = CRM.createPPPClient({url:()=>config.pppUrl || config.evaluatorUrl,token,fetch:window.fetch.bind(window)});
  let evaluationReturnHandled=false, receivingEvaluation=false, evaluationEpoch=0;
  const client = C.createClient({ url: config.url, token, fetch: window.fetch.bind(window) });
  let snapshot = null, tab = new URLSearchParams(location.search).get('tab') === 'presentations' ? 'presentations' : '', broker = '', query = '', stage = '', selected = '', busy = false, edit = null, loadedToken = '';
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
    if (!tab || tab === 'brokers') tab = 'opportunities';
  }
  function accessNotice(message = '') {
    const base = 'brokers.html?embed=1&masterbroker=' + encodeURIComponent(requestedBroker);
    $('notice').textContent = message || (preview ? 'Vista previa de ' + profileName() + '. Explora sin modificar expedientes.' : '');
    if (preview) { const a = document.createElement('a'); a.href = base + (preview ? '&mode=manage' : ''); a.textContent = preview ? 'Gestionar esta cartera como Dirección →' : 'Ver experiencia del Masterbroker →'; $('notice').append(' ',a); }
  }
  const canAgree = () => canEdit() && snapshot.actor.role === 'direccion' && snapshot.capabilities.agree_participation === true;
  const names = ids => (ids || []).map(id => (snapshot.brokers.find(b => b.id === id) || {}).name || 'Masterbroker').join(' · ');
  const current = () => C.visible(snapshot, broker, query, stage);
  function clear() { $('benefits').close();$('benefits-content').replaceChildren(); evaluationEpoch++;receivingEvaluation=false;evaluationReturnHandled=false; crmGeneration++; expanded.clear(); pppData.clear(); pppClient.invalidate(); calendarMonth='';calendarDay='';calendarOpen=false; $('identity').textContent = ''; snapshot = null; liveSnapshot = null; preview = false; managing = false; loadedToken = ''; selected = ''; $('workspace').replaceChildren(); $('workspace').hidden = true; if ($('editor').open) $('editor').close(); edit = null; }
  async function load() {
    if (busy) return;
    const prior={selected,tab,query,stage,caseState,attention,token:loadedToken};
    busy = true; clear(); $('notice').textContent = 'Validando tu acceso y leyendo la cartera…';
    try { const live = await client.load(); applySnapshot(live); loadedToken = token();
      if(prior.token===loadedToken){tab=prior.tab||tab;query=prior.query;stage=prior.stage;caseState=prior.caseState;attention=prior.attention;if(snapshot.opportunities.some(o=>o.id===prior.selected))selected=prior.selected;}
      accessNotice(); render(); await receiveEvaluation(); }
    catch (e) { clear(); $('notice').textContent = e.message; const b = document.createElement('button'); b.textContent = 'Volver a intentar'; b.onclick = load; $('notice').append(' ', b); }
    finally { busy = false; }
  }
  const people = () => (liveSnapshot || snapshot).brokers;
  const ownerChoices = () => [{id:'',name:'Seleccionar responsable'},...people().map(b=>({id:'person:'+b.id,name:b.name})),...(!people().some(b=>b.id===snapshot.actor.id)?[{id:'person:'+snapshot.actor.id,name:snapshot.actor.name}]:[]),{id:'Masterbroker',name:'Masterbroker · sin persona definida'},{id:'YOD',name:'YoDesarrollo · sin persona definida'},{id:'PG',name:'PG'}];
  function selectPortfolio(id) {
    requestedBroker=id;manageRequested=!!id;tab='opportunities';selected='';query='';stage='';caseState='';attention='';calendarDay='';expanded.clear();
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
  function scopeNavigation() {
    if(liveSnapshot.actor.role!=='direccion'||preview)return '';
    const own=C.ownPortfolio(liveSnapshot),ordered=C.orderedPortfolios(liveSnapshot,['Eduardo Lara','Alejandro Franco','Lupita']);
    return `<nav class="scope-switcher" aria-label="Carteras"><button data-plaza="1" aria-current="${!requestedBroker?'page':'false'}"><span class="scope-symbol" aria-hidden="true">◈</span> Mi equipo</button>${ordered.map(b=>`<button data-broker="${esc(b.id)}" aria-current="${requestedBroker===b.id?'page':'false'}" title="${esc(b.name)}"><span class="scope-avatar" aria-hidden="true">${esc(initials(b.name))}</span><span class="scope-role">${C.portfolioRoleLabel(b.id)}</span> ${esc(b.name)}${b.id===own?.id?' · Mi cartera':''}</button>`).join('')}</nav>`;
  }
  function render() {
    if (!snapshot || token() !== loadedToken) { clear(); return; }
    document.querySelector('#brokers h1').textContent = liveSnapshot.actor.role==='direccion'?'Master Developer':'Master Broker';
    $('identity').textContent = snapshot.actor.name+' · '+(snapshot.actor.role==='direccion'?'Master Developer':'Master Broker');
    $('workspace').hidden = false;
    $('brokers').classList.toggle('personal-workspace',isPersonal());
    const own=C.ownPortfolio(liveSnapshot),scopeName=managing?(requestedBroker===own?.id?'Mi cartera':profileName()):snapshot.actor.role==='direccion'?'Mi equipo':'Mi cartera';
    const teamHome=liveSnapshot.actor.role==='direccion'&&!requestedBroker&&tab==='opportunities'&&!selected;
    const isList=['opportunities','brokers'].includes(tab), allRows=C.visible(snapshot,broker,'','');
    if(tab==='brokers')tab='opportunities';
    $('workspace').innerHTML = `${scopeNavigation()}<div class="work-heading"><div><p class="eyebrow">${esc(scopeName)}</p><h2>${teamHome?'Master Brokers':tab==='presentations'?'Presentaciones':tab==='contacts'?'Contactos':tab==='offer'?'Material comercial':tab==='participations'?'Acuerdos':'Clientes y oportunidades'}</h2></div><div class="workspace-actions"><button data-tab="presentations" aria-label="Abrir portal de presentaciones">Presentaciones</button>${tab!=='opportunities'?'<button data-tab="opportunities">← Seguimiento</button>':''}${canEdit()?'<button class="primary" data-new="contact">+ Cliente</button>':''}<details class="workspace-menu"><summary aria-label="Herramientas de cartera">•••</summary><div><button data-tab="contacts">Directorio de contactos</button><button data-tab="offer">Material comercial</button><button data-tab="participations">Acuerdos de cartera</button><button data-benefits="1">Beneficios por ser Masterbroker</button>${canEdit()?'<button data-new="opportunity">Nueva oportunidad</button>':''}<button data-action="refresh">Actualizar cartera</button></div></details></div></div>${isList||tab==='contacts'?`<div class="work-toolbar"><label class="search-field"><span aria-hidden="true">⌕</span><input id="search" type="search" aria-label="Buscar en esta sección" placeholder="Buscar cliente o asunto…" value="${esc(query)}"></label>${isList?`<button data-agenda="1" aria-pressed="${calendarOpen}">Agenda</button><details class="filter-menu"><summary>Filtrar${attention||stage||caseState?' · activo':''}</summary><div><label>Enfoque<select id="attention-filter"><option value="">Todos los asuntos</option>${options([{id:'decision',name:'Requieren decisión'},{id:'today',name:'Seguimiento hoy'},{id:'overdue',name:'Fecha de seguimiento pasada'},{id:'unplanned',name:'Sin siguiente paso completo'}],attention)}</select></label><label>Estado<select id="state-filter">${options([{id:'',name:'Todos'},{id:'open',name:'Abiertos'},{id:'closed',name:'Cerrados'}],caseState)}</select></label><label>Etapa<select id="stage-filter"><option value="">Todas las etapas</option>${options(C.stages,stage)}</select></label></div></details>`:''}</div>`:''}${isList&&!selected&&!teamHome?journeyHome():''}<div id="content" class="${isList?'work-surface'+(selected?' has-detail':''):''}"></div>`;
    const content=$('content');
    if(teamHome)content.innerHTML=teamView();
    else if(isList)content.innerHTML=`<section class="work-list" aria-label="Cartera de clientes">${calendarOpen&&!selected?`<section class="agenda-panel"><div class="crm-layout">${calendar(snapshot.activities)}<div>${timeline(snapshot.activities,true)}</div></div></section>`:''}${portfolio()}</section>${selected?`<section class="work-detail" aria-label="Asunto seleccionado">${detail(snapshot.opportunities.find(o=>o.id===selected))}</section>`:''}`;
    if(tab==='contacts')content.innerHTML=contactsView();
    if(tab==='offer')content.innerHTML=materialView();
    if(tab==='participations')content.innerHTML=agreementsView();
    if(tab==='presentations')window.YODPresentationHub?.mount(content,{snapshot,liveSnapshot,brokerId:broker,caseId:selected});
    if($('search'))$('search').addEventListener('input',e=>{query=e.target.value;const pos=e.target.selectionStart;render();$('search').focus();try{$('search').setSelectionRange(pos,pos);}catch(_){}});
    if($('attention-filter'))$('attention-filter').onchange=e=>{attention=e.target.value;selected='';render();};
    if($('stage-filter'))$('stage-filter').onchange=e=>{stage=e.target.value;selected='';render();};
    if($('state-filter'))$('state-filter').onchange=e=>{caseState=e.target.value;selected='';render();};
    if($('record-select'))$('record-select').onchange=e=>{selected=e.target.value;render();};
    if($('temporal-asof'))$('temporal-asof').onchange=e=>{const v=e.target.value;temporalAsOf=/^\d{4}-\d{2}-\d{2}$/.test(v)&&v<=today()?v:'';render();$('temporal-asof')?.focus({preventScroll:true});};
    document.querySelector('.prospect-list')?.addEventListener('toggle',e=>{prospectsOpen=e.target.open;});
    hydratePPP();
  }
  function openPresentationBoard(caseId=''){
    const u=new URL('presentaciones.html',location.href);
    if(requestedBroker)u.searchParams.set('masterbroker',requestedBroker);
    if(caseId)u.searchParams.set('case',caseId);
    location.assign(u.href);
  }
  function teamView(){
    const own=C.ownPortfolio(liveSnapshot);
    const rows=C.orderedPortfolios(liveSnapshot).filter(b=>!query||b.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
    return `<section class="md-team" aria-label="Equipo de Master Brokers">${rows.map(b=>{
      const cases=C.caseGroups(liveSnapshot,b.id,'','','');
      const activities=liveSnapshot.activities.filter(a=>cases.some(g=>g.records.some(o=>o.id===a.opportunity_id))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      return `<button class="md-broker-row" data-open-broker="${esc(b.id)}"><span class="scope-avatar">${esc(initials(b.name))}</span><span><strong>${esc(b.name)}</strong><small>${b.id===own?.id?'Mi cartera · ':''}${cases.length} ${cases.length===1?'proyecto':'proyectos'}${activities[0]?' · Último movimiento '+esc(dateLabel(activities[0].date)):''}</small></span><span aria-hidden="true">→</span></button>`;
    }).join('')||'<p>No hay brokers que coincidan con la búsqueda.</p>'}</section>`;
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
  function casePriority(o){return CRM.caseInfo(o).decision?0:C.overdue(o,today())?1:o.next_date?2:o.stage==='En pausa'?4:3;}
  function caseRow(g,index){
    const o=g.records[0],a=lastFact(g),step=C.nextStep(o.next_action),open=expanded.has(g.key),info=CRM.caseInfo(o),ppp=CRM.pppReference(o);
    return `<article class="case-row ${selected===o.id?'is-current':''}" data-case="${esc(g.key)}"><button class="case-main" data-open="${esc(o.id)}" aria-label="Abrir ${esc(o.title)}" aria-current="${selected===o.id?'true':'false'}"><span class="case-title-line"><strong>${esc(o.title)}</strong><span class="status">${esc(o.stage)}</span></span><span class="case-progress">${esc(o.kind||'Proyecto')} · ${o.ppp_id?'Plan de potencial vinculado':'Plan de potencial pendiente'}</span><span class="case-task">${info.decision?'<span class="decision-marker">Decisión</span>':''}${esc(step.text||'Definir el primer compromiso con el cliente')}</span><span class="case-owner">${esc(C.ownerLabel(liveSnapshot,o.next_action))}<span aria-hidden="true"> · </span><time class="${C.overdue(o,today())?'late-date':''}">${esc(o.next_date?dateLabel(o.next_date):'Fecha por acordar')}</time></span></button><div class="case-row-footer"><span class="case-proof ${ppp?'linked':''}">${ppp?link(o.ppp_url,'PPP'):'PPP pendiente'}${info.ppp_status!=='Por confirmar'?' · '+esc(info.ppp_status):''}</span><button class="case-toggle" data-expand="${esc(o.id)}" aria-expanded="${open}" aria-controls="case-preview-${index}">${open?'Cerrar resumen':'Resumen'} <span aria-hidden="true">${open?'−':'+'}</span></button></div>${open?`<section class="case-preview" id="case-preview-${index}" aria-label="Resumen de ${esc(o.title)}">${pppMount(o)}<p><span class="mini-label">Último resultado</span> ${esc(a?.text||'Aún no hay un resultado registrado.')}</p><p><span class="mini-label">Propietario / referencia</span> ${esc(g.contacts.filter(c=>c.type==='Propietario').map(c=>c.name).join(' · ')||'Por vincular')}</p>${link(o.documents_url,'Documentos')}</section>`:''}</article>`;
  }
  function journeyHome(){
    const total=C.caseGroups(snapshot,broker,'','','').length;
    const latest=C.visible(snapshot,broker,'','').slice().sort((a,b)=>String(b.updated_at||b.last_review||'').localeCompare(String(a.updated_at||a.last_review||'')))[0];
    return `<section class="journey-home" aria-label="Tu recorrido de desarrollo"><div class="journey-heading"><div><p class="eyebrow">DE LA CONVERSACIÓN AL PROYECTO</p><h2>Una oportunidad.<br>Un lugar para llevarla.</h2><p>Presenta la idea, explora un inmueble y conserva su historia en tu cartera.</p></div><span class="journey-count"><strong>${total}</strong> ${total===1?'expediente':'expedientes'}</span></div><div class="journey-actions"><button class="journey-card" data-tab="offer"><span class="journey-symbol" aria-hidden="true">↗</span><span><strong>Presentar YoDesarrollo</strong><small>Una presentación común para conversar y compartir.</small></span><span aria-hidden="true">↗</span></button>${canEdit()&&!preview?`<button class="journey-card journey-primary" data-preevaluate="new"><span class="journey-symbol" aria-hidden="true">⌖</span><span><strong>Analizar un inmueble</strong><small>Abre el mapa. Ubica, traza y revisa sus posibilidades.</small></span><span aria-hidden="true">→</span></button>`:''}<button class="journey-card" ${latest?'data-journey-resume="'+esc(latest.id)+'"':'data-journey-cases="1"'}><span class="journey-symbol" aria-hidden="true">↺</span><span><strong>Abrir un expediente</strong><small>${latest?esc(latest.title):'Los terrenos que incorpores aparecerán aquí.'}</small></span><span aria-hidden="true">↓</span></button></div></section>`;
  }
  function caseJourney(o){
    const ev=window.BrokerEvaluator.caseId(o.notes),ppp=CRM.pppReference(o),step=C.nextStep(o.next_action);
    return `<section class="case-journey" aria-label="Recorrido de este inmueble"><div class="journey-case-location"><span class="mini-label">RECORRIDO DEL EXPEDIENTE</span></div><ol class="journey-rail"><li><span class="journey-number">01</span><strong>Inmueble</strong><small>${ev?'Evaluación vinculada':'Explora su ubicación y medidas'}</small>${canEdit()&&!preview?`<button data-preevaluate="current">${ev?'Continuar evaluación':'Abrir mapa'} →</button>`:''}</li><li><span class="journey-number">02</span><strong>Plan de potencial</strong><small>${ppp?'Consulta la versión guardada':'Acuerda el análisis que necesita'}</small>${ppp?link(o.ppp_url,'Abrir plan'):canEdit()&&!preview?'<button data-request="true">Solicitar análisis →</button>':''}</li><li><span class="journey-number">03</span><strong>Conversación</strong><small>Presentación general y material del caso</small><button data-case-present="1">Preparar presentación →</button></li><li><span class="journey-number">04</span><strong>Siguiente paso</strong><small>Compromiso, responsable y fecha</small>${canEdit()&&!preview?'<button data-journey-followup="true">Ver siguiente paso ↓</button>':''}</li></ol><p class="journey-footnote">Cada referencia muestra lo que ya está guardado. Una evaluación inicial no aprueba el desarrollo.</p></section>`;
  }
  function portfolio(){
    const allRows=C.visible(snapshot,broker,'',''),d=controlRows(allRows),allowed=attention?new Set((d[attention]||[]).map(o=>o.id)):null;
    const list=C.clientGroups(snapshot,broker,query,stage,caseState).filter(g=>!allowed||g.records.some(o=>allowed.has(o.id)));
    const active=list.filter(g=>g.cases.length),prospects=list.filter(g=>!g.cases.length&&g.contact);
    active.sort((a,b)=>Math.min(...a.records.map(casePriority))-Math.min(...b.records.map(casePriority)));
    const content=active.map((g,i)=>{
      const cases=[...g.cases].sort((a,b)=>casePriority(a.records[0])-casePriority(b.records[0]));
      return `<section class="client-row ${g.contact?'':'unlinked-client'}" ${g.contact?'data-client="'+esc(g.contact.id)+'"':''}><header class="client-heading"><div><span class="client-avatar" aria-hidden="true">${g.contact?esc(initials(g.contact.name)):'?'}</span><div><h3>${esc(g.contact?.name||'Cliente por identificar')}</h3><p>${esc(g.contact?names(g.contact.broker_ids):names(g.records[0]?.broker_ids))}${g.cases.length>1?' · '+g.cases.length+' asuntos':''}</p></div></div>${g.contact&&canEdit()?`<details class="client-menu"><summary aria-label="Opciones de ${esc(g.contact.name)}">•••</summary><div><button data-edit-contact="${esc(g.contact.id)}">Editar cliente</button><button data-client-new="${esc(g.contact.id)}">+ Asunto para este cliente</button></div></details>`:''}</header><div class="client-cases">${cases.map((c,j)=>caseRow(c,i+'-'+j)).join('')}</div></section>`;
    }).join('');
    return `<div class="client-list">${content||`<section class="workspace-empty"><span aria-hidden="true">↗</span><h3>${query||attention||stage||caseState?'No hay coincidencias':'Tu siguiente oportunidad empieza aquí'}</h3><p>${query||attention||stage||caseState?'Cambia la búsqueda o los filtros para ver otros asuntos.':'Agrega un cliente y registra qué busca. Su terreno, plan y seguimiento quedarán juntos.'}</p>${canEdit()&&!query?'<button data-new="opportunity">+ Registrar oportunidad</button>':''}</section>`}${prospects.length?`<details class="prospect-list" ${prospectsOpen?'open':''}><summary>Contactos sin oportunidad <span>${prospects.length}</span></summary>${prospects.map(g=>`<article class="prospect-row" data-client="${esc(g.contact.id)}"><div><strong>${esc(g.contact.name)}</strong><span class="secondary">${esc([g.contact.company,g.contact.phone,g.contact.email].filter(Boolean).join(' · ')||g.contact.type||'Contacto')}</span></div>${canEdit()?`<button data-client-new="${esc(g.contact.id)}">+ Asunto</button>`:''}</article>`).join('')}</details>`:''}</div>`;
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
    const selectedCase=snapshot.opportunities.find(o=>o.id===selected);
    const all=C.caseGroups(snapshot,broker,'','','').filter(g=>!selectedCase||g.records.some(o=>o.id===selectedCase.id));
    return `<div class="section-heading"><div><p class="eyebrow">PRESENTAR Y ACOMPAÑAR</p><h2>Una conversación con dirección.</h2></div>${selectedCase?'<button data-open="'+esc(selectedCase.id)+'">← Volver al expediente</button>':''}</div><section class="presenter-guide"><div><span class="journey-number">1</span><strong>Entiende qué busca</strong><p>Invertir, desarrollar su propiedad o explorar una colaboración.</p></div><div><span class="journey-number">2</span><strong>Conecta con un caso</strong><p>Usa su ubicación, plan y documentos. Distingue lo estudiado de lo que falta comprobar.</p></div><div><span class="journey-number">3</span><strong>Acuerda qué sigue</strong><p>Una revisión, un análisis o una reunión. Registra responsable y fecha en el expediente.</p></div></section>`+publicMaterialCard()+`<div class="section-heading"><h3>${selectedCase?'Material de '+esc(selectedCase.title):'Material de tus expedientes'}</h3></div>`+table(['Expediente','Material',''],all.map(g=>{
      const links=groupLinks(g);
      return links?`<tr><td><strong>${esc(g.records[0].title)}</strong></td><td class="material-links">${links}</td><td><button data-open="${esc(g.records[0].id)}">Ver tablero →</button></td></tr>`:'';
    }).join(''),'Material por expediente')+`<details class="form-advanced"><summary>Otros recursos comerciales</summary><p>${link(new URL('index.html',location.href).href,'Abrir carpeta comercial')}</p></details>`;
  }
  function showBenefits() {
    if(!snapshot||token()!==loadedToken)return;
    $('benefits-content').innerHTML='<p>Dirección aún no publica los beneficios generales.</p><h3>Acuerdos registrados en esta cartera</h3>'+agreementsView(true);
    $('benefits').showModal();
  }
  $('benefits').addEventListener('close',()=>{$('benefits-content').replaceChildren();});
  $('close-benefits').onclick=()=>{$('benefits').close();$('benefits-content').replaceChildren();};
  $('benefits-content').onclick=e=>{const b=e.target.closest('[data-open]');if(!b||!snapshot||token()!==loadedToken)return;const o=snapshot.opportunities.find(o=>o.id===b.dataset.open);if(!o)return;$('benefits').close();$('benefits-content').replaceChildren();selected=o.id;tab='opportunities';detailTab='agreements';temporalAsOf='';temporalPane='today';render();};
  function agreementsView(all=false) {
    const ids=new Set((all?C.visible(snapshot,broker,'',''):current()).map(o=>o.id));
    const parts=snapshot.participations.filter(p=>ids.has(p.opportunity_id)&&(!broker||p.broker_id===broker));
    return table(['Expediente','Participación','Estado',''],parts.map(p=>`<tr><td><strong>${esc((snapshot.opportunities.find(o=>o.id===p.opportunity_id)||{}).title)}</strong><span class="secondary">${esc(names([p.broker_id]))}</span></td><td>${esc(p.terms)} ${link(p.agreement_url,'Acuerdo')}</td><td>${esc(p.status)}</td><td><button data-open="${esc(p.opportunity_id)}">Ver tablero →</button></td></tr>`).join(''),'Acuerdos');
  }
  const initials = name => String(name||'').trim().split(/\s+/).slice(0,2).map(n=>n[0]||'').join('').toUpperCase();
  function groupLinks(g) {
    const seen=new Set();
    return g.records.flatMap(o=>[['ppp_url','Plan de potencial'],['documents_url','Documentos'],['project_url','Proyecto']].map(([key,label])=>{
      const url=C.safeLink(o[key]); if(!url||seen.has(url))return '';seen.add(url);return link(url,g.records.length>1?`${label} · ${o.title}`:label);
    })).join('');
  }
  function temporalFocus(){document.querySelector('.temporal-tabs [role="tab"][aria-selected="true"]')?.focus({preventScroll:true});}
  // Read-only view of one case on a chosen day: history, backed-up state and plans. It never saves or changes the snapshot.
  function temporalView(o,g){
    const t=CRM.temporal(g.activities,temporalAsOf,{stage:o.stage,next_action:o.next_action,next_date:o.next_date,decision:CRM.caseInfo(o).decision,last_review:o.last_review});
    const byId=new Map(CRM.history(g.activities).map(e=>[e.id,e])),multi=g.records.length>1,late='<span class="status status-note">Registrado después de esta fecha</span>';
    const empty=text=>`<span class="empty-note">${text}</span>`,when=t.isToday?'hoy':'el '+dateLabel(t.asOf);
    const caseName=a=>multi?`<span>${esc((snapshot.opportunities.find(r=>r.id===a.opportunity_id)||{}).title||'')}</span>`:'';
    const provenance=a=>`<div class="event-provenance">${a.participants?`<span>Con ${esc(a.participants)}</span>`:''}${a.source?`<span>${esc(a.source)}</span>`:''}${link(a.source_url,'Fuente')}${a.stage?`<span>${esc(a.stage)}</span>`:''}</div>`;
    const corrects=a=>{const r=a.correctsId&&byId.get(a.correctsId);return a.correctsId?`<div class="event-next">Corrige a ${r?esc(r.type+' ('+r.status+') · '+(dateLabel(r.day)||'fecha no registrada')):'un registro que no aparece en este expediente'}</div>`:'';};
    const entry=(a,planned)=>`<li data-activity="${esc(a.id)}"><div class="timeline-meta"><time>${esc(dateLabel(a.day)||'Fecha no registrada')}</time><span>${esc(a.type)}</span><span class="status">${esc(a.status)}</span>${planned&&a.overdue?'<span class="status status-late">Vencida · sin resultado registrado</span>':''}${caseName(a)}</div><p class="pre-wrap">${esc(a.text)}</p>${provenance(a)}${corrects(a)}${a.recordedLater?`<div>${late}</div>`:''}<small class="capture-meta">Registró ${esc(a.author_name||'Sin autor registrado')}${a.recorded_at?' · '+esc(dateLabel(a.recorded_at)):''}</small></li>`;
    const list=(items,planned,none)=>items.length?`<ol class="timeline">${items.map(a=>entry(a,planned)).join('')}</ol>`:`<p class="empty-cell">${none}</p>`;
    const step=(raw,date)=>{const s=C.nextStep(raw),owner=C.ownerLabel(liveSnapshot,raw);return (s.text.trim()||date)?`<strong class="pre-wrap">${esc(s.text.trim()||'Siguiente paso sin descripción')}</strong><div class="record-status"><span class="owner-dot" aria-hidden="true">${esc(initials(owner))}</span><span>${esc(owner)}</span><time>${esc(date?dateLabel(date):'Fecha por acordar')}</time></div>`:empty('Sin siguiente paso registrado');};
    const f=t.today.lastFact,src=link(t.today.sourceUrl,'Fuente'),cs=t.plan.currentStep,row=(label,html)=>`<div><dt>${label}</dt><dd>${html}</dd></div>`;
    const facts=[
      row('Último hecho realizado',f?`<p class="pre-wrap">${esc(f.text)}</p><div class="event-provenance"><time>${esc(dateLabel(f.day))}</time>${t.today.source?`<span>${esc(t.today.source)}</span>`:''}${src}${t.today.source||src?'':'<span>Sin fuente registrada</span>'}</div>${f.recordedLater?`<div>${late}</div>`:''}`:empty('Sin hechos realizados registrados hasta esta fecha.')),
      row(t.isToday?'Etapa actual':'Etapa observada',t.today.stage?`<span class="status">${esc(t.today.stage)}</span>${t.isToday?'':' <small>en el último hecho que la registra</small>'}`:empty(t.isToday?'Etapa no registrada en el expediente':'Etapa no registrada en esa fecha')),
      row(t.isToday?'Siguiente paso vigente':'Siguiente paso registrado en ese hecho',step(t.today.nextAction,t.today.nextDate)),
      row('Bloqueo',t.today.blocker?`<span class="pre-wrap">${esc(t.today.blocker)}</span>`:empty('Sin bloqueo registrado en el expediente')),
      row('Próxima decisión',t.isToday?(t.today.decision?'<span class="decision-marker">Requiere decisión</span>':empty('Sin decisión pendiente registrada')):empty('Sin dato de decisión para esa fecha')),
      row('Última captura registrada',t.today.lastRecordedAt?`<time>${esc(dateLabel(t.today.lastRecordedAt))}</time>`:empty('Sin capturas registradas hasta esta fecha'))
    ].join('');
    const toolbar=`<div class="temporal-toolbar"><label>Ver como estaba el <input type="date" id="temporal-asof" value="${esc(t.asOf)}" max="${esc(today())}" aria-label="Fecha de consulta"></label><button class="text-button" data-temporal-today ${t.isToday?'disabled':''}>Volver a hoy</button><p class="temporal-note">Vista de solo lectura: cambiar la fecha no modifica el expediente.</p></div>`;
    const tabs=[['history','← Historia'],['today','Hoy'],['plan','Planeación →']].map(([id,label])=>`<button role="tab" id="temporal-tab-${id}" aria-controls="temporal-panel-${id}" aria-selected="${temporalPane===id}" tabindex="${temporalPane===id?0:-1}" data-temporal-pane="${id}">${label}</button>`).join('');
    const historyPanel=`<section role="tabpanel" id="temporal-panel-history" data-pane="history" aria-label="Historial"><p class="eyebrow">HISTORIA</p><h3>Hasta ${esc(when)}</h3>${list(t.history,false,'Sin hechos registrados hasta esta fecha.')}</section>`;
    const todayPanel=`<section role="tabpanel" id="temporal-panel-today" data-pane="today" aria-label="Hoy"><p class="eyebrow">${t.isToday?'HOY':'ESTADO EN ESA FECHA'}</p><h3>Estado respaldado ${t.isToday?'de hoy':'al '+esc(dateLabel(t.asOf))}</h3><dl class="temporal-facts">${facts}</dl></section>`;
    const planPanel=`<section role="tabpanel" id="temporal-panel-plan" data-pane="plan" aria-label="Planeación"><p class="eyebrow">PLANEACIÓN</p><h3>${t.isToday?'Lo que sigue':'Lo vigente al '+esc(dateLabel(t.asOf))}</h3>${t.isToday?`<div class="temporal-current"><h4>Siguiente paso vigente</h4>${cs?step(cs.text,cs.date):empty('Sin siguiente paso registrado')}</div>`:''}<h4>Compromisos (programados)</h4>${list(t.plan.commitments,true,'Sin compromisos programados')}<h4>Propuestas</h4>${list(t.plan.proposals,true,'Sin propuestas')}</section>`;
    return `<section class="temporal" aria-label="Historia, hoy y planeación">${toolbar}<div class="temporal-tabs" role="tablist" aria-label="Paneles">${tabs}</div><div class="temporal-grid" data-pane="${esc(temporalPane)}">${historyPanel}${todayPanel}${planPanel}</div></section>`;
  }
  function detail(o) {
    const g=o&&groupFor(o.id); if(!g)return '<p>Expediente no disponible.</p>';
    const contact=snapshot.contacts.find(c=>c.id===o.contact_id), step=C.nextStep(o.next_action);
    const parts=snapshot.participations.filter(p=>p.opportunity_id===o.id);
    let body='';
    if(detailTab==='history')body=`<section class="next-commitment" aria-label="Siguiente compromiso"><div class="commitment-label"><span class="eyebrow">SIGUIENTE COMPROMISO</span>${CRM.caseInfo(o).decision?'<span class="decision-marker">Requiere decisión</span>':''}</div><h3>${esc(step.text||'Definir el siguiente paso')}</h3><div class="record-status"><span class="owner-dot" aria-hidden="true">${esc(initials(C.ownerLabel(liveSnapshot,o.next_action)))}</span><span>${esc(C.ownerLabel(liveSnapshot,o.next_action))}</span><time>${esc(o.next_date?dateLabel(o.next_date):'Fecha por acordar')}</time>${canEdit()?`<button class="text-button" data-edit-opportunity="${esc(o.id)}">Ajustar</button>`:''}</div></section><details class="journey-references"><summary>Referencias y acuerdos del expediente</summary><div class="connection-path" aria-label="Conexiones del asunto"><button data-detail-tab="records"><span>01 · Cliente / terreno</span><strong>${contact?(o.terrain_id?'Referencias vinculadas':'Completar terreno'):'Completar cliente'}</strong></button><button data-detail-tab="material"><span>02 · Plan de potencial</span><strong>${CRM.pppReference(o)?'Consultar PPP':'Vincular plan'}</strong></button><button data-detail-tab="agreements"><span>03 · Acuerdos</span><strong>${parts.length?parts.length+' registrados':'Por definir'}</strong></button><span class="project-connection"><span>04 · Proyecto</span><strong>${C.safeLink(o.project_url)?link(o.project_url,'Abrir proyecto'):'Por vincular'}</strong></span></div></details><div class="history-heading"><h3>Conversaciones y avances</h3><button class="text-button" data-case-calendar="1" aria-pressed="${calendarOpen}">Ver calendario</button></div>${calendarOpen?calendar(g.activities):''}${timeline(g.activities,g.records.length>1)}`;
    if(detailTab==='records')body=`<section class="record-info"><p class="eyebrow">CLIENTE Y RELACIÓN</p><h3>${esc(contact?.name||'Cliente por identificar')}</h3>${contact?`<p>${esc([contact.type,contact.company,contact.email,contact.phone].filter(Boolean).join(' · '))}</p>${contact.notes?`<p class="pre-wrap">${esc(contact.notes)}</p>`:''}${canEdit()?`<button data-edit-contact="${esc(contact.id)}">Editar cliente</button>`:''}`:'<p>Vincula el contacto para reunir sus asuntos sin mezclarlos.</p>'}<hr><p class="eyebrow">TERRENO Y ALCANCE</p><h3>${esc(o.title)}</h3><p>${esc([o.kind,o.location].filter(Boolean).join(' · '))}</p><p class="secondary">${o.terrain_id?'Referencia del terreno: '+esc(o.terrain_id):'Terreno sin referencia vinculada'}</p>${CRM.caseInfo(o).text?`<p class="pre-wrap">${esc(CRM.caseInfo(o).text)}</p>`:''}${o.source_status?`<p class="secondary">${esc(o.source_status)}</p>`:''}<div class="material-links">${groupLinks(g)}</div>${canEdit()?`<button data-edit-opportunity="${esc(o.id)}">Editar registro</button>`:''}${g.records.length>1?table(['Gestión','Estado',''],g.records.map(r=>`<tr><td>${esc(r.title)}</td><td>${esc(r.stage)}</td><td><button data-select-record="${esc(r.id)}" ${r.id===selected?'disabled':''}>${r.id===selected?'Seleccionado':'Seleccionar'}</button></td></tr>`).join(''),'Gestiones relacionadas'):''}</section>`;
    if(detailTab==='material')body=`<section class="connected-plan"><p class="eyebrow">PLAN DE POTENCIAL</p><h3>${CRM.pppReference(o)?'La base para decidir':'Todavía falta vincular el plan'}</h3><p>${CRM.pppReference(o)?'Consulta la versión guardada y sus supuestos.': 'Vincula el plan existente para revisar el potencial de este asunto.'}</p><div class="material-links">${groupLinks(g)}</div>${canEdit()?`<button data-edit-opportunity="${esc(o.id)}">Completar referencias</button>`:''}</section>`;
    if(detailTab==='agreements')body=`${parts.map(p=>`<section class="agreement-item"><div class="row"><strong>${esc(names([p.broker_id]))}</strong><span class="status">${esc(p.status)}</span></div>${p.terms?`<p class="pre-wrap">${esc(p.terms)}</p>`:''}${link(p.agreement_url,'Ver acuerdo')}${canAgree()?`<button data-edit-participation="${esc(p.id)}">Editar acuerdo</button>`:''}</section>`).join('')}${canAgree()?'<button data-new="participation">+ Acuerdo</button>':''}`;
    if(detailTab==='temporal')body=temporalView(o,g);
    return `<article class="detail"><div class="detail-topline"><button class="text-button" data-action="back">← Cartera</button><span>${esc(names(o.broker_ids))}</span></div><div class="detail-heading"><div><p class="eyebrow">${esc(contact?.name||'Cliente por identificar')}</p><h2 tabindex="-1" id="case-heading">${esc(o.title)}</h2><p class="detail-subtitle"><span class="status">${esc(o.stage)}</span> ${esc(o.location||o.kind)}</p></div><aside class="key-question" aria-label="Pregunta clave"><p class="eyebrow">PREGUNTA CLAVE</p><h3>¿Qué falta confirmar para avanzar?</h3><p>${esc(step.text||'Definir el siguiente paso con el cliente.')}</p></aside></div><div class="detail-actions">${canEdit()?'<button class="primary" data-followup="true">Registrar avance</button><button data-schedule="true">Agendar reunión</button>':''}${canEdit()&&!preview?`<details class="create-menu case-tools"><summary>Más</summary><div><button data-edit-opportunity="${esc(o.id)}">Editar asunto</button>${o.terrain_id||o.ppp_id?'<button data-related="true">+ Gestión</button>':''}</div></details>`:''}</div>${g.records.length>1?`<label class="record-picker"><span>Registro activo</span><select id="record-select">${options(g.records.map(r=>({id:r.id,name:r.title+' · '+r.kind})),o.id)}</select></label>`:''}${caseJourney(o)}<nav class="detail-tabs" aria-label="Expediente">${[['history','Seguimiento'],['records','Expediente'],['material','PPP y documentos'],['agreements','Acuerdos'],['temporal','Historia · Hoy · Plan']].map(([id,label])=>`<button data-detail-tab="${id}" aria-current="${detailTab===id?'page':'false'}">${label}</button>`).join('')}</nav><div class="detail-body">${body}</div><section class="case-ppp" aria-label="Plan de potencial guardado"><p class="eyebrow">PLAN DE POTENCIAL</p>${pppMount(o,true)}${link(o.ppp_url,'Abrir plan guardado')}</section></article>`;

  }


  function clearReturnURL(){
    const u=new URL(location.href);u.searchParams.delete('preevaluacion');u.searchParams.delete('opportunity');history.replaceState({},'',u.href);
    evaluationReturnHandled=false;
  }
  function returnNotice(message){
    $('notice').replaceChildren();
    const p=document.createElement('span');p.textContent=message;$('notice').append(p);
    if(new URLSearchParams(location.search).get('preevaluacion')&&!preview&&canEdit()){
      const btn=document.createElement('button');btn.type='button';btn.dataset.resumeEvaluation='1';btn.textContent='Retomar terreno →';
      btn.onclick=()=>{if(!busy&&!receivingEvaluation){evaluationReturnHandled=false;receiveEvaluation();}};$('notice').append(' ',btn);
    }
  }
  async function receiveEvaluation(){
    const params=new URLSearchParams(location.search),id=params.get('preevaluacion');
    if(!id||evaluationReturnHandled||receivingEvaluation||preview||!canEdit())return;
    const ownToken=loadedToken,ownBroker=requestedBroker,ownEpoch=++evaluationEpoch;
    receivingEvaluation=true;
    try{
      const ev=await evaluator.summary(id);
      if(ownEpoch!==evaluationEpoch||!snapshot||token()!==ownToken||requestedBroker!==ownBroker)return;
      if(!snapshot.brokers.some(b=>b.id===ev.broker_id))throw Error('La evaluación no corresponde a esta cartera.');
      const target=params.get('opportunity'),linked=snapshot.opportunities.filter(o=>window.BrokerEvaluator.hasCase(o.notes,ev.id));
      if(linked.length>1)throw Error('Hay más de un registro vinculado. Abre el expediente que deseas actualizar.');
      const existing=target?snapshot.opportunities.find(o=>o.id===target):linked[0];
      if(target&&!existing)throw Error('El expediente de regreso no está en tu cartera.');
      if(linked[0]&&existing&&linked[0].id!==existing.id)throw Error('Esta evaluación ya está vinculada a otro expediente. Revisa su referencia antes de continuar.');
      if(existing&&window.BrokerEvaluator.hasCase(existing.notes,ev.id)){
        if(!(existing.broker_ids||[]).includes(ev.broker_id))throw Error('La evaluación no corresponde a esta cartera.');
        selected=existing.id;tab='opportunities';detailTab='history';temporalAsOf='';temporalPane='today';clearReturnURL();accessNotice('Evaluación vinculada. Continúas en el mismo expediente.');render();return;
      }
      editor('opportunity',window.BrokerEvaluator.recordFromEvaluation(ev,existing));
      if(!edit)return;
      edit.evaluationId=ev.id;evaluationReturnHandled=true;
      $('form-title').textContent=existing?'Incorporar evaluación al expediente':'Guardar terreno en mi cartera';
      $('form-error').textContent='La evaluación ya está en Drive. Confirma el siguiente paso para vincularla a tu cartera.';
      $('save-record').textContent='Guardar en mi cartera';
      const intro=$('fields').querySelector('.form-intro');if(intro)intro.remove();
      const summary=document.createElement('section');summary.className='evaluation-receipt';
      const tag=document.createElement('p');tag.className='eyebrow';tag.textContent='EVALUACIÓN GUARDADA EN DRIVE';
      const title=document.createElement('h3');title.textContent=ev.title||'Tu inmueble';
      const place=document.createElement('p');place.textContent=ev.location||'Ubicación por precisar';
      const area=document.createElement('strong');area.textContent=typeof ev.site_area==='number'?ev.site_area.toLocaleString('es-MX')+' m² de terreno':'Revisa las medidas en el evaluador';
      summary.append(tag,title,place,area);$('fields').prepend(summary);
      const extra=document.createElement('details');extra.className='form-advanced';extra.innerHTML='<summary>Datos y clasificación del expediente</summary>';
      for(const name of ['title','kind','location','stage','notes','ppp_status','decision','broker_ids']){
        const input=$('fields').querySelector('[name="'+name+'"]');if(input)extra.append(input.closest('label'));
      }
      $('fields').append(extra);
      $('save-record').focus();
    }catch(e){evaluationReturnHandled=false;if(ownEpoch===evaluationEpoch&&snapshot&&token()===ownToken&&requestedBroker===ownBroker)returnNotice(e.message);}
    finally{if(ownEpoch===evaluationEpoch)receivingEvaluation=false;}
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
    if(busy||receivingEvaluation)return;
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
    const b = e.target.closest('button'); if (!b || busy || receivingEvaluation) return;
    if(b.dataset.benefits){showBenefits();return;}
    if(b.dataset.agenda){calendarOpen=!calendarOpen;calendarDay='';render();return;}
    if(b.dataset.caseCalendar){calendarOpen=!calendarOpen;calendarDay='';render();return;}
    if(b.dataset.journeyCases){document.querySelector('.client-list')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});return;}
    if(b.dataset.journeyResume){selected=b.dataset.journeyResume;tab='opportunities';detailTab='history';temporalAsOf='';temporalPane='today';render();$('case-heading')?.focus({preventScroll:true});return;}
    if(b.dataset.journeyFollowup){detailTab='history';render();document.querySelector('.next-commitment')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});return;}
    if(b.dataset.temporalPane){if(['history','today','plan'].includes(b.dataset.temporalPane)){temporalPane=b.dataset.temporalPane;render();temporalFocus();}return;}
    if('temporalToday' in b.dataset){temporalAsOf='';render();$('temporal-asof')?.focus({preventScroll:true});return;}
    if(b.dataset.casePresent){openPresentationBoard(selected);return;}
    if(b.dataset.plaza){selectPortfolio('');return;}
    if(b.dataset.attention){attention=b.dataset.attention==='all'?'':b.dataset.attention;tab='opportunities';selected='';query='';stage='';caseState='';render();return;}
    if(b.dataset.clientNew){const c=snapshot.contacts.find(c=>c.id===b.dataset.clientNew);editor('opportunity',{contact_id:c.id,broker_ids:c.broker_ids});return;}
    if(b.dataset.expand){const g=groupFor(b.dataset.expand);if(g){expanded.has(g.key)?expanded.delete(g.key):expanded.add(g.key);render();}return;}
    if(b.dataset.pppRetry){const o=snapshot.opportunities.find(o=>o.id===b.dataset.pppRetry);if(o){pppData.delete(o.ppp_id);pppClient.invalidate();render();}return;}
    if(b.dataset.calendarMove){calendarMonth=CRM.shiftMonth(calendarMonth||today().slice(0,7),Number(b.dataset.calendarMove));calendarDay='';render();return;}
    if(b.dataset.calendarDay){calendarDay=calendarDay===b.dataset.calendarDay?'':b.dataset.calendarDay;render();return;}
    if(b.dataset.calendarClear){calendarDay='';render();return;}
    if(b.dataset.schedule){const o=snapshot.opportunities.find(o=>o.id===selected);editor('activity',{next_action:C.encodeStep(C.nextStep(o.next_action).owner,'Reunión de seguimiento'),next_date:calendarDay||o.next_date,crm:{v:1,type:'Reunión',status:'Programado',occurred_at:calendarDay||o.next_date||today(),participants:''}});return;}
    if(b.dataset.resolveEvent){const a=snapshot.activities.find(a=>a.id===b.dataset.resolveEvent);if(!a)return;const event=CRM.decode(a),o=snapshot.opportunities.find(o=>o.id===a.opportunity_id);selected=o.id;editor('activity',{note:b.dataset.result==='Cancelado'?'Reunión cancelada.':b.dataset.result==='Programado'?event.text:'',next_action:o.next_action,next_date:o.next_date,crm:{...event.meta,v:1,type:event.type,status:b.dataset.result,occurred_at:today(),replaces:a.id}});return;}
    if (b.dataset.preevaluate) { chooseEvaluation(b.dataset.preevaluate); return; }
    if (b.dataset.tab==='presentations') {openPresentationBoard();return;}
    if (b.dataset.tab) { attention=''; caseState = ''; detailTab = 'history'; temporalAsOf=''; temporalPane='today'; tab = b.dataset.tab; const targetURL=new URL(location.href); if(tab==='presentations')targetURL.searchParams.set('tab','presentations');else targetURL.searchParams.delete('tab');history.replaceState({},'',targetURL);selected = ''; query = ''; stage = ''; render(); }
    if (b.dataset.open) { selected = b.dataset.open; tab = 'opportunities'; detailTab = 'history'; temporalAsOf=''; temporalPane='today'; calendarDay=''; render(); $('case-heading')?.focus({preventScroll:true});if(innerWidth<=850)$('case-heading')?.scrollIntoView({block:'start'}); }
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
    if (b.dataset.openBroker) { selectPortfolio(b.dataset.openBroker); return; }
    if (b.dataset.broker) { selectPortfolio(b.dataset.broker); return; }
    if (b.dataset.action === 'refresh') load();
    if (b.dataset.action === 'back') { const previous=selected;selected='';render();document.querySelector('[data-open="'+CSS.escape(previous)+'"]')?.focus(); }
    if (b.dataset.new) editor(b.dataset.new);
    if (b.dataset.editParticipation) { const p = snapshot.participations.find(p => p.id === b.dataset.editParticipation); selected = p.opportunity_id; editor('participation',p); }
    if (b.dataset.editContact) editor('contact',snapshot.contacts.find(c => c.id === b.dataset.editContact));
    if (b.dataset.editOpportunity) editor('opportunity',snapshot.opportunities.find(o => o.id === b.dataset.editOpportunity));
  };
  $('workspace').addEventListener('keydown', e => {
    const t = e.target; if (!t || !t.matches || !t.matches('.temporal-tabs [role="tab"]') || e.altKey || e.ctrlKey || e.metaKey) return;
    const panes = ['history','today','plan'], i = panes.indexOf(t.dataset.temporalPane), next = {ArrowLeft:i - 1, ArrowRight:i + 1, Home:0, End:panes.length - 1}[e.key];
    if (i < 0 || next === undefined) return;
    e.preventDefault(); temporalPane = panes[(next + panes.length) % panes.length]; render(); temporalFocus();
  });
  const close = () => { if (!busy) { if(edit?.evaluationId&&edit.submitted){$('form-error').textContent='El guardado todavía necesita confirmación. Pulsa Verificar envío para comprobar el mismo intento; no se creará otra solicitud.';return;} const resumable=edit?.evaluationId; $('editor').close(); edit = null; if(resumable){evaluationReturnHandled=false;returnNotice('Tu evaluación sigue guardada. Puedes terminar de incorporarla cuando quieras.');} } };
  $('close-editor').onclick = close; $('cancel-editor').onclick = close;
  $('editor').addEventListener('cancel', e => { e.preventDefault(); close(); });
  $('record-form').onsubmit = async e => {
    e.preventDefault(); if (preview || busy || !edit || !snapshot) return;
    const retry=Boolean(edit.evaluationId&&edit.submitted),fd = new FormData(e.target), record = retry?JSON.parse(edit.submitted):Object.fromEntries(fd);
    if(!retry){
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
    }
    const body = JSON.stringify(record);
    if (edit.submitted && edit.submitted !== body) { $('form-error').textContent = 'Primero actualiza la cartera para comprobar el intento anterior. No se enviará una segunda versión sin verificar.'; return; }
    edit.submitted = body; if(edit.evaluationId)document.querySelectorAll('#fields input,#fields select,#fields textarea').forEach(el=>{if(el.dataset.pendingDisabled===undefined)el.dataset.pendingDisabled=el.disabled?'1':'0';el.disabled=true;}); busy = true; $('save-record').disabled = true; $('form-error').textContent = 'Guardando…';
    try {
      const savedKind=edit.kind,evalId=edit.evaluationId,createdContact=edit.kind==='contact'&&!edit.id;
      const result=await client.save(edit.kind,record,edit.revision,edit.requestId);
      applySnapshot(result);pppClient.invalidate();pppData.clear();loadedToken=token();$('editor').close();edit=null;
      if(savedKind==='opportunity'){
        tab='opportunities';query='';stage='';caseState='';attention='';detailTab='history';temporalAsOf='';temporalPane='today';
        const matches=snapshot.opportunities.filter(row=>Object.entries(record).every(([key,value])=>Array.isArray(value)?value.every(id=>(row[key]||[]).includes(id)):String(row[key]??'').trim()===String(value??'').trim()));
        selected=record.id&&snapshot.opportunities.some(o=>o.id===record.id)?record.id:matches.length===1?matches[0].id:'';
        if(evalId)clearReturnURL();
      }
      if(savedKind==='contact'){tab='opportunities';query='';if(createdContact){selected='';attention='';stage='';caseState='';prospectsOpen=true;}}
      accessNotice(selected?'Guardado en tu cartera. Continúa en este expediente.':'Guardado en tu cartera.');render();
    }
    catch (err) { if(edit&&err.definitive){edit.submitted=null;document.querySelectorAll('#fields [data-pending-disabled]').forEach(el=>{el.disabled=el.dataset.pendingDisabled==='1';delete el.dataset.pendingDisabled;});} $('form-error').textContent = err.message; if (token() !== loadedToken) { clear(); $('notice').textContent = 'La sesión cambió. Vuelve a entrar.'; } }
    finally { busy = false; $('save-record').disabled = false;if(edit?.evaluationId)$('save-record').textContent=edit.submitted?'Verificar envío':'Guardar en mi cartera'; }
  };
  window.addEventListener('storage', e => { if (e.key === 'pyod_clave_v1' || e.key === null) { client.invalidate(); clear(); $('notice').textContent = 'La sesión cambió. Actualiza para validar tu acceso.'; } });
  window.addEventListener('focus', () => { if (token() && token() !== loadedToken) { client.invalidate(); clear(); load(); } });
  load();
})();
