# Bache Run — Plan de producción

Juego de carreras arcade de karts ambientado en Torreón. Es una sátira de los problemas cotidianos de La Laguna: baches, fugas, tolvaneras, calor, apagones, obras eternas y transporte prometido que nunca llega.

Diseño de pantallas (21 artboards): https://claude.ai/artifact/UCSnrukL7TmQUBfg9Gh7po

## 1. Visión

| | |
|---|---|
| Género | Carreras arcade con objetos, 8 pilotos por carrera |
| Plataforma | Navegador (escritorio y móvil), instalable como PWA |
| Sesión típica | Una carrera de 3 vueltas dura 2 a 3 minutos |
| Gancho | El rival más peligroso es la calle: la **suspensión** es un recurso que se gasta con cada bache |
| Tono | Humor local, cariñoso y con coraje. Nos burlamos de los problemas, no de las personas |

Es un juego original del género de karts: nombre, pilotos, objetos, pistas, arte y música son propios. No se copia ningún personaje, pista ni elemento de otros juegos.

### Lineamientos de sátira

1. El blanco son los problemas y las instituciones en abstracto, nunca personas reales con nombre.
2. Pilotos, dependencias y marcas son ficticios o parodias evidentes. Sin logotipos reales.
3. Los lugares reales (Cerro de las Noas, río Nazas, Canal de la Perla, bulevares) aparecen estilizados.
4. Nada de burla a víctimas, violencia real ni grupos vulnerables.
5. Sin dinero real: los "pesos" solo se ganan jugando.

## 2. Diseño de juego

### Mecánica central: suspensión

- Cada vehículo tiene un medidor de suspensión (0 a 100).
- Bache chico: frena. Bache grande: quita suspensión. Bache hondo: quita mucha y trae cono.
- Al llegar a 0 hay ponchadura: 2 segundos detenido y la suspensión vuelve a 50.
- La llanta de refacción absorbe un golpe. Esquivar baches seguidos da medallas y pesos.
- Al terminar se muestra el **recibo de daños** (lo que habría costado en un taller) y un **reporte ciudadano** con folio.

### Pilotos (cada uno con su vehículo)

Estadísticas de 1 a 10: velocidad, aceleración, manejo, suspensión.

| Piloto | Vehículo | Vel | Ace | Man | Sus | Habilidad |
|---|---|---|---|---|---|---|
| Doña Lonches | Triciclo lonchero turbo | 5 | 9 | 8 | 3 | El turbo de gordita dura 30% más |
| El Repartidor | Moto de reparto | 7 | 9 | 9 | 2 | Cabe entre dos vehículos |
| La Godínez | Sedán a 60 meses | 7 | 6 | 7 | 5 | Equilibrada, sin debilidades |
| La Inge | Pick-up de obra | 6 | 5 | 6 | 8 | Los conos no la frenan |
| El Lechero | Camión lechero | 6 | 6 | 5 | 7 | Deja charco de leche al derrapar |
| El Pipero | Pipa de agua | 8 | 3 | 4 | 9 | Inmune a charcos y fugas |
| El Rutero | Camión de ruta | 9 | 2 | 3 | 10 | Empuja a los ligeros |
| El Candidato (desbloqueable) | Camioneta con perifoneo | 8 | 7 | 5 | 6 | Sus promesas falsas se ven más reales |

### Pistas: Copa Lagunera

| # | Pista | Inspiración | Peligros y sátira |
|---|---|---|---|
| 1 | Bulevar Bachependencia | Blvd. Independencia y centro | Baches, alcantarillas sin tapa, obra eterna; atajo por el túnel del Canal de la Perla |
| 2 | Carril Fantasma | Blvd. Revolución | Carril confinado y estaciones abandonadas del transporte que nunca llegó |
| 3 | Lecho Seco | Lecho del río Nazas | Arena, tolvaneras; en la vuelta 3 abren las compuertas y cambia la ruta |
| 4 | Subida al Cristo | Cerro de las Noas | Curvas de montaña, teleférico detenido, vista de la ciudad entre polvo |

