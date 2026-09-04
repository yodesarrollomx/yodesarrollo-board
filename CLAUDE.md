# Yodesarrollo Board — *Carpeta de Inversión* que se presenta a codesarrolladores

Contexto para Claude Code. Lee este archivo completo antes de tocar nada.
Escrito el 2026-09-04 a partir del código, el `git log`, `curl` a las URLs vivas y las memorias de `~/.claude/projects/-Users-a-/memory/`.

## Qué es
Tablero de presentación 1-a-1 para reuniones con inversionistas de **Yodesarrollo SAPI** (`README.md`). Se proyecta en pantalla y guía la conversación: carátula → dashboard de mosaicos → secciones (diagnóstico, comparativo, proyectos, calculadora, cronograma, decisión, acuerdo de pago). Lo usa Alejandro frente a un prospecto.

En el menú de YOD OS aparece como **«Codesarrolladores»** (memoria `board-oficial-resiliente`).

**Dirección viva** (comprobada por `curl` el 2026-09-04):
- `https://yodesarrollomx.github.io/yodesarrollo-board/` → **HTTP 200** ← la casa buena.
- `https://alexpueblag.github.io/yodesarrollo-board/` → HTTP 200 (cascarón que reenvía; commit `1946e3d`).
- `https://tableros.yodesarrollo.mx/yodesarrollo-board/` → **000, no resuelve**. El dominio propio todavía no existe en el DNS. No escribas esa liga como si funcionara.

Repo: `yodesarrollomx/yodesarrollo-board` (`git remote -v`). Clon local: `/Users/a./yodesarrollo-board`. Primer commit `64c3222` del 2026-05-17; último `acd6578` del 2026-09-02.

**NO confundir con `Co-desarrolladores-Yod`**, que es el portal privado de cada inversionista con su estado de cuenta (memoria `board-oficial-resiliente`). Los dos suenan igual. Si la pantalla dice «Carpeta de inversión · documento confidencial», es ESTE.

## Reglas INVIOLABLES
- **El Sheet manda.** Todo el contenido sale del Apps Script; `datos.enc` y lo escrito en `sections.jsx` son solo respaldo. Si difieren, gana el servidor (`data-loader.jsx` `fetchLive` → `fetchRespaldoLocal`).
- **Nunca borrar la credencial compartida del Portero** (`localStorage pyod_clave_v1`). Está escrito como REGLA DE ORO en `data-loader.jsx:162`: borrarla causaba el bucle de acceso que dejaba al equipo fuera de TODOS los tableros (commit `9b3c2fe`).
- **Nunca subir `datos.json` en claro.** Está en `.gitignore`. GitHub Pages lo servía a cualquiera con un `curl`: 8 proyectos, 47 lotes y los escalones de rendimiento, con pie de «documento confidencial» (commit `1b8f7c1`). Va cifrado en `datos.enc`.
- **Nunca commitear `apps-script/`.** También en `.gitignore` desde `fc6598d`: es el backend.
- **Bloque nuevo en `SecProyecto` = bloque nuevo también en `SecCasaAlysa` y `SecRealMiramar`.** Esas dos tienen sección propia heredada; por eso los botones de material desaparecieron sin que nadie los borrara (memoria `board-oficial-resiliente`, commit `e8ac676`). Mejor: componente compartido, como `MaterialDelProyecto`.
- **Bump del `?v=` en `index.html` al cambiar cualquier `.jsx`/`.css`.** El HTML se cachea con fuerza; sin bump se sigue sirviendo la versión anterior. Para verificar, entrar con `?fresh=1` (memoria `board-oficial-resiliente`).
- **Sin build.** React + Babel en el navegador. No meter frameworks ni pasos de compilación.
- **No cambiar precios ni cifras desde el código.** Van en el Sheet.

## Archivos
- `index.html` — entrada. `window.YDR_CONFIG` (URL del `/exec` + `datosRespaldo:"datos.enc"`), los `?v=` de cada asset, y al final `portero.js` + `shell.js` del YOD OS.
- `app.jsx` — 3 vistas (Cover → Dashboard → Section). `ICON_BY_ID` y `SECTION_BY_ID` (`app.jsx:7` y `:24`) mapean id de mosaico → componente. Los componentes React NO pueden vivir en el Sheet; los datos sí.
- `sections.jsx` — las secciones (105 KB, el archivo grande). Arriba: `linkArchivo()` (`:11`), `MATERIAL_LOCAL` (`:24`) y `matUrl()` (`:40`).
- `data-loader.jsx` — `useData`, `DataProvider`, caché, credencial, respaldo cifrado, `save()`.
- `edit-mode.jsx` — Modo Edición v1 (ver Decisiones).
- `lote-selector.jsx` / `.css` — selector de lotes de Real de Miramar.
- `styles.css` (tokens de tema), `styles-data.css`, `icons.jsx`, `tweaks-panel.jsx`.
- `datos.enc` — respaldo cifrado (AES-256-CBC, PBKDF2 SHA-256 200k; commit `1b8f7c1`). La frase NO está en el JS a propósito.
- `assets/material/` — 46 MB, 6 archivos (PDFs y video de Alysa, Miramar, Dunas). Ver Pendientes.
- `README.md` / `SETUP-GUIDE.md` — del arranque (2026-07-15). Útiles pero parcialmente desactualizados: ver Por confirmar.

