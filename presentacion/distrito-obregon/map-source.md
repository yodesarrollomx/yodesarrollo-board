# Base cartográfica · Distrito Obregón (Ciudad Obregón, Sonora)

Contexto vial y de uso de suelo alrededor del punto documental del terreno, empaquetado en [basemap.js](basemap.js). La presentación no carga ningún servicio de mapas, teselas ni consultas en línea: todo va en ese archivo.

## Procedencia

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Datos bajo [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); la atribución se conserva en el archivo (`source`) y en la lámina.

- Extracción: 29 de octubre de 2026 (UTC 18:58), API pública OSM v0.6 `map`, 20 teselas.
- Caja geográfica (lon,lat): `-109.9438,27.4551,-109.8992,27.4949` (semilado nominal 2.2 km).
- Punto documental: lat 27.4750, lon -109.9215.
- Las teselas descargadas (`raw`) no se publican en el repositorio.

## Sistema de coordenadas

- Proyección UTM zona 12 norte, WGS84 (meridiano central -111°), serie de Krüger de orden 6.
- **Origen local:** E = 606550, N = 3039500 (el punto documental redondeado a 50 m; lat 27.4749068, lon -109.9215410).
- **Ejes (metros):** X = este − 606550; Y = 3039500 − norte (Y crece hacia abajo, como en pantalla). El punto documental queda en X = 3.96, Y = -10.36.
- **Norte de cuadrícula:** el eje -Y apunta al norte de cuadrícula (UTM), no al norte verdadero. En el origen la convergencia de meridianos es de ≈ 0.50° (0.4976°): el norte de cuadrícula queda unos 0.5° en sentido horario respecto del norte verdadero. El factor de escala es ≈ 0.99974. Para una lámina a esta escala la diferencia es imperceptible, pero no debe usarse como rumbo topográfico.

La función de conversión (`toUTM`, `fromUTM`, `projectLonLat`) vive en [scripts/prepare-obregon-map.cjs](../../scripts/prepare-obregon-map.cjs) y se comprueba contra el par de vértices de Abasto (`presentacion/distrito-abasto/parcel.js`, lon/lat frente a coordenadas métricas): los 9 vértices coinciden con un error máximo < 0.05 m (tolerancia de la prueba).

## Contenido y simplificación

`basemap.js` exporta `origin`, `source` y `roads` (cada elemento: `id` de OSM, `kind`, `name`, `p` = vértices `[X, Y]` en metros; `sub` en usos de suelo y `ref` cuando hay nombre y referencia).

- Capas: usos de suelo, agua, edificios, canales/drenes, ferrocarril y vías.
- Douglas-Peucker con tolerancia de 0.8 m a ≤ 1.2 km del origen y de 3 m más allá (por vértice); coordenadas a 0.1 m.
- `path`, `track`, `pedestrian` y `footway` sólo a ≤ 700 m del origen; los `path/footway` sin nombre se omiten desde la extracción.
- Edificios sólo a ≤ 1.2 km del origen.
- Tamaño ≈ 193 KB (presupuesto: 200 KB).

Regeneración: `node scripts/prepare-obregon-map.cjs --offline --raw <carpeta con teselas> [--out archivo]`. Con la misma entrada el resultado es idéntico byte a byte. Sin `--offline` descarga las teselas que falten.

## Límites

- No se extraen relaciones ni multipolígonos de OSM: sólo vías abiertas y polígonos de una sola vía cerrada. Pueden faltar áreas compuestas (por ejemplo, cuerpos de agua o parques con huecos).
- Los nombres y la clasificación de las vías son los de OSM a la fecha de extracción; pueden estar incompletos o desactualizados.
- La simplificación y el recorte a la caja alteran la geometría original en la tolerancia indicada.
- Este contexto es una referencia gráfica. **No acredita factibilidad** vial, de accesos, de servicios, de uso de suelo ni de colindancias, y no es un deslinde ni sustituye un levantamiento topográfico.
