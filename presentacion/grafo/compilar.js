/* Presentación desde el grafo: arma un guion visual (yod.storyboard.v1) con la receta de una audiencia, que viene
   del grafo aprobado, y el Plan de Potencial GUARDADO de un caso. No calcula nada: cada cifra sale de un campo
   guardado del plan y lleva su procedencia; lo que el plan no trae se muestra «No definido», nunca se inventa.
   Función pura: no usa red, almacenamiento ni reloj. La comparten la página y las pruebas. */
(function (root, factory) { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; root.YODGrafoPresentacion = api; })(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const MOTOR = { mixto: 'vertical', vertical: 'vertical', macrolotes: 'macrolotes', unifamiliar: 'unifamiliar', residencial: 'residencial', patrimonial: 'patrimonial' };
  const fail = code => { throw Object.assign(Error(code), { code }); };
  const num = v => { if (v === '' || v === null || v === undefined || typeof v === 'boolean') return null; const n = typeof v === 'number' ? v : Number(String(v).replace(/[$,%\s]/g, '')); return Number.isFinite(n) ? n : null; };
  const nf = (n, d) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(n);
  const FORMATO = {
    '$': n => ['$' + nf(Math.round(n), 0), ''], '$m2': n => ['$' + nf(Math.round(n), 0), 'por m²'], '%': n => [nf(n, 1), '%'], 'm2': n => [nf(n, 0), 'm²'], 'ha': n => [nf(n, 2), 'ha'],
    'meses': n => [nf(n, 0), n === 1 ? 'mes' : 'meses'], 'n': n => [nf(n, 0), ''], 'n1': n => [nf(n, 1), ''], 'x': n => [nf(n, 2), 'veces'],
  };
  /* tipo: nombre del motor en la liga del PPP (mixto, macrolotes…) o el tipo de la receta (vertical…). */
  function tipoDe(v) { return MOTOR[String(v || '').toLowerCase()] || null; }
  /* De una liga del PPP saca el caso y el tipo; null si no es una liga del tablero de Potenciales. */
  function deLiga(liga) {
    try {
      const u = new URL(String(liga).trim()), m = u.pathname.match(/^\/potenciales-yod\/(macrolotes|patrimonial|residencial|unifamiliar|mixto)\.html$/), id = u.searchParams.get('open');
      if (u.hostname !== 'yodesarrollomx.github.io' || !m || !id || !/^[A-Za-z0-9_.:-]{1,200}$/.test(id)) return null;
      return { caso: id, motor: m[1], tipo: MOTOR[m[1]] };
    } catch (e) { return null; }
  }
  function compilar({ recetas, audiencia, tipo, caso, breve = false }) {
    const R = recetas; if (!R || R.esquema !== 1 || !Array.isArray(R.audiencias)) fail('recetas_invalidas');
    const A = R.audiencias.find(a => a.id === audiencia); if (!A) fail('audiencia_desconocida');
    const t = tipoDe(tipo), T = t && R.tipos[t]; if (!T) fail('tipo_desconocido');
    if (!caso || typeof caso !== 'object') fail('caso_invalido');
    const resultados = caso.resumen && typeof caso.resumen === 'object' ? { ...caso, ...caso.resumen } : caso;
    const rotulo = { '@proyecto': T.proyecto, '@unidad': T.unidad, '@persona': A.persona };
    const objects = Object.entries(R.objetos).map(([id, o]) => ({ id, kind: o.clase, label: rotulo[o.etiqueta] || o.etiqueta, schematic: true }));
    const hechos = new Map();
    function hecho(clave) {
      if (hechos.has(clave)) return hechos.get(clave);
      const d = R.datos[clave], m = d && d.por_tipo && d.por_tipo[t]; let h = null;
      if (m && FORMATO[m[2]]) {
        const [origen, campo, f] = m, n = num(origen === 'resultado' ? resultados[campo] : caso[campo]), txt = n === null ? null : FORMATO[f](n);
        h = { id: 'd_' + clave, label: d.etiqueta, value: txt ? txt[0] : null, unit: txt ? txt[1] : '', source_ref: 'snapshot.' + (origen === 'resultado' ? 'resumen.' : '') + campo,
          status: n === null ? 'pending' : origen === 'resultado' ? 'calculated' : 'assumption', condition: R.condicion || '' };
      }
      hechos.set(clave, h); return h;
    }
    const scenes = [];
    for (const e of A.escenas) {
      if ((breve && !e.nucleo) || (e.solo && !e.solo.includes(t))) continue;
      const moments = e.momentos.map(m => ({ id: m.id, label: m.rotulo, spoken: m.guion, visible_objects: m.ve.slice(),
        annotations: m.datos.map(([obj, clave, rot]) => { const h = hecho(clave); return h ? { object_id: obj, fact_id: h.id, label: rot || '' } : null; }).filter(Boolean).slice(0, 4),
        relations: m.relaciones.map(([from, to, label]) => ({ from, to, label })), camera: { focus: m.foco.slice() } }));
      scenes.push({ id: e.id, title: e.titulo, question: e.pregunta, takeaway: e.idea, role: e.rol, diagram: e.diagrama, condition: moments.some(m => m.annotations.length) ? (R.condicion || '') : '', moments });
    }
    if (!scenes.length) fail('sin_escenas');
    const nombre = String(caso.nombre_caso || '').trim();
    return { schema: 'yod.storyboard.v1', title: (A.titulo + (nombre ? ' · ' + nombre : '')).slice(0, 160), audience: (A.nombre + ' · ' + A.para).slice(0, 300), decision: String(A.decision).slice(0, 500),
      objects, facts: [...hechos.values()].filter(Boolean), scenes };
  }
  /* Qué versión guardada del plan se está leyendo: versión, escenario activo y fecha. */
  function versionDelPlan(caso) {
    let esc = '';
    try { const a = JSON.parse(caso.escenarios_json || '[]'); const act = Array.isArray(a) ? a.find(v => v && v.activo === true && typeof v.nombre === 'string') : null; esc = act ? act.nombre : ''; } catch (e) {}
    return { version: caso.version === undefined || caso.version === null ? '' : String(caso.version), escenario: esc, actualizado: String(caso.ts_actualizado || '') };
  }
  /* Caso de ejemplo con cifras ficticias, para ver la presentación sin sesión. Nunca se mezcla con un caso real. */
  function ejemplo(tipo, contrato) {
    const t = tipoDe(tipo) || 'vertical', c = (contrato && contrato[t]) || { resultados: [], entradas: [] }, caso = { caso_id: 'EJEMPLO', nombre_caso: 'Ejemplo con cifras ficticias', version: 1, ts_actualizado: '', resumen: {} };
    const semilla = k => { let h = 7; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h; };
    const valor = k => /pct|tir|margen|cap_rate|colchon/i.test(k) ? 8 + semilla(k) % 20 : /moic|multiplo/i.test(k) ? 1.6 : /meses/i.test(k) ? 30 + semilla(k) % 12 : /_ha$/.test(k) ? 4.5 : /unidades|lotes_n|pisos|niveles|cajones|recamaras|naves|macrolotes_n|elevadores/i.test(k) ? 4 + semilla(k) % 60
      : /m2|vendible|terreno/i.test(k) ? 800 + semilla(k) * 3 : 1000000 + semilla(k) * 9000;
    for (const k of c.resultados || []) caso.resumen[k] = valor(k);
    for (const k of c.entradas || []) caso[k] = /Aporte|Pct|PIK|Tasa|Desc/i.test(k) ? 10 + semilla(k) % 40 : /Terreno|Superficie/i.test(k) ? 2500 : 5000000 + semilla(k) * 5000;
    return caso;
  }
  return { compilar, tipoDe, deLiga, versionDelPlan, ejemplo, num, FORMATO };
});
