# Replanteamiento comercial · offer-4

Journey-3 fue rechazado por Dirección después de presentarlo: la audiencia no comprendió el negocio. La evidencia técnica anterior no acredita aceptación comercial.

Se conserva la interfaz aceptada, gesto iPhone, marca, chinches, originales y evaluador. Se rehace la representación para nombrar oferta, costos, aportaciones, ejecución y salida. Los textos proceden de journey_offer, clave adicional en el Sheet vigente; atlas_config se conserva íntegro. No se alteran permisos, backend, precios ni condiciones de inversión.

La aprobación del guion es distinta de la aprobación visual y funcional. El guion pasó de 9.1 a 9.6; la comunicación comercial en pantallas obtuvo 9.5. Diseño pasó de 8.0 a 8.9 y después 9.5 tras corregir decisiones y eliminar colisiones durante transformaciones. Son auditorías internas con criterios inspirados en claridad de oferta y diseño, no revisión ni aval personal de Alex Hormozi o Chris Do. La revisión de experiencia comenzó únicamente después de superar ambas puertas.

Nuevo arte separado en offer-art.js/css, con delegación al renderer anterior cuando la fuente no contiene offer-4. La narrativa completa, fuentes y borradores siguen en el lector. El nuevo copy no reside en Git. El mapa conserva fuente y atribución; inmueble y transformaciones son ilustrativos.

Validación: tests/offer-review-browser.cjs produce quince capturas y prueba gesto, reversa, pausa, fuente, diálogos y CTA en WebKit/Chromium. Los problemas de layout se revisan junto con imágenes. La publicación requiere las puertas creativas y regresión técnica. Los recibos de ejecución y publicación se conservan en GitHub Actions y en la bitácora existente.

## Lectura e interacción

El inmueble mantiene su identidad al avanzar y retroceder. Los rótulos se retiran antes de moverlo y regresan al terminar la transformación. Al finalizar un gesto, la superficie se asienta en 140 ms en el punto de lectura más cercano a la entrada del usuario; no encadena etapas. Un toque nuevo, menú, pausa o pérdida de foco cancela el asentamiento. Con movimiento reducido, el ajuste es inmediato. La búsqueda programática de un intermedio permanece exacta para revisión.

La auditoría de experiencia detectó pausas sin relaciones visibles y contraste insuficiente (8.7). La siguiente revisión confirmó su corrección, incluidos gesto rápido y reversa, menú, lector y alternativas de compartir/copiar (9.3). La última corrección incorpora posición visible, archivo histórico agrupado y atribución exclusiva del mapa. Las puntuaciones son revisiones internas de artefactos y pruebas, no resultados de un estudio con clientes.

Evidencia de interacción y contraste: run39045148699, Chromium/WebKit, 131 estados por motor y 33 puntos transicionales adicionales, dos sentidos de gesto rápido, asentamiento interrumpible, botones reales de menú/lector/contacto y alternativas de copiar/compartir. Contraste secundario5.56:1 y acento textual5.12:1. Las pruebas no envían mensajes ni escriben datos reales de negocio. No se afirma validación con iPhone físico, VoiceOver o la hoja nativa de compartir.

Rollback del frontend mediante PR; conservar fuentes editoriales, chinches y registros de negocio.

---

## Referencia anterior conservada

# Presentación pública · storyboard continuo

Revisión journey-3. Dirección autoriza ejecutar el storyboard en la URL existente y conservar la interfaz móvil aprobada. La narrativa anterior se conserva como borrador.

## Recorrido y continuidad

1. Invitación a participar con capital. Vialidades reales de Hermosillo.
2. Ciudad, zonas de búsqueda y manzana. Transición declarada a inmueble ilustrativo.
3. El mismo frente y acceso permiten abrir la construcción, explicar circulación y explorar un producto.
4. Planta a volumen; comparación con otra alternativa y cuenta residual del inmueble, sin números o ganadores inventados.
5. Incorporación por compra o aportación; relación entre inmueble, capital y dirección.
6. Condiciones antes de comprometer, construcción dirigida y paso de vivienda a documentación y cobro.
7. Expediente de participación y llamada a conversación; acceso secundario al evaluador existente.

El SVG conserva un inmueble y su planta en el DOM durante los quince momentos. Las posiciones, cámara y capas dependen sólo del progreso; retroceder recorre las mismas transformaciones. No hay autoplay ni reemplazo de diagrama en fronteras. El gesto de iPhone, cabecera, chinches, lector y controles existentes se conservan.

## Fuentes y alcance

Contenido editorial desde journeyFilm aditivo en la misma celda del Sheet vigente. journeyNext, journey y las escenas originales se preservan y permanecen disponibles en el lector. El consumidor anterior ignora el campo aditivo. No se modifican backend, permisos, precios, acuerdos ni evaluador. Este cambio es editorial y de representación dentro del contrato actual CHG-INVESTOR-INTENT-STORY, sin nueva arquitectura.

Cartografía de OpenStreetMap atribuida; zonas ilustrativas, no zonificación ni demanda comprobada. El inmueble conceptual no se presenta como propiedad localizada o cabida autorizada. Sin proyectos, documentación privada, rendimientos, pipeline o condiciones de inversión en el repositorio.

## Validación y reversión

Pruebas de continuidad numérica, identidad SVG, fronteras sin saltos y reversibilidad exacta; regresión WebKit/Chromium en cinco tamaños, gesto, teclado, lector, chinches y cierre. Las integraciones de escritura se prueban con dobles. CI obtiene únicamente el contenido editorial público; no registra el payload.

La comprobación de Pages y fuente pública es posterior y separada. Emulación WebKit no equivale a prueba en iPhone físico ni a aceptación creativa del usuario.

Rollback mediante PR del frontend. Conservar datos editoriales, borradores, chinches, accesos y recibos. No cambiar credenciales ni reejecutar entregas de Sala.
