# Brokers en Yod OS

Implementación inicial de la vista de Brokers en `brokers.html`, dentro de SYS-INVERSION. Mantiene la presentación actual en `index.html`. La interfaz y el dominio del servidor están implementados. CRM versión21 publicado en la implementación existente. Vista real autenticada de Dirección comprobada; las identidades individuales siguen pendientes de correo verificado. No se habilita captura local que aparente sincronización.

## Pantallas implementadas

- Cartera con búsqueda, etapa, broker, siguiente acción, vencimientos y última revisión.
- Dirección con cartera conjunta; broker con alcance entregado y autorizado por servidor.
- Contactos con alta y edición, oportunidades con alta y edición, terrenos y PPP por referencia canónica.
- Expediente con documentos, proyecto, historial de revisiones y siguiente compromiso.
- Participaciones separadas del origen de la oportunidad; estados por definir, propuesta, acordada, devengada y pagada. El servidor debe autorizar y auditar cada transición; la interfaz no calcula porcentajes ni valida pagos.
- Cambios de sesión descartan datos, no borran la credencial compartida y no reutilizan la caché general.

## Integración con la fuente viva

Se contrastaron GAS-INVERSION y GAS-CRM en sus editores. Brokers reutiliza GAS-CRM, los folios de LEADS-POTENCIAL y tablas auxiliares en el mismo libro. La cartera existente se lee por sus IDs canónicos; las revisiones agregan seguimiento sin duplicar terrenos o PPP. La lectura dedicada POST `brokers_snapshot` no crea registros.

El servidor puro vive en `brokers-server.js`. El adaptador de Apps Script, las identidades y los identificadores privados permanecen en el proyecto de Google, fuera del repositorio público. El guardado agrupa contacto, relación, historial y recibo en una sola llamada de Sheets batchUpdate. La lectura del esquema vivo está comprobada. Google Sheets API activada con autorización específica. CRM versión21 publicado conservando URL y permisos; lectura de API y esquema comprobada.

Respuesta: `{ok:true,data:{contract:'brokers.v1',actor:{id,name,role},revision,capabilities:{write,agree_participation},brokers:[],contacts:[],opportunities:[],activities:[],participations:[]}}`.

Las filas usan IDs canónicos. Contactos y oportunidades llevan `broker_ids`; actividades y participaciones llevan `opportunity_id`; participaciones llevan `broker_id`. El snapshot de un broker incluye solo su perfil, sus registros y sus propias participaciones. Un expediente compartido puede aparecer a ambos brokers; los acuerdos privados del otro no. Las métricas cuentan oportunidades únicas.

Escritura: POST `brokers_save` con `{k,request_id,data:{kind,record,expected_revision}}`. `kind` es contact, opportunity, activity o participation. Devuelve snapshot completo autorizado y el mismo `request_id` únicamente después de persistir. El servidor valida sesión vigente, rol, autorización por registro, referencias, campos permitidos, etapas, enlaces, fechas y acuerdos. No confiar en `broker_ids`, roles o IDs enviados por cliente.

La revisión evita sobrescrituras; la clave idempotente debe devolver el resultado del primer guardado aunque su respuesta se haya perdido. ID, autor, fecha de revisión y auditoría los asigna el servidor. Registrar actividad y actualizar última revisión/próxima acción es una operación coherente. Los cambios económicos requieren atribución y evidencia; los porcentajes y montos no se infieren de la presentación de un contacto. Evitar fórmulas inyectadas al persistir texto en Sheets.

## Publicación y pendiente de identidad

- Board PR5 y portal PR146 integrados y publicados en Pages. PR148 sincroniza el nombre del catálogo de respaldo de la cabina.
- Control Maestro actualizado a Brokers y brokers.html conservando fórmulas, SYS-INVERSION y sensibilidad.
- Dirección inició sesión y se comprobó cartera, contactos y enlaces canónicos a PPP y documentos.
- La sección PPP muestra la presentación definitiva del9-oct2026 desde su hoja; enlace comprobado en la vista real.
- Pendiente: vincular correos verificados a los tres perfiles. No inferir identidad por nombre ni ampliar IV indiscriminadamente.

## Verificación y reversión

`node --test tests/brokers*.test.cjs`, `node --check brokers-core.js`, `node --check brokers.js`, `git diff --check`. 21 pruebas aprobadas. DOM sintético comprobado: expediente, campos canónicos, edición y transición de acuerdos, envío y limpieza por cambio de sesión. Adaptador comprobado con dobles: lote atómico, fechas nativas, texto literal, columnas ajenas preservadas y propagación de fallo. Lectura integrada de Dirección comprobada en navegador; no se realizaron escrituras de prueba en producción. Las pruebas aisladas no acreditan un guardado real.

