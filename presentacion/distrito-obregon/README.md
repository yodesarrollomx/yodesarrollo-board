# Distrito Obregón · storyboard YOD-SB10

Etapa uno: guion visual para revisión. La presentación de producción, sincronización de audiencia y cierre comercial no se habilitan hasta recibir instrucción explícita sobre el guion corregido.

URL estable: https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/distrito-obregon/

## Fuente y narrativa

Propuesta Distrito Obregón Industrial, 19 octubre 2026, cinco páginas. Es un snapshot editorial autorizado de la propuesta; no reemplaza datos operativos de Sheets ni constituye un master plan. El código no contiene reuniones, mensajes, notas privadas ni condiciones de otros proyectos.

Diez escenas /40 momentos: ubicación, estrategia patrimonial, alianza, demanda BTS, retribuciones, complementos, capital, reglas, validación y decisión. La forma se traza desde la presentación conceptual original, no desde un levantamiento; la traza vial es OpenStreetMap con atribución. Hairline aporta el kernel geométrico MIT existente en YOD. `story.js` conserva guion, fuente por página, cautelas, dibujo y transición de cada escena. La geografía de las láminas de terreno vive en `basemap.js` (traza OSM), `parcel.js` (contorno), `map-labels.js` (rótulos), `territory.js` (dibujo del territorio) y `map-source.md` (procedencia y límites); `geography.js` se eliminó en SB07.

La auditoría del guion usa las seis funciones narrativas explicadas por Luis Ramos en su resumen de Donald Miller: https://www.youtube.com/watch?v=06iMqtU_xwM. Transcripción en español consultada mediante vidIQ. No se ha inspeccionado el video generado en NotebookLM ni se atribuyen a ese video movimientos visuales no observados. Los colores expresan funciones del mensaje; los activos se distinguen por forma y rótulo.

`drawings.js` monta una escena SVG persistente e interpola las posiciones y escalas de los mismos objetos al pasar de una escena a otra. La nave no se destruye al cambiar de lámina. Avance determinista/reversible, rotor lateral y slider. Retrato, horizontal y escritorio con encuadres propios. Movimiento reducido conserva la navegación manual.

## Acceso y revisión

Entrada pública; sólo contenido autorizado. Acceso explícito desde el Portero YOD existente. `access.js` comprueba canje fresco, sesión actual, rol y cuenta de Dirección; un rol en caché no habilita la UI. La autorización final de escritura permanece en Sala; no se ha cambiado su ACL.

`reviews.js` reutiliza YODChinche, la base `yodChinche` y el sobre privado `YodPinDelivery` a Sala. El ID, captura, versión, escena y guion viajan juntos. Recibida exige lectura del ID y huella en Sala. Un POST ambiguo no se repite. Guardado local, recibido, corregido y aprobado son estados diferentes. No se crea cron ni se promete una cadencia nueva.

Una edición de guion se registra como corrección privada; no modifica directamente el snapshot público ni una celda del modelo. La corrección revisada se aplica por PR conservando versión.

## Pruebas y límites

- `node --test tests/brokers-pin-delivery.test.cjs`: contrato de entrega existente, 16 casos.
- `node tests/obregon-storyboard-browser.cjs`: Chromium; red simulada, acceso anónimo, caché de rol no confiable, rol denegado, guardado/captura, recibo tras perder respuesta, recarga sin duplicado, objetos persistentes, extremos del rotor y tres viewports.
- Prueba real de Google con la cuenta del propietario y dictado en iPhone físico pendientes de aceptación. No se escriben registros sintéticos en producción.
- Historial local filtrado por cuenta/proyecto/navegador. No es un lector central completo de revisiones entre dispositivos.
- No hay nuevo servicio, hoja, backend ni dependencia de compilación. El transporte compartido sólo añade causas legibles de espera; no modifica su protocolo ni permisos.

