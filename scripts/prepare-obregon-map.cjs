#!/usr/bin/env node
'use strict';
/*
 * prepare-obregon-map.cjs — base cartográfica OSM alrededor del terreno de Distrito Obregón.
 * (descarga OSM v0.6 por mosaicos, o lee --raw) → filtra → recorta al bbox → proyecta UTM 12N WGS84
 * → simplifica (Douglas-Peucker por distancia al origen) → escribe basemap.js
 *
 * Uso:
 *   node scripts/prepare-obregon-map.cjs --offline --raw <dir>   lee las teselas .osm de <dir> (sin red)
 *   node scripts/prepare-obregon-map.cjs --raw <dir>             descarga a <dir> las teselas que falten y genera
 *   Opciones: --out <archivo>  (por defecto presentacion/distrito-obregon/basemap.js)
 *             --raw <dir>      (por defecto <tmp>/obregon-osm-raw; NO va al repositorio)
 *             --half-km=2.2    (semilado del área)
 *             --no-utm-test    omite la prueba UTM contra presentacion/distrito-abasto/parcel.js
 * Como módulo: require('./prepare-obregon-map.cjs') expone toUTM, fromUTM, projectLonLat, utmSelfTest
 * (no ejecuta nada al importarlo). © OpenStreetMap contributors · ODbL 1.0
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
function argValue(name) { // admite "--name valor" y "--name=valor"
  const argv = process.argv;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name) return argv[i + 1];
    if (argv[i].startsWith(name + '=')) return argv[i].slice(name.length + 1);
  }
  return undefined;
}
const RAW = path.resolve(argValue('--raw') || path.join(os.tmpdir(), 'obregon-osm-raw'));
const OUT = path.resolve(argValue('--out') || path.join(REPO, 'presentacion', 'distrito-obregon', 'basemap.js'));
const OFFLINE = process.argv.includes('--offline');
const halfArg = argValue('--half-km');
const HALF_KM = halfArg ? parseFloat(halfArg) : 2.2;
const UA = 'yod-presentacion/1.0 (direccion YOD)';
const MAX_REQUESTS = 40;
const SIZE_TARGET = 200 * 1024;          // presupuesto del basemap
const NEAR_M = 1200, TOL_NEAR = 0.8, TOL_FAR = 3; // Douglas-Peucker: tolerancia (m) según distancia al origen
const FOOT_RADIUS_M = 700;               // path/track/pedestrian/footway solo dentro de este radio
const BUILDING_RADIUS_M = 1200;          // edificios solo dentro de este radio
const FOOT_KINDS = new Set(['path', 'track', 'pedestrian', 'footway']);
const REQUIRED_IDS = ['288664426', '227359800']; // Federal 15 (cuota) y Calle Valle Colorado
const REQUIRED_NAMES = ['Calle 300', 'Calle Paseo Miravalle', 'Calzada Francisco Villanueva', 'Boulevard Circunvalación'];

const SITE = { lat: 27.4750, lon: -109.9215 };

// ---------- UTM (Krüger, serie de orden 6, WGS84) ----------
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
  // latitud geodésica por serie de chi
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

// ---------- Geometría ----------
const SITE_UTM = toUTM(SITE.lat, SITE.lon);
const ORIGIN = { e: Math.round(SITE_UTM.e / 50) * 50, n: Math.round(SITE_UTM.n / 50) * 50 };
const ORIGIN_LL = fromUTM(ORIGIN.e, ORIGIN.n);
const r2 = v => Math.round(v * 100) / 100;
function proj(lat, lon) {
  const u = toUTM(lat, lon);
  return [r2(u.e - ORIGIN.e), r2(ORIGIN.n - u.n)];
}
// Proyección pública: lon/lat → metros locales {x = este − origen.e, y = origen.n − norte}
function projectLonLat(lon, lat) { const [x, y] = proj(lat, lon); return { x, y }; }
const SITE_LOCAL = proj(SITE.lat, SITE.lon);

// bbox ≈ semilado HALF_KM alrededor del punto
const dLat = HALF_KM * 1000 / 110574;
const dLon = HALF_KM * 1000 / (111320 * Math.cos(rad(SITE.lat)));
const BBOX = {
  minLat: +(SITE.lat - dLat).toFixed(4), maxLat: +(SITE.lat + dLat).toFixed(4),
  minLon: +(SITE.lon - dLon).toFixed(4), maxLon: +(SITE.lon + dLon).toFixed(4),
};

function clipLine(pts, b) { // pts [[lon,lat]] → lista de segmentos (Liang–Barsky)
  const out = []; let cur = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const dx = x1 - x0, dy = y1 - y0;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, x0 - b.minLon], [dx, b.maxLon - x0], [-dy, y0 - b.minLat], [dy, b.maxLat - y0]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } }
      else { const t = q / p; if (p < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; } }
    }
    if (!ok) { cur = null; continue; }
    const a = [x0 + t0 * dx, y0 + t0 * dy], c = [x0 + t1 * dx, y0 + t1 * dy];
    if (!cur || t0 > 0) { cur = [a]; out.push(cur); }
    cur.push(c);
    if (t1 < 1) cur = null;
  }
  return out.filter(s => s.length >= 2);
}
function clipPoly(pts, b) { // Sutherland–Hodgman sobre ventana rectangular; pts sin repetir primer punto
  const edges = [
    [p => p[0] >= b.minLon, (a, c) => { const t = (b.minLon - a[0]) / (c[0] - a[0]); return [b.minLon, a[1] + t * (c[1] - a[1])]; }],
    [p => p[0] <= b.maxLon, (a, c) => { const t = (b.maxLon - a[0]) / (c[0] - a[0]); return [b.maxLon, a[1] + t * (c[1] - a[1])]; }],
    [p => p[1] >= b.minLat, (a, c) => { const t = (b.minLat - a[1]) / (c[1] - a[1]); return [a[0] + t * (c[0] - a[0]), b.minLat]; }],
    [p => p[1] <= b.maxLat, (a, c) => { const t = (b.maxLat - a[1]) / (c[1] - a[1]); return [a[0] + t * (c[0] - a[0]), b.maxLat]; }],
  ];
  let poly = pts;
  for (const [inside, inter] of edges) {
    if (!poly.length) break;
    const res = [];
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
      const ci = inside(cur), pi = inside(prev);
      if (ci) { if (!pi) res.push(inter(prev, cur)); res.push(cur); }
      else if (pi) res.push(inter(prev, cur));
    }
    poly = res;
  }
  return poly;
}
function polyArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], c = p[(i + 1) % p.length]; s += a[0] * c[1] - c[0] * a[1]; } return Math.abs(s) / 2; }
// Douglas-Peucker con tolerancia por vértice: tol(punto) según su distancia al origen local (0,0).
// Se conserva el vértice con mayor d / tol(punto) mientras supere 1. Los extremos siempre se conservan.
const tolAt = p => (Math.hypot(p[0], p[1]) <= NEAR_M ? TOL_NEAR : TOL_FAR);
function dpSimplify(pts, closed) {
  if (pts.length <= 2) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = 1; keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const segDist = (p, a, c) => {
    const dx = c[0] - a[0], dy = c[1] - a[1], l2 = dx * dx + dy * dy;
    let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  while (stack.length) {
    const [s, e] = stack.pop(); let mr = 1, mi = -1;
    for (let i = s + 1; i < e; i++) { const r = segDist(pts[i], pts[s], pts[e]) / tolAt(pts[i]); if (r > mr) { mr = r; mi = i; } }
    if (mi >= 0) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
  }
  const out = pts.filter((_, i) => keep[i]);
  if (closed && out.length < 4) { // polígono colapsado: conservar al menos un triángulo
    return pts.length >= 4 ? [pts[0], pts[Math.floor(pts.length / 3)], pts[Math.floor(2 * pts.length / 3)], pts[0]] : pts;
  }
  return out;
}
function segDistPt(px, py, a, c) {
  const dx = c[0] - a[0], dy = c[1] - a[1], l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
  const qx = a[0] + t * dx, qy = a[1] + t * dy;
  return { d: Math.hypot(px - qx, py - qy), qx, qy };
}

function minDistToOrigin(pts) { // distancia (m) del origen local (0,0) a la geometría
  let best = Infinity;
  if (pts.length === 1) return Math.hypot(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, segDistPt(0, 0, pts[i], pts[i + 1]).d);
  return best;
}

// ---------- Descarga ----------
let requests = 0;
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function tileName(b) { return `tile_${b.minLon}_${b.minLat}_${b.maxLon}_${b.maxLat}.osm`; }
function fetchTile(b, depth = 0) {
  const file = path.join(RAW, tileName(b));
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return [file];
  if (requests >= MAX_REQUESTS) throw new Error(`Se alcanzó el máximo de ${MAX_REQUESTS} peticiones`);
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    requests++; sleep(1100);
    let body, code;
    try {
      const out = execFileSync('curl', ['-sS', '-m', '90', '-A', UA, '-o', file + '.part', '-w', '%{http_code}', url], { encoding: 'utf8' });
      code = out.trim();
    } catch (e) { console.error(`curl falló (${tileName(b)}): ${e.message.split('\n')[0]}`); sleep(3000); continue; }
    if (code === '200') { fs.renameSync(file + '.part', file); console.log(`OK ${tileName(b)} ${(fs.statSync(file).size / 1024) | 0} KB (petición ${requests})`); return [file]; }
    body = fs.existsSync(file + '.part') ? fs.readFileSync(file + '.part', 'utf8').slice(0, 300) : '';
    fs.rmSync(file + '.part', { force: true });
    if (code === '400' && /node/i.test(body) && depth < 3) {
      console.log(`HTTP 400 (demasiados nodos) ${tileName(b)} → dividir: ${body.trim()}`);
      const mx = +((b.minLon + b.maxLon) / 2).toFixed(5), my = +((b.minLat + b.maxLat) / 2).toFixed(5);
      return [
        { minLon: b.minLon, minLat: b.minLat, maxLon: mx, maxLat: my }, { minLon: mx, minLat: b.minLat, maxLon: b.maxLon, maxLat: my },
        { minLon: b.minLon, minLat: my, maxLon: mx, maxLat: b.maxLat }, { minLon: mx, minLat: my, maxLon: b.maxLon, maxLat: b.maxLat },
      ].flatMap(s => fetchTile(s, depth + 1));
    }
    console.error(`HTTP ${code} ${tileName(b)}: ${body.trim()}`);
    if (code === '429' || code === '509' || code.startsWith('5')) { sleep(5000 * (attempt + 1)); continue; }
    throw new Error(`HTTP ${code} ${url}: ${body.trim()}`);
  }
  throw new Error(`Fallaron los reintentos para ${url}`);
}
function download() {
  fs.mkdirSync(RAW, { recursive: true });
  const NX = 5, NY = 4, files = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const b = {
      minLon: +(BBOX.minLon + i * (BBOX.maxLon - BBOX.minLon) / NX).toFixed(5), maxLon: +(BBOX.minLon + (i + 1) * (BBOX.maxLon - BBOX.minLon) / NX).toFixed(5),
      minLat: +(BBOX.minLat + j * (BBOX.maxLat - BBOX.minLat) / NY).toFixed(5), maxLat: +(BBOX.minLat + (j + 1) * (BBOX.maxLat - BBOX.minLat) / NY).toFixed(5),
    };
    files.push(...fetchTile(b));
  }
  const metaFile = path.join(RAW, 'meta.json');
  const prev = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
  fs.writeFileSync(metaFile, JSON.stringify({ date: prev.date || new Date().toISOString(), bbox: BBOX, requests: (prev.requests || 0) + requests }, null, 1));
  return files;
}

// ---------- Parseo XML OSM ----------
const unesc = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, g) => {
  if (g[0] === '#') return String.fromCodePoint(g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[g.toLowerCase()];
});
function parseOsm(files) {
  const nodes = new Map(), ways = new Map();
  const reEl = /<(node|way)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/g;
  for (const f of files) {
    const xml = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = reEl.exec(xml))) {
      const attrs = m[2];
      const id = /\bid="(\d+)"/.exec(attrs)[1];
      if (m[1] === 'node') {
        const la = /\blat="([-\d.]+)"/.exec(attrs), lo = /\blon="([-\d.]+)"/.exec(attrs);
        if (la && lo) nodes.set(id, [parseFloat(lo[1]), parseFloat(la[1])]);
      } else if (!ways.has(id)) {
        const body = m[3] || '', nd = [], tags = {};
        let t; const rn = /<nd ref="(\d+)"/g; while ((t = rn.exec(body))) nd.push(t[1]);
        const rt = /<tag k="([^"]*)" v="([^"]*)"/g; while ((t = rt.exec(body))) tags[unesc(t[1])] = unesc(t[2]);
        ways.set(id, { nd, tags });
      }
    }
  }
  return { nodes, ways };
}

// ---------- Filtrado ----------
const HW_SKIP = new Set(['footway', 'path', 'steps', 'cycleway', 'corridor', 'elevator', 'platform', 'proposed']);
const WATERWAYS = new Set(['canal', 'river', 'drain', 'ditch']);
function classify(tags) {
  if (tags.highway && !(HW_SKIP.has(tags.highway) && !tags.name)) return { layer: 'highway', kind: tags.highway, closedOk: false };
  if (tags.railway === 'rail') return { layer: 'railway', kind: 'rail', closedOk: false };
  if (WATERWAYS.has(tags.waterway)) return { layer: 'waterway', kind: tags.waterway, closedOk: false };
  if (tags.natural === 'water') return { layer: 'water', kind: 'water', closedOk: true };
  if (tags.building) return { layer: 'building', kind: 'building', closedOk: true };
  if (tags.landuse) return { layer: 'landuse', kind: 'landuse', sub: tags.landuse, closedOk: true };
  return null;
}
const HW_ORDER = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
function build() {
  const files = fs.readdirSync(RAW).filter(f => /^tile_.*\.osm$/.test(f)).sort().map(f => path.join(RAW, f));
  if (!files.length) throw new Error('No hay teselas en raw/ (¿falta descargar?)');
  const { nodes, ways } = parseOsm(files);
  console.log(`Parseados: ${nodes.size} nodos, ${ways.size} vías de ${files.length} teselas`);
  const items = []; const stat = { skippedNoGeom: 0, outside: 0, landuseWays: 0, relationsIgnored: 'multipolígonos (relations) no se extraen' };
  for (const [id, w] of ways) {
    const c = classify(w.tags); if (!c) continue;
    const ll = w.nd.map(r => nodes.get(r)).filter(Boolean);
    if (ll.length < 2) { stat.skippedNoGeom++; continue; }
    const closed = w.nd.length > 3 && w.nd[0] === w.nd[w.nd.length - 1];
    const name = w.tags.name || w.tags.ref || '';
    const base = { id, kind: c.kind, name, layer: c.layer };
    if (c.sub) base.sub = c.sub;
    if (w.tags.ref && w.tags.name) base.ref = w.tags.ref;
    if (c.layer === 'highway' || c.layer === 'railway' || c.layer === 'waterway') {
      if (w.tags.tunnel && w.tags.tunnel !== 'no' && c.layer !== 'highway') { /* se conserva */ }
      const segs = clipLine(ll, BBOX);
      if (!segs.length) { stat.outside++; continue; }
      segs.forEach((s, i) => items.push({ ...base, id: i ? `${id}-${i + 1}` : id, p: s.map(q => proj(q[1], q[0])) }));
    } else { // polígonos
      if (!closed) {
        // vía abierta con tag de área: se trata como línea solo para agua/uso de suelo (raro); se omite
        stat.skippedNoGeom++; continue;
      }
      const poly = clipPoly(ll.slice(0, -1), BBOX);
      if (poly.length < 3) { stat.outside++; continue; }
      const p = poly.map(q => proj(q[1], q[0])); p.push(p[0]);
      items.push({ ...base, p });
    }
  }
  // Recortes por distancia al origen: edificios solo a ≤ 1.2 km; path/track/pedestrian/footway solo a ≤ 700 m.
  const bldTotal = items.filter(i => i.layer === 'building').length;
  const footTotal = items.filter(i => i.layer === 'highway' && FOOT_KINDS.has(i.kind)).length;
  const kept = items.filter(i => {
    if (i.layer === 'building') return minDistToOrigin(i.p) <= BUILDING_RADIUS_M;
    if (i.layer === 'highway' && FOOT_KINDS.has(i.kind)) return minDistToOrigin(i.p) <= FOOT_RADIUS_M;
    return true;
  });
  const bldDropped = bldTotal - kept.filter(i => i.layer === 'building').length;
  const footDropped = footTotal - kept.filter(i => i.layer === 'highway' && FOOT_KINDS.has(i.kind)).length;
  return { items: kept, stat, bldTotal, bldDropped, footTotal, footDropped, nNodes: nodes.size, nWays: ways.size, nTiles: files.length };
}

