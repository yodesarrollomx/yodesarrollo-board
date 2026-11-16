#!/usr/bin/env python3
"""Telón YOD: genera el par de logos (visor / maestro) de cada presentación guiada.

Uso:  python3 scripts/telon-logos.py            # escribe presentacion/telon/<slug>-{visor,maestro}.png
Sólo dibuja imágenes de marca; no lee ni escribe datos de negocio.
Para una presentación nueva: añade su renglón en PRESENTACIONES y sigue presentacion/telon/README.md.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SALIDA = Path(__file__).resolve().parent.parent / "presentacion" / "telon"
APORTADORES = SALIDA.parent / "aportadores" / "assets"
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
LADO, ESCALA = 600, 2  # se dibuja al doble y se reduce para suavizar bordes

# slug, monograma, nombre, subtítulo
PRESENTACIONES = [
    ("aportadores", "YOD", "DESARROLLAR JUNTOS", "Alianza de aportadores"),
    ("gaston-madrid", "GM", "GASTÓN MADRID", "Plan de potencial"),
    ("distrito-abasto", "DA", "DISTRITO ABASTO SONORA", "Presentación"),
    ("distrito-obregon", "DO", "DISTRITO OBREGÓN", "Guion visual"),
    ("yod-general", "YOD", "YODESARROLLO", "Del terreno al proyecto"),
]

CREMA, VERDE, ORO, GRIS = "#f5f3eb", "#315840", "#b8975a", "#6b7a6e"
ROJO, BLANCO, ROSA = "#8f1d1d", "#ffffff", "#f3c9c9"


def fuente(ruta, texto, alto, ancho_max):
    """La fuente más grande (hasta `alto`) cuyo texto cabe en `ancho_max`."""
    for size in range(alto, 8, -2):
        f = ImageFont.truetype(ruta, size * ESCALA)
        if f.getlength(texto) <= ancho_max * ESCALA:
            return f
    return ImageFont.truetype(ruta, 10 * ESCALA)


def centrado(d, texto, f, cx, cy, color):
    d.text((cx * ESCALA, cy * ESCALA), texto, font=f, fill=color, anchor="mm")


def aro(d, cx, cy, r, color, grosor):
    d.ellipse([(cx - r) * ESCALA, (cy - r) * ESCALA, (cx + r) * ESCALA, (cy + r) * ESCALA], outline=color, width=grosor * ESCALA)


def disco(d, cx, cy, r, color):
    d.ellipse([(cx - r) * ESCALA, (cy - r) * ESCALA, (cx + r) * ESCALA, (cy + r) * ESCALA], fill=color)


def logo(mono, nombre, sub, maestro):
    fondo, tinta = (ROJO, BLANCO) if maestro else (CREMA, VERDE)
    im = Image.new("RGB", (LADO * ESCALA, LADO * ESCALA), fondo)
    d = ImageDraw.Draw(im)
    cx, cy, r = 300, 250, 180
    aro(d, cx, cy, r, tinta, 12)
    aro(d, cx, cy, r - 22, ROSA if maestro else ORO, 2)
    centrado(d, mono, fuente(SERIF, mono, 170, 250), cx, cy - 4, tinta)
    bx, by = cx + 127, cy - 127  # insignia sobre el aro, arriba a la derecha
    if maestro:  # tache: nunca compartir
        disco(d, bx, by, 56, BLANCO)
        for dx in (-1, 1):
            d.line([(bx - 26 * dx) * ESCALA, (by - 26) * ESCALA, (bx + 26 * dx) * ESCALA, (by + 26) * ESCALA], fill=ROJO, width=13 * ESCALA)
        centrado(d, "MAESTRO · NO COMPARTIR", fuente(SANS, "MAESTRO · NO COMPARTIR", 36, 540), cx, 488, BLANCO)
        centrado(d, nombre, fuente(SANS, nombre, 24, 540), cx, 540, ROSA)
    else:  # triángulo de «ver»: la que sí se manda
        disco(d, bx, by, 56, VERDE)
        d.polygon([((bx - 17) * ESCALA, (by - 25) * ESCALA), ((bx - 17) * ESCALA, (by + 25) * ESCALA), ((bx + 27) * ESCALA, by * ESCALA)], fill=CREMA)
        centrado(d, nombre, fuente(SANS, nombre, 34, 540), cx, 488, VERDE)
        centrado(d, sub, fuente(SANS, sub, 24, 540), cx, 540, GRIS)
    return im.resize((LADO, LADO), Image.LANCZOS)


def aportadores(maestro):
    """Componer los archivos originales; nunca reconstruir las marcas con texto."""
    im = Image.new("RGB", (LADO * ESCALA, LADO * ESCALA), CREMA)
    d = ImageDraw.Draw(im)
    def marca(nombre, cx, cy, ancho, alto):
        asset = Image.open(APORTADORES / nombre).convert("RGBA")
        asset.thumbnail((ancho * ESCALA, alto * ESCALA), Image.Resampling.LANCZOS)
        xy = (int(cx * ESCALA - asset.width / 2), int(cy * ESCALA - asset.height / 2))
        im.paste(asset, xy, asset)
    marca("yodesarrollo-original.png", 300, 335, 460, 85)
    marca("puebla-arquitectos-original.png", 150, 190, 128, 128)
    marca("avermont-original.webp", 385, 190, 270, 90)
    d.line((70 * ESCALA, 395 * ESCALA, 530 * ESCALA, 395 * ESCALA), fill=GRIS, width=ESCALA)
    centrado(d, "DESARROLLAR JUNTOS", fuente(SANS, "DESARROLLAR JUNTOS", 32, 530), 300, 447, VERDE)
    centrado(d, "Alianza de aportadores", fuente(SANS, "Alianza de aportadores", 22, 500), 300, 487, GRIS)
    pie = "MAESTRO · NO COMPARTIR" if maestro else "VER PRESENTACIÓN"
    d.rectangle((0, 530 * ESCALA, 600 * ESCALA, 600 * ESCALA), fill=ROJO if maestro else VERDE)
    centrado(d, pie, fuente(SANS, pie, 23, 530), 300, 565, BLANCO)
    return im.resize((LADO, LADO), Image.Resampling.LANCZOS)


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for slug, mono, nombre, sub in PRESENTACIONES:
        for maestro in (False, True):
            destino = SALIDA / f"{slug}-{'maestro' if maestro else 'visor'}.png"
            imagen = aportadores(maestro) if slug == "aportadores" else logo(mono, nombre, sub, maestro)
            imagen.save(destino, optimize=True)
            if slug == "aportadores":
                imagen.save(SALIDA / f"aportadores-logos3-{'maestro' if maestro else 'visor'}.png", optimize=True)
            print(destino.relative_to(SALIDA.parent.parent), destino.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
