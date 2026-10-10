(function () {
  'use strict';
  const C = window.BrokersCore, $ = id => document.getElementById(id);
  // Set only after contrasting the existing live backend and publishing brokers.v1.
  // No separate database, public fixture or whole-board fallback is permitted.
  const config = window.YDR_BROKERS_CONFIG || {};
  const token = () => { try { return localStorage.getItem('pyod_clave_v1') || ''; } catch (_) { return ''; } };
  const client = C.createClient({ url: config.url, token, fetch: window.fetch.bind(window) });
  let snapshot = null, tab = 'home', broker = '', query = '', stage = '', selected = '', busy = false, edit = null, loadedToken = '', agendaOwner = '';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Hermosillo', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const options = (items, value) => items.map(x => { const id = typeof x === 'string' ? x : x.id, name = typeof x === 'string' ? x : x.name; return `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(name)}</option>`; }).join('');
  const link = (url, label) => C.safeLink(url) ? `<a target="_blank" rel="noopener noreferrer" href="${esc(C.safeLink(url))}">${esc(label)} ↗</a>` : `<span class="muted">${esc(label)} pendiente de vincular</span>`;
  const canEdit = () => snapshot && snapshot.capabilities && snapshot.capabilities.write === true;
  const canAgree = () => canEdit() && snapshot.actor.role === 'direccion' && snapshot.capabilities.agree_participation === true;
  const names = ids => (ids || []).map(id => (snapshot.brokers.find(b => b.id === id) || {}).name || 'Masterbroker').join(' · ');
  const current = () => C.visible(snapshot, broker, query, stage);
  function clear() { $('identity').textContent = 'Tu espacio para conectar oportunidades con YoDesarrollo.'; snapshot = null; loadedToken = ''; selected = ''; $('workspace').replaceChildren(); $('workspace').hidden = true; if ($('editor').open) $('editor').close(); edit = null; }
  async function load() {
    if (busy) return;
    busy = true; clear(); $('notice').textContent = 'Validando tu acceso y leyendo la cartera…';
    try { snapshot = await client.load(); loadedToken = token(); $('notice').textContent = ''; render(); }
    catch (e) { clear(); $('notice').textContent = e.message; const b = document.createElement('button'); b.textContent = 'Volver a intentar'; b.onclick = load; $('notice').append(' ', b); }
    finally { busy = false; }
  }
  function render() {
    if (!snapshot || token() !== loadedToken) { clear(); return; }
    const rows = current(), all = C.visible(snapshot, broker, '', '');
    $('identity').textContent = `${snapshot.actor.name || 'Mi cartera'} · ${snapshot.actor.role === 'direccion' ? 'Dirección' : 'Masterbroker'}`;
    $('workspace').hidden = false;
    const direction = snapshot.actor.role === 'direccion';
    const navigation = [['home','Inicio','◈'],['offer','Qué ofrecer','◇'],['opportunities',direction?'Oportunidades':'Mis oportunidades','▦'],['contacts','Mi red','◎'],['participations','Mis acuerdos','≋'],...(direction?[['brokers','Equipo','◉']]:[])];
    $('workspace').innerHTML = `<div class="app-layout"><aside class="sidebar"><p class="nav-caption">MI ESPACIO</p><nav class="tabs" aria-label="Espacio Masterbrokers">${navigation.map(([id,label,icon]) => `<button data-tab="${id}" class="${tab === id ? 'active' : ''}" aria-current="${tab === id ? 'page' : 'false'}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav><div class="sidebar-foot"><span class="online-dot"></span> Cartera conectada<button data-action="refresh" aria-label="Actualizar cartera">↻</button></div></aside><div class="main-panel"><div class="context-bar"><span>${direction?'Vista de Dirección':'Mi espacio de trabajo'}</span>${direction ? `<select id="broker-filter" aria-label="Masterbroker"><option value="">Todo el equipo</option>${options(snapshot.brokers,broker)}</select>` : ''}</div>${['opportunities','contacts','participations','brokers'].includes(tab)?`<div class="toolbar"><input id="search" type="search" aria-label="Buscar en esta sección" placeholder="Buscar en mi cartera" value="${esc(query)}">${tab === 'opportunities' ? `<select id="stage-filter" aria-label="Etapa"><option value="">Todas las etapas</option>${options(C.stages,stage)}</select>` : ''}${canEdit() && ['contacts','opportunities'].includes(tab) ? `<button class="primary" data-new="${tab === 'contacts' ? 'contact' : 'opportunity'}">+ ${tab === 'contacts' ? 'Agregar contacto' : 'Presentar oportunidad'}</button>` : ''}</div>`:''}<div id="content"></div></div></div>`;
    const content = $('content');
    if (tab === 'home') content.innerHTML = home(all);
    if (tab === 'offer') content.innerHTML = offer(all);
    if (tab === 'opportunities') content.innerHTML = selected ? detail(rows.find(o => o.id === selected)) : `<div class="section-heading"><div><p class="eyebrow">DEL CONTACTO AL ACUERDO</p><h2>Oportunidades en movimiento</h2></div><span class="count">${rows.length} expedientes</span></div><div class="grid">${rows.map(card).join('')}</div>${rows.length ? '' : empty('Tu próxima oportunidad empieza aquí','Registra el terreno, una necesidad de análisis o una propuesta de capital. Después podrás dar seguimiento con YoDesarrollo.',canEdit()?'<button class="primary" data-new="opportunity">Presentar oportunidad</button>':'')}`;
    if (tab === 'contacts') {
      const contacts = snapshot.contacts.filter(c => (!broker || (c.broker_ids || []).includes(broker)) && [c.name,c.company,c.email,c.phone].join(' ').toLowerCase().includes(query.toLowerCase()));
      content.innerHTML = `<div class="grid">${contacts.map(c => `<article class="card"><span class="pill">${esc(c.type || 'Contacto')}</span><h3>${esc(c.name)}</h3><p>${esc(c.company)}<br>${esc(c.email)}<br>${esc(c.phone)}</p><small>${esc(names(c.broker_ids))}</small><p>${esc(c.notes)}</p>${canEdit() ? `<button data-edit-contact="${esc(c.id)}">Editar contacto</button>` : ''}</article>`).join('')}</div>${contacts.length ? '' : '<p class="empty">No hay contactos con estos filtros.</p>'}`;
    }
    if (tab === 'participations') {
      const ids = new Set(rows.map(o => o.id)); const parts = snapshot.participations.filter(p => ids.has(p.opportunity_id) && (!broker || p.broker_id === broker));
      content.innerHTML = `<div class="section-heading"><div><p class="eyebrow">CLARIDAD EN CADA OPORTUNIDAD</p><h2>Mis acuerdos</h2><p class="muted">Consulta las condiciones, el estado y el documento que respalda tu participación.</p></div></div><div class="grid">${parts.map(p => `<article class="card"><span class="pill">${esc(p.status)}</span><h3>${esc((snapshot.opportunities.find(o => o.id === p.opportunity_id) || {}).title)}</h3><p>${esc(names([p.broker_id]))}</p><p>${esc(p.terms || 'Condiciones por definir')}</p>${link(p.agreement_url,'Acuerdo')}<p>${esc(p.confirmed_at || '')}</p>${canAgree() ? `<button data-edit-participation="${esc(p.id)}">Actualizar participación</button>` : ''}</article>`).join('')}</div>${parts.length ? '' : '<p class="empty">No hay participaciones registradas para estos expedientes.</p>'}`;
    }
    if (tab === 'brokers') content.innerHTML = `<div class="grid">${snapshot.brokers.filter(b => (!broker || b.id === broker) && b.name.toLowerCase().includes(query.toLowerCase())).map(b => `<article class="card"><span class="pill">${b.active ? 'Acceso vinculado' : 'Identidad por vincular'}</span><h3>${esc(b.name)}</h3><p>${snapshot.opportunities.filter(o => (o.broker_ids || []).includes(b.id)).length} oportunidades vinculadas</p><button data-broker="${esc(b.id)}">Ver cartera</button></article>`).join('')}</div>`;
    if ($('search')) $('search').addEventListener('input', e => { query = e.target.value; const pos = e.target.selectionStart; selected = ''; render(); $('search').focus(); try { $('search').setSelectionRange(pos,pos); } catch (_) {} });
    if ($('broker-filter')) $('broker-filter').onchange = e => { broker = e.target.value; selected = ''; render(); };
    if ($('stage-filter')) $('stage-filter').onchange = e => { stage = e.target.value; selected = ''; render(); };
  }
  function empty(title, text, action = '') {
    return `<div class="empty"><span class="empty-mark" aria-hidden="true">◇</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
  }
  function stepLabel(o) {
    const n = C.nextStep(o.next_action);
    return `<span class="owner ${n.owner === 'YOD'?'owner-yod':''}">${esc(n.owner || 'Responsable por definir')}</span><strong>${esc(n.text || 'Acordar el siguiente paso')}</strong>`;
  }
  function card(o) {
    return `<article class="card opportunity"><div class="card-top"><span class="case-symbol" aria-hidden="true">${o.kind === 'Capital'?'↗':o.kind === 'Plan de potencial'?'◇':'▧'}</span><span class="pill">${esc(o.stage)}</span></div><small>${esc(o.kind || 'Oportunidad')}</small><h3>${esc(o.title)}</h3><p class="location">${esc(o.location || 'Ubicación por completar')}</p>${o.source_status?`<p class="source-status">${esc(o.source_status)}</p>`:''}<div class="next-step">${stepLabel(o)}</div><div class="row"><small class="${C.overdue(o,today())?'late-text':''}">${esc(o.next_date || 'Fecha por acordar')}</small><button class="text-button" data-open="${esc(o.id)}">Abrir →</button></div></article>`;
  }
  function home(all) {
    const pending = C.agenda(all,agendaOwner), first = snapshot.actor.name ? snapshot.actor.name.split(' ')[0] : 'Masterbroker';
    return `<section class="welcome"><div><p class="eyebrow">OPORTUNIDADES QUE AVANZAN CONTIGO</p><h2>Vamos al siguiente paso,<br>${esc(first)}.</h2><p>Conecta una oportunidad. Prepara la conversación.<br>Construye el acuerdo con YoDesarrollo.</p>${canEdit()?'<button class="primary" data-new="opportunity">+ Presentar oportunidad</button>':''}</div><div class="welcome-art" aria-hidden="true"><div class="land-grid"></div><div class="building one"></div><div class="building two"></div><div class="building three"></div><span class="art-caption">CONECTAR · DESARROLLAR · CRECER</span></div></section><div class="quick-actions"><button data-tab="offer"><span aria-hidden="true">◇</span><strong>Preparar una conversación</strong><small>Qué ofrecer y con qué material</small><b aria-hidden="true">↗</b></button><button data-tab="participations"><span aria-hidden="true">≋</span><strong>Consultar mis acuerdos</strong><small>Condiciones y evidencia por oportunidad</small><b aria-hidden="true">↗</b></button></div><section class="agenda"><div class="section-heading"><div><p class="eyebrow">TRABAJO COMPARTIDO</p><h2>Lo que sigue</h2></div><span class="count">${pending.length} pendientes</span></div><div class="segmented" aria-label="Responsable del siguiente paso">${[['','Todos'],['Masterbroker','Masterbroker'],['YOD','YoDesarrollo']].map(([id,label])=>`<button data-agenda="${id}" aria-pressed="${agendaOwner===id}">${label}</button>`).join('')}</div>${pending.length?pending.map(o=>`<button class="agenda-item" data-open="${esc(o.id)}"><span class="agenda-date ${C.overdue(o,today())?'late-text':''}">${esc(o.next_date || 'Sin fecha')}<small>${C.overdue(o,today())?'Revisar fecha':'Seguimiento'}</small></span><span class="agenda-main"><small>${esc(o.title)}</small>${stepLabel(o)}</span><span aria-hidden="true">→</span></button>`).join(''):empty('Sin pendientes en esta vista','Los próximos pasos aparecerán aquí al registrar una oportunidad o un avance.')}<p class="microcopy">Los expedientes anteriores conservan su información. Al registrar el siguiente paso, indica quién lo gestiona y la fecha acordada.</p></section>`;
  }
  function offer(all) {
    const material = all.filter(o => C.safeLink(o.documents_url)||C.safeLink(o.ppp_url)||C.safeLink(o.project_url));
    return `<div class="section-heading"><div><p class="eyebrow">TU CONVERSACIÓN COMERCIAL</p><h2>¿Qué necesita tu contacto?</h2><p class="muted">Parte de su necesidad. El alcance y las condiciones se confirman con YoDesarrollo.</p></div></div><div class="offer-grid"><article class="offer-card"><span class="offer-symbol" aria-hidden="true">▧</span><span class="eyebrow">TIENE UNA PROPIEDAD</span><h3>Descubrir su potencial</h3><p>Entender qué puede hacerse, qué inversión requiere y en cuánto tiempo. El resultado ayuda a decidir entre desarrollar, vender o explorar un codesarrollo.</p><details><summary>Preparar el primer contacto</summary><ul><li>Ubicación, superficie y documentos disponibles.</li><li>Relación con el propietario y expectativa.</li><li>Objetivo y plazo para decidir.</li></ul></details>${canEdit()?'<button class="primary" data-start="Terreno">Presentar terreno →</button><button class="text-button" data-start="Plan de potencial">Solicitar un plan de potencial</button>':''}</article><article class="offer-card"><span class="offer-symbol" aria-hidden="true">⌂</span><span class="eyebrow">BUSCA UN INMUEBLE</span><h3>Conectar con un producto</h3><p>Identificar su necesidad y revisar el material comercial. Confirma producto, disponibilidad, precio y autorización antes de hacer una oferta.</p><details><summary>Preparar la conversación</summary><ul><li>Uso, ubicación, presupuesto y plazo del interesado.</li><li>Ficha y disponibilidad confirmadas por YOD.</li><li>Condiciones comerciales por escrito.</li></ul></details><a class="button primary" href="index.html">Abrir carpeta comercial ↗</a>${canEdit()?'<button class="text-button" data-offer-contact="true">Registrar interesado</button>':''}</article><article class="offer-card"><span class="offer-symbol" aria-hidden="true">↗</span><span class="eyebrow">BUSCA PARTICIPAR</span><h3>Explorar una inversión</h3><p>Documentar el interés y llevarlo a revisión. YoDesarrollo debe confirmar proyecto, supuestos, riesgos y condiciones de participación.</p><details><summary>Preparar la revisión</summary><ul><li>Objetivo, horizonte y recursos que desea aportar.</li><li>Proyecto y documentación autorizados.</li><li>Condiciones y responsables por acordar.</li></ul></details>${canEdit()?'<button class="primary" data-start="Capital">Presentar interés →</button>':''}</article></div><section class="material-section"><div class="section-heading"><div><p class="eyebrow">EXPEDIENTES DE TU CARTERA</p><h2>Material para preparar tu reunión</h2></div></div><p class="microcopy">Abre la versión vinculada al expediente y confirma con YOD cuál puede compartirse. Un enlace disponible no equivale a autorización comercial.</p>${material.length?`<div class="grid">${material.map(o=>`<article class="card"><h3>${esc(o.title)}</h3><div class="material-links">${C.safeLink(o.ppp_url)?link(o.ppp_url,'Plan de potencial'):''}${C.safeLink(o.documents_url)?link(o.documents_url,'Documentos'):''}${C.safeLink(o.project_url)?link(o.project_url,'Proyecto'):''}</div><button class="text-button" data-open="${esc(o.id)}">Preparar seguimiento →</button></article>`).join('')}</div>`:empty('Material por vincular','Cuando YOD agregue el PPP, documentos o proyecto a una oportunidad, estarán disponibles aquí.')}</section>`;
  }
  function detail(o) {
    if (!o) return '<p>Expediente no disponible.</p>';
    const contact = snapshot.contacts.find(c => c.id === o.contact_id);
    const activities = snapshot.activities.filter(a => a.opportunity_id === o.id).sort((a,b) => String(b.date).localeCompare(String(a.date)));
    const step = C.nextStep(o.next_action), parts = snapshot.participations.filter(p => p.opportunity_id === o.id);
    return `<article class="detail"><div class="row"><button class="text-button" data-action="back">← Oportunidades</button><span class="pill">${esc(o.stage)}</span></div><p class="eyebrow">${esc(o.kind || 'Oportunidad')} · ${esc(o.location || 'Ubicación por completar')}</p><h2>${esc(o.title)}</h2><p class="muted">${esc(names(o.broker_ids))}</p><section class="decision-panel"><span class="eyebrow">SIGUIENTE PASO</span><h3>${esc(step.text || 'Acordar qué sigue')}</h3><div class="row"><span class="owner">${esc(step.owner || 'Responsable por definir')}</span><span class="${C.overdue(o,today())?'late-text':''}">${esc(o.next_date || 'Fecha por acordar')}</span></div>${canEdit()?'<div class="action-row"><button class="primary" data-new="activity">Registrar avance</button><button data-request="true">Pedir análisis a YOD</button></div>':''}</section><div class="detail-columns"><div><section><h3>Contexto de la oportunidad</h3>${o.source_status?`<p class="source-status"><strong>Estado documental</strong><br>${esc(o.source_status)}</p>`:''}<p class="pre-wrap">${esc(o.notes || 'Completa el contexto y la necesidad de tu contacto.')}</p><p>${esc(contact ? contact.name : 'Contacto por vincular')} · ${esc(contact ? contact.phone : '')}</p>${canEdit()?`<button class="text-button" data-edit-opportunity="${esc(o.id)}">Actualizar expediente →</button>`:''}</section><section><h3>Análisis para decidir</h3><p class="muted">Consulta rendimiento, inversión y ciclo en el PPP vinculado. Los supuestos y versiones se revisan allí.</p><div class="material-links">${link(o.ppp_url,'Abrir plan de potencial')}${link(o.documents_url,'Documentos')}${link(o.project_url,'Proyecto')}</div></section><section><h3>Conversación y avances</h3>${activities.map(a=>`<div class="list-item"><small>${esc(a.date)} · ${esc(a.author_name || 'Equipo')}</small><p class="pre-wrap">${esc(a.note)}</p></div>`).join('')||'<p class="muted">Registra la primera conversación, solicitud o respuesta para conservar el contexto.</p>'}</section></div><aside class="agreement-panel"><section><h3>Mi participación</h3><p class="microcopy">El origen de la oportunidad y la participación económica se documentan por separado.</p>${parts.map(p=>`<div class="participation-item"><span class="pill">${esc(p.status)}</span><p>${esc(names([p.broker_id]))}</p><p class="pre-wrap">${esc(p.terms || 'Condiciones por definir')}</p>${link(p.agreement_url,'Ver acuerdo')}${canAgree()?`<button data-edit-participation="${esc(p.id)}">Actualizar acuerdo</button>`:''}</div>`).join('')||'<p>Acuerdo por definir con Dirección.</p>'}${canAgree()?'<button data-new="participation">Registrar acuerdo</button>':''}</section><details><summary>Datos del expediente</summary><p>Última revisión: ${esc(o.last_review || 'Sin revisión registrada')}</p><p>Terreno: ${esc(o.terrain_id || 'Por vincular')}<br>PPP: ${esc(o.ppp_id || 'Por vincular')}</p></details></aside></div></article>`;
  }

  function field(name, label, value, type = 'text', choices, required = false) {
    return `<label><span>${esc(label)}</span>${choices ? `<select name="${name}" ${required ? 'required' : ''}>${options(choices,value || '')}</select>` : type === 'textarea' ? `<textarea name="${name}" maxlength="4000" ${required ? 'required' : ''}>${esc(value)}</textarea>` : `<input name="${name}" type="${type}" value="${esc(value)}" maxlength="1000" ${required ? 'required' : ''}>`}</label>`;
  }
  function editor(kind, record) {
    if (!canEdit() || (kind === 'participation' && !canAgree())) return;
    if (['activity','participation'].includes(kind) && !snapshot.opportunities.some(o => o.id === selected)) return;
    const r = record || {}; edit = { kind, id: r.id, revision: snapshot.revision, requestId: crypto.randomUUID(), submitted: null };
    $('form-title').textContent = ({contact:'Contacto',opportunity:'Oportunidad',activity:'Registrar revisión',participation:'Participación'})[kind];
    let fields = '';
    if (kind === 'contact') fields = field('name','Nombre',r.name,'text',null,true) + field('type','Relación',r.type,'text',['Propietario','Inversionista','Aliado','Contacto']) + field('company','Empresa',r.company) + field('email','Correo',r.email,'email') + field('phone','Teléfono',r.phone,'tel') + field('notes','Notas',r.notes,'textarea');
    if (kind === 'opportunity') fields = field('title','Nombre de la oportunidad',r.title,'text',null,true) + field('kind','Tipo',r.kind,'text',['Terreno','Capital','Codesarrollo','Plan de potencial']) + field('contact_id','Contacto',r.contact_id,'text',[{id:'',name:'Por vincular'},...snapshot.contacts]) + field('location','Ubicación',r.location) + field('terrain_id','ID del terreno existente',r.terrain_id) + field('ppp_id','ID del PPP existente',r.ppp_id) + field('ppp_url','Enlace al PPP',r.ppp_url,'url') + field('documents_url','Carpeta del expediente',r.documents_url,'url') + field('project_url','Enlace al proyecto',r.project_url,'url') + field('stage','Etapa',r.stage || 'Recibido','text',C.stages) + field('next_owner','¿Quién gestiona el siguiente paso?',C.nextStep(r.next_action).owner,'text',[{id:'',name:'Seleccionar responsable'},{id:'Masterbroker',name:'Masterbroker'},{id:'YOD',name:'YoDesarrollo'}],true) + field('next_action','¿Qué debe pasar ahora?',C.nextStep(r.next_action).text,'text',null,true) + field('next_date','Fecha de seguimiento',r.next_date,'date',null,true) + field('notes','Notas',r.notes,'textarea');
    if (['contact','opportunity'].includes(kind) && snapshot.actor.role === 'direccion') fields += `<label><span>Masterbrokers vinculados</span><select name="broker_ids" multiple required>${snapshot.brokers.map(b => `<option value="${esc(b.id)}" ${(r.broker_ids || [broker]).includes(b.id) ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>`;
    if (kind === 'activity') fields = field('note','Avance, solicitud o respuesta',r.note,'textarea',null,true) + field('next_owner','¿Quién gestiona el siguiente paso?',C.nextStep(r.next_action).owner,'text',[{id:'',name:'Seleccionar responsable'},{id:'Masterbroker',name:'Masterbroker'},{id:'YOD',name:'YoDesarrollo'}],true) + field('next_action','Entregable o siguiente acción',C.nextStep(r.next_action).text,'text',null,true) + field('next_date','Fecha acordada de seguimiento',r.next_date,'date',null,true);
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
    $('form-error').textContent = ''; $('save-record').disabled = false; $('editor').showModal();
  }
  $('workspace').onclick = e => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.tab) { tab = b.dataset.tab; selected = ''; query = ''; stage = ''; render(); }
    if (b.dataset.open) { selected = b.dataset.open; tab = 'opportunities'; query = ''; stage = ''; render(); }
    if (b.dataset.agenda !== undefined) { agendaOwner = b.dataset.agenda; render(); }
    if (b.dataset.start) editor('opportunity',{kind:b.dataset.start});
    if (b.dataset.request) editor('activity', {note:'Solicitud de análisis a YoDesarrollo: ',next_action:'[YOD] Revisar solicitud y definir entregable'});
    if (b.dataset.offerContact) editor('contact',{notes:'Interés en producto inmobiliario. Producto, disponibilidad y condiciones por confirmar con YoDesarrollo.'});
    if (b.dataset.broker) { broker = b.dataset.broker; tab = 'opportunities'; selected = ''; query = ''; stage = ''; render(); }
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
    e.preventDefault(); if (busy || !edit || !snapshot) return;
    const fd = new FormData(e.target), record = Object.fromEntries(fd);
    if (record.next_action !== undefined) { record.next_action = C.encodeStep(record.next_owner,record.next_action); delete record.next_owner; }
    if (edit.id) record.id = edit.id;
    if (['contact','opportunity'].includes(edit.kind)) record.broker_ids = snapshot.actor.role === 'direccion' ? fd.getAll('broker_ids') : [snapshot.actor.id];
    if (edit.canonicalBrokers) record.broker_ids = edit.canonicalBrokers;
    if (['activity','participation'].includes(edit.kind)) record.opportunity_id = selected;
    for (const key of ['ppp_url','documents_url','project_url','agreement_url']) if (record[key] && !C.safeLink(record[key])) { $('form-error').textContent = 'Usa un enlace HTTPS de Yod OS o Google Drive.'; return; }
    const body = JSON.stringify(record);
    if (edit.submitted && edit.submitted !== body) { $('form-error').textContent = 'Primero actualiza la cartera para comprobar el intento anterior. No se enviará una segunda versión sin verificar.'; return; }
    edit.submitted = body; busy = true; $('save-record').disabled = true; $('form-error').textContent = 'Guardando…';
    try { const result = await client.save(edit.kind,record,edit.revision,edit.requestId); snapshot = result; loadedToken = token(); $('editor').close(); edit = null; $('notice').textContent = 'Guardado confirmado por el servidor.'; render(); }
    catch (err) { $('form-error').textContent = err.message; if (token() !== loadedToken) { clear(); $('notice').textContent = 'La sesión cambió. Vuelve a entrar.'; } }
    finally { busy = false; $('save-record').disabled = false; }
  };
  window.addEventListener('storage', e => { if (e.key === 'pyod_clave_v1' || e.key === null) { client.invalidate(); clear(); $('notice').textContent = 'La sesión cambió. Actualiza para validar tu acceso.'; } });
  window.addEventListener('focus', () => { if (token() && token() !== loadedToken) { client.invalidate(); clear(); load(); } });
  load();
})();