Revertir los commits del frontend mediante PR. No borrar ni restaurar registros de negocio o accesos como rollback.

## Control diario (10-oct-2026)

Mi día prioriza por fecha registrada: vencidos, hoy, casos por organizar y próximo compromiso. Seguimiento filtra activos, fechas, responsable explícito y pausados/cerrados; no infiere asignaciones ni rentabilidad. La actividad reciente proviene del historial y los acuerdos faltantes se muestran por expediente. Registrar seguimiento conserva los valores actuales para revisión; el resultado se incorpora a la nota y persiste con brokers.v1.

Dirección dispone de gestión de una cartera seleccionada mediante `masterbroker=<id>&mode=manage`: conserva su actor, autoría y capacidades de servidor, y vuelve a acotar cada snapshot tras guardar. Sin `mode=manage` continúa la previsualización sin escrituras. Un broker real nunca adquiere rol de Dirección por el parámetro. La gestión de contactos compartidos preserva los demás brokers vinculados. Activación de identidad individual pendiente de correo verificado; no se suplanta al Masterbroker.

Verificación: 27 pruebas de contrato/dominio. DOM con casos sintéticos: broker, preview y gestión; agenda, formularios, reintento con mismo request_id tras fallo, ACK, historial, conservación de vínculos compartidos, alcance tras guardado y limpieza al cambiar sesión. Sin escrituras de prueba en producción.

## Preevaluación desde cartera

El botón Preevaluar terreno abre el evaluador existente mediante un acceso de un solo uso. El backend contrasta identidad y cartera con el snapshot canónico del CRM; el navegador no concede permisos. Se conserva el acceso público aislado del evaluador.

Guardar mantiene la evaluación en Drive. Usar en Masterbrokers vuelve con su ID y recupera datos con la sesión vigente: nombre, ubicación, carpeta y referencia de revisión. El formulario requiere confirmar el siguiente paso y guardar mediante brokers_save; no crea ni aprueba planes automáticamente. Una referencia ya vinculada reabre el registro existente. La vista previa de Dirección no lanza ni importa evaluaciones. Los perfiles sin correo verificado siguen sujetos a vinculación canónica.

Datos, configuración y expedientes viven en Drive/Sheets. Git contiene la lógica y ejemplos sintéticos. Pruebas con dobles y navegador, sin escrituras de prueba en CRM. La publicación no acredita que todos los perfiles individuales estén activados.

## Mini CRM (13-oct-2026)

La cartera presenta una barra por expediente y permite abrir varios resúmenes a la vez. Los titulares del PPP se leen mediante el GET de caso existente: sólo inputs y resultados guardados, versión y fecha. No se recalculan las versiones alternas. Capital máximo es el límite del input; faltante de capital es el resultado guardado y no una estimación nueva de equity necesario. Un contacto sin relación Propietario no acredita titularidad.

Avance y Programar reunión reutilizan `brokers_save(kind=activity)`, revisión y recibo. Los nueve campos de BROKERS_Actividades permanecen intactos. La nota incluye texto humano y un sobre `[YOD-CRM v1]` con tipo, estado, fecha ocurrida, participantes, origen, URL, etapa observada y referencia de reemplazo. Las notas antiguas/malformadas se muestran completas sin conversión. El backend conserva el autor y la fecha de captura; participantes y `[PG]` son etiquetas de seguimiento, no nuevas identidades ni ACL.

El calendario usa America/Hermosillo y distingue hechos de programación/propuesta. Registrar resultado o cancelar agrega una actividad; el evento anterior sigue en historial y sale del calendario sólo con un reemplazo explícito del mismo registro. La fecha vencida no convierte una reunión en realizada. No se envían invitaciones a Google Calendar. Consultar o abrir un caso no genera un avance comercial.

La ingestión documental usa fuentes privadas verificadas y claves estables para evitar duplicados. Los hechos históricos se pueden añadir mediante el conector nativo autorizado sin cambiar el siguiente paso. WhatsApp entra desde un exportado compartido; no se presume una conexión continua a conversaciones privadas. Autorización, alcance, ACK y reintentos del contrato anterior permanecen vigentes.

Verificación sintética: `node --test tests/brokers*.test.cjs`, `node tests/brokers-crm-browser.cjs` (Chromium320/390/1440), regresiones de evaluador y presentación, sintaxis y atlas. La publicación y la lectura privada se registran por separado; estas pruebas no escriben negocio en producción. Revertir el frontend preserva todas las actividades, reuniones y versiones de PPP.

## Dirección por plaza y clientes (17-oct-2026)

