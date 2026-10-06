> HISTÓRICO: esta dirección fue rechazada por el usuario. La dirección vigente es V3, documentada en `docs/premium-v3.md`; estas comprobaciones no constituyen aceptación visual.

# Revisión visual del rediseño de Atlas Link

Fecha: 24 de septiembre de 2026. Revisión independiente de presentación, realizada sobre capturas reales de la aplicación local. Este documento registra lo observado; no es una certificación de accesibilidad, usabilidad ni preparación para producción.

## Evidencia y método

Se compararon las capturas anteriores de `evidence/production-smoke/` con las iteraciones de `evidence/redesign/`. Se inspeccionaron visualmente landing, acceso hospitalario, panel hospitalario, consola Atlas, listado y detalle de cuentas; escritorio de 1440 px y móvil emulado de 390 px. Se revisaron también los informes JSON producidos por la ejecución del navegador. La revisión visual y los resultados automatizados se distinguen a continuación.

Referencias principales:

- Antes: `evidence/production-smoke/desktop-landing.png`, `desktop-admin-dashboard.png`, `mobile-emulated-landing.png` y `mobile-emulated-admin-login.png`.
- Primera revisión: capturas de `evidence/redesign/iteration-1/`; se detectaron cinco problemas concretos.
- Correcciones de composición: `evidence/redesign/iteration-2/desktop-hospital-login.png`, `mobile-hospital-login.png`, `desktop-hospital.png`, `desktop-admin.png` y `mobile-landing.png`.
- Cierre de contención móvil: `evidence/redesign/iteration-3/mobile-hospital.png`, `mobile-hospital-accounts.png` y `report.json`.
- Contrato visual: [redisenio-visual.md](redisenio-visual.md).

## Resultado de los cinco hallazgos

| Hallazgo inicial | Corrección observada | Evidencia | Estado de esta revisión |
|---|---|---|---|
| Desbordamiento del documento móvil: landing a 580 px, panel hospitalario a 500 px y cuentas a 790 px pese a emulación de 390 px. | La franja blanca lateral desaparece. En la tercera iteración, las 18 vistas móviles registran `clientWidth`, `innerWidth`, `visualWidth`, ancho del documento y ancho configurado iguales a 390 px. Las tablas amplias quedan contenidas en su panel. | Capturas móviles hospital/cuentas e informe de `iteration-3`. | Corregido para las rutas y el tamaño comprobados. |
| Iconos de correo y contraseña fuera de los campos, con elementos del formulario pegados. | Iconos integrados en los inputs; etiquetas, campos y botón separados. Los perfiles demo mantienen nombres completos y una jerarquía legible. | Acceso hospitalario en escritorio y móvil de `iteration-2`. | Corregido visualmente. |
| Barra enorme para un único periodo sin comparación temporal. | El panel presenta un resumen con periodo, importe recibido, cantidad de cuentas y promedio. Explica cuándo estará disponible la evolución mensual. | Panel hospitalario de `iteration-2` y móvil de `iteration-3`. | Corregido; no se inventaron periodos para llenar la gráfica. |
| Preview de producto reducido a una miniatura de escritorio en la landing móvil. | Presentación móvil centrada en una cuenta, su importe, estado y recorrido. Los controles de rol y la información principal tienen una composición propia. | Landing móvil de `iteration-2`. | Corregido respecto a la miniatura anterior. |
| Consola Atlas ocupada por un bloque promocional y un estado vacío demasiado grande. | Tabla de organizaciones con licencia, uso, equipo y vigencia. Acciones de gestión próximas a esos datos. Actividad vacía compacta. | Consola Atlas de `iteration-2`. | Corregido visualmente. |

## Cambios de jerarquía comprobados

El panel hospitalario sitúa las cifras operativas antes que la información secundaria y elimina el anterior banner promocional. La navegación agrupa operación y gestión. La consola de la empresa muestra las organizaciones y su capacidad contratada, en lugar de repetir la navegación como una pieza publicitaria. El acceso combina fotografía real con formulario y selección de perfiles, conservando una versión móvil centrada en entrar.

La landing cambia el pequeño logo flotante por una representación de la cuenta hospitalaria y su recorrido. La paleta perla/cobalt, los títulos y las cifras comparten un sistema visible entre las superficies. Estos cambios son reconocibles en las capturas; no implican una evaluación con usuarios ni una garantía de preferencia estética.

## Comprobaciones automatizadas consultadas

