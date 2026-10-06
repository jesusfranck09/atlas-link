# Atlas Link — refinamiento visual V4

## Petición atendida

Conservar la esencia editorial de la landing V3 y mejorar sus acabados. Reemplazar el login dividido y la composición rígida del portal. Usar blanco, perla, grafito e iris, curvas suaves y gráficas de pastel 3D completas.

## Implementación

- Landing: conserva fotografías reales, contenido y composición; refina navegación, controles, superficies de vidrio y detalles al interactuar. No utiliza imágenes generadas por IA.
- Accesos: formulario central sin tarjeta exterior, fotografías en arcos laterales y perfiles demostrativos seleccionables. Seleccionar un perfil rellena los campos; entrar sigue siendo una acción separada.
- Portal hospitalario y consola Atlas: navegación flotante, métricas sobre superficies redondeadas y controles cápsula. La visualización principal admite distribución y comparación/volumen según la información disponible.
- Analítica: pastel de sectores cerrados con extrusión, materiales e iluminación Three.js. Las leyendas mantienen valores legibles; la selección también funciona mediante teclado. Reportes incorpora cuentas por aseguradora y estados de preauditoría con los filtros existentes.
- El iris coordina las gráficas. Los estados de alerta conservan etiquetas y colores semánticos. No se inventan tendencias ni series que el backend no devuelve.
- Formularios y recorridos secundarios comparten superficies y controles de la misma dirección visual.

## Responsabilidades

Coordinación, landing, estilos globales, reportes e integración: agente principal. Login: `soft_login_v4`. Workspace, paneles y consola: `soft_workspace_v4`. Visualizaciones y pruebas específicas: `pie_sculpture_v4`.

## Validación

- Compilación optimizada Next.js/TypeScript en Docker y ESLint: sin errores. Solo se sustituye el contenedor web; los seis servicios locales permanecen saludables.
- `evidence/redesign/premium-v4-final/report.json`: 36 vistas y 16 comprobaciones de interacción en la versión optimizada de `http://127.0.0.1:4430`; cero errores, cero desbordamientos y cero incidencias Axe detectadas. Comprueba ambos accesos, perfiles activos, hospital, reportes, cuentas y detalle, importación, convenios, usuarios, auditoría, consola, licencias y solicitudes. Conserva las 20 cuentas sintéticas.
- `evidence/premium-v4/sculpture-review.json`: 17/17 comprobaciones sobre la versión optimizada. Pie con valores 3/6/9 de la API, selección por geometría/teclado/tacto, movimiento reducido, pérdida y recuperación de contexto, SVG y desmontaje. La escena de pastel registró 20,980 triángulos, ocho llamadas de dibujo y cero renders durante la ventana de un segundo en reposo; no es una medida de FPS ni una garantía de batería.
- `evidence/soft-v4-login/review-final.json`: ocho vistas de desarrollo a 1440, 820, 390 y 320 px, y once comprobaciones de autocompletado, mostrar/ocultar contraseña, autenticación real y cuenta desactivada. Sin errores JS, desbordamientos ni incidencias Axe detectadas.
- `evidence/premium-v4/performance-smoke.json`: 12 muestras de carga inicial de landing/login, escritorio y móvil emulado, sin errores. Medianas locales LCP: landing 80 ms en ambas vistas; login 84 ms escritorio y 64 ms móvil. CLS mediano entre 0 y 0.00055. Landing: aproximadamente 716/629 KB transferidos y una tarea inicial larga de 85/86 ms; login: 280/242 KB, ninguna tarea larga observada. Laboratorio sobre loopback sin limitar CPU/red; no mide rendimiento de campo ni INP.
- `evidence/premium-v4/workspace-review-final.json`: revisión de los dos dashboards en escritorio y móvil, incluidos sus selectores de pie/barras.
- Inspección visual de capturas reales del login, dashboards, reportes, directorio y landing. Revisión cruzada de login y landing documentada en `review-visual-v4.md`.

La primera iteración integrada se conserva en `evidence/redesign/premium-v4-iteration-1`: detectó contraste insuficiente en la nota de licencias, ya corregido, y se interrumpió por cierre de su contexto del navegador. La ejecución final anterior completó el recorrido. Los reportes V3 son históricos y no verifican V4.

Después del recorrido completo se ajustó la separación de métricas en reportes, la forma cápsula del buscador común y la geometría del pastel con una sola categoría, eliminando una costura radial artificial. La compilación optimizada y el lint del componente pasaron. `evidence/premium-v4/report-visual-review.json` verifica el último build: 10 comprobaciones, seis vistas, cero errores y cero incidencias Axe detectadas; compara valores contra API, filtra una sola aseguradora, comprueba periodo vacío y descarga deshabilitada, y restaura filtros. Se revisó visualmente el disco continuo en la captura final.

## Límites

Los datos son sintéticos. Esta entrega cambia la presentación, no amplía el alcance clínico ni los servicios backend. Las comprobaciones en navegador local y móvil emulado no sustituyen pruebas en dispositivos Windows, Android e iOS reales ni aceptación estética del usuario.
