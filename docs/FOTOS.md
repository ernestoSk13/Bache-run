# Fotos de Torreón y cómo se vuelven renderizables

El juego usa fotos reales de Torreón con licencia libre, tomadas de Wikimedia Commons. Este documento lista las fotos, su atribución y las técnicas con las que se meten al mundo 3D.

## Fotos usadas

| Archivo en el juego | Foto original en Commons | Autor | Licencia |
|---|---|---|---|
| `fachada_galicia.jpg` | `File:Hotel Galicia, Torreón - 03.jpg` | ProtoplasmaKid | CC BY 4.0 |
| `fachada_teatro.jpg` | `File:Teatro Isauro Martinez.jpg` | Rodrigo.riverag | CC BY-SA 4.0 |
| `cerro_noas.png` | `File:Teleférico Torreón - 2026 - 05.jpg` | ProtoplasmaKid | CC BY 4.0 |
| `esp_cristo.jpg` | `File:Santuario del Cerro de las noas 10.jpg` | ProtoplasmaKid | CC BY 4.0 |
| `esp_plaza.jpg` | `File:PlazadeArmasTorreon.jpg` | Elias Garcia-Ortiz | CC BY-SA 2.0 |
| `esp_nazas.jpg` | `File:Nazas.jpg` | Alberto.G.Cisneros | CC BY-SA 4.0 |
| `esp_canal.jpg` | `File:Torreón, Coahuila (22947094385).jpg` | Comisión Mexicana de Filmaciones | CC BY-SA 2.0 |
| `esp_reloj.jpg` | `File:Reloj en la Plaza de Armas en Torreón.jpg` | B.jars | CC0 |
| `esp_plaza_mayor.jpg` | `File:Plaza Mayor Torreón 05.jpg` | BlatZzz | CC BY-SA 3.0 |

Cada página de origen es `https://commons.wikimedia.org/wiki/<nombre del archivo>`. Todas las imágenes fueron recortadas, reescaladas o rectificadas. Las obras derivadas de fotos CC BY-SA (los archivos de `public/assets/torreon/` marcados así) se comparten bajo la misma licencia que su original.

Pendiente antes de publicar: abrir cada página de Commons y confirmar autor y versión exacta de la licencia; aquí se anotó lo que devolvió la búsqueda de Commons.

## Técnicas implementadas

Todas viven en `tools/process_photos.py` (preparación) y `src/world.ts` (render).

1. **Fachada proyectada.** Se recorta la parte frontal de un edificio y, si la foto está tomada desde abajo, se corrige la perspectiva con una transformación de cuatro esquinas. El resultado es la textura de la cara de una caja. Así están hechos el Hotel Galicia y el Teatro Isauro Martínez. En el Galicia solo se usa la planta alta; la planta baja se dibuja con rótulos de parodia para no mostrar marcas reales.
2. **Silueta de horizonte.** De una foto del Cerro de las Noas se separa el cielo columna por columna (se busca dónde empieza la roca), se guarda como PNG con transparencia y se pega en un cilindro lejano al sur de la pista, sin niebla.
3. **Espectaculares.** Las fotos turísticas van tal cual sobre anuncios panorámicos con una leyenda satírica debajo. Es la forma más barata de meter una foto y además sirve al tono del juego.

## Técnicas investigadas para después

| Técnica | Qué da | Qué necesita |
|---|---|---|
| Huellas de edificios de OpenStreetMap extruidas | Las manzanas reales del centro | Descargar edificios con Overpass y extruirlos con `ExtrudeGeometry`. Desde este entorno Overpass no respondió, así que el trazo de la pista es propio |
| Relieve por mapa de profundidad | Fachadas con volumen (balcones, cornisas) | Un modelo de estimación de profundidad por foto y un plano desplazado |
| Fotogrametría | Modelo 3D texturizado de un edificio | 30 a 100 fotos propias alrededor del objeto y un programa como Meshroom o RealityScan |
| Gaussian splatting | Escenas fotorrealistas de una calle | Un video caminando la calle, entrenamiento con nerfstudio o Polycam, y un visor de splats para three.js. Pesado para móvil |
| Imagen a 3D con IA | Utilería rápida (puestos, estatuas) | Revisar licencia del servicio y limpiar la malla |

La ruta recomendada para sumar realismo sin perder rendimiento: más fachadas proyectadas con fotos propias tomadas de frente, y edificios de OpenStreetMap para la forma de las manzanas.

## Cómo agregar una foto

1. Elegir una foto con licencia libre (CC0, CC BY o CC BY-SA) y anotar autor y licencia en la tabla.
2. Guardar el original en una carpeta fuera del repo y agregar su recorte en `tools/process_photos.py`.
3. Correr `python3 tools/process_photos.py <carpeta> public/assets/torreon`.
4. Usar la textura en `src/world.ts`.

Wikimedia limita las descargas automáticas: conviene pedir miniaturas en tamaños estándar (por ejemplo 1280 px) y espaciar las peticiones.
