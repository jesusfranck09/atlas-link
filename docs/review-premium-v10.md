# Sol visible y acabado de componentes V10

24 de septiembre de 2026. Petición: el sol V9 no se percibe y los componentes necesitan un acabado más cuidado.

## Cambios

- El disco solar tiene un núcleo dorado definido y un halo localizado. La fuente mide aproximadamente 61 px en la landing de escritorio y 28 px en móvil. La variante de mediodía conserva un margen despejado; tablet y móvil ubican el disco por encima del título. La iluminación general sigue siendo tenue.
- La cabecera de hospital y consola Atlas reserva un espacio para el sol o la luna. El origen anterior, oculto detrás de la fotografía o los paneles, se elimina del fondo del workspace. La fuente es decorativa, no un botón ni un indicador meteorológico.
- La hora local, actualización automática, pausa de reloj con pestaña oculta, render inicial neutro, movimiento reducido y contraste forzado mantienen el contrato V9.
- Landing: vidrio claro con bordes interiores, botones cápsula de la misma familia, superficies perladas en módulos y formularios. Se elimina el barrido brillante sobre la gráfica y el desplazamiento vertical del botón. La gráfica anular utiliza el acabado de vidrio existente, con render bajo demanda y fallback SVG. Su etiqueta central se desplaza 6 px hacia el hueco claro para mejorar lectura.
- Portales: navegación, filtros y controles coherentes; paneles con cantos finos, márgenes alineados, importes a la derecha y flechas discretas con estado de interacción. Se conserva la densidad de información y los objetivos táctiles. Los estilos compartidos nuevos se limitan a `[data-workspace]`.
- En el menú móvil, las secciones conservan su altura natural y el contenedor permite desplazarse: en 320 × 740 px la navegación se contraía y sus enlaces interceptaban «Centro de ayuda». La corrección evita que el pie se solape con los módulos.
- Login aprobado, contenido, acciones, permisos, contratos y cálculos conservados. Sin dependencias ni recursos gráficos nuevos.

## Coordinación

Root integra landing, la cabecera y la clase semántica de importe, y coordina validación y entrega. `pie_sculpture_v4` implementa las fuentes de luz; `premium_components_v10` refina los estilos del portal; `design_review_v10` aporta una revisión visual independiente; `daylight_v9_qa` ejecuta los recorridos de navegador. Archivos y responsabilidades delimitados.

## Evidencia

Antes: `evidence/premium-v10/before/`, a 1440 × 1000 px y hora local simulada 14:00. Después: `evidence/premium-v10/after/`, con capturas equivalentes y vistas de 390 y 320 px. Se compararon sol, legibilidad, retícula, material y densidad. El total central de la gráfica se ajustó a partir de esta revisión; el material WebGL se revisa después de completar su carga, junto al fallback inicial.

- Compilación de producción, TypeScript y ESLint correctos. Web local actualizada y seis servicios saludables.
- [Revisión dirigida](../evidence/premium-v10/after/review.json): **19/19 escenarios correctos**, sin errores de navegador ni consola. Cuatro fases de luz, discos despejados del texto y controles, fuentes de cabecera, cambio automático de hora, movimiento reducido, contraste forzado, filtros, tablas y ayuda modal.
- [Recorrido ampliado](../evidence/premium-v10/after/smoke/report.json): **42/42 vistas correctas** en landing, accesos, hospital y consola Atlas; sin errores de navegador, consola o HTTP ni infracciones axe detectadas. Las 20 cuentas sintéticas se mantienen sin cambios.
- [Gráfica final](../evidence/premium-v10/after/ring-review.json): captura con WebGL y acabado de vidrio confirmados, etiqueta central reubicada, sin errores. Axe no detectó infracciones de contraste y dejó ocho nodos con fondo/canvas pendientes de resolución automática; se revisó también la imagen. No equivale a una auditoría completa de contraste.
- Menú de hospital a 320 × 740 px: contenido de 839 px desplazable; menú de Atlas: 790 px. «Centro de ayuda», cierre por Escape y reapertura del menú funcionan. El defecto inicial y su geometría se conservan en `after/defect-menu-320.json`.

Entorno: Chrome en macOS; móvil emulado a 390 y 320 px. Autenticación y API reales contra microservicios/PostgreSQL locales, sin respuestas interceptadas ni modificación de información comercial. No se afirma validación física en Android/iOS/Windows, auditoría completa de accesibilidad ni medición de FPS o batería. La validación técnica y la revisión de capturas no sustituyen la aceptación estética del usuario.

Repetir desde `qa/`, con CDP disponible:

```sh
node premium-finish-review.mjs
ATLAS_SMOKE_OUTPUT=../evidence/premium-v10/after/smoke ATLAS_SMOKE_EXTENDED=true node production-smoke.mjs
```
