# Atlas Link — experiencia compacta V5

## Corrección del usuario

El usuario aprobó la claridad del login V4, pero rechazó sus fotos, formas decorativas y colores oscuros. Valoró la plataforma en 60/100 y la experiencia en 55/100: los números ocupaban componentes demasiado anchos y altos, y la alineación no ayudaba a trabajar. Esta iteración replantea la composición para priorizar información y acciones.

## Dirección

- Login abierto y tipográfico, sin fotografías, órbitas ni esferas. Botón iris pastel con texto legible. Perfiles demo compactos junto al acceso, con autofill sin envío automático.
- Navegación horizontal de dos franjas en escritorio; menú accesible en móvil. Un único eje de alineación para la cabecera, los datos y las tablas.
- Métricas abiertas, sin tarjetas voluminosas para una cifra. Cuentas y organizaciones pasan al espacio principal; la analítica 3D ocupa una columna lateral proporcionada.
- Filtros de trabajo sobre cuentas recientes, identificados como tales; los datos acumulados no se confunden con esa muestra. Accesos claros al listado completo.
- Paleta blanca/perla/periwinkle, controles ligeros y texto contrastado. La densidad se obtiene de la estructura, no reduciendo la legibilidad o los objetivos táctiles.
- Reportes, tablas, formularios e importación comparten la nueva escala. La landing conserva la composición aceptada.

## Contratos conservados

No cambia el backend, el alcance del producto ni los datos sintéticos. Se mantienen roles, rutas, autenticación, estados y acciones autorizadas por la API. Los valores ausentes siguen ausentes. El pastel conserva valores y proporciones; la nueva propiedad `density` cambia su disposición, no su geometría ni el renderizado bajo demanda.

## Coordinación

Root: sistema común, reportes, integración y validación. `soft_workspace_v4`: nuevo espacio de trabajo, dashboard y cuentas. `soft_login_v4`: acceso. `pie_sculpture_v4`: densidad de visualizaciones. Los nombres de agentes identifican hilos reutilizados; la implementación actual es V5.

## Referencia y validación

La comparación directa del inicio hospitalario a 1440 × 900 registra:

| Medida | V4 | V5 |
| --- | ---: | ---: |
| Altura de indicadores | 154 px | 83 px |
| Inicio de la tabla | 1313 px | 405 px |
| Filas completas visibles al abrir | 0 | 6 |
| Altura del documento | 2102 px | 1186 px |

El pastel completo y su leyenda quedan entre y=412 e y=729. En móvil 390 × 844, la altura del inicio hospitalario baja de 3228 a 2219 px. Fuentes: `evidence/premium-v5/workspace-review-final.json` y las revisiones integradas V4/V5. La consola a 1440 × 900 queda en 921 px; a 1440 × 1000 el documento mide al menos la altura de la ventana, por lo que no se comparan esas dos cifras como si fueran contenido distinto.

La revisión visual cruzada está documentada en `docs/review-compact-v5.md`. Detectó y confirmó la corrección de fechas móviles con saltos de línea inconsistentes. La revisión automática integrada detectó dos colores insuficientes en el directorio de hospitales; se corrigieron manteniendo los fondos claros.

Pruebas específicas completadas:

- Revisión integrada final sobre la demo empaquetada: 36 vistas, 16 comprobaciones de interacción y cero errores registrados. Incluye landing, ambos accesos, módulos hospitalarios, detalle de cuenta y consola; navegación, ayuda, perfiles y datos sintéticos. Evidencia: `evidence/redesign/compact-v5-final/report.json`.
- Acceso: seis vistas a 1440, 390 y 320 px, nueve comprobaciones de perfiles, autenticación y cuenta desactivada; sin errores registrados. Evidencia de desarrollo: `evidence/calm-v5-login/review.json`.
- Espacio de trabajo: cuatro vistas y ocho interacciones, sin errores ni infracciones Axe detectadas. Evidencia: `evidence/premium-v5/workspace-review-final.json`.
- Visualización compacta sobre la demo empaquetada: siete comprobaciones de tamaños, interacción por teclado/toque, alternativa SVG y ausencia de renders durante 700 ms de reposo. Evidencia: `evidence/density-v5/density-review.json`.
- Reportes sobre la demo empaquetada: diez comprobaciones y seis vistas; filtros, métricas contrastadas con API, ausencia de resultados y restauración. Evidencia: `evidence/compact-v5/report-visual-review.json`.

Comandos reproducibles desde `qa/`:

```sh
QA_BASE_URL=http://127.0.0.1:4430 node redesign-review.mjs compact-v5-final
QA_BASE_URL=http://127.0.0.1:4430 node density-review.mjs
QA_BASE_URL=http://127.0.0.1:4430 node report-visual-review.mjs
```

Ejecutarlos en secuencia: utilizan el mismo Chrome local por CDP en el puerto 9430. La compilación de producción y ESLint pasan. La demo se sirve en `http://localhost:4430`; los demás servicios y los datos permanecen en el entorno local de Docker.

Las comprobaciones son locales sobre Chrome/macOS, con móvil emulado. No implican aceptación estética ni validación en Windows, Android, iOS o Safari físicos. Las evidencias V4 son históricas.
