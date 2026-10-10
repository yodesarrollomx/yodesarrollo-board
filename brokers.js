(function () {
  'use strict';
  const C = window.BrokersCore, $ = id => document.getElementById(id);
  // Set only after contrasting the existing live backend and publishing brokers.v1.
  // No separate database, public fixture or whole-board fallback is permitted.
  const config = window.YDR_BROKERS_CONFIG || {};
  const token = () => { try { return localStorage.getItem('pyod_clave_v1') || ''; } catch (_) { return ''; } };
  const client = C.createClient({ url: config.url, token, fetch: window.fetch.bind(window) });
  let snapshot = null, tab = 'opportunities', broker = '', query = '', stage = '', selected = '', busy = false, edit = null, loadedToken = '';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Hermosillo', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const options = (items, value) => items.map(x => { const id = typeof x === 'string' ? x : x.id, name = typeof x === 'string' ? x : x.name; return `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(name)}</option>`; }).join('');
  const link = (url, label) => C.safeLink(url) ? `<a target="_blank" rel="noopener noreferrer" href="${esc(C.safeLink(url))}">${esc(label)} ↗</a>` : `<span class="muted">${esc(label)} pendiente de vincular</span>`;
  const canEdit = () => snapshot && snapshot.capabilities && snapshot.capabilities.write === true;
  const canAgree = () => canEdit() && snapshot.actor.role === 'direccion' && snapshot.capabilities.agree_participation === true;
  const names = ids => (ids || []).map(id => (snapshot.brokers.find(b => b.id === id) || {}).name || 'Broker').join(' · ');
  const current = () => C.visible(snapshot, broker, query, stage);
  function clear() { $('identity').textContent = 'Tu cartera, sus avances y el siguiente paso.'; snapshot = null; loadedToken = ''; selected = ''; $('workspace').replaceChildren(); $('workspace').hidden = true; if ($('editor').open) $('editor').close(); edit = null; }
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
    $('identity').textContent = `${snapshot.actor.name || 'Mi cartera'} · ${snapshot.actor.role === 'direccion' ? 'Dirección' : 'Master broker'}`;
    $('workspace').hidden = false;
    $('workspace').innerHTML = `<div class="stats"><div class="stat"><strong>${all.length}</strong><span>Oportunidades</span></div><div class="stat"><strong>${all.filter(o => C.overdue(o, today())).length}</strong><span>Seguimientos vencidos</span></div><div class="stat"><strong>${all.filter(o => o.stage === 'PPP presentado').length}</strong><span>PPP presentados</span></div><div class="stat"><strong>${all.filter(o => o.stage === 'Formalizado').length}</strong><span>Formalizadas</span></div></div>
    <nav class="tabs" aria-label="Secciones">${[['opportunities','Oportunidades'],['contacts','Contactos'],['participations','Participaciones'],['brokers','Brokers']].map(([id,label]) => `<button data-tab="${id}" class="${tab === id ? 'active' : ''}" aria-pressed="${tab === id}">${label}</button>`).join('')}<button data-action="refresh">Actualizar</button></nav>
    <div class="toolbar"><input id="search" type="search" aria-label="Buscar" placeholder="Buscar nombre, terreno o ubicación" value="${esc(query)}">${snapshot.actor.role === 'direccion' ? `<select id="broker-filter" aria-label="Broker"><option value="">Todos los brokers</option>${options(snapshot.brokers,broker)}</select>` : ''}${tab === 'opportunities' ? `<select id="stage-filter" aria-label="Etapa"><option value="">Todas las etapas</option>${options(C.stages,stage)}</select>` : ''}${canEdit() && ['contacts','opportunities'].includes(tab) ? `<button class="primary" data-new="${tab === 'contacts' ? 'contact' : 'opportunity'}">+ ${tab === 'contacts' ? 'Contacto' : 'Oportunidad'}</button>` : ''}</div><div id="content"></div>`;
    const content = $('content');
    if (tab === 'opportunities') content.innerHTML = selected ? detail(snapshot.opportunities.find(o => o.id === selected)) : `<div class="grid">${rows.map(o => `<article class="card"><span class="pill">${esc(o.stage)}</span><h3>${esc(o.title)}</h3><p>${esc(o.location || 'Ubicación por completar')}</p><small>${esc(names(o.broker_ids))}</small><p>Última revisión: ${esc(o.last_review || 'Sin revisión registrada')}<br>Siguiente: ${esc(o.next_action || 'Definir siguiente acción')}</p><div class="row"><span class="pill ${C.overdue(o,today()) ? 'late' : ''}">${esc(o.next_date || 'Sin fecha')}</span><button data-open="${esc(o.id)}">Abrir expediente</button></div></article>`).join('')}</div>${rows.length ? '' : '<p class="empty">No hay oportunidades con estos filtros. Registra una o ajusta la búsqueda.</p>'}`;
    if (tab === 'contacts') {
      const contacts = snapshot.contacts.filter(c => (!broker || (c.broker_ids || []).includes(broker)) && [c.name,c.company,c.email,c.phone].join(' ').toLowerCase().includes(query.toLowerCase()));
      content.innerHTML = `<div class="grid">${contacts.map(c => `<article class="card"><span class="pill">${esc(c.type || 'Contacto')}</span><h3>${esc(c.name)}</h3><p>${esc(c.company)}<br>${esc(c.email)}<br>${esc(c.phone)}</p><small>${esc(names(c.broker_ids))}</small><p>${esc(c.notes)}</p>${canEdit() ? `<button data-edit-contact="${esc(c.id)}">Editar contacto</button>` : ''}</article>`).join('')}</div>${contacts.length ? '' : '<p class="empty">No hay contactos con estos filtros.</p>'}`;
    }
    if (tab === 'participations') {
      const ids = new Set(rows.map(o => o.id)); const parts = snapshot.participations.filter(p => ids.has(p.opportunity_id) && (!broker || p.broker_id === broker));
      content.innerHTML = `<p class="muted">La presentación de una oportunidad reconoce su origen. La participación económica depende del acuerdo registrado.</p><div class="grid">${parts.map(p => `<article class="card"><span class="pill">${esc(p.status)}</span><h3>${esc((snapshot.opportunities.find(o => o.id === p.opportunity_id) || {}).title)}</h3><p>${esc(names([p.broker_id]))}</p><p>${esc(p.terms || 'Condiciones por definir')}</p>${link(p.agreement_url,'Acuerdo')}<p>${esc(p.confirmed_at || '')}</p>${canAgree() ? `<button data-edit-participation="${esc(p.id)}">Actualizar participación</button>` : ''}</article>`).join('')}</div>${parts.length ? '' : '<p class="empty">No hay participaciones registradas para estos expedientes.</p>'}`;
    }
    if (tab === 'brokers') content.innerHTML = `<div class="grid">${snapshot.brokers.filter(b => (!broker || b.id === broker) && b.name.toLowerCase().includes(query.toLowerCase())).map(b => `<article class="card"><span class="pill">${b.active ? 'Acceso vinculado' : 'Identidad por vincular'}</span><h3>${esc(b.name)}</h3><p>${snapshot.opportunities.filter(o => (o.broker_ids || []).includes(b.id)).length} oportunidades vinculadas</p><button data-broker="${esc(b.id)}">Ver cartera</button></article>`).join('')}</div>`;
    $('search').addEventListener('input', e => { query = e.target.value; const pos = e.target.selectionStart; selected = ''; render(); $('search').focus(); try { $('search').setSelectionRange(pos,pos); } catch (_) {} });
    if ($('broker-filter')) $('broker-filter').onchange = e => { broker = e.target.value; selected = ''; render(); };
    if ($('stage-filter')) $('stage-filter').onchange = e => { stage = e.target.value; selected = ''; render(); };
  }
  function detail(o) {
    if (!o) return '<p>Expediente no disponible.</p>';
    const contact = snapshot.contacts.find(c => c.id === o.contact_id);
    const activities = snapshot.activities.filter(a => a.opportunity_id === o.id).sort((a,b) => String(b.date).localeCompare(String(a.date)));
    return `<article class="detail"><div class="row"><button data-action="back">← Cartera</button><span class="pill">${esc(o.stage)}</span></div><h1>${esc(o.title)}</h1><p>${esc(o.location)} · ${esc(o.kind || 'Terreno')}</p><p>${esc(names(o.broker_ids))}</p><section><h2>Contacto y seguimiento</h2><p>${esc(contact ? contact.name : 'Contacto por vincular')} · ${esc(contact ? contact.phone : '')}</p><p>Última revisión: ${esc(o.last_review || 'Sin revisión')}<br>Próxima acción: ${esc(o.next_action || 'Por definir')} · ${esc(o.next_date || 'Sin fecha')}</p>${o.source_status ? `<p><strong>Estado documental de la cartera:</strong> ${esc(o.source_status)}</p>` : ''}<p>${esc(o.notes)}</p>${canEdit() ? `<button data-edit-opportunity="${esc(o.id)}">Editar expediente</button>` : ''}</section><section><h2>Expediente conectado</h2><p>${link(o.ppp_url,'Abrir PPP')} · ${link(o.documents_url,'Documentos')} · ${link(o.project_url,'Proyecto')}</p><small>Referencias canónicas: ${esc(o.terrain_id || 'Terreno por vincular')} · ${esc(o.ppp_id || 'PPP por vincular')}</small></section><section><div class="row"><h2>Historial</h2>${canEdit() ? '<button data-new="activity">+ Registrar revisión</button>' : ''}</div>${activities.map(a => `<div class="list-item"><small>${esc(a.date)} · ${esc(a.author_name || 'Equipo')}</small><p>${esc(a.note)}</p></div>`).join('') || '<p class="muted">Sin revisiones registradas.</p>'}</section><section><div class="row"><h2>Participación</h2>${canAgree() ? '<button data-new="participation">Registrar acuerdo</button>' : ''}</div>${snapshot.participations.filter(p => p.opportunity_id === o.id).map(p => `<p><span class="pill">${esc(p.status)}</span> ${esc(names([p.broker_id]))} · ${esc(p.terms || 'Por definir')} ${canAgree() ? `<button data-edit-participation="${esc(p.id)}">Actualizar</button>` : ''}</p>`).join('') || '<p>Por definir. No se asigna un porcentaje automáticamente.</p>'}</section></article>`;
  }
  function field(name, label, value, type = 'text', choices, required = false) {
    return `<label><span>${esc(label)}</span>${choices ? `<select name="${name}" ${required ? 'required' : ''}>${options(choices,value || '')}</select>` : type === 'textarea' ? `<textarea name="${name}" maxlength="4000" ${required ? 'required' : ''}>${esc(value)}</textarea>` : `<input name="${name}" type="${type}" value="${esc(value)}" maxlength="1000" ${required ? 'required' : ''}>`}</label>`;
  }
  function editor(kind, record) {
    if (!canEdit() || (kind === 'participation' && !canAgree())) return;
    const r = record || {}; edit = { kind, id: r.id, revision: snapshot.revision, requestId: crypto.randomUUID(), submitted: null };
    $('form-title').textContent = ({contact:'Contacto',opportunity:'Oportunidad',activity:'Registrar revisión',participation:'Participación'})[kind];
    let fields = '';
    if (kind === 'contact') fields = field('name','Nombre',r.name,'text',null,true) + field('type','Relación',r.type,'text',['Propietario','Inversionista','Aliado','Contacto']) + field('company','Empresa',r.company) + field('email','Correo',r.email,'email') + field('phone','Teléfono',r.phone,'tel') + field('notes','Notas',r.notes,'textarea');
    if (kind === 'opportunity') fields = field('title','Nombre de la oportunidad',r.title,'text',null,true) + field('kind','Tipo',r.kind,'text',['Terreno','Capital','Codesarrollo','Plan de potencial']) + field('contact_id','Contacto',r.contact_id,'text',[{id:'',name:'Por vincular'},...snapshot.contacts]) + field('location','Ubicación',r.location) + field('terrain_id','ID del terreno existente',r.terrain_id) + field('ppp_id','ID del PPP existente',r.ppp_id) + field('ppp_url','Enlace al PPP',r.ppp_url,'url') + field('documents_url','Carpeta del expediente',r.documents_url,'url') + field('project_url','Enlace al proyecto',r.project_url,'url') + field('stage','Etapa',r.stage || 'Recibido','text',C.stages) + field('next_action','Siguiente acción',r.next_action,'text',null,true) + field('next_date','Fecha de seguimiento',r.next_date,'date',null,true) + field('notes','Notas',r.notes,'textarea');
    if (['contact','opportunity'].includes(kind) && snapshot.actor.role === 'direccion') fields += `<label><span>Brokers vinculados</span><select name="broker_ids" multiple required>${snapshot.brokers.map(b => `<option value="${esc(b.id)}" ${(r.broker_ids || [broker]).includes(b.id) ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>`;
    if (kind === 'activity') fields = field('note','Qué se revisó y qué se acordó','','textarea',null,true) + field('next_action','Siguiente acción','','text',null,true) + field('next_date','Fecha de seguimiento','','date',null,true);
    if (kind === 'participation') fields = field('broker_id','Broker',r.broker_id,'text',snapshot.brokers.filter(b => (snapshot.opportunities.find(o => o.id === selected).broker_ids || []).includes(b.id) && (!r.id || b.id === r.broker_id)),true) + field('status','Estado',r.status || 'Por definir','text',C.participationStates.slice(r.id ? C.participationStates.indexOf(r.status) : 0,(r.id ? C.participationStates.indexOf(r.status) : 0)+2)) + field('terms','Condiciones y base de cálculo',r.terms,'textarea',null,true) + field('agreement_url','Documento de acuerdo',r.agreement_url,'url');
    $('fields').innerHTML = fields;
    if (kind === 'opportunity' && Object.prototype.hasOwnProperty.call(r,'source_status')) {
      const note = document.createElement('p'); note.className = 'muted'; note.textContent = 'El nombre, los enlaces y el broker provienen de la cartera existente. Aquí se actualizan el seguimiento y la relación con el contacto.'; $('fields').prepend(note);
      for (const name of ['title','ppp_id','ppp_url','documents_url','broker_ids']) { const el = $('fields').querySelector(`[name="${name}"]`); if (!el) continue; if (el.tagName === 'SELECT') el.disabled = true; else el.readOnly = true; }
      edit.canonicalBrokers = r.broker_ids;
    }
    $('form-error').textContent = ''; $('save-record').disabled = false; $('editor').showModal();
  }
  $('workspace').onclick = e => {
    const b = e.target.closest('button'); if (!b || busy) return;
    if (b.dataset.tab) { tab = b.dataset.tab; selected = ''; render(); }
    if (b.dataset.open) { selected = b.dataset.open; render(); }
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
