#!/usr/bin/env node
'use strict';
/*
 * Contorno del terreno · Distrito Obregón → presentacion/distrito-obregon/parcel.js
 *
 * Dos modos, mismo esquema de salida (export const parcel={...}):
 *   --conceptual      Silueta conceptual de la presentación SB06 (drawings.js), escalada a 247,584 m²,
 *                     rotación 0, trasladada por búsqueda en rejilla de 5 m sobre la base OSM.
 *                     status:'conceptual' (posición aproximada; NO son linderos).
 *   --kml <doc.kml>   Primer Polygon del KML/KMZ del terreno, lon/lat → UTM 12N → metros locales.
 *                     status:'kmz'; los vértices no se ajustan; computedArea es el área real.
 *
 * Opciones:
 *   --basemap <basemap.js>   base OSM en metros locales (por defecto presentacion/distrito-obregon/basemap.js)
 *   --out <parcel.js>        salida (por defecto presentacion/distrito-obregon/parcel.js)
 *   --max-cross=800          límite de metros de calles cruzadas en --conceptual; si se rebasa, no escribe y avisa
 *   --dry                    no escribe, solo imprime el reporte
 *
 * Solo lee archivos locales (sin red). No sube ni copia ningún KMZ: del KML solo se toman las coordenadas
 * del primer polígono (nunca la descripción ni los nombres de propietarios).
 * Ejes locales: X = este − origen.e ; Y = origen.n − norte (Y hacia abajo, norte arriba). Norte de cuadrícula UTM.
 */
const fs = require('node:fs');
const path = require('node:path');

// ---------- UTM (Krüger, serie de orden 6, WGS84) · misma fórmula que prepare-obregon-map.cjs ----------
const A = 6378137.0, F = 1 / 298.257223563, K0 = 0.9996, FE = 500000;
const N_ = F / (2 - F);
const A_ = A / (1 + N_) * (1 + N_ ** 2 / 4 + N_ ** 4 / 64 + N_ ** 6 / 256);
const alpha = [null,
  N_ / 2 - 2 * N_ ** 2 / 3 + 5 * N_ ** 3 / 16 + 41 * N_ ** 4 / 180 - 127 * N_ ** 5 / 288 + 7891 * N_ ** 6 / 37800,
  13 * N_ ** 2 / 48 - 3 * N_ ** 3 / 5 + 557 * N_ ** 4 / 1440 + 281 * N_ ** 5 / 630 - 1983433 * N_ ** 6 / 1935360,
  61 * N_ ** 3 / 240 - 103 * N_ ** 4 / 140 + 15061 * N_ ** 5 / 26880 + 167603 * N_ ** 6 / 181440,
  49561 * N_ ** 4 / 161280 - 179 * N_ ** 5 / 168 + 6601661 * N_ ** 6 / 7257600,
  34729 * N_ ** 5 / 80640 - 3418889 * N_ ** 6 / 1995840,
  212378941 * N_ ** 6 / 319334400];
const beta = [null,
  N_ / 2 - 2 * N_ ** 2 / 3 + 37 * N_ ** 3 / 96 - N_ ** 4 / 360 - 81 * N_ ** 5 / 512 + 96199 * N_ ** 6 / 604800,
  N_ ** 2 / 48 + N_ ** 3 / 15 - 437 * N_ ** 4 / 1440 + 46 * N_ ** 5 / 105 - 1118711 * N_ ** 6 / 3870720,
  17 * N_ ** 3 / 480 - 37 * N_ ** 4 / 840 - 209 * N_ ** 5 / 4480 + 5569 * N_ ** 6 / 90720,
  4397 * N_ ** 4 / 161280 - 11 * N_ ** 5 / 504 - 830251 * N_ ** 6 / 7257600,
  4583 * N_ ** 5 / 161280 - 108847 * N_ ** 6 / 3991680,
  20648693 * N_ ** 6 / 638668800];