Atlas: CHG-PRESENTATION-STORYBOARD-GITHUB-20261019. Reversión: revertir frontend por PR, sin eliminar registros, capturas ni versiones.

## Recuperación SB05

Verificación Portero single-flight por credencial; outbox al entrar, volver, reconectar y cada60s con página visible. Solicitudes Sala con plazo60s; no se confunde esta cadencia con un editor automático. Estado visible arriba e historial privado accesible. Se conserva ID, captura y original de versiones anteriores. Pruebas de conexión fallida antes de POST, recarga con entrega automática y verificaciones concurrentes añadidas.

Sonda real de Sala 39300005312: contrato disponible con rol agente; no acredita canje Google del dueño ni recibo de sus notas. El circuito conserva el último recibo confirmado y no reenvía POST ambiguos. La lectura actual de Sala expone30 registros recientes; una nota antigua fuera de esa ventana requiere conciliación central y no se marca falsamente recibida.

## SB06 · Diagramas con significado y asociación

La instrucción vigente de Alejandro es **formalizar la asociación**. Sustituye el cierre limitado a carta de intención del PDF, sin dar por acordados porcentajes, honorarios, valuaciones o garantías. El cierre muestra aportaciones, modalidades tierra/tierra más capital, términos por cerrar y ruta de firma. Las respuestas del cierre son guion revisable; no registran aceptación contractual.

`meaning.js` construye gramáticas distintas: bifurcación patrimonial, red de responsabilidades, requisitos que dimensionan la nave, flujos separados de rentas/honorarios, necesidad-producto, aportaciones A/B, compartimentos de obligaciones, secuencia de firma y acuerdo de asociación. Hairline se usa donde la forma de una nave aporta significado. Cada escena declara qué debe entenderse.

La guía visible explica seis funciones, sus preguntas de evaluación y el contexto neutro. Cada momento del guion tiene función propia. No se obliga a usar seis colores en cada escena ni se trata su cantidad como calificación. La oferta tiene chinche privada y conserva el transporte de SB05. Pruebas añadidas: guía accesible en horizontal, cierre de asociación y visibilidad completa del último momento.

## SB07 · Terreno sobre traza y estrategia explicada

**Origen.** Corrección privada de Dirección sobre la lámina de terreno: pidió traza urbana real, calle de frente y de atrás, morfología, explicación de BTS y complementos para pantalla grande. La nota no se copia aquí.

**Cartografía.** `basemap.js` empaqueta OpenStreetMap (© OpenStreetMap contributors, ODbL) georreferenciado en UTM 12N, extracción del 29-oct-2026. Se genera con `scripts/prepare-obregon-map.cjs` (reproducible con `--offline`, resultado idéntico byte a byte) con presupuesto de 200 KB o menos. No hay teselas ni servicios en línea en ejecución. Procedencia, ejes, simplificación y límites: [map-source.md](map-source.md).

**Contorno (caso conceptual, sin KMZ).** `parcel.js` usa la forma de la presentación conceptual escalada a 247,584 m² y colocada por búsqueda restringida: frente a 60 m o menos de la Federal 15, sin cruzar autopista ni vía férrea. Cruza ≈647 m de calles de OSM (Calle Cereza 308 m, Calle Piña 83, Calle Mandarina 74, otras menores y un servicio sin nombre). Por eso se rotula "forma conceptual · posición aproximada": no son linderos ni deslinde. Colindancias según OSM: frente Federal 15 / MEX 15D; poniente Calle Valle Colorado; oriente Calle Raigoza. Que la autopista sea de cuota no acredita acceso de carga.

**Cómo pasar al KMZ.** `node scripts/prepare-obregon-parcel.cjs --kml doc.kml` lee solo las coordenadas del primer Polygon (nunca la descripción ni nombres) y marca `status:"kmz"`; el área calculada se reporta sin ajustar. No se publica el KMZ ni su descripción. Publicar los vértices reales requiere autorización de Alejandro. Con el contorno real, la cautela y el texto hablado de la forma necesitan redacción autorizada antes de cambiarse.