Post-lanzamiento: Periférico Sin Fin (tráfico pesado y puente inconcluso) y Zona Industrial (humo y visibilidad).

### Objetos (cajas de despensa)

| Objeto | Efecto |
|---|---|
| Gordita de chicharrón | Turbo de 2 s; tres seguidas calientan el motor |
| Bache portátil | Se suelta atrás; quien cae pierde suspensión |
| Conos de obra | Barrera de tres conos |
| Tolvanera | Nube de polvo que tapa la vista a los de adelante |
| Fuga de agua | Charco resbaloso que dura toda la carrera |
| Llanta de refacción | Protege de un bache o un golpe |
| Agente de tránsito | Persigue al primer lugar: lo detiene 2 s o le cobra $200 |
| Promesa de campaña | Caja falsa: parece objeto y no entrega nada |

Reparto por posición: los de atrás reciben mejores objetos; el primer lugar recibe sobre todo promesas.

### Eventos de pista

Apagón (8 s a oscuras), golpe de calor (el turbo calienta más), compuertas abiertas (Lecho Seco), obra sorpresa (cierran un carril).

### Modos

- **Gran Premio**: 4 pistas, puntos 10-8-6-5-4-3-2-0.
- **Carrera rápida**: una pista.
- **Contrarreloj**: sin rivales ni objetos, con fantasma de tu mejor tiempo.
- Dificultades: Domingo temprano, Hora pico, Quincena con lluvia.
- Post-lanzamiento: pantalla dividida para 2.

### Progresión: El Yonke

Los pesos compran piezas (amortiguadores, llantas, aire acondicionado, claxon) y pinturas. Máximo dos piezas por carrera. Pilotos y pistas extra se desbloquean con logros.

## 3. Pantallas

Todas están diseñadas en el lienzo enlazado arriba, a 1280×720 salvo las móviles.

| # | Pantalla | Archivo en el lienzo |
|---|---|---|
| 01 | Aviso de sátira | `Aviso` |
| 02 | Título | `Main` |
| 03 | Menú principal | `Menu` |
| 04 | Modo de juego y dificultad | `Modos` |
| 05 | Selección de piloto | `Pilotos` |
| 06 | Copa y pista | `Pistas` |
| 07 | Carga | `Carga` |
| 08 | Parrilla y semáforo | `Salida` |
| 09 | HUD de carrera | `HUD` |
| 10 | Guía de objetos y eventos | `Objetos` |
| 11 | Pausa | `Pausa` |
| 12 | HUD táctil (844×390) | `HUDMovil` |
| 13 | Resultados de carrera | `Resultados` |
| 14 | Recibo de daños y reporte ciudadano | `Recibo` |
| 15 | Podio de copa | `Podio` |
| 16 | Récords contrarreloj | `Records` |
| 17 | Ajustes | `Ajustes` |
| 18 | Controles | `Controles` |
| 19 | El Yonke | `Yonke` |
| 20 | Créditos | `Creditos` |
| 21 | Gira tu dispositivo (390×844) | `Gira` |

Flujo: Aviso → Título → Menú → Modo → Piloto → Pista → Carga → Salida → Carrera (HUD, Pausa) → Resultados → Recibo → siguiente pista o Podio → Menú.

Identidad visual: señalética vial mexicana. Amarillo preventivo `#FFC61A`, naranja de cono `#FF5A1F`, verde de señal carretera `#0B6B4A`, asfalto `#1B1A1D`, arena `#F6ECD6`. Tipografías: Bowlby One (rótulos), Barlow Condensed (señales), Barlow (texto).

## 4. Herramientas

