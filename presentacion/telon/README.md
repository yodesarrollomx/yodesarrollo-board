# Telón YOD — par de ligas de cada presentación guiada

«Telón YOD» es el nombre código con el que Dirección busca sus presentaciones en el chat. Cada presentación del catálogo tiene dos ligas permanentes:

| Liga | Ruta | Para qué | ¿Se comparte? |
| --- | --- | --- | --- |
| **VISOR** | `…/presentacion/<carpeta>/` | La que ve el cliente; sigue al conductor en tiempo real. | Sí |
| **MAESTRO** | `…/presentacion/<carpeta>/maestro.html` | Entra a conducir de un toque. | **Nunca** |

## Cómo funciona la liga MAESTRO

`maestro.html` sólo lleva su propia vista previa (título de alerta y logo rojo con tache) y redirige a `./?maestro=1`. Con ese parámetro `presenter.js`:

1. muestra el aviso «⛔ MAESTRO · no compartas esta liga» y antepone «⛔ MAESTRO» al título de la pestaña;
2. si el dispositivo no tiene sesión de Dirección, abre el acceso de Google **una vez**; el Portero guarda la sesión en ese dispositivo y recarga;
3. con sesión de Dirección, ejecuta **una sola vez** la misma acción del botón «Conducir»;
4. si la versión publicada de esa presentación no corresponde a la página, **no** abre sesión sola: avisa y deja el botón «Conducir» manual.

En las dos ligas `presenter.js` conserva «Telón YOD» al inicio del título de la pestaña aunque la página lo reescriba al cargar.

La liga **no es una llave**: no concede permisos ni lleva secretos. El servidor de sesiones sigue validando al dueño en cada operación. Si alguien más la abre, sólo ve la solicitud de acceso y, sin la cuenta de Dirección, no puede conducir. Se marca «nunca compartir» para no confundir al cliente, no porque abra el control.

## Añadir una presentación nueva

1. Añade su renglón en `scripts/telon-logos.py` y ejecuta `python3 scripts/telon-logos.py` (requiere Pillow).
2. En su `index.html`: título con «Telón YOD · …», `og:title`, `og:description` y `og:image` apuntando a `telon/<slug>-visor.png`.
3. Copia un `maestro.html` existente a su carpeta y cambia nombre e imagen (`telon/<slug>-maestro.png`).
4. Corre `node --test tests/brokers-presentations-telon.test.cjs`: exige el par completo para cada presentación del catálogo.
