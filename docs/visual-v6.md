# Atlas Link — composición y materiales V6

## Encargo

El usuario aprecia la lógica de negocio, rechaza el acceso V5 por convencional y valora el portal en 50/100 de diseño. Solicita una interfaz clara, cuidada y expresiva, con imágenes reales, liquid glass, efectos contenidos y gráficas 3D con mayor presencia. Esta iteración sustituye la composición del acceso y el lenguaje visual operativo. La calificación estética corresponde al usuario.

## Dirección compartida

Blanco hielo y grafito legible, con acentos violeta, cyan y apricot. Los tonos de estados conservan una secuencia reconocible: cyan para sin alertas, apricot para revisión y rosa para atención prioritaria, acompañados siempre de etiquetas. Las comparativas por organización utilizan una paleta categórica violeta/cyan/apricot.

El acceso combina fotografía humana y formulario abierto en una composición asimétrica. Los perfiles demo continúan rellenando los campos sin enviar automáticamente el formulario. El portal conserva el trabajo visible, integra fotografía arquitectónica en una franja pequeña y usa vidrio en la navegación y el área analítica, con superficies de lectura más opacas para las tablas. La escala compacta y los datos de negocio se conservan.

Las fotografías ya existentes se sirven localmente y tienen procedencia registrada en `docs/assets-v3.md`. Son ilustrativas: no se presentan como personal, instalaciones o clientes de Atlas Link. No se generan imágenes con IA.

## Responsabilidades

- Root: dirección compartida, estilos de componentes comunes, reportes, integración, comprobación y entorno local.
- `soft_login_v4`: reemplazo de composición y CSS del acceso.
- `soft_workspace_v4`: shell, dashboard, directorios y tablas del portal.
- `pie_sculpture_v4`: acabado de cristal, materiales y pruebas de las gráficas.
- `visual_review_v6` (`interface_designer_senior`): revisión independiente sobre capturas reales; sin editar frontend ni compartir el navegador de QA.

Los nombres de hilos se reutilizan; no identifican la versión de la entrega.

## Criterios de comprobación

1. Formulario abierto, fotografía con encuadre completo de los rostros y perfiles fáciles de seleccionar; sin desbordamiento a 320 px.
2. Tabla y gráfico completos en el área inicial de escritorio, indicadores compactos y ejes alineados; móvil prioriza tareas.
3. Cristal perceptible mediante reflejos, bordes e iluminación, con contraste legible. La falta de soporte de desenfoque conserva una superficie utilizable.
4. Proporciones y valores de gráficas conservados. Selección por teclado/toque, movimiento reducido y alternativa SVG cuando no hay WebGL.
5. Renderizado bajo demanda y sin bucle en reposo. Las mediciones locales no representan teléfonos físicos ni rendimiento de campo.

## Validación

La revisión de desarrollo del acceso cubre seis vistas (1440, 390 y 320 px, ambos accesos), nueve comprobaciones de perfiles y autenticación, sin errores JavaScript, desbordamientos ni infracciones Axe detectadas. Los textos de perfiles tienen al menos 12 px y los campos 16 px. Evidencia: `evidence/expressive-v6-login/review.json`.

La revisión de desarrollo del portal cubre cuatro vistas y ocho interacciones, sin errores JavaScript, desbordamientos ni infracciones Axe detectadas. A 1440 × 900 se ven seis filas completas, indicadores de 78 px de alto, fotografía contextual de 260 × 72 px y columna analítica de 406 px. Evidencia: `evidence/expressive-v6-workspace/review.json`. El último ajuste de texto acorta «Hospitales conectados» a «Hospitales» en el indicador para alinear los números móviles; la tabla mantiene su título completo.

La revisión visual independiente está en `docs/review-glass-v6.md`. Las capturas no prueban movimiento ni rendimiento y no sustituyen la preferencia estética del usuario. Referencia anterior: `evidence/redesign/compact-v5-final/`.

La visualización opta por `finish="glass"` en el portal y reportes; la landing conserva `standard`. Usa material físico con transmisión 0.8, IOR 1.46 y reflexión de estudio. La normal óptica modifica reflejos y refracción sin alterar la silueta ni los sectores derivados de los datos. La captura final revisada es `evidence/glass-v6/final-glass-panel.png`.

Las doce comprobaciones especializadas de `qa/glass-review.mjs` pasan sobre desarrollo: valores 3/6/9 contrastados con la API, disco de una categoría, barras, selección por teclado/toque, movimiento reducido, alternativa SVG y pérdida/restauración del contexto gráfico. Se observaron cero renders durante un segundo de reposo; el pastel utilizó 27,988 triángulos y ocho llamadas de dibujo. El DPR está limitado a 1.5 y el buffer de transmisión compartido usa media resolución. Esto no constituye una medida de FPS ni una prueba en móviles físicos. Evidencia: `evidence/glass-v6/glass-review.json`.

Referencias técnicas consultadas por el especialista: [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) y [WebGLRenderer.transmissionResolutionScale](https://threejs.org/docs/pages/WebGLRenderer.html#transmissionResolutionScale), contrastadas con Three.js 0.186.1 instalado.

La revisión integrada sobre `http://127.0.0.1:4430` cubre 36 vistas y 16 comprobaciones de interacción: cero errores registrados y cero infracciones Axe detectadas. Incluye los módulos hospitalarios, consola, accesos y landing. Los reportes pasan diez comprobaciones y seis vistas, con valores contrastados con API, filtros y estados sin resultados. Evidencia: `evidence/redesign/glass-v6-final/report.json` y `evidence/glass-v6/report-visual-review.json`.

Root inspeccionó la captura integrada `evidence/redesign/glass-v6-final/mobile-admin-viewport.png`: la etiqueta «Hospitales» ocupa una línea y los valores de la primera fila comparten línea base. El ajuste visual pendiente queda cerrado. La captura de escritorio confirma que la demo empaquetada incluye el material final, con su banda de reflejo.

Compilación de producción y ESLint correctos. Las comprobaciones se ejecutaron con Chrome 153 en macOS y móviles emulados; no certifican Windows, Android, iOS o Safari físicos. El servicio local permanece en `http://localhost:4430`.

La observación de carga se completó con doce muestras locales (tres por ruta y viewport, landing y login). El login no registró tareas largas en esas muestras; la landing registró una de aproximadamente 86 ms de mediana. No hubo errores y se verificó movimiento reducido. Son lecturas en loopback, sin limitar CPU/red y con ventanas de observación de 2.5 segundos: no representan Core Web Vitals de campo, dispositivos físicos ni la sesión completa. Informe y metodología: `evidence/glass-v6/performance-smoke.json`.

Comandos de revisión integrada, desde `qa/`, ejecutados en secuencia para preservar el Chrome CDP compartido:

```sh
QA_BASE_URL=http://127.0.0.1:4430 node redesign-review.mjs glass-v6-final
QA_BASE_URL=http://127.0.0.1:4430 node report-visual-review.mjs
ATLAS_PRODUCTION_URL=http://127.0.0.1:4430 node performance-smoke.mjs
```
