/* Aviso discreto del grafo. Dice, sin estorbar, cuando lo que se ve ya no corresponde al grafo en el que se
   está trabajando:
     · «borrador»  hay un grafo nuevo en revisión; lo que ves usa el aprobado y no cambia hasta que se apruebe;
     · «nueva»     ya se aprobó un grafo más nuevo que el que esta pantalla cargó; basta actualizar.
   Si todo está al día no pinta nada. Sólo aparece con sesión de YOD en el navegador: quien abre una liga
   compartida (un cliente) nunca lo ve. Lee archivos públicos y estáticos; no usa claves ni escribe nada. */
(function (root, factory) { const api = factory(root); if (typeof module === 'object' && module.exports) module.exports = api; root.YODGrafoAviso = api; })(typeof globalThis === 'object' ? globalThis : this, function (root) {
  'use strict';
  const BASE = 'https://yodesarrollomx.github.io/potenciales-yod/grafo/';
  const CRUDO = 'https://raw.githubusercontent.com/yodesarrollomx/potenciales-yod/grafo-datos/';
  const ACCESOS = 'https://yodesarrollomx.github.io/potenciales-yod/accesos.html#grafo-sistema';
  const ID = /^G-[0-9]{8}-[0-9]{4}$/;

  /* Qué decir. cargado = el grafo con que se armó lo que está en pantalla (o el aprobado al abrir la página). */
  function estado({ cargado, versiones, borrador }) {
    const aprobado = versiones && typeof versiones.aprobado === 'string' ? versiones.aprobado : '';
    if (!aprobado) return { tipo: 'sin-dato' };
    const base = cargado || aprobado;
    if (base !== aprobado) return { tipo: 'nueva', cargado: base, aprobado, corto: 'Hay un grafo más nuevo',
      detalle: 'Esto se armó con el grafo ' + base + '. Ya se aprobó uno más nuevo (' + aprobado + '). Al actualizar se usa el nuevo; mientras tanto, lo que ves no cambia.' };
    if (borrador && ID.test(String(borrador.id || '')) && borrador.id !== aprobado) return { tipo: 'borrador', cargado: base, aprobado, borrador: borrador.id, corto: 'Otra versión en trabajo',
      detalle: 'Esto usa el grafo aprobado ' + aprobado + '. Hay otra versión del grafo en borrador (' + borrador.id + '), así que puede cambiar más adelante. ' +
        'No hay que hacer nada: sigue igual hasta que se apruebe.' };
    return { tipo: 'al-dia', cargado: base, aprobado };
  }

  /* El rol que dejó portero.js en sessionStorage.pyod_rol: hoy un JSON {f, rol}, donde f es el inicio del token con que
     se canjeó; antes, la palabra sola. Sólo es una pista para la interfaz (enseñar o no la liga a Accesos): no autoriza
     nada, el servidor valida todo. Si no se entiende, o es de otro token, no hay rol. */
  function rolDe(valor, token = '') {
    if (typeof valor !== 'string') return '';
    let rol = valor.trim();
    if (rol.charAt(0) === '{') {
      let o = null; try { o = JSON.parse(rol); } catch (e) { return ''; }
      if (!o || typeof o !== 'object' || typeof o.rol !== 'string') return '';
      if (typeof o.f === 'string' && o.f && typeof token === 'string' && token && !token.startsWith(o.f)) return '';
      rol = o.rol.trim();
    }
    return /^[a-z_]{1,32}$/i.test(rol) ? rol.toLowerCase() : '';
  }

  function montar(el, { cargado = '', base = root.YOD_GRAFO_BASE || BASE, crudo = root.YOD_GRAFO_CRUDO || CRUDO, fetchImpl = (...a) => root.fetch(...a), cada = 300000,
    sesion = () => { try { return !!root.localStorage.getItem('pyod_clave_v1'); } catch (e) { return false; } },
    direccion = () => { try { return ['admin', 'direccion'].includes(rolDe(root.sessionStorage.getItem('pyod_rol'), root.localStorage.getItem('pyod_clave_v1') || '')); } catch (e) { return false; } },
    alActualizar = () => root.location.reload() } = {}) {
    let vivo = true, reloj = null, ultimo = { tipo: 'sin-dato' }, abierto = false;
    const doc = el.ownerDocument, json = u => fetchImpl(u, { cache: 'no-store', credentials: 'omit' }).then(r => r.ok ? r.json() : null).catch(() => null);
    function pintar() {
      if (!vivo) return;
      const e = ultimo; el.textContent = '';
      if (!sesion() || (e.tipo !== 'borrador' && e.tipo !== 'nueva')) { el.hidden = true; abierto = false; return; }
      el.hidden = false; el.classList.add('yga');
      const b = doc.createElement('button'); b.type = 'button'; b.className = 'yga-boton'; b.setAttribute('aria-expanded', String(abierto)); b.title = 'Sobre la versión del grafo';
      const p = doc.createElement('i'); p.setAttribute('aria-hidden', 'true'); b.append(p, doc.createTextNode(e.corto));
      b.onclick = () => { abierto = !abierto; pintar(); };
      el.append(b);
      if (abierto) {
        const c = doc.createElement('div'); c.className = 'yga-caja'; c.setAttribute('role', 'note');
        const t = doc.createElement('p'); t.textContent = e.detalle; c.append(t);
        const fila = doc.createElement('div'); fila.className = 'yga-fila';
        if (e.tipo === 'nueva') { const a = doc.createElement('button'); a.type = 'button'; a.textContent = 'Actualizar al último grafo'; a.onclick = () => alActualizar(e); fila.append(a); }
        else if (direccion()) { const a = doc.createElement('a'); a.href = ACCESOS; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Ver el borrador en Accesos'; fila.append(a); }
        else { const s = doc.createElement('span'); s.textContent = 'Si la necesitas ya, pide a Dirección que la apruebe.'; fila.append(s); }
        const x = doc.createElement('button'); x.type = 'button'; x.textContent = 'Cerrar'; x.onclick = () => { abierto = false; pintar(); }; fila.append(x);
        c.append(fila); el.append(c);
        /* El detalle nunca se sale de la pantalla, esté donde esté la pastilla. */
        const ancho = doc.documentElement.clientWidth, r = c.getBoundingClientRect(); let dx = 0;
        if (r.right > ancho - 8) dx = ancho - 8 - r.right;
        if (r.left + dx < 8) dx = 8 - r.left;
        if (dx) c.style.transform = 'translateX(' + Math.round(dx) + 'px)';
      }
    }
    async function leer() {
      if (!vivo || !sesion()) { pintar(); return ultimo; }
      const t = '?t=' + Math.floor(Date.now() / 60000);
      const [versiones, borrador] = await Promise.all([json(base + 'versiones.json' + t), json(crudo + 'borrador.json' + t)]);
      if (!vivo) return ultimo;
      if (versiones) { if (!cargado) cargado = versiones.aprobado || ''; ultimo = estado({ cargado, versiones, borrador }); }
      pintar(); return ultimo;
    }
    const alVolver = () => { if (!doc.hidden) leer(); }, alMedir = () => { if (abierto) pintar(); };
    doc.addEventListener('visibilitychange', alVolver);
    if (typeof root.addEventListener === 'function') root.addEventListener('resize', alMedir);
    if (cada > 0) reloj = setInterval(leer, cada);
    leer();
    return { leer, estado: () => ultimo, fijar(v) { cargado = v || ''; return leer(); }, detener() { vivo = false; clearInterval(reloj); doc.removeEventListener('visibilitychange', alVolver); if (typeof root.removeEventListener === 'function') root.removeEventListener('resize', alMedir); el.textContent = ''; el.hidden = true; } };
  }
  /* Las páginas sólo ponen <span data-grafo-aviso hidden></span>: aquí se monta solo. */
  if (root.document && typeof root.document.querySelectorAll === 'function') {
    const arranca = () => { for (const el of root.document.querySelectorAll('[data-grafo-aviso]')) if (!el.__yga) el.__yga = montar(el); };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', arranca); else arranca();
  }
  return { estado, montar, rolDe, BASE, CRUDO };
});
