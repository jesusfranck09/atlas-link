# Atlas Link — dirección visual V3

El usuario rechazó las dos direcciones anteriores y confirmó expresamente: **tecnología de lujo, blanco, grafito, acentos violeta, vidrio sutil y gráficas 3D protagonistas**. Esta dirección sustituye los contratos visuales anteriores; pasar comprobaciones técnicas no equivale a aceptación estética del usuario.

## Implementación

- Landing recompuesta: introducción editorial centrada, arquitectura hospitalaria real protagonista, panel de analítica translúcido, módulos de cuenta y reglas, fotografía humana, selector de perspectivas, licencias y formulario comercial conectado a la API.
- Geist Variable local, grafito `#242429`, iris `#6b4bd1`, superficies blancas/neutras. El violeta se concentra en interacción y visualización; los estados conservan su semántica.
- Login con fotografía arquitectónica a sangre, formulario legible y perfiles de demostración que autocompletan correo y contraseña sin enviar automáticamente.
- Portal hospitalario con métricas abiertas, distribución volumétrica de preauditoría, acciones según rol, cuentas recientes y volumen recibido. Consola con uso real de licencias por hospital.
- En móvil, el resumen de cuentas conserva referencia, importe, estado y enlace sin desplazar la tabla lateralmente. Las tablas operativas extensas mantienen desplazamiento dentro de su propio contenedor.
- Fotografías de cámara, sin generación IA: autoría, procedencia y licencia en `assets-v3.md`. No se presentan como hospitales clientes ni como avales.
- Se retiraron la escena anterior de tarjetas inclinadas, su CSS, la maqueta antigua y el runner específico de esa escena.

## Gráficas y datos

`AnalyticsSculpture` usa Three.js con importación dinámica al entrar en pantalla. Anillo extruido y barras biseladas, cámara ortográfica, materiales satinados, iluminación de estudio procedural, DPR limitado a 1.5 y renderizado bajo demanda. Una alternativa SVG existe antes de cargar JavaScript y permanece disponible al fallar WebGL. Controles mediante teclado y tacto, leyenda con valores exactos y tabla accesible. Movimiento reducido evita interpolaciones y desplazamientos del puntero.

La landing usa ejemplos explícitamente ficticios. Los dashboards consumen `/dashboard`, `/tenants` y `/licenses`: no se inventaron ingresos, crecimiento o series históricas. Un único periodo se presenta como un único periodo. Los valores de uso no disponibles permanecen no disponibles. La gráfica no escribe datos de negocio.

## Participación y revisión

Root integra landing, componentes comunes, marca, compilación y pruebas. `interface_designer_senior` inspeccionó versiones anteriores, seleccionó fotografías y revisó pantallas renderizadas. `explorer` documentó contratos y datos. `frontend_experience_engineer` implementó portales y login. `visual_effects_3d_engineer` implementó y probó geometrías, interacción, fallback y recursos.

La revisión visual independiente detectó cuatro defectos que se corrigieron: fotografía humana recortada sobre los rostros; demasiado espacio antes de la fotografía principal; palabras concatenadas en títulos móviles; estado de cuentas fuera del resumen móvil. Se conservaron las observaciones en `review-premium-v3.md` y las capturas en `evidence/premium-v3-review/` y `evidence/premium-v3-portal/`.

## Verificación y límites

Los runners son `qa/redesign-review.mjs`, `qa/sculpture-review.mjs`, `qa/performance-smoke.mjs` y `qa/premium-capture.mjs`. Los reportes indican URL, fecha, navegador y comprobaciones. Los resultados previos con errores se conservan como evidencia de iteración; no deben leerse como aprobación final.

Las comprobaciones locales en Chrome sobre macOS y tamaños móviles emulados no certifican dispositivos Windows, Android, iOS ni Safari reales. Las observaciones de carga sobre loopback sin limitación de red/CPU no representan rendimiento de campo. Esta revisión visual no cambia el alcance comercial ni cierra las limitaciones de producción documentadas en README.

### Resultado integrado de la versión empaquetada

La compilación optimizada de Next.js y TypeScript pasó en Docker. ESLint pasó en el árbol de trabajo. Los seis servicios de la presentación están activos y saludables; solo se sustituyó el contenedor web.

`evidence/redesign/premium-v3-final/report.json`: **36 vistas**, **16 comprobaciones de interacción**, **0 errores registrados**, **0 incidencias Axe detectadas**. Incluye landing, ambos accesos, dashboard y módulos hospitalarios, detalle de cuenta, módulos de consola, seis perfiles activos, autocompletado, mostrar contraseña, ayuda y menú móvil. El número de cuentas sintéticas de negocio se mantuvo en 20. Chrome 153/macOS, escritorio 1440 y móvil 390 emulado.

La revisión visual independiente verificó las cuatro correcciones en las capturas finales, sin nuevos defectos visuales críticos en esas superficies. La aceptación estética corresponde al usuario.

`evidence/premium-v3/sculpture-review.json`: **13/13 comprobaciones** de la gráfica en la versión Docker 4430; cero errores. Renderizado WebGL real, selección por teclado y tacto, alternativa SVG, pérdida y recuperación de contexto, 0 fotogramas en reposo y desmontaje sin crecimiento de recursos en tres ciclos. La suite de movimiento se ejecutó secuencialmente con preferencia explícita para evitar interferencias de pruebas concurrentes sobre CDP.

`evidence/premium-v3/performance-smoke.json`: 12 muestras completas, sin errores. Medianas locales: landing escritorio LCP 88 ms / CLS 0.00194, landing móvil emulado LCP 84 ms / CLS 0; login escritorio LCP 72 ms / CLS 0.00371 y móvil LCP 112 ms / CLS 0. La landing transfirió aproximadamente 748 KB en escritorio y 666 KB en móvil, con una tarea inicial larga de 86–89 ms; los accesos, 289–293 KB y ninguna tarea larga observada. Son medidas de carga local, sin limitar red ni CPU. La descarga y puesta en marcha de la escena tienen un coste; su trabajo continuo en reposo es cero según la suite de gráficos. No se interpreta este laboratorio como garantía de dispositivos reales.
