# Presentación desde el grafo

Propuesta del atlas: `CHG-PRESENTACION-GRAFO-20261111` (contrato `CTR-GRAFO-VERSIONES`). Autorizado por Dirección el 11-nov-2026.

## Qué es

`presentacion/grafo/` arma en el navegador una presentación con dos fuentes:

1. **El grafo aprobado** que publica `potenciales-yod`: `grafo/versiones.json` dice cuál es y `grafo/datos/<id>.json` trae las recetas por audiencia y el contrato del Plan de Potencial (nombres de campos, sin valores).
2. **El Plan de Potencial guardado** del caso, leído con la sesión de quien abre la página. Es la misma lectura `recurso=caso` que ya usa el Mini CRM; no hay backend nuevo.

Opción múltiple, arriba de la presentación:

- **¿Para quién es?** Cliente o inversionista · Dueño del terreno · Departamentos, lotes o casas.
- **¿Qué tan a fondo?** Completa · Corta.

La elección viaja en la liga (`?caso=…&tipo=…&audiencia=…&breve=1`), así que cada versión tiene su dirección y siempre está lista. La liga nunca lleva la credencial ni cifras.

Se entra desde el cajón «Plan de potencial» de un expediente en Master Brokers («Presentar desde el grafo»), desde Presentaciones («Desde el grafo») o pegando la liga del plan.

## Qué no hace

- **No calcula.** Cada cifra es un campo guardado del plan, con su procedencia. Lo que el plan no trae se muestra «No definido»; nunca se deriva ni se inventa.
- **No escribe ni guarda.** No hay POST, almacenamiento ni registro. Nunca borra la credencial compartida del Portero.
- **No publica.** Sin sesión de YOD sólo se ve el ejemplo con cifras ficticias. Quien recibe una liga necesita su propio acceso al caso.
- **No sustituye las presentaciones registradas del PPP** (`presentacion/ppp/`, con versiones y producción). Es una vista interna que se arma al abrirla.

## Borrador y aprobado

La página sólo lee el grafo **aprobado**.

- Mientras un grafo rehecho está en **borrador**, las presentaciones y sus ligas no cambian.
- Al **aprobarse** (se fusiona el PR del borrador en `potenciales-yod`), la siguiente apertura usa el grafo nuevo sin más pasos. Quien la tiene abierta ve «Hay un grafo más nuevo» y actualiza con un toque.

Si una receta nombra un campo que el plan ya no guarda, ese dato deja de mostrarse y el aviso de borrador en Accesos lo advierte antes de aprobar.

## Aviso discreto

`presentacion/grafo-aviso.js` (+ `.css`) pinta una pastilla pequeña y gris; el detalle aparece sólo al tocarla. Está en Master Brokers, en Presentaciones y en la propia página. Para ponerla en otra pantalla basta `<span data-grafo-aviso hidden></span>` y cargar los dos archivos.

| Dice | Cuándo |
|---|---|
| nada | Lo que se ve usa el grafo aprobado y no hay otro en trabajo. |
| «Otra versión en trabajo» | Hay un grafo en borrador. Lo que se ve no cambia hasta que se apruebe. |
| «Hay un grafo más nuevo» | Ya se aprobó uno más nuevo que el que esta pantalla cargó. Ofrece actualizar. |

Sólo aparece con sesión de YOD en el navegador: un cliente que abre una liga compartida nunca la ve. Lee archivos estáticos públicos; no usa claves.

## Archivos

| Archivo | Qué hace |
|---|---|
| `presentacion/grafo/compilar.js` | Función pura: receta + plan guardado → guion `yod.storyboard.v1`. Sin red, almacenamiento ni reloj. |
| `presentacion/grafo/app.mjs` | Lee el grafo aprobado y el plan, pinta con el motor de `presentacion/ppp/renderer.mjs`. |
| `presentacion/grafo/index.html` · `style.css` | La página. |
| `presentacion/grafo-aviso.js` · `.css` | La pastilla. |
| `tests/fixtures/grafo-aprobado.json` | Copia de prueba del grafo aprobado (sin casos ni cifras). |

Las recetas no viven aquí: están en `potenciales-yod/grafo-motor/recetas.json` y llegan con cada grafo aprobado.

## Pruebas

```
node --test tests/ppp-grafo-presentacion.test.cjs
node tests/ppp-grafo-browser.cjs
```

La primera comprueba que cada audiencia, tipo de plan y extensión arma un guion válido, que cada cifra sale de un campo guardado y que lo ausente queda «No definido». La segunda recorre la página en tres tamaños con un Portero y un grafo sintéticos; ninguna llamada llega a producción.

## Pendiente de comprobar en producción

- La lectura real del plan con una sesión real (aquí sólo con dobles).
- Que `potenciales-yod` ya publique `grafo/versiones.json` y `grafo/datos/`. Sin ellos la página dice que no pudo leer el grafo y la pastilla no pinta nada.

## Reversión

Revertir el merge. No hay backend, hojas, permisos ni datos.
