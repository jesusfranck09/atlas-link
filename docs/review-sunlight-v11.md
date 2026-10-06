# Luz sobre superficies y encabezado V11

24 de septiembre de 2026. El usuario aprueba el sol V10 y pide que los rayos alcancen toda la interfaz, además de reducir y mejorar los textos grandes del inicio de la landing.

## Resultado

- La luz cruza fotografías, tarjetas, tablas y formularios de landing y portales. La capa permanece fija al viewport durante el desplazamiento: las secciones inferiores reciben la misma iluminación. Los haces cálidos dan paso a reflejos fríos de noche según la hora local del navegador; las superficies siguen siendo claras.
- Se conserva el disco solar aprobado. En el portal, el origen de los haces toma la posición real de la fuente de la cabecera, incluso cuando cambia el ancho disponible. En el atardecer de la landing de escritorio, disco y origen suben 44 px para mantener el sol completo por encima de la fotografía, que ahora comienza antes.
- El inicio dice «Cada cuenta, en perspectiva.» y explica el producto en una frase. Título y fotografía comparten borde; explicación y acciones ocupan una segunda columna en escritorio. En móvil forman una sola columna. El título pasa a un máximo de 54 px en escritorio y 32–38 px en móvil; se elimina la cápsula introductoria repetitiva.
- Se mantienen los destinos de las acciones, el login aprobado, los módulos, los permisos, los cálculos y los datos. No hay nuevas dependencias ni imágenes.

## Implementación y límites

`daylight.module.css` añade gradientes diagonales estáticos, con mezcla `multiply`, sobre el contenido. La capa está acotada al viewport, no intercepta el puntero y queda fuera del árbol accesible. Cabecera, menú móvil y diálogos conservan sus niveles superiores. Se desactiva en contraste forzado e impresión; movimiento reducido elimina las transiciones.

`DaylightSource` mide el origen al montar y al cambiar las dimensiones mediante `ResizeObserver` y `resize`. Actualiza dos variables CSS sin renderizados React adicionales, bucles de animación ni listeners de desplazamiento. El reloj y sus cuatro franjas horarias mantienen el contrato V10. Estas decisiones acotan el trabajo, pero no representan una medición de FPS o batería.

Root integra encabezado, estilos y contratos de los recorridos existentes. `sunrays_v11` implementa la iluminación; `design_review_v10` define y revisa la composición; `daylight_v9_qa` valida el navegador. Los responsables de archivos se mantienen separados.

## Evidencia visual

Referencia anterior: [baseline.json](../evidence/sunlight-v11/before/baseline.json), reutilizada de V10 en la revisión `6a37e87`. Capturas nuevas en `evidence/sunlight-v11/after/`; las imágenes se conservan localmente y no se versionan.

Root y los especialistas revisaron las capturas: los haces se perciben sobre superficies opacas, conservan espacios blancos y no ocultan el texto. El encabezado de escritorio deja aparecer la fotografía aproximadamente en y=300 px, frente a y=484 px en V10. En 320 px, el título cabe en dos líneas. Esta revisión visual no sustituye la aceptación estética del usuario.

## Validación

- Compilación de producción, TypeScript y ESLint correctos. La web está actualizada en `http://localhost:4430`; los seis servicios locales se encuentran saludables.
- [Revisión dirigida](../evidence/sunlight-v11/after/review.json): **13/13 escenarios correctos**, sin errores de navegador ni consola. Incluye día, noche y geometría del sol de tarde; desplazamiento, selección de texto, entrada en formularios, filtros, menús y ayuda modal; movimiento reducido y contraste forzado.
- Ocho comparaciones de capturas con la capa de rayos visible y oculta confirman que se pinta sobre el formulario de contacto y las tablas opacas en los cuatro anchos. La ocultación se hace solo durante la prueba y se revierte inmediatamente.
- Axe no detectó infracciones de contraste en las regiones examinadas. Dejó entre 14 y 47 nodos por vista sin resolución automática por sus fondos o canvas; se complementó con revisión de capturas. No equivale a una auditoría integral.
- La primera pasada se conserva en `initial-review.json`. Cuatro comprobaciones usaban un nombre accesible incompleto del correo y una esperaba un gráfico 3D fuera del viewport. Se corrigieron el selector y la espera del runner, sin cambiar el producto; `retest.json` conserva la repetición de esos cinco casos y las dos comprobaciones de atardecer. El informe consolidado identifica la ejecución de origen de cada resultado.
- La revisión visual de atardecer detectó un recorte del disco por la fotografía, aunque no había colisión con textos o botones. Se ajustó su posición y se añadió la separación mínima de 16 px respecto de la foto a la comprobación de escritorio. Solo las dos geometrías de atardecer se repiten tras ese cambio; la captura y el informe anteriores se conservan.
- La revisión dirigida utiliza Chrome en macOS, con escritorio y tablet/móviles emulados a 1440, 1024, 390 y 320 px. Emplea autenticación real contra los microservicios y PostgreSQL locales, sin interceptar respuestas ni modificar información comercial.
- El recorrido amplio de 42 vistas de V10 se conserva como evidencia anterior; no se presenta como una nueva ejecución V11. No se afirma validación física en Android, iOS o Windows, ni auditoría completa de accesibilidad.

Repetir desde `qa/`, con CDP 9430 disponible:

```sh
node sunlight-review.mjs
```