## Arquitectura de datos

```
Google Sheet "Yodesarrollo-Board"  (id 11tkKgl4W3ugthjWh80ZxHfT_PXSH_rPbCVmwM9l3CeU
                                    — según memoria board-oficial-resiliente, no verificado aquí)
        │   Alejandro edita aquí. Nunca invertir la dirección.
        ▼
Apps Script /exec  (doGet ?k=<credencial> → JSON;  doPost → guarda)
  https://script.google.com/macros/s/AKfycbynq5JFU2AROO2gpOm6gbuedB_ZlwXoCej1eDO8rmXo63_QWnCBAy3_73il8NGc2u5N2Q/exec
  Comprobado 2026-09-04: HTTP 200 y sin credencial responde {"ok":false,"error":"liga","version":"3.0.0"}
        │
        ▼
data-loader.jsx  fetchLive()
  1. pinta YA la caché local (localStorage ydr_board_data_v1, TTL 5 min)
  2. revalida en segundo plano; si el servidor tarda >15 s reintenta UNA vez (commit 012e3d4)
  3. si falla → fetchRespaldoLocal() → datos.enc (se abre con la clave de equipo del Portero)
        │
        ▼
app.jsx / sections.jsx  (React 18.3.1 + Babel standalone desde unpkg)

Acceso:  portero.js  https://yodesarrollomx.github.io/potenciales-yod/portero.js  (HTTP 200, 2026-09-04)
         guarda la credencial en localStorage pyod_clave_v1 y el rol en sessionStorage pyod_rol.
         El backend valida del lado del servidor — el repo no trae secretos.

Escritura: save("save_diagnostico", {...}) → POST text/plain al mismo /exec
           (data-loader.jsx:423-430, llamado en sections.jsx:153). text/plain evita el preflight CORS.

Ediciones locales: localStorage ydr_overrides_v1 (Modo Edición v1) — NO tocan el Sheet.
```

**El repo es ESPEJO del backend.** El `Code.gs` que corre es el que está pegado en el editor de Apps Script, no un archivo de este repo (`apps-script/` está en `.gitignore` desde `fc6598d`). Antes de tocar el backend, pide el `Code.gs` VIVO del editor; tras cualquier cambio hay que publicar «Nueva versión» en Administrar implementaciones para que el `/exec` lo tome (regla de la casa, memoria `backend-vivo-no-es-el-repo`).

## Decisiones
- **2026-05-17 — Arranque.** App de una sola página, sin build, alimentada por Sheet + Apps Script, en GitHub Pages (`64c3222`, `README.md`). Porqué: cambiar copy y cifras sin tocar código ni redeployar.
- **2026-08-02 (Alejandro) — Código de colores tokenizado.** Los cremas hardcodeados eran ilegibles en tema claro; se pasó todo a tokens con bloque `[data-tema="claro"]` al final de `styles.css` (`1ef9a72`, memoria `ydb-codigo-colores`).
- **2026-08-03 (Alejandro) — Modo Edición v1.** Se edita EL DATO, no el DOM: clic en un valor → ancla legible del Sheet → override en `localStorage ydr_overrides_v1` (`c726180`, `edit-mode.jsx`). Botón visible solo si `sessionStorage pyod_rol` ∈ {direccion, comercial}. **Ese gating es solo de UI**; la validación real de rol va en el GAS en la v2 (memoria `ydb-modo-edicion`). Riesgo hoy: nulo, porque no escribe al Sheet.
- **2026-08-03 (corrección de Alejandro) — El cronograma es PROSPECTIVO.** El Mes 0 es cuando se PRESENTA la carpeta, no cuando arrancó la obra; por eso el eje se calcula y el default es el mes en curso (`648a73a`, `91be1e2`). Antes venía escrito a mano en el Sheet y envejecía.
- **2026-08-03 — Material local.** Con la cuenta de Google suspendida, los botones apuntan a `assets/material/` vía `MATERIAL_LOCAL`/`matUrl()` (`8afeb6d`). ~~Se revierte cuando vuelva la cuenta~~ — la cuenta ya se reactivó el 16-ago (memoria `google-workspace-reactivado-16ago`) y **la reversión sigue sin hacerse**: pasa a Pendientes. El fix de `linkArchivo()` (`4386c9c`) se queda pase lo que pase: arregla que el backend convierte todo `*_url` a miniatura lh3.
- **2026-08-04 (Alejandro) — PPP / Quiénes somos / Arquitectura de Autor viven SOLO en la franja «Ecosistema»**, no duplicados como chips (`8e493e9`). El PPP se rehizo como mini-landing con CTA medible (`7edd661`); las ligas llevan UTM: `?utm_source=yodesarrollo-board&utm_medium=presentacion&utm_campaign=board-ppp` (`sections.jsx:1695`) y `board-autor` (`sections.jsx:1932`). Porqué: distinguir lead de presentación vs lead de redes (memoria `yod-ligas-convencion`).
- **2026-08-05 — Modo resiliente.** Si el Apps Script no contesta, el tablero pinta su respaldo empacado y no se cae (`3988132`). Nació de la suspensión de Workspace del 3-ago.
- ~~**2026-08-27 — La casa es `tableros.yodesarrollo.mx`** (`176428d`).~~ **OBSOLETO desde 2026-09-01**: el DNS nunca existió. Manda `1946e3d`: los tableros viven en `yodesarrollomx.github.io` y la puerta vieja reenvía. Comprobado hoy: el dominio propio da 000.
- **2026-08-27 — El respaldo va cifrado.** `datos.json` en claro exponía 8 proyectos, 47 lotes y los rendimientos a un `curl` (`1b8f7c1`). La frase no se guarda en el JS: si estuviera, el cifrado sería decorativo.
- **2026-09-01 — Se quitó el `window.prompt()` del respaldo.** Bloqueaba el arranque pidiendo la clave; ahora avisa por consola y existe `window.YDR_abrirRespaldo("clave")` (`012e3d4`, `data-loader.jsx:350-356`).
- **2026-09-02 — El cuestionario Aurum se apunta a `aurumarquitectos.github.io/experiencia`** (`acd6578`). Ese repo vive fuera del tablero YOD y no se muda.

