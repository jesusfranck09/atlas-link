# Rendimiento y efectos visuales

La revisión de código y artefactos está completa. El intento de medición dinámica de rendimiento no pudo conectar con Chrome por un bloqueo de socket del sandbox (`EPERM 127.0.0.1:9430`): **no se obtuvieron valores de TTFB, LCP, CLS ni tareas largas**. El intento está conservado en `evidence/performance-smoke.json`; no representa un resultado aprobado.

## Implementación revisada

- La escena tridimensional de la landing usa perspectiva, transformaciones CSS y SVG. No incorpora Three.js, WebGL, modelos descargables ni un bucle JavaScript de renderizado.
- Dos tarjetas decorativas de la escena animan únicamente su transformación, con ciclos de 10 y 11 segundos. El efecto es decorativo y ninguna operación hospitalaria depende de él.
- `prefers-reduced-motion: reduce` aplica una sola iteración de 0.01 ms, reduce transiciones y desactiva desplazamiento suave. QA comprobó la iteración única en la versión Docker, tanto a 1440 px como a 390 px: `evidence/production-smoke.json`, sección `reducedMotion`. Esta comprobación funcional no mide consumo de CPU/GPU ni batería.
- Inter y Manrope se sirven localmente en WOFF2 variable con `font-display: swap` y subconjuntos por `unicode-range`. No hay solicitudes a Google Fonts.
- La fotografía local de hospital usa Next Image, `sizes` responsivo y un contenedor con dimensiones reservadas. Está debajo del primer bloque y conserva la carga diferida predeterminada.
- Los recursos públicos y la carga de la fotografía se verificaron en el smoke independiente de QA. No se descargaron motores gráficos ni se agregaron dependencias para este análisis.

## Inventario estático

Build local inspeccionado: `OnMMit0fUQthohqlasaeY`, 24 de septiembre de 2026. Los tamaños corresponden al conjunto de archivos de **todas las rutas**, no a lo que se descarga al abrir una pantalla. Gzip es una compresión local de cada archivo; no constituye una medición HTTP.

| Recurso | Archivos | Bytes originales | Bytes gzip local |
| --- | ---: | ---: | ---: |
| JavaScript | 25 | 771,850 | 238,052 |
| CSS | 1 | 131,476 | 27,246 |
| Fuentes WOFF2 | 13 | 293,484 | 293,769 |

El CSS global incluye las pantallas operativas y los ajustes visuales de toda la aplicación. Una separación por superficie puede estudiarse cuando una medición real demuestre que afecta la carga; el inventario por sí solo no justifica una refactorización. Los subconjuntos de fuentes se seleccionan según el contenido: 13 archivos disponibles no significa 13 descargas por página.

## Medición reproducible preparada

`qa/performance-smoke.mjs` reutiliza el Chrome CDP existente; no abre navegadores ni cierra el navegador compartido. Solo visita landing y login, sin iniciar sesión ni modificar datos.

```sh
cd qa
ATLAS_PRODUCTION_URL=http://127.0.0.1:4430 ATLAS_CDP_URL=http://127.0.0.1:9430 node performance-smoke.mjs
```

El entorno de ejecución debe permitir conexión a esos sockets locales. Este intento no solicitó nuevas autorizaciones ni intentó eludir el bloqueo.

El protocolo realiza tres cargas por ruta y viewport —1440×1000 y 390×844 con emulación táctil—, siempre con contexto nuevo y caché del navegador deshabilitada. Observa 2.5 segundos después de `load` y de la disponibilidad de fuentes; registra Navigation Timing, LCP, CLS por ventanas, tareas largas y tamaños de Resource Timing. Después verifica el movimiento reducido en ambos viewports. El resultado se escribe en `evidence/performance-smoke.json`.

Los valores futuros serán observaciones de laboratorio local, sin limitación artificial de red o CPU. No equivalen a rendimiento en Windows, Safari, Android o iOS reales, ni a percentiles de usuarios. No se mide INP ni el ciclo completo de una sesión. Chrome documenta que [CLS requiere agrupar los cambios por ventanas y que laboratorio puede subestimar el comportamiento real](https://web.dev/articles/cls); [LCP identifica el elemento principal pintado en la navegación](https://web.dev/articles/lcp).

Validación de este artefacto: `node --check qa/performance-smoke.mjs` sin errores. Cero cambios al frontend.