| Área | Herramienta | Por qué |
|---|---|---|
| Lenguaje y build | TypeScript + Vite | Arranque rápido, tipado, recarga en caliente |
| Render 3D | Three.js | Corre en cualquier navegador y móvil; se comparte con un enlace |
| Física | Controlador arcade propio + `three-mesh-bvh` para raycasts | El manejo de karts se siente mejor a mano que con física realista |
| UI | HTML y CSS sobre el canvas | Las 21 pantallas son texto y listas; el DOM es accesible y fácil de traducir |
| Audio | Howler.js | Sprites de audio, desbloqueo en móvil |
| Modelado | Blender, exportando glTF | Estándar y gratuito |
| Optimización de assets | `gltf-transform` (Draco/Meshopt, KTX2) | Peso de descarga en móvil |
| Arte provisional | Paquetes CC0 de Kenney | Prototipar sin bloquearse por arte |
| Trazo de pistas | Curvas en Blender + JSON de metadatos (checkpoints, baches, cajas) | Editar pistas sin tocar código |
| Referencia de calles | OpenStreetMap (atribución ODbL) | Trazado estilizado de bulevares reales |
| Diseño de UI | Lienzo de diseño (enlace arriba) | Fuente de verdad de pantallas |
| Música y efectos | LMMS o BeepBox, jsfxr, grabaciones propias | Cumbia y norteño originales en clave chiptune |
| Pruebas | Vitest (lógica) y Playwright (humo en navegador) | Regresiones de vueltas, objetos y menús |
| Calidad | ESLint, Prettier | Consistencia |
| CI/CD | GitHub Actions + GitHub Pages | Cada push a `main` publica una versión jugable |
| Gestión | GitHub Issues: un epic por fase con sub-issues | Ya vive junto al código |

Motor alternativo descartado: Godot. Es más cómodo para editar escenas, pero el objetivo es que el juego se comparta con un enlace y cargue rápido en el teléfono.

### Estructura de carpetas propuesta

```
src/
  core/      bucle, estados, input, guardado
  race/      vehículo, pista, checkpoints, baches, objetos, IA
  render/    escena, cámara, efectos
  ui/        pantallas y HUD
  audio/
  data/      pilotos, pistas, objetos, textos (JSON)
public/assets/  modelos, texturas, audio
docs/
tests/
```

## 5. Fases

Cada fase es un epic en GitHub con sus sub-issues. Cada una termina con algo jugable publicado.

| Fase | Entregable | Criterio de salida |
|---|---|---|
| 0. Preproducción y cimientos | Repo con build, CI y despliegue; GDD cerrado | Un push a `main` publica una página en Pages |
| 1. Prototipo de manejo | Un vehículo en pista de cajas grises con vueltas | Manejar se siente divertido sin arte ni rivales |
| 2. Vertical slice | Bulevar Bachependencia con baches, suspensión, IA básica y HUD | Una carrera completa de principio a fin contra 7 rivales |
| 3. Sistemas de juego | Objetos, eventos, IA completa, modos, guardado | Un Gran Premio de una pista repetida se juega completo |
| 4. Contenido | 4 pistas, 8 pilotos, textos | La Copa Lagunera completa es jugable |
| 5. Interfaz | Las 21 pantallas, táctil, es/en | Se navega todo con teclado, mando y dedo |
| 6. Audio y pulido | Música, efectos, partículas, clima | El juego se siente terminado |
| 7. QA y lanzamiento | Rendimiento, balance, accesibilidad, PWA, v1.0 | 60 fps en escritorio, 30 fps en un móvil de gama media |
| 8. Post-lanzamiento | Pantalla dividida, pistas extra, récords en línea | Backlog priorizado según respuesta |

Dependencias: 0 → 1 → 2 son secuenciales. A partir de la fase 2, sistemas (3), contenido (4) e interfaz (5) pueden avanzar en paralelo. Audio (6) necesita el slice. QA (7) cierra todo.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| El manejo no se siente bien | La fase 1 no se cierra hasta que lo sea; parámetros expuestos en un panel de ajuste |
| El arte 3D frena todo | Paquetes CC0 primero; estilo low-poly de colores planos |
| Rendimiento en móvil | Presupuesto desde la fase 2: menos de 150 draw calls y menos de 15 MB de descarga inicial |
| La sátira se lee como ataque personal | Lineamientos de la sección 1 y revisión de textos antes de lanzar |
| Alcance | La v1.0 son 4 pistas y un jugador; todo lo demás va a la fase 8 |
