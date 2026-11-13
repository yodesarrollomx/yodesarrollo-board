/* Presentación desde el grafo. Lee el grafo APROBADO (recetas por audiencia y contrato del plan) de los archivos
   públicos de potenciales-yod, y el Plan de Potencial guardado del caso con la sesión de quien la abre (el mismo
   GET de lectura que ya usa Master Brokers). Arma el guion en el navegador con compilar.js y lo dibuja con el
   mismo motor de los guiones visuales. No escribe nada, no guarda nada y nunca borra la credencial del Portero. */
import { mount } from '../ppp/renderer.mjs?v=YOD-SB-1.0.0';

const S = window.YODStoryboard, C = window.YODGrafoPresentacion, $ = s => document.querySelector(s);
const BASE = window.YOD_GRAFO_BASE || 'https://yodesarrollomx.github.io/potenciales-yod/grafo/';
const P = new URLSearchParams(location.search);
const sel = { caso: P.get('caso') || '', motor: (P.get('tipo') || '').toLowerCase(), audiencia: P.get('audiencia') || 'cliente', breve: P.get('breve') === '1', demo: P.get('demo') === '1' };
let grafo = null, caso = null, story = null, renderer = null, position = 0, target = 0, raf = 0, aviso = null, generacion = 0, toastTimer = 0;

const token = () => { try { return localStorage.getItem('pyod_clave_v1') || ''; } catch (e) { return ''; } };
const portero = () => window.YOD_GRAFO_PORTERO || window.YOD_PORTERO?.original || '';
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('visible'), 5000); }
function texto(parent, tag, value, cls) { const e = document.createElement(tag); e.textContent = value; if (cls) e.className = cls; parent.append(e); return e; }
function vista(id) { for (const s of ['gate', 'elegir', 'workspace']) $('#' + s).hidden = s !== id; }
function puerta(mensaje, reintentar = true) { vista('gate'); $('#gateMessage').textContent = mensaje; $('#retry').hidden = !reintentar; }
async function json(url, espera = 20000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), espera);
  try { const r = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: c.signal }); if (!r.ok) throw Error('http'); return await r.json(); } finally { clearTimeout(t); }
}

/* ── el grafo aprobado: versión, recetas y contrato del plan ─────────────────────────────────────── */
async function cargarGrafo() {
  const V = await json(BASE + 'versiones.json?t=' + Math.floor(Date.now() / 60000));
  if (!V || typeof V.aprobado !== 'string' || !/^G-[0-9]{8}-[0-9]{4}$/.test(V.aprobado)) throw Error('grafo');
  const D = await json(BASE + 'datos/' + V.aprobado + '.json');
  if (!D || D.id !== V.aprobado || !D.recetas || D.recetas.esquema !== 1) throw Error('grafo');
  const ficha = (V.versiones || []).find(v => v.id === V.aprobado) || {};
  return { id: D.id, fecha: ficha.fecha || '', recetas: D.recetas, ppp: D.ppp || {} };
}

/* ── el plan guardado del caso, con la sesión de quien abre ─────────────────────────────────────── */
async function cargarCaso() {
  const k = token(), url = portero();
  if (!k) throw Object.assign(Error('sesion'), { code: 'sesion' });
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url) && !window.YOD_GRAFO_PORTERO) throw Object.assign(Error('portero'), { code: 'portero' });
  const u = new URL(url); u.search = new URLSearchParams({ k, tipo: sel.motor, recurso: 'caso', id: sel.caso });
  const j = await json(u.href, 25000);
  if (token() !== k) throw Object.assign(Error('cambio'), { code: 'cambio' });
  if (!j || j.ok !== true || !j.caso || j.caso.caso_id !== sel.caso) throw Object.assign(Error('permiso'), { code: 'permiso' });
  return j.caso;
}