Dirección abre Sonora con responsables de cartera; una coincidencia única del nombre del actor ordena su tarjeta primero, sin otorgar permisos ni activar usuarios. Entrar a una cartera desde esta pantalla conserva identidad y atribución de Dirección. Volver a Sonora recupera el snapshot autorizado completo. Los enlaces antiguos de vista previa siguen sin guardar; la navegación operativa usa mode=manage.

La cartera agrupa clientes por contact_id explícito, con asuntos independientes por terreno/PPP. Homónimos no se fusionan; contactos sin asuntos permanecen visibles; asuntos sin contacto conservan su identidad y muestran Cliente por vincular. No se inventan asignaciones ni se importan leads sin relación comprobada.

next_action admite el responsable nominal Persona:<id> además de etiquetas heredadas. El sobre YOD-CASE v1 en notes conserva texto previo, estado PPP (Por confirmar/En preparación/Listo/Presentado) y solicitud explícita de decisión. No cambia la etapa del asunto al registrar actividad. Reprogramar agrega una nueva actividad que sustituye la programación sólo en el calendario; originales siguen en historial. Guardado conserva revisión, recibo e identidad del servidor.

Validación: 139 pruebas Node; 84 comprobaciones de jerarquía/cliente/nominal/PPP/decisión/reprogramación/recarga/aislamiento y 72 del mini CRM a 320/390/1440px. Preevaluación y material comercial regresionados. Servicios sintéticos, cero escrituras de prueba en negocio. Lectura real de Dirección previa confirmada; publicación y aceptación de código nuevo registradas aparte en PR/Buzón. Revertir frontend conserva actividades, asignaciones, clientes, documentos y PPP.

## Portal personal y CRM visible · 17-oct

La entrada canónica muestra al Master Developer, cartera propia, equipo desplegable, actividad reciente y cobertura de PPP. Los enlaces de gestión explícitos conservan su alcance y ofrecen Mi portal sin cambiar el actor. La ficha separa situación actual, siguiente paso y plan, con historial y calendario debajo. El enlace al PPP está disponible sin desplegar la fila. El estado del acceso individual es informativo y no activa identidades.

Validación local: 141 pruebas de contratos, 96 comprobaciones de jerarquía/guardado/alcance y 72 de mini CRM en 320/390/1440; incluye contraste de métricas y equipo desplegable. Cero escrituras sintéticas en producción. El registro de importaciones reales y la verificación publicada se conservan en el buzón privado.

La lectura real del 17-oct detectó ACK con snapshot anterior después de guardar un contacto. El cliente verifica los campos enviados y, sólo si no coinciden, realiza una lectura autorizada nueva. No repite escrituras ni construye datos optimistas; si persiste la diferencia, mantiene el intento idempotente y solicita verificar. Tres regresiones cubren relectura, discrepancia persistente y cambio de sesión.

## Espacio de carteras ·17-oct-2026

Se sustituye la portada de métricas y pestañas redundantes por un único espacio. Dirección abre Mi equipo; Mi cartera y cada broker cambian el alcance conservando la identidad autenticada. Un broker individual sigue recibiendo sólo su cartera del backend. La lista agrupa por cliente explícito y mantiene cada asunto separado. El detalle conserva contexto en escritorio, y usa regreso a cartera en móvil.

Próximo compromiso, persona y fecha aparecen antes de la historia. Cliente/terreno, PPP, acuerdos y proyecto se abren desde el asunto, sólo con referencias existentes; ausencia no equivale a integración. Calendario, filtros, contactos sin oportunidad y herramientas comerciales se revelan al usarlos. Comparación de PPP, edición, reuniones y fuentes anteriores siguen disponibles. No cambios de datos, permisos, contratos ni backend.


## Prototipo público

