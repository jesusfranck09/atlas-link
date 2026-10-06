# Iluminación ambiental V9

24 de septiembre de 2026. Petición: añadir efectos de sol y luna según la hora, conservando la composición aprobada de la landing y la plataforma clara.

## Comportamiento

La hora local del navegador determina cuatro ambientes decorativos:

| Hora local | Ambiente |
| --- | --- |
| 06:00–10:59 | Sol de mañana y luz cálida diagonal |
| 11:00–15:59 | Luz de día suave, con el sol más alto |
| 16:00–18:59 | Luz cálida lateral de tarde |
| 19:00–05:59 | Luna creciente y reflejo frío sobre fondo claro |

La fase se actualiza sin recargar, al cambiar el minuto o volver a la página. No representa amanecer, puesta de sol, fase lunar ni meteorología reales. No requiere ubicación ni consulta servicios externos. No modifica fechas institucionales ni cálculos de negocio.

La landing conserva textos, imágenes, secciones y controles. La plataforma usa la misma luz con menor intensidad y una altura máxima de 320 px; las tablas mantienen sus superficies claras. El login V7 permanece intacto.

## Implementación

`daylight.tsx` comparte lectura y suscripción del reloj entre landing y workspace. El render del servidor permanece neutro hasta hidratarse en el navegador, sin suponer una zona horaria. La suscripción pausa su temporizador mientras la página está oculta y retira eventos y temporizador al desmontarse.

Los efectos usan capas de degradados CSS con transiciones breves al cambiar de fase. No añaden imágenes, librerías, Canvas ni animación continua. Son decorativos, quedan detrás del contenido, no reciben clics y están ocultos a las tecnologías de asistencia. Movimiento reducido elimina las transiciones; contraste forzado e impresión ocultan el efecto.

## Coordinación

Root implementó reloj, integración, apilamiento y documentación. `pie_sculpture_v4` desarrolló y revisó exclusivamente los estilos de luz. `daylight_v9_qa` implementó y ejecutó la validación de navegador. Responsabilidades y archivos delimitados; la revisión visual detectó y suavizó el borde superior de un reflejo.

## Validación

- Compilación de producción, TypeScript y ESLint correctos. Versión desplegada en `http://localhost:4430`.
- [Informe de navegador](../evidence/daylight-v9/report.json): **19/19 escenarios aprobados**, sin errores de consola ni de hidratación. Cuatro fases a 1440 y 390 px, mismo instante en México/Tokio con resultados locales distintos, cambio de 10:59:59 a 11:00 sin navegación, resincronización de foco/visibilidad y render neutro sin JavaScript.
- Ambos portales autenticados mediante sus perfiles demo reales. Menús, ayuda y cierre de sesión funcionando; luz del workspace limitada a 320 px, sin desbordamiento horizontal.
- Movimiento reducido comprobado en las capas dibujadas: sin propiedades de transición activas ni animaciones. Contraste forzado oculta la decoración. Axe no detectó infracciones de contraste en las vistas examinadas; dejó algunos nodos con fondos complejos sin resolución automática. Se revisaron también las capturas visualmente.
- Ajuste visual final: luna móvil más pequeña, ubicada entre la cabecera y el texto. [Tres verificaciones adicionales](../evidence/daylight-v9/mobile-polish.json) a 320, 390 y 760 px confirman separación del título y del enlace introductorio, sin desbordamiento ni errores de navegador. Se recompiló y desplegó este ajuste; no cambia las otras fases ni los portales.
- Capturas de landing y portales en `evidence/daylight-v9/`; PNG excluidos de Git según la configuración del proyecto.

Entorno ejecutado: Chrome en macOS y móvil emulado. API, microservicios y PostgreSQL locales, sin respuestas simuladas. Las pruebas crean y cierran sesiones, sin modificar datos de negocio ni enviar formularios comerciales. No se afirma prueba en dispositivos físicos, auditoría completa de accesibilidad ni medición de FPS/batería.

Para repetir desde `qa/`, con el navegador CDP compartido libre:

```sh
node daylight-review.mjs
```