## Pendientes
- **Revertir el material local** — dueño: Alejandro decide, Claude ejecuta. La cuenta de Google ya volvió (16-ago) pero `MATERIAL_LOCAL` sigue puesto. Evidencia para cerrarlo: las ligas del Sheet (`presentacion_url`, `pdf_dossier_url`, `video_url`) abren el archivo real, y decisión suya sobre si se borran los 46 MB de `assets/material/` (receta completa en memoria `ydr-material-local-revertir`).
- **PDFs comerciales públicos** — dueño: Alejandro. Comprobado hoy con `curl`: `https://yodesarrollomx.github.io/yodesarrollo-board/assets/material/casa-alysa-presentacion.pdf` responde **HTTP 206** sin credencial. El respaldo se cifró, pero estos PDFs siguen en claro en un repo público. Evidencia para cerrarlo: o se borran del repo, o Alejandro dice por escrito que no le importa que sean públicos.
- **Modo Edición v2** — dueño: Claude, con el `Code.gs` vivo que solo Alejandro puede sacar del editor. Contrato ya definido: `save('editarCampo',{cambios:[{path,old,val,ts}]})` con validación de rol SERVER-side. Evidencia: un cambio hecho desde el board que aparezca en la celda del Sheet.
- **Tabs `ppp`, `quienes` y `autor` en el Sheet** — dueño: Alejandro. Hoy esas secciones caen al respaldo escrito en `sections.jsx`. Evidencia: el copy cambia editando el Sheet, sin tocar código (memoria `ydb-secciones-ppp-quienes`).
- **Modelo de precio del PPP** — dueño: Alejandro. La cifra que muestra la mini-landing NO está confirmada por él (memoria `ydb-secciones-ppp-quienes`). Evidencia: su confirmación explícita.
- **`normalizeValue_` del Apps Script** — dueño: Claude, cuando haya `Code.gs` vivo. Que solo convierta a miniatura lh3 las columnas de imagen; hoy `linkArchivo()` lo deshace del lado del cliente.

## Por confirmar (no lo afirmes hasta preguntar)
- **¿El `README.md` sigue vigente?** Describe una carpeta `apps-script/` dentro del repo (hoy en `.gitignore`), un `data.json` retirado y «27 pestañas» del Sheet. No pude verificar el número de pestañas. Pregunta: ¿se actualiza el README o se marca como histórico?
- **¿Qué pasó con `codesarrolladores-libre`?** La memoria `board-oficial-resiliente` lo da por vivo como copia sin candado; hoy `https://alexpueblag.github.io/codesarrolladores-libre/` responde **404**. Pregunta a Alejandro: ¿se archivó, se borró o se movió?
- **Id del Sheet.** El `11tkKgl4W3ug…` viene de memoria, no del código (el repo no trae el `Code.gs`). Confírmalo contra el editor de Apps Script antes de usarlo.
- **Ramas viejas en `origin`**: `respaldo-pre-migracion`, `respaldo-v3`, `agent/*`, `claude/*`, `fix/login-board-iv`, `dominio-propio`. Pregunta si ya se pueden borrar.