// ---------- Salida ----------
const LAYER_ORDER = { landuse: 0, water: 1, building: 2, waterway: 3, railway: 4, highway: 5 };
function sortItems(items) {
  const hwRank = k => { const base = k.replace('_link', ''); const i = HW_ORDER.indexOf(base); return i < 0 ? 99 : i; };
  items.sort((a, b) => (LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer]) ||
    (a.layer === 'highway' ? (hwRank(b.kind) - hwRank(a.kind)) : 0) || (+a.id.split('-')[0] - +b.id.split('-')[0]));
}
function serialize(items, meta) {
  const roads = items.map(i => {
    const o = { id: i.id, kind: i.kind, name: i.name };
    if (i.sub) o.sub = i.sub;
    if (i.ref) o.ref = i.ref;
    o.p = i.p;
    return o;
  });
  const head = `// © OpenStreetMap contributors · ODbL 1.0. Extracción ${meta.date.slice(0, 10)}. Simplificado Douglas-Peucker ${TOL_NEAR} m (≤ ${NEAR_M / 1000} km del origen) y ${TOL_FAR} m (más allá). Origen UTM 12N WGS84 (${ORIGIN.e}, ${ORIGIN.n}); X = este − ${ORIGIN.e}; Y = ${ORIGIN.n} − norte (m).\n`;
  return head +
    `export const origin={utm:'12N',e:${ORIGIN.e},n:${ORIGIN.n},lat:${ORIGIN_LL.lat.toFixed(7)},lon:${ORIGIN_LL.lon.toFixed(7)}};\n` +
    `export const source='© OpenStreetMap contributors · ODbL 1.0 · extracción ${meta.date.slice(0, 19)}Z · bbox ${BBOX.minLon},${BBOX.minLat},${BBOX.maxLon},${BBOX.maxLat}';\n` +
    `export const roads=${JSON.stringify(roads)};\n`;
}