const ZONE = 12, LON0 = (ZONE * 6 - 183) * Math.PI / 180; // -111°
const rad = d => d * Math.PI / 180;
function toUTM(lat, lon) {
  const phi = rad(lat), lam = rad(lon) - LON0;
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - (2 * Math.sqrt(N_) / (1 + N_)) * Math.atanh((2 * Math.sqrt(N_) / (1 + N_)) * Math.sin(phi)));
  const xi = Math.atan2(t, Math.cos(lam));
  const eta = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
  let x = eta, y = xi;
  for (let j = 1; j <= 6; j++) {
    x += alpha[j] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
    y += alpha[j] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
  }
  return { e: FE + K0 * A_ * x, n: K0 * A_ * y };
}
function fromUTM(e, n) {
  const xi = n / (K0 * A_), eta = (e - FE) / (K0 * A_);
  let xi_ = xi, eta_ = eta;
  for (let j = 1; j <= 6; j++) {
    xi_ -= beta[j] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    eta_ -= beta[j] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  const chi = Math.asin(Math.sin(xi_) / Math.cosh(eta_));
  const e2 = F * (2 - F);
  const d = [null,
    e2 / 2 + 5 * e2 ** 2 / 24 + e2 ** 3 / 12 + 13 * e2 ** 4 / 360,
    7 * e2 ** 2 / 48 + 29 * e2 ** 3 / 240 + 811 * e2 ** 4 / 11520,
    7 * e2 ** 3 / 120 + 81 * e2 ** 4 / 1120,
    4279 * e2 ** 4 / 161280];
  let phi = chi;
  for (let j = 1; j <= 4; j++) phi += d[j] * Math.sin(2 * j * chi);
  const lam = LON0 + Math.atan2(Math.sinh(eta_), Math.cos(xi_));
  return { lat: phi * 180 / Math.PI, lon: lam * 180 / Math.PI };
}

// Verificación de la conversión (valores de prepare-obregon-map.cjs / resumen.md de la base)
function selfCheck() {
  const u = toUTM(27.4750, -109.9215);
  const okE = Math.abs(u.e - 606553.961) < 0.002, okN = Math.abs(u.n - 3039510.356) < 0.002;
  const b = fromUTM(u.e, u.n);
  const rt = Math.max(Math.abs(b.lat - 27.4750), Math.abs(b.lon + 109.9215));
  if (!okE || !okN || rt > 1e-8) throw new Error(`Verificación UTM fallida: E=${u.e} N=${u.n} ida y vuelta ${rt}`);
  return { e: u.e, n: u.n, roundtrip: rt };
}

// ---------- Geometría ----------
const SITE = { lat: 27.4750, lon: -109.9215 };
const r2 = v => Math.round(v * 100) / 100;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const shoelace = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function inside(p, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [x1, y1] = P[i], [x2, y2] = P[j];
    if ((y1 > p[1]) !== (y2 > p[1]) && p[0] < (x2 - x1) * (p[1] - y1) / (y2 - y1) + x1) c = !c;
  }
  return c;
}
function ptSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const u = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
}
function segInter(a, b, c, d) { // parámetro t sobre a→b de la intersección propia con c→d, o null
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  return t > 0 && t < 1 && u >= 0 && u <= 1 ? t : null;
}
function segSeg(a, b, c, d) { return segInter(a, b, c, d) !== null ? 0 : Math.min(ptSeg(a, c, d), ptSeg(b, c, d), ptSeg(c, a, b), ptSeg(d, a, b)); }
/** Parte el segmento a→b por el contorno P: [{a,b,len,inside}] */
function clipPieces(a, b, P) {
  const ts = [0, 1];
  for (let i = 0; i < P.length; i++) { const t = segInter(a, b, P[i], P[(i + 1) % P.length]); if (t !== null) ts.push(t); }
  ts.sort((x, y) => x - y);
  const out = [];
  for (let k = 0; k < ts.length - 1; k++) {
    if (ts[k + 1] - ts[k] < 1e-9) continue;
    const pa = [a[0] + (b[0] - a[0]) * ts[k], a[1] + (b[1] - a[1]) * ts[k]];
    const pb = [a[0] + (b[0] - a[0]) * ts[k + 1], a[1] + (b[1] - a[1]) * ts[k + 1]];
    const m = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    out.push({ a: pa, b: pb, len: dist(pa, pb), inside: inside(m, P) });
  }
  return out;
}

// ---------- Base OSM (basemap.js: ESM con origin, source, roads) ----------
function loadBasemap(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const body = txt.replace(/^export const /gm, 'const ');
  const m = new Function(body + '\nreturn {origin, source, roads};')();
  if (!m.origin || !Array.isArray(m.roads)) throw new Error('basemap.js no tiene origin/roads');
  const lines = []; // todos los segmentos de calles y vías
  for (const r of m.roads) {
    const isHw = r.kind && !['landuse', 'water', 'building', 'rail', 'canal', 'drain', 'river', 'stream'].includes(r.kind);
    const isRail = r.kind === 'rail';
    if (!isHw && !isRail) continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const a = r.p[i], b = r.p[i + 1];
      lines.push({ a, b, kind: r.kind, name: r.name || '', id: r.id, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) });
    }
  }
  return { origin: m.origin, source: m.source, lines };
}
const toLocal = (origin, lat, lon) => { const u = toUTM(lat, lon); return [u.e - origin.e, origin.n - u.n]; };