**Escena patrimonio.** Define BTS (Built-To-Suit) y muestra la cadena empresa, nave, contrato de arrendamiento y rentas a largo plazo, con los propietarios conservando el inmueble. Presenta cinco complementos con su necesidad y, en pantalla grande, ejemplos tomados de la presentación conceptual. Sin cuadro de áreas ni porcentajes: no es lotificación ni cabida.

**Textos tomados de la presentación conceptual.** Las flechas «← Hermosillo» y «Navojoa →» en el mapa, la línea «Patios de maniobra · andenes · infraestructura para gran escala» bajo Built-To-Suit y las terceras líneas de los complementos (por ejemplo «Restaurantes · bancos · cafetería · farmacia · conveniencia») provienen de `assets/concepto-fuente.webp`. Se incluyen como material complementario, sujeto al visto bueno de Dirección al revisar la chinche; no están en el guion hablado. Las terceras líneas de complementos solo se muestran en pantalla grande.

**Pruebas.** `tests/obregon-storyboard-browser.cjs` añade comprobaciones de traza, contorno, rótulos y solapamiento de textos, con red simulada. Verificación local de sintaxis y `git diff --check`; no demuestran funcionamiento en producción.

**Pendientes (no son pruebas).**
- KMZ del terreno y regeneración de `parcel.js`.
- Autorización de Alejandro para publicar vértices reales.
- Prueba en pantalla real de 80".
- Aceptación de la chinche #347 por Dirección.

## SB08 · Integrantes y retribución

**Origen.** Chinche #348 de Dirección sobre las láminas «Quién lo articula» (`participacion`, escena 3) y «Cómo se retribuye» (`retribucion`, escena 5). No se cambió ningún texto hablado (`spoken`, `narration`, `title`, `beats`, `caution`); solo `change`, `draw`, `motion`, `visualMeaning` y `version` de esas dos escenas.

**Red de integrantes (`network.js`).** Propietarios → alianza (tres miembros) → especialistas por seleccionar (ocho categorías, en línea punteada: estructurador financiero, valuador, legal o fiscal, constructora, operador y similares, sin nombres de empresas). Cada nodo lleva `data-node` y `data-status` (`alianza`, `por-seleccionar`, `por-confirmar`, `por-prospectar`); los íconos de caja `data-icon` y las líneas `data-link`. El cierre dice que la familia trata con una sola coordinación. Los miembros se muestran solo por nombre: `SHOW_MEMBER_ROLES=false` oculta las frases de aporte hasta que Dirección las apruebe. Avermont Real Estate no aparece mientras Dirección no confirme su rol.

**Tabla de flujos (`flows.js`).** Cinco filas (`data-flow`: renta, colocación, gerencia, especialistas, complementos) con quién lo origina, cuándo se genera, qué concepto y quién lo recibe. Columna «lo recibe», no «lo paga». Sin cifras, porcentajes, tarifas ni cascadas; la cautela «Sin porcentajes ni tarifas acordados» está visible en todos los pasos.

**Íconos (`icons.js`).** Tabler Icons 3.24.0 (outline, MIT, © Paweł Kuna), el mismo estilo de línea de la barra lateral de YOD OS. Las rutas son copia literal de los SVG originales; la licencia va en la cabecera del archivo. `diagram-kit.js` agrupa los primitivos de dibujo que antes vivían en `meaning.js`.

**Pruebas.** `tests/obregon-storyboard-browser.cjs` añade para las escenas 3 y 5: 11 nodos, 3 de la alianza y al menos 6 por seleccionar; 5 flujos; cautela en los pasos 1 a 4; ausencia de cifras (`/\d\s*%|\$\s*\d|MXN|USD|\d{2,}\s*(años|meses)/`); y solapamiento de textos, cajas de íconos y líneas. La versión esperada la fija la constante `VERSION` de la prueba.