/* ── pintar ─────────────────────────────────────────────────────────────────────────────────────── */
function pintar() {
  if (!story || !renderer) return;
  const f = renderer.render(position), role = S.roles[f.scene.role];
  document.documentElement.style.setProperty('--role', role.color);
  $('#role').textContent = role.label; $('#sceneTitle').textContent = f.scene.title; $('#takeaway').textContent = f.scene.takeaway;
  $('#momentLabel').textContent = f.moment.label + ' · ' + (Math.round(position) + 1) + ' de ' + (f.max + 1);
  $('#spoken').textContent = f.moment.spoken || ''; $('#question').textContent = f.scene.question || ''; $('#condition').textContent = f.moment.annotations.length ? f.scene.condition : '';
  $('#progress').value = String(Math.round(position)); $('#prev').disabled = position <= 0; $('#next').disabled = position >= f.max;
  const facts = $('#facts'); facts.replaceChildren();
  for (const a of f.moment.annotations) {
    const fact = story.facts.find(x => x.id === a.fact_id), o = story.objects.find(x => x.id === a.object_id); if (!fact) continue;
    const card = document.createElement('article'); card.className = 'fact';
    texto(card, 'h3', a.label || fact.label); texto(card, 'strong', S.factLabel(fact)); texto(card, 'small', S.statusLabels[fact.status] + ' · ' + o.label, 'estado'); facts.append(card);
  }
  const rel = $('#relationships'); rel.replaceChildren();
  for (const r of f.moment.relations) { const p = texto(rel, 'p', ''); texto(p, 'strong', story.objects.find(o => o.id === r.from).label + ' → ' + story.objects.find(o => o.id === r.to).label); texto(p, 'span', r.label); }
  for (const b of $('#stages').children) b.setAttribute('aria-current', b.dataset.scene === f.scene.id ? 'step' : 'false');
}
function paso(now) {
  raf = 0; const d = target - position;
  if (Math.abs(d) < .02) { position = target; pintar(); return; }
  position += Math.sign(d) * Math.min(Math.abs(d), .09); pintar(); raf = requestAnimationFrame(paso);
}
function ir(v, ya = false) {
  if (!story) return; const max = S.timeline(story).length - 1; target = Math.max(0, Math.min(max, Math.round(v)));
  if (ya || matchMedia('(prefers-reduced-motion:reduce)').matches) { if (raf) cancelAnimationFrame(raf); raf = 0; position = target; pintar(); } else if (!raf) raf = requestAnimationFrame(paso);
}

