# Baches reales

Cuando el jugador cae en un bache grande, aparece unos segundos una tarjeta con la foto de un bache real de La Laguna y su ubicación. Al terminar la carrera, la pantalla de resultados muestra los que le tocaron.

## Cómo funciona

- Las fotos y sus datos viven en `public/baches/`: una imagen por bache y el archivo `baches.json`.
- La tarjeta sale solo con baches que dañan la suspensión, como máximo una cada 8 segundos y sin repetir foto en la misma carrera. Los baches portátiles que sueltan los rivales no la disparan.
- Si no hay fotos, el juego funciona igual: no hay tarjeta ni galería.
- Las entradas con `"ejemplo": true` son dibujos provisionales. Solo se ven agregando `?ejemplos` a la dirección del juego; en el sitio público normal no aparecen.

## Agregar un bache

1. Exporta la foto como JPEG. Las fotos HEIC del iPhone necesitan `pip install pillow-heif`, o cambia en el teléfono Ajustes → Cámara → Formatos → "Más compatible".
2. Corre la herramienta (necesita Python y `pip install pillow`):

```
python3 tools/add_bache.py foto.jpg "Calle A esq. Avenida B" --colonia Centro --fecha 2026-11 --credito "Nombre"
```

3. Revisa la imagen que quedó en `public/baches/` y haz commit de la imagen y de `baches.json`. Al llegar a `main` se publica sola.

La herramienta endereza la foto, la reduce a 640 px y la guarda sin metadatos. Las fotos de teléfono traen la ubicación GPS exacta de donde se tomaron: **nunca subas el original al repo ni lo arrastres a la página de GitHub**; el repo es público.

## Campos de `baches.json`

| Campo | Obligatorio | Contenido |
|---|---|---|
| `id` | sí | Identificador único |
| `foto` | sí | Nombre del archivo dentro de `public/baches/` |
| `ubicacion` | sí | Cruce de calles o referencia |
| `colonia` | no | Colonia o sector |
| `fecha` | no | Mes de la foto, como `2026-11` |
| `estado` | no | `activo` o `tapado`; un bache tapado se muestra como "Ya lo taparon" |
| `credito` | no | Quién tomó la foto |
| `ejemplo` | no | `true` para fotos provisionales |

Para quitar un bache, borra su entrada y su imagen.

## Reglas de moderación

- Que no se vean caras, placas ni números de casa.
- Ubicación por cruce o colonia, nunca por domicilio.
- Solo fotos propias o enviadas con permiso de quien las tomó. Nada bajado de redes sociales ni de medios.
- Pon siempre el mes de la foto: un bache puede haberse tapado.
- La foto es del bache, no de personas ni de negocios.

Cuando haya fotos reales, borra las cuatro `ejemplo-*.jpg` y sus entradas.
