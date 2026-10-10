# Brokers en Yod OS

Implementación inicial de la vista de Brokers en `brokers.html`, dentro de SYS-INVERSION. Mantiene la presentación actual en `index.html`. La interfaz y el adaptador están implementados; el backend, las identidades reales y el despliegue operativo están pendientes. No se habilita captura local que aparente sincronización.

## Pantallas implementadas

- Cartera con búsqueda, etapa, broker, siguiente acción, vencimientos y última revisión.
- Dirección con cartera conjunta; broker con alcance entregado y autorizado por servidor.
- Contactos con alta y edición, oportunidades con alta y edición, terrenos y PPP por referencia canónica.
- Expediente con documentos, proyecto, historial de revisiones y siguiente compromiso.
- Participaciones separadas del origen de la oportunidad; estados por definir, propuesta, acordada, devengada y pagada. El servidor debe autorizar y auditar cada transición; la interfaz no calcula porcentajes ni valida pagos.
- Cambios de sesión descartan datos, no borran la credencial compartida y no reutilizan la caché general.

## Integración requerida con la fuente viva

CLAUDE.md exige obtener el Code.gs VIVO antes de tocar el backend. GAS-INVERSION no está en este repositorio; no se debe inventar una implementación paralela ni publicar fuentes privadas aquí. Contrastar también el CRM existente para reutilizar contactos y oportunidades, en vez de crear duplicados.

Solo después de adaptar el backend existente se configura `window.YDR_BROKERS_CONFIG = {url: <endpoint existente>}` antes de brokers.js. No apuntar al backend legado sin verificar el contrato: la vista rechaza su respuesta general. La lectura dedicada usa POST `brokers_snapshot` y debe ser estrictamente de lectura, sin creación automática de registros.

Respuesta: `{ok:true,data:{contract:'brokers.v1',actor:{id,name,role},revision,capabilities:{write,agree_participation},brokers:[],contacts:[],opportunities:[],activities:[],participations:[]}}`.

Las filas usan IDs canónicos. Contactos y oportunidades llevan `broker_ids`; actividades y participaciones llevan `opportunity_id`; participaciones llevan `broker_id`. El snapshot de un broker incluye solo su perfil, sus registros y sus propias participaciones. Un expediente compartido puede aparecer a ambos brokers; los acuerdos privados del otro no. Las métricas cuentan oportunidades únicas.

Escritura: POST `brokers_save` con `{k,request_id,data:{kind,record,expected_revision}}`. `kind` es contact, opportunity, activity o participation. Devuelve snapshot completo autorizado y el mismo `request_id` únicamente después de persistir. El servidor valida sesión vigente, rol, autorización por registro, referencias, campos permitidos, etapas, enlaces, fechas y acuerdos. No confiar en `broker_ids`, roles o IDs enviados por cliente.

La revisión evita sobrescrituras; la clave idempotente debe devolver el resultado del primer guardado aunque su respuesta se haya perdido. ID, autor, fecha de revisión y auditoría los asigna el servidor. Registrar actividad y actualizar última revisión/próxima acción es una operación coherente. Los cambios económicos requieren atribución y evidencia; los porcentajes y montos no se infieren de la presentación de un contacto. Evitar fórmulas inyectadas al persistir texto en Sheets.

## Activación pendiente

1. Obtener y contrastar fuente viva de GAS-INVERSION/CRM y su esquema real. Mapear identidades de acceso a brokers; nombres de personas no se publican en este repositorio.
2. Implementar contrato y autorización en el backend existente; probar con dobles y hojas aisladas, nunca escrituras de prueba en producción.
3. Configurar la URL real en brokers.html. Confirmar lectura/escritura y aislamiento en entorno de prueba con broker A, broker B y Dirección, incluidos enlaces directos y acceso revocado.
4. Cambiar el destino/nombre de SYS-INVERSION en catálogo canónico y Control Maestro, conservando su ID. Regenerar copias del catálogo; no ampliar permisos IV indiscriminadamente.
5. Vincular la presentación definitiva del PPP después de resolver su archivo/versión aprobados. No sustituirla por texto reconstruido ni una versión histórica.
6. Integrar mediante PR, publicar y comprobar por separado frontend y versión activa backend. La existencia de estos archivos no acredita usuarios activos.

## Verificación y reversión

`node --test tests/brokers.test.cjs`, `node --check brokers-core.js`, `node --check brokers.js`, `git diff --check`. Recorrido de navegador con servidor simulado y datos sintéticos: filtros, alta, edición, historial, acuerdos, móvil, sesión y errores. Producción pendiente.

Revertir los commits del frontend mediante PR. No borrar ni restaurar registros de negocio o accesos como rollback.