**Pendientes de Dirección (Q1–Q7).**
- Q1: si Avermont Real Estate forma parte de la alianza en Obregón y con qué rol.
- Q2: aprobación de las frases públicas del aporte de cada miembro.
- Q3: qué mostrar del sistema de seguimiento y reportes de YOD.
- Q4: qué especialistas pueden pasar de «por seleccionar» a nombrarse, con permiso para publicarlos.
- Q5: quién paga y quién recibe la colocación, y si puede decirse en la lámina.
- Q6: si la gerencia y estructuración la presta la alianza completa o un integrante.
- Q7: si los íconos Tabler son el «estilo de logos» pedido en la chinche #351.

Revisión visual y aceptación de la chinche #348 por Dirección pendientes.

## SB09 · Por qué un distrito

**Origen.** Chinche #349 de Dirección sobre la lámina «Por qué un distrito» (`complementos`, escena 6 de 10, índice 5): «Entiendo los números, pero no tiene mucha lógica». La versión anterior era una tabla genérica «De la necesidad al producto», sin la operación que genera las necesidades, sin criterio para confiar y sin siguiente paso. No se cambió ningún texto hablado (`spoken`, `narration`, `title`, `beats`, `caution`); solo `change`, `draw`, `motion`, `visualMeaning`, `understand` y `version` de esa escena.

**Qué responde.** `patrimonio` responde «qué es cada negocio»; `complementos` responde «por qué existiría cada uno y cómo se decide si se hace». No repite los ejemplos del catálogo de `patrimonio`.

**Cadena.** Operación industrial (la nave) → cinco necesidades → cinco productos que podrían responder → mismo filtro de estudios (demanda, operador, viabilidad) → ruta por producto y asociación propia → siguiente paso. Llenar el terreno de productos aparece tachado como la alternativa descartada. `districts.js` dibuja la escena (`complementos(m)`, desktop y móvil) y `meaning.js` solo delega en él. Las figuras Hairline de la nave y de los cinco productos son los mismos objetos persistentes de `patrimonio`; `drawings.js` los coloca y en móvil los oculta.

Marcas para revisión: `data-need` (servicios, reuniones, visitas, encuentros, pequenas), `data-product` (plaza, office, hotel, club, pocket), `data-gate`, `data-route`, `data-next`, `data-strike`, `data-icon` y `data-link`.

**Mapeo al Método YOD v3.0.0.**

| Regla del Método | Cómo se aplica |
|---|---|
| Una escena responde una pregunta de la audiencia | «¿Por qué desarrollar algo además de las naves, y cómo sabremos cuál conviene?» |
| Un mensaje por paso | 1 la operación trae necesidades · 2 dos respuestas para quienes trabajan ahí · 3 tres más, que no tienen que ir juntas · 4 todos pasan el mismo filtro y el siguiente paso es estudiar |
| El objeto antes que la etiqueta | La nave aparece primero; después las líneas y los textos de las necesidades. Cada producto es una figura con su propio nombre y su propia línea, sin llave que los agrupe |
| Un color por función | Necesidad = problema, producto = solución, filtro y ruta = plan, siguiente paso = acción (único texto verde de la escena) |
| Razones para confiar | Cada negocio debe mostrar demanda, operador y viabilidad antes de comprometer tierra o capital |
| Reducir esfuerzo e incertidumbre | No todos se desarrollan juntos ni bajo el mismo modelo; la asociación se define para ese negocio |
| Siguiente paso | «Estudiar demanda, operador y viabilidad de cada producto» |

**Íconos (`icons.js`).** Ocho nuevos de Tabler Icons 3.24.0, copia literal: `tools-kitchen-2`, `presentation`, `luggage`, `package`, `chart-line`, `calculator`, `file-search` y `arrows-split`.