const FORBIDDEN = new Set(['trunk', 'trunk_link', 'rail']);
const labelOf = l => l.name || `(sin nombre · ${l.kind})`;

/** Metros de vías/ferrocarril dentro del contorno, agrupados por nombre */
function crossings(P, lines) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const by = new Map(); let total = 0, forbidden = 0;
  for (const l of lines) {
    if (l.x1 < x0 || l.x0 > x1 || l.y1 < y0 || l.y0 > y1) continue;
    for (const pc of clipPieces(l.a, l.b, P)) {
      if (!pc.inside) continue;
      if (FORBIDDEN.has(l.kind)) forbidden += pc.len;
      const k = l.kind === 'rail' ? 'Vía férrea' : labelOf(l);
      by.set(k, (by.get(k) || 0) + pc.len); total += pc.len;
    }
  }
  const list = [...by.entries()].map(([name, meters]) => ({ name, meters: Math.round(meters) })).filter(c => c.meters >= 1).sort((a, b) => b.meters - a.meters || a.name.localeCompare(b.name));
  return { total, forbidden, list };
}

/** Vía con nombre más cercana FUERA del contorno, a ≤ 80 m de cada lado (o ''). */
function neighborFor(P, sideChain, lines, maxD = 80) {
  // muestras a lo largo de la cadena (cada ≈5 m) con la dirección de su arista
  const samples = [];
  for (let k = 0; k < sideChain.length - 1; k++) {
    const a = P[sideChain[k]], b = P[sideChain[k + 1]], L = dist(a, b), n = Math.max(1, Math.round(L / 5));
    const dir = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    for (let s = 0; s < n; s++) { const t = (s + .5) / n; samples.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir, w: L / n }); }
  }
  const W = samples.reduce((s, x) => s + x.w, 0);
  // trozos fuera del contorno de las vías con nombre (se excluye el ferrocarril)
  const pieces = new Map();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (const l of lines) {
    if (!l.name || l.kind === 'rail') continue;
    if (l.x1 < x0 - maxD || l.x0 > x1 + maxD || l.y1 < y0 - maxD || l.y0 > y1 + maxD) continue;
    for (const pc of clipPieces(l.a, l.b, P)) {
      if (pc.inside || pc.len < .5) continue;
      if (!pieces.has(l.name)) pieces.set(l.name, []);
      pieces.get(l.name).push({ a: pc.a, b: pc.b, dir: [(pc.b[0] - pc.a[0]) / pc.len, (pc.b[1] - pc.a[1]) / pc.len] });
    }
  }
  const COS = Math.cos(rad(35)); // la vía debe ir más o menos paralela al lado (descarta calles que solo lo tocan de frente)
  let best = null;
  for (const [name, pcs] of pieces) {
    let covered = 0, acc = 0;
    for (const s of samples) {
      let d = Infinity;
      for (const pc of pcs) {
        if (Math.abs(pc.dir[0] * s.dir[0] + pc.dir[1] * s.dir[1]) < COS) continue;
        const dd = ptSeg(s.p, pc.a, pc.b); if (dd < d) d = dd;
      }
      if (d <= maxD) covered += s.w;
      acc += Math.min(d, maxD) * s.w;
    }
    const coverage = covered / W, mean = acc / W;
    if (coverage < 0.3) continue;
    if (!best || mean < best.mean) best = { name, coverage, mean };
  }
  return best;
}

function nameNeighbors(P, sides, lines) {
  const chain = ([i, j]) => { const c = [i]; let k = i; while (k !== j) { k = (k + 1) % P.length; c.push(k); } return c; };
  const out = {}, detail = {};
  for (const key of ['front', 'west', 'south', 'east']) {
    const s = sides[key];
    const nb = s ? neighborFor(P, chain(s), lines) : null;
    out[key] = nb ? nb.name : ''; detail[key] = nb;
  }
  return { out, detail };
}

