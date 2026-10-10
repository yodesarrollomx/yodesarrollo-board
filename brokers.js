(function () {
  'use strict';
  const C = window.BrokersCore, $ = id => document.getElementById(id);
  // Set only after contrasting the existing live backend and publishing brokers.v1.
  // No separate database, public fixture or whole-board fallback is permitted.
  const config = window.YDR_BROKERS_CONFIG || {};
  const requestedBroker = new URLSearchParams(window.location.search).get('masterbroker') || '';
  const manageRequested = new URLSearchParams(window.location.search).get('mode') === 'manage';
  let preview = false, managing = false, caseState = '', detailTab = 'history';
  const token = () => { try { return localStorage.getItem('pyod_clave_v1') || ''; } catch (_) { return ''; } };
  const client = C.createClient({ url: config.url, token, fetch: window.fetch.bind(window) });
  let snapshot = null, tab = 'opportunities', broker = '', query = '', stage = '', selected = '', busy = false, edit = null, loadedToken = '';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Hermosillo', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const options = (items, value) => items.map(x => { const id = typeof x === 'string' ? x : x.id, name = typeof x === 'string' ? x : x.name; return `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(name)}</option>`; }).join('');
  const link = (url, label) => C.safeLink(url) ? `<a target="_blank" rel="noopener noreferrer" href="${esc(C.safeLink(url))}">${esc(label)} ↗</a>` : '';
  const canEdit = () => snapshot && snapshot.capabilities && snapshot.capabilities.write === true;
  const isPersonal = () => snapshot && (snapshot.actor.role === 'broker' || managing);
  const profileName = () => managing ? (snapshot.brokers[0] || {}).name || 'Masterbroker' : snapshot.actor.name;
  function applySnapshot(live) {
    managing = !!requestedBroker && manageRequested && live.actor.role === 'direccion';
    preview = !!requestedBroker && !managing && live.actor.role === 'direccion';
    snapshot = C.workspaceSnapshot(live,requestedBroker,managing);
    if (managing) broker = requestedBroker;
  }
  function accessNotice(message = '') {
    const base = 'brokers.html?embed=1&masterbroker=' + encodeURIComponent(requestedBroker);
    $('notice').textContent = message || (preview ? 'Vista previa de ' + profileName() + '. Explora sin modificar expedientes.' : managing ? 'Gestión de la cartera de ' + profileName() + ' · guardas como ' + snapshot.actor.name + ' (Dirección).' : '');
    if (preview || managing) { const a = document.createElement('a'); a.href = base + (preview ? '&mode=manage' : ''); a.textContent = preview ? 'Gestionar esta cartera como Dirección →' : 'Ver experiencia del Masterbroker →'; $('notice').append(' ',a); }
  }
  const canAgree = () => canEdit() && snapshot.actor.role === 'direccion' && snapshot.capabilities.agree_participation === true;
  const names = ids => (ids || []).map(id => (snapshot.brokers.find(b => b.id === id) || {}).name || 'Masterbroker').join(' · ');
  const current = () => C.visible(snapshot, broker, query, stage);
  function clear() { $('identity').textContent = ''; snapshot = null; preview = false; managing = false; loadedToken = ''; selected = ''; $('workspace').replaceChildren(); $('workspace').hidden = true; if ($('editor').open) $('editor').close(); edit = null; }
  async function load() {
    if (busy) return;
    busy = true; clear(); $('notice').textContent = 'Validando tu acceso y leyendo la cartera…';
    try { const live = await client.load(); applySnapshot(live); loadedToken = token(); accessNotice(); render(); }
    catch (e) { clear(); $('notice').textContent = e.message; const b = document.createElement('button'); b.textContent = 'Volver a intentar'; b.onclick = load; $('notice').append(' ', b); }
    finally { busy = false; }
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
    $('identity').textContent = profileName() || '';
    $('workspace').hidden = false;
    $('brokers').classList.toggle('personal-workspace',isPersonal());
    const direction = snapshot.actor.role === 'direccion' && !managing;
    const navigation = [['opportunities','Cartera'],['contacts','Contactos'],['offer','Material'],['participations','Acuerdos'],...(direction?[['brokers','Equipo']]:[])];
    const isList = !selected && tab !== 'offer';
    $('workspace').innerHTML = `<nav class="module-tabs" aria-label="Masterbrokers">${navigation.map(([id,label])=>`<button data-tab="${id}" aria-current="${tab===id?'page':'false'}">${label}</button>`).join('')}<button class="refresh" data-action="refresh" aria-label="Actualizar cartera">↻</button></nav>${isList?`<div class="toolbar"><input id="search" type="search" aria-label="Buscar en esta sección" placeholder="Buscar expediente o contacto" value="${esc(query)}">${direction?`<select id="broker-filter" aria-label="Masterbroker"><option value="">Todo el equipo</option>${options(snapshot.brokers,broker)}</select>`:''}${tab==='opportunities'?`<select id="state-filter" aria-label="Estado"><option value="">Todos</option><option value="open" ${caseState==='open'?'selected':''}>Abiertos</option><option value="closed" ${caseState==='closed'?'selected':''}>Cerrados</option></select><select id="stage-filter" aria-label="Etapa"><option value="">Todas las etapas</option>${options(C.stages,stage)}</select>`:''}${canEdit()&&['opportunities','contacts'].includes(tab)?`<button class="primary" data-new="${tab==='contacts'?'contact':'opportunity'}">+ ${tab==='contacts'?'Contacto':'Oportunidad'}</button>`:''}</div>`:''}<div id="content"></div>`;
    const content = $('content');
    if (tab === 'opportunities') content.innerHTML = selected ? detail(snapshot.opportunities.find(o=>o.id===selected)) : portfolio();
    if (tab === 'contacts') content.innerHTML = contactsView();
    if (tab === 'offer') content.innerHTML = materialView();
    if (tab === 'participations') content.innerHTML = agreementsView();
    if (tab === 'brokers') content.innerHTML = teamView();
    if ($('search')) $('search').addEventListener('input', e => { query=e.target.value; const pos=e.target.selectionStart; render(); $('search').focus(); try{$('search').setSelectionRange(pos,pos);}catch(_){} });
    if ($('broker-filter')) $('broker-filter').onchange=e=>{broker=e.target.value;selected='';render();};
    if ($('stage-filter')) $('stage-filter').onchange=e=>{stage=e.target.value;render();};
    if ($('state-filter')) $('state-filter').onchange=e=>{caseState=e.target.value;render();};
    if ($('record-select')) $('record-select').onchange=e=>{selected=e.target.value;render();};
  }
  function table(headers, rows, label) {
    return `<div class="table-scroll" role="region" aria-label="${esc(label)}" tabindex="0"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}" class="empty-cell">No hay registros en esta vista.</td></tr>`}</tbody></table></div>`;
  }
  function portfolio() {
    const list=groups();
    return `<div class="list-caption">${list.length} expedientes</div>`+table(['Expediente / contacto','Estado','Última actualización','Seguimiento',''],list.map(g=>{
      const o=g.records[0], a=g.activities[0], stages=[...new Set(g.records.map(r=>r.stage).filter(Boolean))];
      const next=C.agenda(g.records,'').find(r=>r.next_date||C.nextStep(r.next_action).text);
      const step=next?C.nextStep(next.next_action):{};
      const state=stages.length===1?stages[0]:[g.open?`${g.open} abiertos`:'',g.records.length-g.open?`${g.records.length-g.open} cerrados`:''].filter(Boolean).join(' · ');
      const contact=g.contacts.map(c=>c.name).filter(Boolean);
      const updated=g.records.slice().sort((a,b)=>String(b.last_review||b.updated_at||'').localeCompare(String(a.last_review||a.updated_at||'')))[0];
      const summary=a?a.note:updated.source_status;
      return `<tr class="case-row" data-case="${esc(g.key)}"><td class="case-cell"><strong>${esc(o.title)}</strong>${contact.length?`<span class="secondary contact-name" title="${esc(contact.join(' · '))}">${esc(contact[0])}${contact.length>1?` +${contact.length-1}`:''}</span>`:''}${g.records.length>1?`<button class="related-count" data-open="${esc(o.id)}">${g.records.length} gestiones${g.contacts.length>1?` · ${g.contacts.length} contactos`:''}</button>`:''}</td><td><span class="status" title="${esc(stages.join(' · '))}">${esc(state)}</span></td><td class="update-cell">${summary?`<span class="one-line" title="${esc(summary)}">${esc(summary)}</span>`:''}${a&&a.date?`<time class="secondary">${esc(dateLabel(a.date))}${a.author_name?' · '+esc(a.author_name):''}</time>`:updated.last_review?`<time class="secondary">${esc(dateLabel(updated.last_review))}</time>`:''}</td><td class="followup-cell">${step.text?`<span class="one-line" title="${esc(step.text)}">${esc(step.text)}</span>`:''}${next?`<span class="secondary ${C.overdue(next,today())?'late-text':''}">${esc([dateLabel(next.next_date),step.owner].filter(Boolean).join(' · '))}</span>`:''}</td><td class="open-cell"><button class="open-board" data-open="${esc(o.id)}">Ver tablero <span aria-hidden="true">→</span></button></td></tr>`;
    }).join(''),'Expedientes');
  }
  function contactsView() {
    const contacts=snapshot.contacts.filter(c=>(!broker||(c.broker_ids||[]).includes(broker))&&[c.name,c.company,c.email,c.phone].join(' ').toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')));
    return table(['Contacto','Relación','Expedientes',''],contacts.map(c=>{
      const related=C.caseGroups(snapshot,broker,'','','').filter(g=>g.contacts.some(x=>x.id===c.id));
      return `<tr><td><strong>${esc(c.name)}</strong><span class="secondary">${esc([c.company,c.email,c.phone].filter(Boolean).join(' · '))}</span></td><td>${esc(c.type)}</td><td>${related.map(g=>`<button class="text-button" data-open="${esc(g.records[0].id)}">${esc(g.records[0].title)}</button>`).join('')}</td><td>${canEdit()?`<button data-edit-contact="${esc(c.id)}">Editar</button>`:''}</td></tr>`;
    }).join(''),'Contactos');
  }
  function materialView() {
    const all=C.caseGroups(snapshot,broker,'','','');
    return `<div class="section-heading"><h2>Material</h2><a class="button" href="index.html">Carpeta comercial ↗</a></div>`+table(['Expediente','Material',''],all.map(g=>{
      const links=groupLinks(g);
      return links?`<tr><td><strong>${esc(g.records[0].title)}</strong></td><td class="material-links">${links}</td><td><button data-open="${esc(g.records[0].id)}">Ver tablero →</button></td></tr>`:'';
    }).join(''),'Material por expediente');
  }
  function agreementsView() {
    const ids=new Set(current().map(o=>o.id));
    const parts=snapshot.participations.filter(p=>ids.has(p.opportunity_id)&&(!broker||p.broker_id===broker));
    return table(['Expediente','Participación','Estado',''],parts.map(p=>`<tr><td><strong>${esc((snapshot.opportunities.find(o=>o.id===p.opportunity_id)||{}).title)}</strong><span class="secondary">${esc(names([p.broker_id]))}</span></td><td>${esc(p.terms)} ${link(p.agreement_url,'Acuerdo')}</td><td>${esc(p.status)}</td><td><button data-open="${esc(p.opportunity_id)}">Ver tablero →</button></td></tr>`).join(''),'Acuerdos');
  }
  function teamView() {
    return table(['Nombre','Cartera',''],snapshot.brokers.filter(b=>(!broker||b.id===broker)&&b.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).map(b=>`<tr><td><strong>${esc(b.name)}</strong></td><td>${C.caseGroups(snapshot,b.id,'','','').length} expedientes</td><td><button data-broker="${esc(b.id)}">Ver cartera →</button> <a href="brokers.html?embed=1&amp;masterbroker=${encodeURIComponent(b.id)}">Vista personal ↗</a></td></tr>`).join(''),'Equipo');
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
    if(detailTab==='history')body=`<ol class="timeline">${g.activities.map(a=>`<li><div class="timeline-meta">${a.date?`<time>${esc(dateLabel(a.date))}</time>`:''}${a.author_name?`<span>${esc(a.author_name)}</span>`:''}${g.records.length>1?`<span>${esc((g.records.find(r=>r.id===a.opportunity_id)||{}).title)}</span>`:''}</div><p class="pre-wrap">${esc(a.note)}</p>${a.next_action?`<div class="event-next">${esc(C.nextStep(a.next_action).text)}${a.next_date?' · '+esc(dateLabel(a.next_date)):''}</div>`:''}</li>`).join('')}</ol>${g.activities.length?'':'<p class="empty-cell">No hay movimientos registrados.</p>'}`;
    if(detailTab==='records')body=table(['Gestión','Contacto','Estado',''],g.records.map(r=>`<tr><td><strong>${esc(r.title)}</strong><span class="secondary">${esc(r.kind)}</span></td><td>${esc((snapshot.contacts.find(c=>c.id===r.contact_id)||{}).name)}</td><td>${esc(r.stage)}</td><td><button data-select-record="${esc(r.id)}" ${r.id===selected?'disabled':''}>${r.id===selected?'Seleccionado':'Seleccionar'}</button></td></tr>`).join(''),'Gestiones relacionadas')+`<section class="record-info">${o.source_status?`<p>${esc(o.source_status)}</p>`:''}${o.notes?`<p class="pre-wrap">${esc(o.notes)}</p>`:''}${contact?`<p>${esc([contact.name,contact.company,contact.email,contact.phone].filter(Boolean).join(' · '))}</p>`:''}${canEdit()?`<button data-edit-opportunity="${esc(o.id)}">Editar registro</button>`:''}</section>`;
    if(detailTab==='material')body=`<div class="material-links">${groupLinks(g)||'<p class="empty-cell">No hay material vinculado.</p>'}</div>`;
    if(detailTab==='agreements')body=`${parts.map(p=>`<section class="agreement-item"><div class="row"><strong>${esc(names([p.broker_id]))}</strong><span class="status">${esc(p.status)}</span></div>${p.terms?`<p class="pre-wrap">${esc(p.terms)}</p>`:''}${link(p.agreement_url,'Ver acuerdo')}${canAgree()?`<button data-edit-participation="${esc(p.id)}">Editar acuerdo</button>`:''}</section>`).join('')}${canAgree()?'<button data-new="participation">+ Acuerdo</button>':''}`;
    return `<article class="detail"><button class="text-button" data-action="back">← Cartera</button><div class="detail-heading"><div><h2>${esc(g.records[0].title)}</h2>${g.contacts.length?`<p class="muted">${esc(g.contacts.map(c=>c.name).join(' · '))}</p>`:''}</div><div class="detail-actions">${canEdit()?'<button class="primary" data-followup="true">+ Seguimiento</button>'+(o.terrain_id||o.ppp_id?'<button data-related="true">+ Gestión</button>':'')+'':''}</div></div>${g.records.length>1?`<label class="record-picker"><span>Registro activo</span><select id="record-select">${options(g.records.map(r=>({id:r.id,name:r.title+' · '+r.kind})),o.id)}</select></label>`:''}<div class="record-status"><span class="status">${esc(o.stage)}</span>${step.text?`<span>${esc(step.text)}</span>`:''}${o.next_date?`<time>${esc(dateLabel(o.next_date))}</time>`:''}${step.owner?`<span class="muted">${esc(step.owner)}</span>`:''}</div><nav class="detail-tabs" aria-label="Expediente">${[['history','Historial'],['records',`Gestiones (${g.records.length})`],['material','Material'],['agreements','Acuerdos']].map(([id,label])=>`<button data-detail-tab="${id}" aria-current="${detailTab===id?'page':'false'}">${label}</button>`).join('')}</nav><div class="detail-body">${body}</div></article>`;
  }

  function field(name, label, value, type = 'text', choices, required = false) {
    return `<label><span>${esc(label)}</span>${choices ? `<select name="${name}" ${required ? 'required' : ''}>${options(choices,value || '')}</select>` : type === 'textarea' ? `<textarea name="${name}" maxlength="4000" ${required ? 'required' : ''}>${esc(value)}</textarea>` : `<input name="${name}" type="${type}" value="${esc(value)}" maxlength="1000" ${required ? 'required' : ''}>`}</label>`;
  }
  function editor(kind, record) {
    if (!canEdit() || (kind === 'participation' && !canAgree())) return;
    if (['activity','participation'].includes(kind) && !snapshot.opportunities.some(o => o.id === selected)) return;
    const r = record || (kind === 'activity' ? snapshot.opportunities.find(o=>o.id===selected) || {} : {}); edit = { kind, id: kind === 'activity' ? undefined : r.id, revision: snapshot.revision, requestId: crypto.randomUUID(), submitted: null };
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
    if (managing && r.id && ['contact','opportunity'].includes(kind)) edit.canonicalBrokers = r.broker_ids;
    if (edit.kind === 'activity') { const outcome = document.createElement('div'); outcome.innerHTML = field('outcome','Resultado de la conversación','','text',[{id:'',name:'Seleccionar si aplica'},'Obtuve respuesta','Necesita más información','Sin respuesta','Solicité análisis a YOD','Recibí respuesta de YOD']); $('fields').prepend(outcome); }
    $('form-error').textContent = preview ? 'Estás explorando la vista del Masterbroker. No se guardan cambios desde esta vista previa.' : ''; $('save-record').disabled = preview; $('save-record').textContent = preview ? 'Guardado deshabilitado en vista previa' : 'Guardar'; $('editor').showModal();
  }
  $('workspace').onclick = e => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.tab) { caseState = ''; detailTab = 'history'; tab = b.dataset.tab; selected = ''; query = ''; stage = ''; render(); }
    if (b.dataset.open) { selected = b.dataset.open; tab = 'opportunities'; detailTab = 'history'; render(); }
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
    e.preventDefault(); if (preview || busy || !edit || !snapshot) return;
    const fd = new FormData(e.target), record = Object.fromEntries(fd);
    if (Object.prototype.hasOwnProperty.call(record,'outcome')) { if(record.outcome) record.note = record.outcome + ': ' + record.note; delete record.outcome; }
    if (record.next_action !== undefined) { record.next_action = C.encodeStep(record.next_owner,record.next_action); delete record.next_owner; }
    if (edit.id) record.id = edit.id;
    if (['contact','opportunity'].includes(edit.kind)) record.broker_ids = snapshot.actor.role === 'direccion' ? fd.getAll('broker_ids') : [snapshot.actor.id];
    if (edit.canonicalBrokers) record.broker_ids = edit.canonicalBrokers;
    if (['activity','participation'].includes(edit.kind)) record.opportunity_id = selected;
    for (const key of ['ppp_url','documents_url','project_url','agreement_url']) if (record[key] && !C.safeLink(record[key])) { $('form-error').textContent = 'Usa un enlace HTTPS de Yod OS o Google Drive.'; return; }
    const body = JSON.stringify(record);
    if (edit.submitted && edit.submitted !== body) { $('form-error').textContent = 'Primero actualiza la cartera para comprobar el intento anterior. No se enviará una segunda versión sin verificar.'; return; }
    edit.submitted = body; busy = true; $('save-record').disabled = true; $('form-error').textContent = 'Guardando…';
    try { const result = await client.save(edit.kind,record,edit.revision,edit.requestId); applySnapshot(result); loadedToken = token(); $('editor').close(); const savedKind=edit.kind; edit = null; if(savedKind==='opportunity'){tab='opportunities';selected='';query='';stage='';} if(savedKind==='contact'){tab='contacts';query='';} accessNotice('Guardado.'); render(); }
    catch (err) { $('form-error').textContent = err.message; if (token() !== loadedToken) { clear(); $('notice').textContent = 'La sesión cambió. Vuelve a entrar.'; } }
    finally { busy = false; $('save-record').disabled = false; }
  };
  window.addEventListener('storage', e => { if (e.key === 'pyod_clave_v1' || e.key === null) { client.invalidate(); clear(); $('notice').textContent = 'La sesión cambió. Actualiza para validar tu acceso.'; } });
  window.addEventListener('focus', () => { if (token() && token() !== loadedToken) { client.invalidate(); clear(); load(); } });
  load();
})();