// ---------- Prueba UTM contra el par de Abasto (parcel.js) ----------
// parcel.js es un módulo ES: se lee como texto y se evalúa solo `coordinates` y `lonLat` (datos puros).
function loadAbastoPair(file) {
  const src = fs.readFileSync(file, 'utf8');
  const body = src.replace(/^export const /gm, 'const ');
  return new Function(`${body}\nreturn { coordinates, lonLat };`)();
}
function utmSelfTest(file = path.join(REPO, 'presentacion', 'distrito-abasto', 'parcel.js'), tolM = 0.05, log = console.log) {
  const { coordinates, lonLat } = loadAbastoPair(file);
  const rows = []; let worst = 0, worstBack = 0;
  log('vértice | lon, lat (parcel.lonLat) | E, N esperado (parcel.coordinates) | E, N calculado | error m | ida y vuelta m');
  for (const id of Object.keys(lonLat)) {
    const [lon, lat] = lonLat[id], [e0, n0] = coordinates[id];
    const u = toUTM(lat, lon), err = Math.hypot(u.e - e0, u.n - n0);
    const back = fromUTM(e0, n0); // UTM → lon/lat; se mide en metros con la misma proyección directa
    const ub = toUTM(back.lat, back.lon), errBack = Math.hypot(ub.e - e0, ub.n - n0);
    worst = Math.max(worst, err); worstBack = Math.max(worstBack, errBack);
    rows.push({ id, err, errBack });
    log(`${id.padStart(6)} | ${lon.toFixed(8)}, ${lat.toFixed(8)} | ${e0.toFixed(4)}, ${n0.toFixed(4)} | ${u.e.toFixed(4)}, ${u.n.toFixed(4)} | ${err.toFixed(4)} | ${errBack.toFixed(6)}`);
  }
  const ok = rows.length === 9 && worst <= tolM;
  log(`Prueba UTM: ${rows.length} vértices, error máximo ${worst.toFixed(4)} m (tolerancia ${tolM} m), ida y vuelta máx ${worstBack.toFixed(6)} m → ${ok ? 'PASA' : 'FALLA'}`);
  return { ok, worst, worstBack, rows };
}

