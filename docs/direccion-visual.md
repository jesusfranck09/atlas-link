# Dirección visual y revisión de acabado

Responsable de implementación: equipo frontend. Esta revisión conserva la identidad clara acordada y no modifica contratos ni funciones de negocio.

## Identidad aplicada

Atlas Link combina superficies marfil y blancas, tinta azul profunda, acentos teal y cobalt, tipografía Inter para operación y Manrope para marca/títulos. El isotipo geométrico «A + conexión» funciona como SVG local, conserva nitidez y no depende de imágenes externas. La fotografía hospitalaria es real e ilustrativa; su procedencia está documentada en `assets.md`.

La landing puede usar escala editorial, espacio y una escena de producto con volumen. Los espacios operativos deben priorizar estado de cuentas, acciones y comparación de cifras. El acabado premium se consigue con alineación, ritmo, legibilidad y respuesta de controles: no requiere elevar cada tarjeta, superponer vidrio ni animar continuamente tablas o formularios.

## Criterios concretos por superficie

| Superficie | Composición y comportamiento | Criterio de aceptación |
|---|---|---|
| Landing | Hero en dos columnas en escritorio; mensaje y acción antes de la escena en móvil. Flujo conceptual identificado, fotografía con recorte deliberado. | Ningún texto, CTA o sección fuera del ancho a 390 px; botones táctiles de al menos 44 px como objetivo de diseño; fotografía sin estirar. |
| Login | Marca y narrativa lateral en escritorio; formulario y perfiles prioritarios en móvil. Datos demo en botones completos con rol, nombre y correo. | Cada perfil rellena ambos campos sin iniciar sesión automáticamente; seleccionado y foco se distinguen por más que color; el correo es legible sin truncamiento crítico. |
| Consolas | Navegación lateral estable en escritorio, menú desplegable en móvil; acciones principales junto al título y métricas debajo. | Tablas con desplazamiento interno cuando sea necesario, sin desplazar la página completa; las operaciones y estados conservan sus nombres de dominio. |
| Cuenta | Resumen, estado y siguiente acción antes de detalle; dinero alineado y cifras tabulares; corrección e historial separados. | Etiquetas visibles para campos y errores; cambios pendientes de reevaluar identificables; confirmaciones explican la consecuencia de la acción. |
| Tablas/reportes | Jerarquía por texto, separadores y acentos semánticos. La prioridad usa etiqueta además de color. | Los importes conservan MXN y precisión; filtros legibles; estados vacíos/error/carga no ocultan la recuperación. |
| Volumen/3D | Geometría CSS/SVG del producto, sin descargar un motor 3D solo para ornamentación. Movimiento breve o nulo fuera del hero. | `prefers-reduced-motion` deja contenido estático y completo; móvil usa composición simplificada; no hay efecto que dependa únicamente de hover. |

## Observaciones remitidas a frontend

1. **Perfiles demo en móvil.** Mantener una sola columna cuando los correos y roles no caben cómodamente; priorizar legibilidad sobre densidad. Conservar área clicable completa, estado seleccionado y foco visible de al menos 2 px como decisión de diseño.
2. **Prueba de cuenta desactivada.** El backend entrega el nombre «Cuenta desactivada» con rol `BILLING`; el título basado únicamente en rol puede confundirlo con otra cuenta de caja. Presentar el estado explícitamente y conservar el botón clicable para probar el rechazo del servidor.
3. **Login móvil.** Evitar una pantalla de narrativa/arte antes del formulario. Reducir el lateral a marca y contexto, dejando acceso y perfiles al comienzo del recorrido.
4. **Vista ilustrativa de la landing.** En ancho estrecho, simplificar navegación decorativa y columnas secundarias o habilitar scroll interno. No reducir toda la interfaz hasta volver ilegibles los rótulos.
5. **Movimiento y foco.** Escena con alternativa estática y controles con foco visible, incluso sobre superficies teal/marfil. Reservar el volumen para comunicación de producto; el trabajo diario requiere estabilidad visual.
6. **Lenguaje operativo.** En el dashboard, preferir «Cuentas recientes» a «Las últimas conexiones» y «Actividad del equipo» a titulares metafóricos cuando ayude a escanear. La landing conserva el tono editorial; el espacio de trabajo debe nombrar tareas y objetos concretos.