**Sin cifras nuevas.** Ni porcentajes, montos, plazos ni superficies; la única cifra es «250 a 500 m²» de las bodegas pocket, ya presente en el guion.

**Pruebas.** `tests/obregon-storyboard-browser.cjs` añade para la escena 5: cinco `[data-need]` y cinco `[data-product]`, presencia de filtro, ruta y siguiente paso, un solo texto «Siguiente paso»; productos con opacidad menor a .1 en el paso 1; ausencia de porcentajes, montos y de la superficie del terreno; opacidad de la nave y de las figuras por paso (en móvil las cinco figuras ocultas); y solapamiento de textos, íconos y líneas en los pasos 1 a 4 (el tachado solo se ignora contra su propio texto). Versión esperada: SB09. Verificación local de sintaxis y `git diff --check`; no demuestran funcionamiento en producción.

**Pendientes (no son pruebas).**
- Título opcional: «La industria crea necesidades alrededor.» afirma una causalidad que no se ha medido; se propone «Otros negocios, sólo si la operación los necesita.». No se aplica sin visto bueno de Dirección.
- Hotel: «Hotel de negocios» (guion) frente a «Hotel de cadena comercial» (lámina conceptual). Se usa el del guion.
- Estudio de mercado: si hay uno cotizado o en curso que pueda nombrarse como siguiente paso (quién y cuándo, sin montos). Mientras tanto, «estudio por producto».
- Ejemplos de la lámina conceptual en `patrimonio` («restaurantes, bancos…», «gimnasio, alberca…»): decidir si se quitan o se aprueban como texto público.
- Revisión visual y aceptación de la chinche #349 por Dirección.

## SB10 · Capital y piel del proyecto

**Origen.** Chinche #350 de Dirección sobre la lámina «Qué aporta cada quien» (`capital`, escena 7 de 10, índice 6). La versión anterior eran dos columnas de rótulos en cajas: no dibujaba terreno ni efectivo y no mostraba quién recibe qué. No se cambió ningún texto hablado (`spoken`, `narration`, `title`, `beats`, `caution`); solo `change`, `draw`, `motion`, `visualMeaning`, `understand` y `version` de esa escena.

**Fórmula del guion (sin cifras).** Suelo valuado + trabajo desarrollador + capital → modelo → honorarios, participación y reglas. `capital.js` dibuja la escena (`capital(m)`, desktop y móvil) y `meaning.js` solo delega en él.

**Pasos.**

| Paso | Mensaje |
|---|---|
| 1 · El suelo tiene un valor que reconocer | El terreno (objeto persistente `land`) llega como protagonista y se valúa; suelo, trabajo y riesgo son tres valores distintos y una sola cifra no los mezcla |
| 2 · A · Aportar tierra | El terreno baja a la fila A: suelo + trabajo + capital por conseguir → modelo. Se ve qué recibe cada parte |
| 3 · B · Aportar tierra y efectivo | La fila B repite A con el efectivo de ustedes, reconocido por separado. Una llave marca la única diferencia: quién pone el efectivo |
| 4 · Del modelo a los derechos económicos | Los dos modelos convergen en la fórmula; primero se modela y después se pacta. Único texto verde: «Un negocio entendible antes de comprometerlo.» |

Una etiqueta de contexto siempre visible recuerda que aplica a los negocios complementarios y que las naves BTS siguen siendo patrimonio de la familia. El nombre del equipo queda como «Yo Desarrollo».

Marcas para revisión: `data-row` (A, B), `data-gives` (suelo, trabajo, capital, modelo), `data-receives` (ustedes, equipo), `data-formula`, `data-until`, `data-icon` y `data-link`.

**Reveal inverso.** `reveal()` acepta `data-until="n"`: el elemento se desvanece cuando el progreso local de la escena pasa de `n` (opaco hasta `n`, oculto desde `n + 0.2`). Se combina por producto con `data-reveal`. Lo del paso 1 sale así antes de que el terreno llegue a la fila A.

