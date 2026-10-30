/*
 * Íconos Tabler Icons (estilo outline), versión 3.24.0.
 * Fuente: https://github.com/tabler/tabler-icons (paquete @tabler/icons@3.24.0).
 * Las rutas de abajo son copia literal del atributo d de cada SVG original;
 * se omite solo el trazo de relleno transparente (stroke="none") de cada archivo.
 *
 * MIT License
 *
 * Copyright (c) 2020-2024 Paweł Kuna
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Convención: icon(name, x, y, size, color) devuelve un <g> de SVG cuyo centro
// queda en (x, y). La cuadrícula original es de 24 x 24; el grupo se traslada
// a (x - size/2, y - size/2) y se escala size/24. Trazo de 2 unidades de la
// cuadrícula, extremos y uniones redondeados, sin relleno; el color se aplica
// al trazo (por defecto currentColor).
const PATHS={
 'users-group':[
  'M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0',
  'M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1',
  'M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0',
  'M17 10h2a2 2 0 0 1 2 2v1',
  'M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0',
  'M3 13v-1a2 2 0 0 1 2 -2h2'
 ],
 'chart-arrows':[
  'M3 18l14 0',
  'M9 9l3 3l-3 3',
  'M14 15l3 3l-3 3',
  'M3 3l0 18',
  'M3 12l9 0',
  'M18 3l3 3l-3 3',
  'M3 6l18 0'
 ],
 'ruler-2':[
  'M17 3l4 4l-14 14l-4 -4z',
  'M16 7l-1.5 -1.5',
  'M13 10l-1.5 -1.5',
  'M10 13l-1.5 -1.5',
  'M7 16l-1.5 -1.5'
 ],
 'heart-handshake':[
  'M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572',
  'M12 6l-3.293 3.293a1 1 0 0 0 0 1.414l.543 .543c.69 .69 1.81 .69 2.5 0l1 -1a3.182 3.182 0 0 1 4.5 0l2.25 2.25',
  'M12.5 15.5l2 2',
  'M15 13l2 2'
 ],
 'user-search':[
  'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0',
  'M6 21v-2a4 4 0 0 1 4 -4h1.5',
  'M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  'M20.2 20.2l1.8 1.8'
 ],
 'building-store':[
  'M3 21l18 0',
  'M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4',
  'M5 21l0 -10.15',
  'M19 21l0 -10.15',
  'M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4'
 ],
 'building-bank':[
  'M3 21l18 0',
  'M3 10l18 0',
  'M5 6l7 -3l7 3',
  'M4 10l0 11',
  'M20 10l0 11',
  'M8 14l0 3',
  'M12 14l0 3',
  'M16 14l0 3'
 ],
 'building':[
  'M3 21l18 0',
  'M9 8l1 0',
  'M9 12l1 0',
  'M9 16l1 0',
  'M14 8l1 0',
  'M14 12l1 0',
  'M14 16l1 0',
  'M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16'
 ],
 'scale':[
  'M7 20l10 0',
  'M6 6l6 -1l6 1',
  'M12 3l0 17',
  'M9 12l-3 -6l-3 6a3 3 0 0 0 6 0',
  'M21 12l-3 -6l-3 6a3 3 0 0 0 6 0'
 ],
 'license':[
  'M15 21h-9a3 3 0 0 1 -3 -3v-1h10v2a2 2 0 0 0 4 0v-14a2 2 0 1 1 2 2h-2m2 -4h-11a3 3 0 0 0 -3 3v11',
  'M9 7l4 0',
  'M9 11l4 0'
 ],
 'crane':[
  'M6 21h6',
  'M9 21v-18l-6 6h18',
  'M9 3l10 6',
  'M17 9v4a2 2 0 1 1 -2 2'
 ],
 'tools':[
  'M3 21h4l13 -13a1.5 1.5 0 0 0 -4 -4l-13 13v4',
  'M14.5 5.5l4 4',
  'M12 8l-5 -5l-4 4l5 5',
  'M7 8l-1.5 1.5',
  'M16 12l5 5l-4 4l-5 -5',
  'M16 17l-1.5 1.5'
 ],
 'building-warehouse':[
  'M3 21v-13l9 -4l9 4v13',
  'M13 13h4v8h-10v-6h6',
  'M13 21v-9a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v3'
 ],
 'file-certificate':[
  'M14 3v4a1 1 0 0 0 1 1h4',
  'M5 8v-3a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-5',
  'M6 14m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  'M4.5 17l-1.5 5l3 -1.5l3 1.5l-1.5 -5'
 ],
 'cash':[
  'M7 9m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z',
  'M14 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  'M17 9v-2a2 2 0 0 0 -2 -2h-10a2 2 0 0 0 -2 2v6a2 2 0 0 0 2 2h2'
 ],
 'receipt':[
  'M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2m4 -14h6m-6 4h6m-2 4h2'
 ],
 'clipboard-check':[
  'M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2',
  'M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z',
  'M9 14l2 2l4 -4'
 ],
 'building-community':[
  'M8 9l5 5v7h-5v-4m0 4h-5v-7l5 -5m1 1v-6a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v17h-8',
  'M13 7l0 .01',
  'M17 7l0 .01',
  'M17 11l0 .01',
  'M17 15l0 .01'
 ],
 'wall':[
  'M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z',
  'M4 8h16',
  'M20 12h-16',
  'M4 16h16',
  'M9 4v4',
  'M14 8v4',
  'M8 12v4',
  'M16 12v4',
  'M11 16v4'
 ],
 'user-check':[
  'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0',
  'M6 21v-2a4 4 0 0 1 4 -4h4',
  'M15 19l2 2l4 -4'
 ]
};

export const iconNames=Object.freeze(Object.keys(PATHS));

const num=n=>String(+n.toFixed(3));
const attr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

export function icon(name,x,y,size=24,color='currentColor'){
 if(!Object.prototype.hasOwnProperty.call(PATHS,name))throw new Error(`Ícono desconocido: ${name}`);
 if(![x,y,size].every(Number.isFinite))throw new Error('icon: x, y y size deben ser números finitos');
 const tx=num(x-size/2),ty=num(y-size/2),k=num(size/24);
 return `<g transform="translate(${tx},${ty}) scale(${k})" fill="none" stroke="${attr(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name].map(d=>`<path d="${d}"/>`).join('')}</g>`;
}