// ---------- Modo conceptual ----------
// Silueta SB06 (drawings.js), unidades de dibujo, Y hacia abajo, norte arriba. Sentido horario en pantalla.
const SILUETA = [[-32, -100], [32, -51], [31, 100], [-24, 100], [-24, 42], [-28, 41], [-27, -38], [-33, -39]];
const SILUETA_SIDES = { front: [0, 1], east: [1, 2], south: [2, 3], west: [3, 0] }; // west recorre 3→4→5→6→7→0 (incluye la muesca)
const DECLARED = 247584;
const GRID = 5, FRONT_MAX = 60;

function conceptual(base, docPoint, maxCross) {
  const s = Math.sqrt(DECLARED / Math.abs(shoelace(SILUETA)));
  const base0 = SILUETA.map(([x, y]) => [x * s, y * s]);
  const trunk = base.lines.filter(l => l.kind === 'trunk');
  const forb = base.lines.filter(l => FORBIDDEN.has(l.kind));
  const hw = base.lines.filter(l => !FORBIDDEN.has(l.kind));
  const frontDist = (P) => { // máximo, sobre la arista diagonal, de la distancia al eje (vía trunk más cercana)
    const [a, b] = [P[0], P[1]]; let mx = 0;
    for (let k = 0; k <= 8; k++) {
      const p = [a[0] + (b[0] - a[0]) * k / 8, a[1] + (b[1] - a[1]) * k / 8];
      let d = Infinity; for (const t of trunk) { const dd = ptSeg(p, t.a, t.b); if (dd < d) d = dd; }
      if (d > mx) mx = d;
    }
    return mx;
  };
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const p of base0) { xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
  const cands = []; let tried = 0, feasible = 0;
  for (let tx = Math.ceil((docPoint[0] - xmax) / GRID) * GRID; tx <= docPoint[0] - xmin; tx += GRID) {
    for (let ty = Math.ceil((docPoint[1] - ymax) / GRID) * GRID; ty <= docPoint[1] - ymin; ty += GRID) {
      tried++;
      const P = base0.map(([x, y]) => [x + tx, y + ty]);
      if (!inside(docPoint, P)) continue;
      const fd = frontDist(P);
      if (fd > FRONT_MAX) continue;
      const cx = crossings(P, forb);
      if (cx.forbidden > 0.01) continue;
      feasible++;
      const c = crossings(P, hw);
      cands.push({ tx, ty, fd, total: c.total, list: c.list });
    }
  }
  if (!cands.length) throw new Error('Sin posición factible (docPoint + 0 m de trunk/rail + arista ≤ 60 m del eje).');
  cands.sort((a, b) => a.total - b.total || a.fd - b.fd || a.tx - b.tx || a.ty - b.ty);
  const best = cands[0];
  const P = base0.map(([x, y]) => [r2(x + best.tx), r2(y + best.ty)]);
  return { P, scale: s, tx: best.tx, ty: best.ty, frontDist: best.fd, total: best.total, tried, feasible, top: cands.slice(0, 5), sides: SILUETA_SIDES };
}

// ---------- Modo KML ----------
function parseKml(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const poly = txt.match(/<Polygon\b[\s\S]*?<\/Polygon>/i);
  if (!poly) throw new Error('El KML no tiene ningún <Polygon>.');
  const outer = (poly[0].match(/<outerBoundaryIs>[\s\S]*?<\/outerBoundaryIs>/i) || [poly[0]])[0];
  const co = outer.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
  if (!co) throw new Error('El primer Polygon no tiene <coordinates>.');
  const pts = co[1].trim().split(/\s+/).map(t => t.split(',').map(Number)).filter(v => v.length >= 2 && v.every(Number.isFinite)).map(v => [v[0], v[1]]); // [lon, lat]
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  if (pts.length < 3) throw new Error('El polígono tiene menos de 3 vértices.');
  return pts;
}
/** front = arista (≥ 20 m) más cercana al eje de la trunk; west/south/east = cadena contigua más larga de aristas cuya normal exterior apunta a ese rumbo. */
function kmlSides(P, trunk) {
  const n = P.length, edges = [];
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], L = dist(a, b), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const nx = (b[1] - a[1]) / L, ny = -(b[0] - a[0]) / L; // normal exterior para sentido horario con Y abajo
    let cls = Math.abs(nx) >= Math.abs(ny) ? (nx < 0 ? 'west' : 'east') : (ny < 0 ? 'north' : 'south');
    let d = Infinity; for (const t of trunk) { const dd = ptSeg(m, t.a, t.b); if (dd < d) d = dd; }
    edges.push({ i, L, cls, d });
  }
  const cand = edges.filter(e => e.L >= 20);
  const fe = (cand.length ? cand : edges).reduce((u, e) => e.d < u.d ? e : u);
  const sides = { front: [fe.i, (fe.i + 1) % n], west: null, south: null, east: null };
  // las aristas cortas (< 30 m, p. ej. una muesca) heredan la clase de la arista larga anterior, para no partir un lado en pedazos
  const cls = edges.map(e => e.cls), longIdx = edges.findIndex(e => e.L >= 30 && e.i !== fe.i);
  if (longIdx >= 0) {
    let cur = cls[longIdx];
    for (let k = 0; k < n; k++) { const e = edges[(longIdx + k) % n]; if (e.L >= 30 && e.i !== fe.i) cur = e.cls; else cls[e.i] = cur; }
  }
  for (const c of ['west', 'south', 'east']) {
    let bestRun = null;
    for (let st = 0; st < n; st++) {
      if (cls[st] !== c || st === fe.i || (cls[(st + n - 1) % n] === c && (st + n - 1) % n !== fe.i)) continue; // inicio de corrida
      let len = 0, k = st;
      while (cls[k] === c && k !== fe.i) { len += edges[k].L; k = (k + 1) % n; if (k === st) break; }
      if (!bestRun || len > bestRun.len) bestRun = { len, start: st, end: k };
    }
    if (bestRun) sides[c] = [bestRun.start, bestRun.end];
  }
  return sides;
}

