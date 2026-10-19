# Distrito Obregón · storyboard YOD-SB04

Etapa uno: guion visual para revisión. La presentación de producción, sincronización de audiencia y cierre comercial no se habilitan hasta recibir instrucción explícita sobre el guion corregido.

URL estable: https://yodesarrollomx.github.io/yodesarrollo-board/presentacion/distrito-obregon/

## Fuente y narrativa

Propuesta Distrito Obregón Industrial, 19 octubre 2026, cinco páginas. Es un snapshot editorial autorizado de la propuesta; no reemplaza datos operativos de Sheets ni constituye un master plan. El código no contiene reuniones, mensajes, notas privadas ni condiciones de otros proyectos.

Ocho escenas: intención patrimonial, demanda BTS, beneficio y remuneración, asociación complementaria, aportaciones, gobierno, validación y decisión de estudio. `story.js` conserva guion, fuente por página, cautelas, dibujo y transición de cada escena.

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
- No hay nuevo servicio, hoja, backend ni dependencia de compilación. No se altera el resto de presentaciones.

Atlas: CHG-PRESENTATION-STORYBOARD-GITHUB-20261019. Reversión: revertir frontend por PR, sin eliminar registros, capturas ni versiones.
