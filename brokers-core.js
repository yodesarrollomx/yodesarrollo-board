(function (root) {
  'use strict';
  const stages = ['Recibido', 'En revisión', 'PPP en proceso', 'PPP presentado', 'En negociación', 'Formalizado', 'En pausa', 'Descartado'];
  const participationStates = ['Por definir', 'Propuesta', 'Acordada', 'Devengada', 'Pagada'];
  function safeLink(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && ['yodesarrollomx.github.io', 'docs.google.com', 'drive.google.com'].includes(u.hostname) && !u.username && !u.password ? u.href : '';
    } catch (_) { return ''; }
  }
  function validateSnapshot(s) {
    if (!s || s.contract !== 'brokers.v1' || !s.actor || !s.actor.id || !['broker', 'direccion'].includes(s.actor.role) || !Number.isInteger(s.revision)) throw new Error('El servidor todavía no ofrece el acceso de Brokers.');
    for (const key of ['brokers', 'contacts', 'opportunities', 'activities', 'participations']) {
      if (!Array.isArray(s[key]) || s[key].some(r => !r || typeof r.id !== 'string')) throw new Error('Respuesta incompleta del servidor.');
    }
    // Defense in depth, never a replacement for server-side row authorization.
    if (s.actor.role === 'broker') {
      const owns = r => Array.isArray(r.broker_ids) && r.broker_ids.includes(s.actor.id);
      if (s.contacts.some(r => !owns(r)) || s.opportunities.some(r => !owns(r)) || s.brokers.some(r => r.id !== s.actor.id) || s.participations.some(r => r.broker_id !== s.actor.id)) throw new Error('El alcance de la respuesta no coincide con tu acceso.');
      const ids = new Set(s.opportunities.map(r => r.id));
      if (s.activities.some(r => !ids.has(r.opportunity_id)) || s.participations.some(r => !ids.has(r.opportunity_id))) throw new Error('Relaciones fuera del alcance autorizado.');
    }
    return s;
  }
  function visible(s, broker, query, stage) {
    const q = String(query || '').toLocaleLowerCase('es');
    return s.opportunities.filter(o => (!broker || (o.broker_ids || []).includes(broker)) && (!stage || o.stage === stage) && [o.title, o.location, o.id, (s.contacts.find(c => c.id === o.contact_id) || {}).name].join(' ').toLocaleLowerCase('es').includes(q));
  }
  // Group only explicit canonical references, inside the already-authorized snapshot.
  // Names and contact identity never merge independent terrain records.
  function caseGroups(s, broker, query, stage, state) {
    const groups = new Map(), q = String(query || '').trim().toLocaleLowerCase('es');
    const closed = o => ['Formalizado','Descartado'].includes(o.stage);
    for (const o of visible(s,broker,'','')) {
      const key = o.terrain_id ? 'terrain:' + o.terrain_id : o.ppp_id ? 'ppp:' + o.ppp_id : 'opportunity:' + o.id;
      if (!groups.has(key)) groups.set(key,{key, records:[]});
      groups.get(key).records.push(o);
    }
    return [...groups.values()].map(g => {
      const ids = new Set(g.records.map(o=>o.id)), contacts = s.contacts.filter(c=>g.records.some(o=>o.contact_id===c.id));
      const activities = s.activities.filter(a=>ids.has(a.opportunity_id)).slice().sort((a,b)=>String(b.date || '').localeCompare(String(a.date || '')));
      return Object.assign(g,{contacts,activities,open:g.records.filter(o=>!closed(o)).length});
    }).filter(g => (!stage || g.records.some(o=>o.stage===stage)) && (!state || (state==='open' ? g.open>0 : g.open===0)) &&
      (!q || [...g.records.flatMap(o=>[o.id,o.title,o.location,o.kind,o.terrain_id,o.ppp_id]),...g.contacts.flatMap(c=>[c.name,c.company])].join(' ').toLocaleLowerCase('es').includes(q)));
  }
  function overdue(o, today) { return !!o.next_date && o.next_date < today && !['Formalizado', 'Descartado', 'En pausa'].includes(o.stage); }
  function nextStep(value) {
    const text = String(value || ''), match = text.match(/^\[(YOD|Masterbroker)\]\s*/);
    return { owner: match ? match[1] : '', text: match ? text.slice(match[0].length) : text };
  }
  function encodeStep(owner, value) {
    const text = nextStep(value).text.trim();
    return text && ['YOD','Masterbroker'].includes(owner) ? `[${owner}] ${text}` : text;
  }
  function agenda(rows, owner) {
    return rows.filter(o => !['Formalizado','Descartado','En pausa'].includes(o.stage) && (!owner || nextStep(o.next_action).owner === owner))
      .slice().sort((a,b) => String(a.next_date || '9999').localeCompare(String(b.next_date || '9999')));
  }
  function previewSnapshot(s, id) {
    validateSnapshot(s);
    if (!id) return s;
    if (s.actor.role !== 'direccion') {
      if (s.actor.id !== id) throw new Error('Esta cartera no corresponde a tu acceso.');
      return s;
    }
    const person = s.brokers.find(b => b.id === id);
    if (!person) throw new Error('No se encontró la cartera solicitada.');
    const owns = r => (r.broker_ids || []).includes(id);
    const opportunities = s.opportunities.filter(owns), ids = new Set(opportunities.map(o => o.id));
    return validateSnapshot(Object.assign({},s,{
      actor:{id:person.id,name:person.name,role:'broker'},
      capabilities:Object.assign({},s.capabilities,{agree_participation:false}),
      brokers:[person],contacts:s.contacts.filter(owns),opportunities,
      activities:s.activities.filter(a => ids.has(a.opportunity_id)),
      participations:s.participations.filter(p => p.broker_id === id && ids.has(p.opportunity_id))
    }));
  }
  function workspaceSnapshot(s, id, manage) {
    const scoped = previewSnapshot(s,id);
    // URL chooses a view, never an identity or extra authorization.
    if (!id || !manage || s.actor.role !== 'direccion') return scoped;
    return Object.assign({},scoped,{actor:s.actor,capabilities:s.capabilities});
  }
  function dailyControl(rows, day) {
    const active = agenda(rows,''), closed = rows.filter(o => !active.includes(o));
    return {
      all: active,
      overdue: active.filter(o => o.next_date && o.next_date < day),
      today: active.filter(o => o.next_date === day),
      upcoming: active.filter(o => o.next_date && o.next_date > day),
      unplanned: active.filter(o => !o.next_date || !nextStep(o.next_action).owner || !nextStep(o.next_action).text.trim()),
      mine: active.filter(o => nextStep(o.next_action).owner === 'Masterbroker'),
      yod: active.filter(o => nextStep(o.next_action).owner === 'YOD'),
      closed
    };
  }
  function createClient(config) {
    let generation = 0;
    async function request(action, data, requestId) {
      const token = config.token();
      if (!token) throw new Error('Entra a Yod OS para validar tu sesión.');
      if (!config.url) throw new Error('La conexión de Brokers está pendiente de activación.');
      const own = ++generation, controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout || 20000);
      try {
        const response = await config.fetch(config.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, k: token, data, request_id: requestId }), signal: controller.signal, cache: 'no-store', credentials: 'omit' });
        if (!response.ok) throw new Error(response.status === 403 || response.status === 401 ? 'Tu sesión no tiene acceso a Brokers.' : 'No se pudo conectar con Brokers.');
        const json = await response.json();
        if (own !== generation || config.token() !== token) throw new Error('La sesión cambió; vuelve a cargar.');
        if (!json.ok) { const messages = { conflict:'Otra persona actualizó el expediente. Recarga antes de guardar.', broker_not_linked:'Tu sesión es válida; Dirección debe vincularla con tu perfil de broker.', duplicate_contact:'Este contacto ya existe en el CRM. Pide a Dirección vincularlo con tu cartera.', contact_not_linked:'Vincula primero el contacto a los brokers del expediente.', evidence_required:'Agrega el documento que respalda el acuerdo.', invalid_transition:'Avanza la participación una etapa a la vez.', forbidden:'Tu sesión no tiene permiso para esta operación.' }; throw new Error(messages[json.error] || 'El servidor no confirmó la operación.'); }
        if (requestId && json.request_id !== requestId) throw new Error('No se recibió la confirmación del guardado. Conserva el formulario y verifica antes de reintentar.');
        return validateSnapshot(json.data);
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('La conexión tardó demasiado. El guardado puede seguir en curso; recarga para comprobarlo.');
        throw e;
      } finally { clearTimeout(timer); }
    }
    return { load: () => request('brokers_snapshot', {}), save: (kind, record, revision, requestId) => request('brokers_save', { kind, record, expected_revision: revision }, requestId), invalidate: () => { generation++; } };
  }
  const api = { stages, participationStates, safeLink, validateSnapshot, visible, caseGroups, overdue, nextStep, encodeStep, agenda, previewSnapshot, workspaceSnapshot, dailyControl, createClient };
  if (typeof module !== 'undefined') module.exports = api;
  root.BrokersCore = api;
})(typeof window === 'undefined' ? globalThis : window);