function liga(extra = {}) {
  const q = new URLSearchParams(); const s = { ...sel, ...extra };
  if (s.demo) q.set('demo', '1'); else q.set('caso', s.caso);
  q.set('tipo', s.motor); q.set('audiencia', s.audiencia); if (s.breve) q.set('breve', '1');
  return location.origin + location.pathname + '?' + q;
}
function armar() {
  const tipo = C.tipoDe(sel.motor), R = grafo.recetas;
  if (!R.audiencias.some(a => a.id === sel.audiencia)) sel.audiencia = R.audiencias[0].id;
  story = S.normalize(C.compilar({ recetas: R, audiencia: sel.audiencia, tipo, caso, breve: sel.breve }));
  if (raf) cancelAnimationFrame(raf); raf = 0; renderer?.dispose(); renderer = mount($('#stage'), story); position = 0; target = 0;
  const A = R.audiencias.find(a => a.id === sel.audiencia), v = C.versionDelPlan(caso);
  $('#project').textContent = story.title; document.title = story.title + ' · YoDesarrollo';
  $('#versionBadge').textContent = 'Para ' + A.nombre.toLowerCase(); $('#sourceLabel').textContent = R.tipos[tipo].nombre + ' · ' + (sel.breve ? 'versión corta' : 'versión completa');
  $('#planVersion').textContent = sel.demo ? 'de ejemplo' : ('v' + (v.version || '—') + (v.escenario ? ' · ' + v.escenario : '') + (v.actualizado ? ' · ' + new Date(v.actualizado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : ''));
  $('#grafoVersion').textContent = grafo.id + (grafo.fecha ? ' · ' + grafo.fecha : ''); $('#ejemplo').hidden = !sel.demo;
  const au = $('#audiencias'); au.replaceChildren();
  for (const a of R.audiencias) { const b = document.createElement('button'); b.type = 'button'; b.dataset.audiencia = a.id; b.setAttribute('aria-pressed', String(a.id === sel.audiencia)); b.append(a.nombre); texto(b, 'small', a.para); au.append(b); }
  for (const b of $('#fondo').children) b.setAttribute('aria-pressed', String((b.dataset.breve === '1') === sel.breve));
  const st = $('#stages'); st.replaceChildren(); let inicio = 0;
  for (const scene of story.scenes) { const b = texto(st, 'button', scene.title); b.type = 'button'; b.dataset.scene = scene.id; const en = inicio; b.onclick = () => ir(en, true); inicio += scene.moments.length; }
  $('#progress').max = String(inicio - 1);
  const pr = $('#provenance'); pr.replaceChildren();
  for (const f of story.facts) texto(pr, 'p', f.label + ': ' + S.factLabel(f) + ' · ' + S.statusLabels[f.status] + ' · ' + f.source_ref.replace('snapshot.', 'plan.'));
  try { history.replaceState(null, '', liga()); } catch (e) {}
  vista('workspace'); pintar();
  if (aviso) aviso.fijar(grafo.id); else if (window.YODGrafoAviso) aviso = window.YODGrafoAviso.montar($('#aviso'), { cargado: grafo.id, base: BASE, alActualizar: () => abrir() });
}

async function abrir() {
  const mio = ++generacion;
  $('#access').textContent = token() ? 'Sesión YOD activa' : 'Acceso YOD';
  puerta('Leyendo el grafo aprobado…', false);
  try { grafo = await cargarGrafo(); } catch (e) { if (mio === generacion) puerta('No se pudo leer el grafo aprobado. Revisa tu conexión y vuelve a intentar.'); return; }
  if (mio !== generacion) return;
  if (!sel.demo && !sel.caso) { vista('elegir'); return; }
  if (!C.tipoDe(sel.motor) || !grafo.recetas.tipos[C.tipoDe(sel.motor)]) { puerta('La liga no dice de qué tipo es el plan. Ábrela desde el expediente o pega la liga del plan.', false); vista('elegir'); return; }
  if (sel.demo) { caso = C.ejemplo(sel.motor, grafo.ppp); armar(); return; }
  if (!/^[A-Za-z0-9_.:-]{1,200}$/.test(sel.caso)) { vista('elegir'); $('#ligaEstado').textContent = 'Ese caso no tiene un identificador válido.'; return; }
  puerta('Leyendo el plan guardado con tu acceso…', false);
  try { caso = await cargarCaso(); }
  catch (e) {
    if (mio !== generacion) return;
    puerta({ sesion: 'Entra con tu cuenta de YOD para leer el plan de este caso.', permiso: 'Tu cuenta no puede leer este plan, o el caso ya no existe. Ábrelo desde el PPP para confirmarlo.',
      portero: 'Falta la dirección del Portero en esta página. Vuelve a cargarla.', cambio: 'La sesión cambió mientras se leía el plan. Vuelve a intentar.' }[e.code] || 'No se pudo leer el plan guardado. Vuelve a intentar.');
    return;
  }
  if (mio !== generacion) return;
  try { armar(); } catch (e) { puerta('El plan se leyó, pero no se pudo armar la presentación (' + (e.code || e.message) + ').'); }
}

/* ── controles ──────────────────────────────────────────────────────────────────────────────────── */
$('#retry').onclick = () => abrir();
$('#access').onclick = async () => { if (token()) { toast('Ya hay una sesión de YOD en este navegador.'); return; } try { await window.YODPortero?.entrar?.(); } catch (e) {} abrir(); };
$('#prev').onclick = () => ir(target - 1); $('#next').onclick = () => ir(target + 1);
$('#progress').oninput = e => ir(Number(e.target.value), true);
$('#audiencias').onclick = e => { const b = e.target.closest('button[data-audiencia]'); if (b && b.dataset.audiencia !== sel.audiencia) { sel.audiencia = b.dataset.audiencia; armar(); } };
$('#fondo').onclick = e => { const b = e.target.closest('button[data-breve]'); if (b && (b.dataset.breve === '1') !== sel.breve) { sel.breve = b.dataset.breve === '1'; armar(); } };
$('#present').onclick = () => { const on = !document.body.classList.contains('presenting'); document.body.classList.toggle('presenting', on); $('#present').setAttribute('aria-pressed', String(on)); $('#present').textContent = on ? 'Preparar' : 'Presentar'; pintar(); };
$('#copiar').onclick = async () => { try { await navigator.clipboard.writeText(liga()); toast('Liga copiada. Abre siempre el grafo aprobado y el plan guardado; quien la reciba necesita su acceso.'); } catch (e) { toast(liga()); } };
$('#abrirLiga').onclick = () => { const r = C.deLiga($('#liga').value); if (!r) { $('#ligaEstado').textContent = 'Pega la liga completa del plan, tal como se abre en Potenciales.'; return; } location.href = liga({ demo: false, caso: r.caso, motor: r.motor }); };
$('#verEjemplo').onclick = () => { location.href = liga({ demo: true, motor: sel.motor || 'mixto' }); };
addEventListener('keydown', e => { if (!story || e.target.closest('input,textarea,select')) return; if (e.key === 'ArrowRight' || e.key === 'PageDown') { ir(target + 1); e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { ir(target - 1); e.preventDefault(); } });
addEventListener('resize', () => pintar());
addEventListener('storage', e => { if (e.key === 'pyod_clave_v1' && !sel.demo && sel.caso) abrir(); });
abrir();