El informe de `iteration-3` corresponde a Chrome `153.0.8010.53`, con 36 vistas entre escritorio y móvil, sobre la aplicación local empaquetada y datos sintéticos. Registra autenticación y navegación de lectura; los escenarios de perfiles demo, ayuda y navegación resultan satisfactorios. El número de cuentas de demostración se conserva en 20. La comprobación de movimiento reducido registra cero animaciones infinitas en ejecución.

Ese informe no contiene errores de JavaScript ni desbordamientos del documento. Sí contiene un hallazgo de axe en la bitácora móvil: `scrollable-region-focusable` sobre `.table-scroll`; por ello su resultado global es `passed: false`. El coordinador informó de una corrección posterior y una nueva compilación, pero esa nueva ejecución no forma parte de la evidencia inspeccionada para este documento. No debe presentarse `iteration-3` como una ejecución sin hallazgos de accesibilidad.

## Límites y revisión pendiente

La contención del documento móvil queda cerrada en las capturas revisadas. Las tablas conservan columnas fuera de la vista inicial; la captura estática no demuestra por sí sola la interacción de desplazamiento o su acceso por teclado.

El acabado final del borde inferior de la escena 3D y de su etiqueta superior móvil se revisa por separado con VFX. Se observaron recortes en la segunda iteración y el coordinador informó de ajustes posteriores; no se declara su cierre a partir de capturas anteriores.

No se probaron aquí dispositivos físicos Android/iOS ni navegadores de Windows. La revisión no sustituye pruebas funcionales, validación del backend o del motor financiero, ni evaluación con personal hospitalario.


## Verificación integrada posterior

Root ejecutó la comprobación final el 2026-09-24T15:43:04.803Z. Las 36 vistas pasaron, con cero errores JavaScript/HTTP 500, cero desbordamientos del documento y cero infracciones detectadas por axe en esa ejecución. Los 18 casos móviles conservaron el ancho configurado de 390 px. Se validaron los seis perfiles activos de demostración, autocompletado, mostrar/ocultar contraseña, ayuda y cierre con Escape. Los datos de negocio conservaron 20 cuentas.

La tabla de bitácora recibió foco de teclado y nombre de región después del hallazgo registrado en iteration-3. Evidencia posterior: `evidence/redesign/final/report.json`; capturas completas y de primer viewport en el mismo directorio. La revisión automatizada complementa las inspecciones visuales anteriores; no certifica accesibilidad completa ni sistemas operativos no ejecutados.

La escena pasó además seis capturas y cuatro comprobaciones de interacción, contención, teclado, touch emulado y movimiento reducido: `evidence/redesign/scene-review.json`. Root inspeccionó las capturas finales de escritorio y móvil. La composición usa CSS 3D y SVG, movimiento de puntero acotado y ningún bucle de animación permanente.

Validación técnica: ESLint y build Next.js de producción con TypeScript aprobados. Se reconstruyó exclusivamente la imagen web local; los microservicios y PostgreSQL conservaron sus datos. Entorno de presentación: `http://localhost:4430`.


## Carga y estabilidad tras reservar perfiles demo

La medición local detectó CLS 0.143 en el acceso hospitalario de escritorio al aparecer los perfiles. Se sustituyó el indicador corto de carga por seis celdas de geometría equivalente (una en consola Atlas), con estado accesible, sin identidades falsas ni animación. Se mantuvo la composición final y se repitió la compilación, TypeScript y ESLint.

`evidence/redesign/performance-smoke.json` contiene 12 muestras reales: tres repeticiones de landing y login en escritorio y móvil emulado, caché de navegador deshabilitada, observación de 2.5 segundos después de cargar. Resultado posterior:

| Vista | LCP mediano local | CLS mediano | Tareas largas observadas |
|---|---:|---:|---:|
| desktop · `/` | 120 ms | 0.000000 | 0 |
| desktop · `/login` | 108 ms | 0.000375 | 0 |
| mobile-emulated · `/` | 112 ms | 0.000000 | 0 |
| mobile-emulated · `/login` | 68 ms | 0.000000 | 0 |

Los controles de movimiento reducido no dejaron animaciones activas. La transferencia inicial observada fue aproximadamente 287 KiB para la landing y 296–297 KiB para el login. El informe conserva recursos, ventanas, muestras y limitaciones; `performance-before-login-stability.json` conserva la medición previa y documenta la corrección de agrupación del reporte.

Estas son observaciones de Chrome en macOS sobre loopback, sin limitación de CPU o red. No representan percentiles de usuarios, un resultado Lighthouse, INP, FPS ni pruebas en dispositivos físicos Windows/Android/iOS. La última modificación afectó únicamente el estado transitorio de carga de perfiles; las 36 vistas estables y los recorridos de autenticación se habían comprobado en la ejecución integrada precedente.
