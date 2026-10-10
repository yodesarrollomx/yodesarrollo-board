# Brokers en Yod OS

Implementación inicial de la vista de Brokers en `brokers.html`, dentro de SYS-INVERSION. Mantiene la presentación actual en `index.html`. La interfaz y el dominio del servidor están implementados. La integración se añadió al editor vivo del CRM; su publicación y las identidades están pendientes de activación. No se habilita captura local que aparente sincronización.

## Pantallas implementadas

- Cartera con búsqueda, etapa, broker, siguiente acción, vencimientos y última revisión.
- Dirección con cartera conjunta; broker con alcance entregado y autorizado por servidor.
- Contactos con alta y edición, oportunidades con alta y edición, terrenos y PPP por referencia canónica.
- Expediente con documentos, proyecto, historial de revisiones y siguiente compromiso.
- Participaciones separadas del origen de la oportunidad; estados por definir, propuesta, acordada, devengada y pagada. El servidor debe autorizar y auditar cada transición; la interfaz no calcula porcentajes ni valida pagos.
- Cambios de sesión descartan datos, no borran la credencial compartida y no reutilizan la caché general.

## Integración con la fuente viva

Se contrastaron GAS-INVERSION y GAS-CRM en sus editores. Brokers reutiliza GAS-CRM, los folios de LEADS-POTENCIAL y tablas auxiliares en el mismo libro. La cartera existente se lee por sus IDs canónicos; las revisiones agregan seguimiento sin duplicar terrenos o PPP. La lectura dedicada POST `brokers_snapshot` no crea registros.

El servidor puro vive en `brokers-server.js`. El adaptador de Apps Script, las identidades y los identificadores privados permanecen en el proyecto de Google, fuera del repositorio público. El guardado agrupa contacto, relación, historial y recibo en una sola llamada de Sheets batchUpdate. La lectura del esquema vivo está comprobada. La API de Sheets requiere activación antes de publicar una nueva versión; el endpoint sigue en su versión anterior.

Respuesta: `{ok:true,data:{contract:'brokers.v1',actor:{id,name,role},revision,capabilities:{write,agree_participation},brokers:[],contacts:[],opportunities:[],activities:[],participations:[]}}`.

Las filas usan IDs canónicos. Contactos y oportunidades llevan `broker_ids`; actividades y participaciones llevan `opportunity_id`; participaciones llevan `broker_id`. El snapshot de un broker incluye solo su perfil, sus registros y sus propias participaciones. Un expediente compartido puede aparecer a ambos brokers; los acuerdos privados del otro no. Las métricas cuentan oportunidades únicas.

Escritura: POST `brokers_save` con `{k,request_id,data:{kind,record,expected_revision}}`. `kind` es contact, opportunity, activity o participation. Devuelve snapshot completo autorizado y el mismo `request_id` únicamente después de persistir. El servidor valida sesión vigente, rol, autorización por registro, referencias, campos permitidos, etapas, enlaces, fechas y acuerdos. No confiar en `broker_ids`, roles o IDs enviados por cliente.

La revisión evita sobrescrituras; la clave idempotente debe devolver el resultado del primer guardado aunque su respuesta se haya perdido. ID, autor, fecha de revisión y auditoría los asigna el servidor. Registrar actividad y actualizar última revisión/próxima acción es una operación coherente. Los cambios económicos requieren atribución y evidencia; los porcentajes y montos no se infieren de la presentación de un contacto. Evitar fórmulas inyectadas al persistir texto en Sheets.

## Activación pendiente

1. Activar Google Sheets API en el proyecto existente: el diagnóstico devuelve 403 por API deshabilitada. El diálogo de Google presenta términos de API; requiere la confirmación correspondiente.
2. Publicar una nueva versión de la implementación existente, conservando URL y permisos. Verificar lectura autorizada; no hacer escrituras de prueba en producción.
3. Vincular correos verificados a los perfiles; no inferir identidad por nombre ni ampliar IV indiscriminadamente.
4. Integrar los PR de portal y board después de las comprobaciones. Actualizar nombre y destino de SYS-INVERSION en Control Maestro conservando fórmulas, ID y sensibilidad.
5. La presentación definitiva del PPP ya está referenciada en la hoja; el frontend la muestra desde esa fuente, sin copiar precios al código.

## Verificación y reversión

`node --test tests/brokers*.test.cjs`, `node --check brokers-core.js`, `node --check brokers.js`, `git diff --check`. 21 pruebas aprobadas. DOM sintético comprobado: expediente, campos canónicos, edición y transición de acuerdos, envío y limpieza por cambio de sesión. Adaptador comprobado con dobles: lote atómico, fechas nativas, texto literal, columnas ajenas preservadas y propagación de fallo. Navegador integrado y guardado real pendientes; no se acreditan por las pruebas aisladas.

Revertir los commits del frontend mediante PR. No borrar ni restaurar registros de negocio o accesos como rollback.