**Textos pendientes de visto bueno de Dirección.** Están detrás de constantes en `capital.js`, apagadas (`false`), y mientras tanto se muestra el texto público:

| Constante | Texto público actual | Texto propuesto |
|---|---|---|
| `VB_VALUACION` (VB-1) | Valuación acordada entre las partes | Por peritos independientes aceptados por la banca |
| `VB_SPONSOR` (VB-2) | por producto o fase | honorarios preferentes y participación si se superan metas pactadas |

**Sin cifras.** Ni porcentajes, montos, «50/50», tasas ni plazos; el dibujo compara aportaciones.

**Íconos (`icons.js`).** Siete nuevos de Tabler Icons 3.24.0, copia literal: `certificate`, `map-2`, `alert-triangle`, `math-function`, `equal-not`, `coins` y `file-analytics`.

**Piel del proyecto (opcional y reversible).** `body.skin-obregon` en `index.html` aplica con CSS el navy `#052543` y el cobre `#9b6036` de la lámina conceptual: encabezado, línea superior del escenario, títulos de escena, siluetas Hairline, contorno del predio en `ubicacion` (cobre), slider y botones. No toca los colores con función (`K.*`, paleta de 6), el mapa base ni las figuras de producto. Quitar la clase del `<body>` revierte todo; no hay JavaScript de por medio.

**Revisión escena por escena (siguientes).**

| Prioridad | Escena | Defecto | Dirección |
|---|---|---|---|
| 1 | `capital` (6) | Rótulos en cajas | Hecha en SB10 |
| 2 | `validacion` (8) | Lista numerada de texto, buena parte de la pantalla vacía | Escalera con objetos, uno por peldaño: título y superficies, modelo y reglas, convenio firmado, nave por fases; el último peldaño lleva el siguiente paso |
| 3 | `decision` (9) | Dos columnas de rótulos | Mesa de acuerdo: lado familia y lado alianza se juntan en el convenio; selector A/B visible y cierre «¿Avanzamos a formalizar?» |
| 4 | `reglas` (7) | Por revisar | Compartimentos con objetos: naves frente a complementos y compuerta de facultades |
| — | `ubicacion`, `patrimonio`, `participacion`, `retribucion`, `complementos` | Ya rehechas (SB07 a SB09) | Solo la piel |

**Preguntas abiertas.**
- Q1: colores del cliente (navy y cobre de la lámina conceptual, u otra paleta) y si BTS y complementos se distinguen por forma o trama en lugar del violeta.
- Q2: cómo debe nombrarse al equipo en la lámina; mientras tanto, «Yo Desarrollo».
- Q3: VB-1, si puede decirse en público «valuación por peritos independientes aceptados por la banca».
- Q4: VB-2, si puede decirse que en B el equipo cobra honorarios preferentes y participación si se superan metas pactadas (sin cifras ni umbrales).
- Q5: qué parte de lo platicado se cuenta en público; hoy no está en el guion.
- Q6: orden de la revisión: `capital`, `validacion`, `decision`.

**Pruebas.** `tests/obregon-storyboard-browser.cjs` añade para la escena 6: el terreno como héroe en 24.0 y 24.6 (opacidad y escala) y en la fila A en 25.0, mismo nodo; en el paso 4, filas A y B con cuatro aportaciones cada una, cuatro «recibe», fórmula y un solo texto en el color de acción; lo marcado con `data-until` se ve al inicio y desaparece; ausencia de porcentajes, montos y «50/50»; solapamiento de textos, íconos y líneas en los pasos 1 a 4; y la piel (título en `rgb(5, 37, 67)` con la clase y en la tinta anterior sin ella, sin residuos). Versión esperada: SB10. Verificación local de sintaxis y `git diff --check`; no demuestran funcionamiento en producción.

**Pendientes (no son pruebas).** Revisión visual y aceptación de la chinche #350 por Dirección; respuestas a Q1 a Q6.