La muestra interactiva abre sin cuenta en [master-brokers/](https://yodesarrollomx.github.io/yodesarrollo-board/master-brokers/). Comienza en Master Developer y su equipo, y permite recorrer carteras, prospectos, trabajos, historial y fichas de PPP.

Sus clientes, fechas, conversaciones y documentos son ficticios; la etiqueta de ejemplo permanece visible. No consulta ni escribe en el CRM y no incluye el adaptador de datos reales aún no habilitado. No carga Portero ni el shell de la aplicación interna. La aplicación productiva `brokers.html` y sus permisos conservan su comportamiento.

Verificación: `node --test tests/brokers-public-preview.test.cjs` y `node tests/brokers-public-preview-browser.cjs`; después de publicar, comparar archivos de la ruta anónima con el commit integrado.

## Recorrido guiado y regreso recuperable · propuesta 17-oct

Dirección solicita que presentación, captura, evaluación y seguimiento se usen como un recorrido común de todos los Master Brokers dentro de YOD OS. Se reutilizan CHG-MASTERBROKERS-MINI-CRM y CHG-MASTERBROKER-PREEVALUATION del atlas aprobado, sin conexiones ni contratos nuevos.

Entrada visual en cartera: Presentar, Analizar inmueble y Continuar expediente. La ficha muestra evaluación, PPP y seguimiento según evidencia guardada, sin inferir aprobación. Cada cartera conserva alcance del servidor y la presentación pública no recibe datos privados.

Reparaciones previstas: retorno pendiente recuperable tras error o cancelación hasta confirmación del guardado; retorno ya vinculado abre el expediente sin duplicar; actualizar conserva selección sólo si sigue autorizada; guardado abre el registro confirmado; referencia de evaluación más reciente conserva notas y metadatos PPP. La importación agrupa datos disponibles y deja campos administrativos en detalles, sin inventar responsable, fecha, precios ni viabilidad.

Comprobación: pruebas de contrato y navegador Chromium/WebKit con fuentes sintéticas; red fallida, cancelar/recargar/retomar, ACK, referencias múltiples, broker A/B, preview y móvil. Separar publicación del frontend, funcionamiento del evaluador y aceptación de usuario; ningún POST de prueba a negocio. Reversión sólo frontend preserva Drive, Sheets, actividades, permisos y referencias.

Implementación del recorrido: entrada común de tres acciones; ficha con mapa/evaluación, PPP, material y seguimiento. El regreso conserva su URL hasta ACK; cancelar ofrece Retomar y una evaluación ya vinculada abre su expediente. Actualizar conserva la selección autorizada, la creación confirmada abre el registro exacto y conserva la experiencia de clientes recién registrados. Se preserva la unificación de cartera publicada en PR41 y el prototipo público de PR42. La referencia EV actual es la última línea de evaluación, conservando las anteriores y el sobre YOD-CASE-v1. El editor del retorno recoge contacto opcional y siguiente paso; datos recibidos y clasificación se despliegan sólo si se necesitan. Publicación y pruebas se registran al finalizar.

## Historia · Hoy · Plan (as-of)

El detalle de cada caso añade la pestaña «Historia · Hoy · Plan». Con una fecha de consulta (por defecto hoy) muestra tres paneles: Historia a la izquierda, Hoy al centro y Planeación a la derecha. Desde 1024 px se ven juntos; en pantallas menores se alternan con las pestañas «← Historia», «Hoy» y «Planeación →», que admiten flechas, Inicio y Fin.

- Historia: los hechos con fecha ocurrida hasta el día consultado, con participantes, fuente y enlace, y su estado en texto (Realizado, Programado, Propuesto, Cancelado). Muestra «Corrige a …» cuando el evento reemplaza a otro y «Registrado después de esta fecha» cuando se capturó después del día consultado.
- Hoy: el último hecho realizado con su fuente, la etapa observada (la del último hecho que la registró; la etapa del expediente si la fecha es hoy), el siguiente paso vigente a esa fecha, la fecha real de la última captura y «Requiere decisión» sólo si la fecha es hoy y el expediente la solicita. No existe un campo de bloqueo: se indica «Sin bloqueo registrado en el expediente».
- Planeación: «Compromisos (programados)» y «Propuestas» vigentes a la fecha. Un plan sale cuando un evento registrado hasta ese día lo reemplaza o cancela. Si su día ya pasó sin resultado se marca «Vencida · sin resultado registrado» y conserva su estado; nunca se convierte en realizado. Si la fecha es hoy se añade el siguiente paso vigente del expediente.

Reglas: la vista es de sólo lectura; cambiar la fecha o volver a hoy no guarda, no llama a `brokers_save` y no modifica el snapshot. Los reemplazos y cancelaciones cuentan por su fecha de registro (America/Hermosillo), no por la fecha del hecho. Los vacíos se escriben de forma explícita («Sin hechos registrados hasta esta fecha.», «Etapa no registrada en esa fecha», «Sin siguiente paso registrado», «Sin compromisos programados», «Sin propuestas») y nunca se sustituyen por porcentajes ni por fechas inventadas.

Sin cambios de contrato: se deriva de las actividades existentes y del sobre `[YOD-CRM v1]`, sin backend, tablas, campos ni permisos nuevos. La lógica pura es `CRM.temporal(rows, asOfDay, current)` en `brokers-crm.js`; `decode` y `calendarEvents` no cambian.

Verificación: `node --test tests/brokers*.test.cjs` (incluye `tests/brokers-temporal.test.cjs`) y `node tests/brokers-temporal-browser.cjs` (Chromium 320/390/1440 con servicios sintéticos; capturas en `temporal-review-artifacts/`). Sin escrituras de prueba en producción. Revertir el frontend conserva actividades, recibos y PPP.
