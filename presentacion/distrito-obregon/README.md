# Distrito Obregón · storyboard YOD-SB08

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

**Pruebas.** `tests/obregon-storyboard-browser.cjs` añade para las escenas 3 y 5: 11 nodos, 3 de la alianza y al menos 6 por seleccionar; 5 flujos; cautela en los pasos 1 a 4; ausencia de cifras (`/\d\s*%|\$\s*\d|MXN|USD|\d{2,}\s*(años|meses)/`); y solapamiento de textos, cajas de íconos y líneas. La versión esperada es YOD-SB08.

**Pendientes de Dirección (Q1–Q7).**
- Q1: si Avermont Real Estate forma parte de la alianza en Obregón y con qué rol.
- Q2: aprobación de las frases públicas del aporte de cada miembro.
- Q3: qué mostrar del sistema de seguimiento y reportes de YOD.
- Q4: qué especialistas pueden pasar de «por seleccionar» a nombrarse, con permiso para publicarlos.
- Q5: quién paga y quién recibe la colocación, y si puede decirse en la lámina.
- Q6: si la gerencia y estructuración la presta la alianza completa o un integrante.
- Q7: si los íconos Tabler son el «estilo de logos» pedido en la chinche #351.

Revisión visual y aceptación de la chinche #348 por Dirección pendientes.