## Evidencia y límites

Revisión inicial realizada sobre `login.tsx`, `landing.tsx`, `ui.tsx`, `workspace.tsx`, `dashboard.tsx`, tipos y contratos. En ese momento no existía todavía la hoja global de estilos y el servidor web 4300 no respondía. Por tanto estas observaciones iniciales no constituyen una validación visual renderizada, de contraste, rendimiento ni de compatibilidad entre sistemas operativos.

Chrome sobre macOS con viewport móvil es emulación; no equivale a pruebas en Windows, Android o Safari/iOS reales.

## Refinamiento implementado y revisión renderizada

El equipo frontend cedió la edición de un bloque final de `frontend/nxt-ui-atlas-link/src/app/globals.css` para esta revisión. Se conservó la base original y se añadieron correcciones concretas:

- Escala tipográfica legible: texto operativo de 14 px, campos de 16 px, información secundaria de 12 px y excepciones deliberadas de 10–11 px para rótulos editoriales. Botones principales e iconos interactivos con objetivo táctil de 44 px. Se oscurecieron colores de texto conservando los fondos claros y tonos semánticos.
- El hero móvil ya no corta titulares ni llamadas a la acción: el grid usa `minmax(0,1fr)` para evitar que el ancho intrínseco de la escena 3D ensanche su columna. La escena conserva su escala y composición propias.
- La vista ilustrativa móvil cambia sus tres métricas a filas y simplifica las columnas de la cuenta, con textos legibles. No se representa como una captura de datos de clientes reales.
- Los perfiles demo conservan rol, nombre y correo completos; se marcan con borde, radio y franja de selección. La cuenta desactivada indica explícitamente que prueba un acceso denegado.
- Los paneles usan columnas `minmax(0,…)`. El scroll de tablas se contiene en un elemento posicionado: un texto accesible absoluto del encabezado provocaba desbordamiento del documento aunque la tabla pareciera contenida.
- Se corrigió contraste adicional en textos teal sobre fondos tintados, badges azules y el aviso de perfil seleccionado.

Capturas y métricas de las pasadas están en `evidence/visual-review/`. La primera captura de landing móvil mostró el recorte; `landing-mobile-v2.png` acredita la corrección. `login-desktop-v2.png` muestra los seis perfiles legibles. `iteration-2.json` e `iteration-3.json` conservan defectos intermedios para distinguir progreso de resultado final. No deben confundirse con la última ejecución integrada de QA.

Las comprobaciones propias ejecutadas incluyen render Chrome/CDP, tamaños de documento contra viewport, revisión visual de landing/login/dashboard y axe con reglas WCAG 2 A/AA y 2.1 AA. Las pruebas integradas y el estado final por ruta corresponden a `evidence/browser-report.json`. La ausencia de hallazgos automáticos no sustituye una evaluación completa de accesibilidad ni una prueba en dispositivos reales.

### Resultado del cierre visual

`evidence/visual-review/final-review.json` registra seis vistas: landing a 1440 y 390 px; login hospitalario a 390 px; login de consola a 1440 px; dashboard hospitalario a 390 px y dashboard de consola a 1440 px. Todas devolvieron cero violaciones axe en las reglas evaluadas y ancho del documento igual al viewport. Con movimiento reducido activo, la duración de animación calculada fue 0.00001 s. Se revisaron además las capturas de fotografía real y contacto comercial en escritorio y móvil, sin recortes de contenido.

El responsable de QA comunicó una última ejecución integrada de 22/22 escenarios aprobados después de estas correcciones. El CSS queda congelado para la compilación de producción. Las capturas de desarrollo pueden incluir el indicador de Next.js; no forma parte de la interfaz comercial.
