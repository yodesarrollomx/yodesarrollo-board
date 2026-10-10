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
  function overdue(o, today) { return !!o.next_date && o.next_date < today && !['Formalizado', 'Descartado', 'En pausa'].includes(o.stage); }
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
        if (!json.ok) throw new Error(json.error === 'conflict' ? 'Otra persona actualizó el expediente. Recarga antes de guardar.' : 'El servidor no confirmó la operación.');
        if (requestId && json.request_id !== requestId) throw new Error('No se recibió la confirmación del guardado. Conserva el formulario y verifica antes de reintentar.');
        return validateSnapshot(json.data);
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('La conexión tardó demasiado. El guardado puede seguir en curso; recarga para comprobarlo.');
        throw e;
      } finally { clearTimeout(timer); }
    }
    return { load: () => request('brokers_snapshot', {}), save: (kind, record, revision, requestId) => request('brokers_save', { kind, record, expected_revision: revision }, requestId), invalidate: () => { generation++; } };
  }
  const api = { stages, participationStates, safeLink, validateSnapshot, visible, overdue, createClient };
  if (typeof module !== 'undefined') module.exports = api;
  root.BrokersCore = api;
})(typeof window === 'undefined' ? globalThis : window);