// ---------- Invariantes y estadísticas ----------
function checkInvariants(items) {
  const miss = [];
  for (const id of REQUIRED_IDS) if (!items.some(i => i.id.split('-')[0] === id)) miss.push(`id ${id}`);
  for (const n of REQUIRED_NAMES) if (!items.some(i => i.name === n)) miss.push(`vía "${n}"`);
  return miss;
}
function printStats(items, b, meta, bytes) {
  const byLayer = {}, byKind = {};
  items.forEach(i => { byLayer[i.layer] = (byLayer[i.layer] || 0) + 1; const k = i.layer === 'landuse' ? `landuse (${i.sub})` : i.kind; byKind[k] = (byKind[k] || 0) + 1; });
  const pts = items.reduce((n, i) => n + i.p.length, 0);
  console.log(`Teselas ${b.nTiles}; nodos ${b.nNodes}; vías ${b.nWays}; extracción ${meta.date}`);
  console.log(`Edificios: ${b.bldTotal} extraídos, ${b.bldDropped} fuera de ${BUILDING_RADIUS_M} m; path/track/pedestrian/footway: ${b.footTotal} extraídos, ${b.footDropped} fuera de ${FOOT_RADIUS_M} m`);
  console.log(`Elementos ${items.length}, vértices ${pts}`);
  console.log('Por capa: ' + Object.entries(byLayer).map(([k, v]) => `${k}=${v}`).join(', '));
  console.log('Por kind: ' + Object.entries(byKind).sort((a, c) => c[1] - a[1] || (a[0] < c[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join(', '));
  console.log(`basemap.js ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB; presupuesto ${SIZE_TARGET / 1024} KB)`);
}

// ---------- main ----------
function main() {
  console.log(`Punto documental → UTM 12N: E=${SITE_UTM.e.toFixed(3)} N=${SITE_UTM.n.toFixed(3)}; origen ${ORIGIN.e},${ORIGIN.n}; local ${SITE_LOCAL}`);
  console.log(`bbox ${BBOX.minLon},${BBOX.minLat},${BBOX.maxLon},${BBOX.maxLat}`);
  if (!process.argv.includes('--no-utm-test')) {
    const t = utmSelfTest();
    if (!t.ok) { console.error('La prueba UTM falló; no se escribe el basemap.'); process.exit(1); }
  }
  if (!OFFLINE) download();
  const metaFile = path.join(RAW, 'meta.json');
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : { date: new Date().toISOString(), requests: 0 };
  const b = build();
  sortItems(b.items);
  for (const it of b.items) {
    it.p = dpSimplify(it.p, it.layer === 'building' || it.layer === 'water' || it.layer === 'landuse');
    // precisión final de 0.1 m (≪ tolerancia de 0.8 m); se descartan vértices consecutivos repetidos por el redondeo
    const q = it.p.map(v => [Math.round(v[0] * 10) / 10, Math.round(v[1] * 10) / 10]);
    it.p = q.filter((v, k) => k === 0 || v[0] !== q[k - 1][0] || v[1] !== q[k - 1][1]);
  }
  const out = serialize(b.items, meta);
  const bytes = Buffer.byteLength(out);
  const miss = checkInvariants(b.items);
  if (miss.length) { console.error('Faltan elementos obligatorios: ' + miss.join(', ')); process.exit(1); }
  if (bytes > SIZE_TARGET) { console.error(`basemap ${bytes} bytes excede ${SIZE_TARGET}`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out);
  printStats(b.items, b, meta, bytes);
  console.log(`Escrito ${OUT}`);
}

module.exports = { toUTM, fromUTM, projectLonLat, utmSelfTest, ORIGIN };
if (require.main === module) main();
