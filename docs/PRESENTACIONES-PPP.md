# Presentaciones desde la versión vista del PPP

Esta implementación añade al board existente un visor privado y versiones de contenido generadas por el agente. La fuente financiera sigue siendo el PPP y su snapshot confirmado en servidor. El catálogo y la mesa Master Developer leen el mismo registro de Sala; no se crea otra biblioteca ni se incluyen expedientes en el catálogo estático.

## Identidad, almacenamiento y acceso

- `presentation_id` conserva la presentación y la dirección `/presentacion/ppp/?id=…`.
- `presentation_version_id` identifica una entrega editorial inmutable; `parent_version_id` conserva su relación con la entrega revisada.
- `revision` protege cambios concurrentes del registro. No es una revisión financiera ni una versión editorial. `releaseRevision` continúa reservado al contrato de publicación existente.
- Cada entrega conserva caso, PPP, escenario visto, revisión PPP, revisión del expediente, hash del snapshot, trabajo, método, renderer y recibo.
- `register_storyboard` requiere autorización del adaptador servidor, validación del guion y una creación atómica en el índice existente. Una sesión de Dirección en el navegador no concede autoridad de worker.
- Catálogo e inspección devuelven metadatos de versiones. `read_version` devuelve el cuerpo sólo a Dirección; las presentaciones generadas quedan fuera de lecturas públicas y de brokers, aunque un vínculo o una bandera se altere accidentalmente.

El adaptador ejecutable de Apps Script, almacenamiento y enrutado viven en [Sala, PR 372](https://github.com/yodesarrollomx/sala-edicion/pull/372). Sus espejos `PresentacionesDominio.gs` y `PresentacionesStoryboard.gs` corresponden a los contratos de este repositorio. El servicio de agente y la resolución de la fuente pertenecen a sus repositorios existentes. Tener estos archivos no acredita que el Apps Script publicado ni el worker productivo los ejecuten.

## Guion visual y producción

`storyboard-core.js` valida contenido sin código, HTML, URLs de medios ni primitivas arbitrarias proporcionadas por el agente. `storyboard.schema.json` documenta su forma; el normalizador además comprueba referencias, límites, IDs duplicados y pendientes sin importe. La validación estructural no acredita por sí sola que los valores procedan del snapshot: esa comparación corresponde al generador y al servidor.

El renderer usa el kernel Hairline MIT ya empleado en el board, copiado sin cambios a `presentacion/vendor/`. Dibuja terreno, edificio, unidad, capital, persona y documento. La composición responde a sitio, comparación, programa, flujo, fases o decisión, con un máximo de seis objetos persistentes por escena. Los objetos conservan sus IDs y se transforman entre escenas; el progreso determina revelado, posición y cámara, también al retroceder. Las cifras y condiciones permanecen en texto legible. Todo volumen y terreno del adaptador es esquemático: no sustituye levantamiento, avalúo, cálculo ni proyecto ejecutivo.

El visor ofrece slider, rotor relativo, teclado, saltos por nombre, orientación adaptada y menor movimiento. No contiene un caso real de demostración ni descarga un guion antes de verificar acceso. La revocación limpia dibujo, texto, historial y contexto del encargo; nunca borra la credencial compartida del Portero.

La primera entrega tiene `stage: storyboard`. Después de revisar una versión, «Autorizar etapa 2» registra la instrucción expresa y continúa mediante el agente:

1. `authorize_production` conserva autorización y recibo para la versión exacta.
2. El Portero existente intercambia la sesión por un token FAST temporal, limitado al caso. Sólo ese token se envía al endpoint de agente verificado; permanece en memoria.
3. `POST /presentations/produce` recibe los IDs de presentación, versión y autorización. El identificador `produce-<authorization_id>` se conserva entre pestañas y reintentos. IndexedDB guarda la identidad del encargo, nunca el token FAST.
4. `POST /presentations/status` recupera el trabajo al volver a abrir la tarjeta. Sólo se ofrece abrir la presentación cuando hay estado de revisión y recibo.
5. La entrega `stage: presentation` requiere autorización del mismo actor, padre storyboard y fuente idéntica. Una producción de V1 puede añadirse como V3 aunque exista V2; la revisión esperada sigue protegiendo el registro y V2 se conserva.

La presentación producida se abre en la misma dirección, con proyección del servidor que excluye audiencia interna, preguntas de revisión, texto hablado, referencias de fuente y hechos no dibujados. Condiciones y restricciones materiales se conservan. La proyección sigue siendo privada; producir no publica ni envía al cliente. Las operaciones públicas y sesiones del contrato anterior permanecen bloqueadas para estas nuevas presentaciones hasta implementar su publicación y permisos específicos.

## Chinches

La pantalla reutiliza `storyboard-reviews.js`, el bundle canónico de chinches 1.1.0 y `pin-delivery.js`. Sólo se inicializa después de verificar Dirección y abrir la versión. La captura conserva presentación, versión, escena, momento, progreso y fuente. La superficie `/ppp/` comparte ruta entre casos: Sala filtra también `presentation_id` para no mezclar sus revisiones. Guardado local, entrega pendiente y recepción con acuse mantienen estados distintos. No se certifica recepción real en Sala ni grabación física por las pruebas sintéticas.

## Comprobación y activación

Pruebas locales:

```sh
node --test tests/*.test.cjs
node tests/ppp-storyboard-browser.cjs
node tests/presentation-hub-browser.cjs
git diff --check
```

El test de navegador sirve archivos locales y dobles de Portero, Sala y agente. Comprueba versión histórica, recorrido reversible, cámara, reservas, teclado, tres tamaños, catálogos, autorización, FAST, encargo confirmado, recarga, producción privada y revocación. Las capturas se guardan al definir `QA_ARTIFACTS`. `CHROMIUM_EXECUTABLE_PATH` permite usar Chromium instalado. Estos resultados no equivalen a integración productiva, Safari físico ni aceptación editorial de un cliente.

El workflow fija el atlas `d99f27b5da52c5aab5d3c1ff6625937df35ba8f3`, propuesta `CHG-PPP-PRESENTACIONES-20261031`. La activación requiere integrar y verificar los componentes coordinados, su configuración del worker, el código vivo del Portero/Sala y un recorrido autorizado de extremo a extremo. Este PR no los despliega ni habilita automáticamente.

Rollback: revertir el consumidor mediante revisión y deshabilitar el alcance nuevo del agente si corresponde. Conservar versiones, autorizaciones, recibos, chinches y cálculos del PPP; no borrar expedientes ni restaurar datos de negocio como parte de una reversión de interfaz.
