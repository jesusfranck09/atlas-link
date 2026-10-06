# Plataforma V8 — simplificación visual

24 de septiembre de 2026. Petición: conservar el login aprobado y simplificar la plataforma por exceso de colores y texto.

## Cambios

- Hospital y consola Atlas: blanco y gris, un acento violeta suave, bordes discretos y navegación sin degradados multicolor. Estados identificados por texto e indicadores pequeños.
- Métricas con nombre, valor y unidad cuando aporta información. Se retiraron iconos decorativos y captions repetidas.
- Títulos directos en cuentas, reportes, equipo, hospitales, convenios, bitácora y carga. Se conservan las instrucciones sobre contratos, importación, permisos de operación y consecuencias financieras.
- La actividad reciente se abre bajo demanda mediante un control nativo accesible por teclado. Los filtros y la recarga de uso conservan sus acciones.
- Gráficas 3D: paleta de categorías gris/violeta, colores de estado moderados, fondo limpio y leyendas sin brillos decorativos. Datos, geometría, selección, fallback y render bajo demanda siguen usando el componente existente.
- En 320 px, las filas compactas distribuyen referencia, importe y estado sin partir el folio. Las tablas completas conservan su desplazamiento horizontal interno.

## Coordinación y revisión

Root implementó el tema, dashboard, métricas y la integración. `platform_copy_v8` simplificó ocho componentes de pantallas y comparó capturas de escritorio y móvil. `pie_sculpture_v4` ajustó exclusivamente los estilos de la gráfica compacta. Cada encargo tuvo archivos delimitados.

Se compararon las capturas previas de dashboard hospitalario y reportes con las nuevas, además de revisar consola Atlas y pantallas de 390 y 320 px. La revisión técnica y visual no constituye aceptación estética del usuario.

## Evidencia

- Compilación de producción, TypeScript y ESLint correctos. Web actualizada en `http://localhost:4430`; los seis servicios locales se encuentran saludables.
- [Recorridos de pantallas](../evidence/platform-v8/after/report.json): 42 visitas correctas, con perfiles reales de demostración, capturas, desbordamiento y axe en escritorio y móvil emulado. Cero errores de navegador, HTTP o consola; el total de cuentas sintéticas se mantiene en 20.
- [Interacciones](../evidence/platform-v8/interactions/report.json): cuatro recorridos correctos entre hospital/consola y 1366/320 px; actividad por teclado, estado vacío contrastado con API, filtros comparados contra datos, alternancia de gráficas, recarga de capacidad, detalle financiero y cierre de sesión. Sin desbordamiento ni incidencias axe en esas vistas.
- Capturas locales: `evidence/platform-v8/before/`, `after/` e `interactions/`. Los PNG se excluyen del repositorio según su configuración.

Entorno: Chrome en macOS; tamaños móviles emulados. Las pruebas usan gateway, microservicios y PostgreSQL locales; no crean cuentas hospitalarias ni modifican información comercial. Solo generan las sesiones y su auditoría. No se afirma validación en dispositivos físicos ni auditoría integral de accesibilidad.

Para repetir el recorrido de pantallas desde `qa/`:

```sh
ATLAS_SMOKE_OUTPUT=../evidence/platform-v8/after ATLAS_SMOKE_EXTENDED=true node production-smoke.mjs
```
