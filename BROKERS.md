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