// ---------- Salida ----------
const fmtPt = p => `[${p[0]},${p[1]}]`;
function serialize(parcel, header) {
  const sd = s => s ? `[${s[0]},${s[1]}]` : 'null';
  return header +
`export const parcel={
  status:${JSON.stringify(parcel.status)},
  source:${JSON.stringify(parcel.source)},
  declaredArea:${parcel.declaredArea},
  computedArea:${parcel.computedArea},
  outline:[${parcel.outline.map(fmtPt).join(',')}],
  front:${sd(parcel.front)},
  sides:{front:${sd(parcel.sides.front)},west:${sd(parcel.sides.west)},south:${sd(parcel.sides.south)},east:${sd(parcel.sides.east)}},
  neighbors:${JSON.stringify(parcel.neighbors)},
  crosses:${JSON.stringify(parcel.crosses)},
  docPoint:${fmtPt(parcel.docPoint)}
};
`;
}

// ---------- main ----------
function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
function main() {
  const root = path.resolve(__dirname, '..', 'presentacion', 'distrito-obregon');
  const basemapFile = path.resolve(arg('--basemap') || path.join(root, 'basemap.js'));
  const outFile = path.resolve(arg('--out') || path.join(root, 'parcel.js'));
  const maxCrossArg = process.argv.find(a => a.startsWith('--max-cross='));
  const maxCross = maxCrossArg ? parseFloat(maxCrossArg.split('=')[1]) : 800;
  const dry = process.argv.includes('--dry');
  const kml = arg('--kml'), isConceptual = process.argv.includes('--conceptual');
  if (!!kml === isConceptual) { console.error('Uso: node scripts/prepare-obregon-parcel.cjs (--conceptual | --kml <doc.kml>) [--basemap f] [--out f] [--max-cross=800] [--dry]'); process.exit(1); }

  const chk = selfCheck();
  console.log(`Verificación UTM: 27.4750, -109.9215 → E ${chk.e.toFixed(3)} N ${chk.n.toFixed(3)} (esperado 606553.961, 3039510.356); ida y vuelta ${chk.roundtrip.toExponential(1)} °`);
  const base = loadBasemap(basemapFile);
  const docPoint = toLocal(base.origin, SITE.lat, SITE.lon).map(r2);
  console.log(`Base: ${path.basename(basemapFile)} · origen ${base.origin.e},${base.origin.n} · ${base.lines.length} segmentos · punto documental local [${docPoint}]`);

  let parcel, report;
  if (isConceptual) {
    const r = conceptual(base, docPoint, maxCross);
    console.log(`Rejilla ${GRID} m: ${r.tried} posiciones, ${r.feasible} factibles. Escala ${r.scale.toFixed(4)} m/u, traslación (${r.tx}, ${r.ty}), arista frontal a ≤ ${r.frontDist.toFixed(1)} m del eje de la trunk.`);
    if (r.total > maxCross) {
      console.error(`AVISO: el menor cruce posible es ${Math.round(r.total)} m de calles (> ${maxCross} m). No se escribe parcel.js; revise el contorno con Dirección.`);
      r.top.forEach(c => console.error(`  tx ${c.tx} ty ${c.ty}: ${Math.round(c.total)} m, frente ${c.fd.toFixed(0)} m`));
      process.exit(2);
    }
    const area = Math.abs(shoelace(r.P));
    const cx = crossings(r.P, base.lines);
    const nb = nameNeighbors(r.P, r.sides, base.lines);
    parcel = {
      status: 'conceptual',
      source: 'Silueta conceptual de la presentación SB06, escalada a 247,584 m², rotación 0 y colocada de forma aproximada sobre OpenStreetMap (© OpenStreetMap contributors, ODbL). No son linderos.',
      declaredArea: DECLARED, computedArea: r2(area), outline: r.P, front: r.sides.front, sides: r.sides,
      neighbors: nb.out, crosses: cx.list, docPoint
    };
    report = { nb, cx, area, extra: `escala ${r.scale.toFixed(4)} m/u; arista frontal a ≤ ${r.frontDist.toFixed(1)} m del eje` };
    if (Math.abs(area - DECLARED) / DECLARED > 0.001) throw new Error(`Área ${area} fuera de ±0.1 % de ${DECLARED}`);
  } else {
    let P = parseKml(path.resolve(kml)).map(([lon, lat]) => toLocal(base.origin, lat, lon).map(r2));
    if (shoelace(P) < 0) P = P.reverse(); // sentido horario en pantalla (Y abajo)
    const area = Math.abs(shoelace(P));
    const trunk = base.lines.filter(l => l.kind === 'trunk');
    const sides = kmlSides(P, trunk);
    const cx = crossings(P, base.lines);
    const nb = nameNeighbors(P, sides, base.lines);
    parcel = {
      status: 'kmz',
      source: 'Polígono del KMZ/KML del terreno (solo coordenadas del primer Polygon, sin ajustar), sobre OpenStreetMap (© OpenStreetMap contributors, ODbL).',
      declaredArea: DECLARED, computedArea: r2(area), outline: P, front: sides.front, sides,
      neighbors: nb.out, crosses: cx.list, docPoint
    };
    report = { nb, cx, area, extra: `${P.length} vértices; diferencia con el área declarada ${(area - DECLARED).toFixed(1)} m² (${((area - DECLARED) / DECLARED * 100).toFixed(2)} %), sin ajustar` };
  }

  const header = `// Generado por scripts/prepare-obregon-parcel.cjs (${isConceptual ? '--conceptual' : '--kml'}). Metros locales: X = este − ${base.origin.e}; Y = ${base.origin.n} − norte (Y abajo, norte de cuadrícula UTM 12N).\n` +
    `// outline: sentido horario en pantalla. sides.*: [vértice inicial, vértice final] de la cadena de aristas, recorrida en el sentido del contorno (west puede abarcar varias aristas).\n` +
    `// neighbors: vía con nombre más cercana fuera del contorno a ≤ 80 m de cada lado, aproximadamente paralela (cubre ≥ 30 % del lado); '' si no hay. crosses: metros de calles/vías de la base OSM dentro del contorno.\n` +
    `// ${isConceptual ? 'Posición aproximada: la forma conceptual NO coincide con linderos reales.' : 'Coordenadas del polígono entregado; confirmar con el cliente antes de publicar vértices exactos.'}\n`;
  const out = serialize(parcel, header);

  console.log(`status ${parcel.status} · área calculada ${parcel.computedArea} m² (declarada ${DECLARED}) · ${report.extra}`);
  console.log('Lados:', JSON.stringify(parcel.sides));
  for (const k of ['front', 'west', 'south', 'east']) { const d = report.nb.detail[k]; console.log(`  ${k}: ${parcel.neighbors[k] || '(sin vía nombrada ≤ 80 m)'}${d ? ` · cubre ${(d.coverage * 100).toFixed(0)} % · dist. media ${d.mean.toFixed(0)} m` : ''}`); }
  console.log(`Calles cruzadas: ${Math.round(report.cx.total)} m en total`);
  parcel.crosses.forEach(c => console.log(`  ${String(c.meters).padStart(4)} m  ${c.name}`));
  if (!dry) { fs.writeFileSync(outFile, out); console.log(`Escrito ${outFile} (${Buffer.byteLength(out)} bytes)`); }
}

if (require.main === module) main();
else module.exports = { toUTM, fromUTM, selfCheck, loadBasemap, conceptual, crossings, parseKml, kmlSides, shoelace, inside };
