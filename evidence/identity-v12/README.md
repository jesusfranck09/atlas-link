# Revisión visual e integrada V12

El [índice final](result-index.json) reúne evidencia aprobada de **20 escenarios distintos**, incluidas **52 vistas de módulos/detalles**. Se ejecutaron en tres revisiones: la imagen final recibió tres comprobaciones focales; el resto reutiliza resultados de componentes que no cambiaron. No se presenta como una sola corrida de 20 casos sobre la última imagen.

Responsabilidad QA: `qa/identity-review.mjs` y esta carpeta. Entorno local Docker en `http://127.0.0.1:4430`, con autenticación y consultas a las APIs Java/Spring y PostgreSQL reales del demo. No hubo mocks de API ni escrituras de datos comerciales; los inicios/cierres de sesión sí generan su auditoría normal. Chrome 153.0.8010.53 en macOS; reloj del navegador fijado a las 14:00 de Ciudad de México.

| Evidencia | Resultado ejecutado | Procedencia |
| --- | --- | --- |
| [Baseline](before/review.json) | 8 capturas nuevas V11 | Landing y tres roles, 1440×1000 y 390×844; revisión base `815cb3e` |
| [Preview](preview/review.json) | 4 capturas V12 | Revisión de composición, anterior a la regresión completa |
| [Primera corrida](initial-run/review.json) | 9 aprobados, 10 fallidos; 50 vistas verificadas | Imagen `3a5d95f…`; se conservan fallos y capturas |
| [Retest integrado](after/integrated-review.json) | 14 aprobados, 2 fallidos; 52 vistas verificadas | Imagen ejecutada `72152157…`; las 12 combinaciones de portal/tamaño aprobaron |
| [Regresión final focal](final-focused/review.json) | 3 aprobados, 0 fallidos, 0 errores | Imagen `82f06c44…`; landing desktop/390 y reentrada nativa de PrismaticText |

El retest integrado registró inicialmente `502cc29a…` en `deploymentImage`: es el digest de configuración del build. El manifiesto ejecutado, confirmado con `docker inspect .Image`, fue `72152157…`. El informe original se conserva y el índice deja explícita esta corrección de metadatos.

La selección final corresponde a tres escenarios de ciclo WebGL de la primera corrida, 14 del retest integrado y tres de la última corrida. Los dos fallos del retest integrado se resolvieron en el alcance focal: una expectativa incorrecta del runner sobre el umbral de aparición y una carrera real entre el puntero y `IntersectionObserver`. [La reproducción nativa](diagnostic-native/prismatic-timing.json) conserva el orden de eventos que causaba el fallo. El retest final pasó tres ciclos rápidos de salida/reentrada, recuperación tras preferencias sin otro `pointerenter`, reposo y legibilidad con movimiento reducido/colores forzados.

Las correcciones previas quedaron verificadas: contraste del número de pie del carrusel, foco inicial/ciclo/Escape del menú móvil y foco de teclado en la tabla de cargos de aseguradora. El hospital muestra ahora seis filas completas a 1440×900; la última termina en 883,8 px. Las 52 vistas comprueban sistema, organización y módulo; incluyen detalles, filtros/búsqueda contra la API real, roles y navegación. Aseguradora conserva controles de consulta y tres accesos de lectura prohibidos responden 403.

Las primeras capturas del carrusel podían ocurrir durante su desplazamiento suave. El runner ahora espera el scroll-snap estable, posición inicial y botón «Anterior sistema» deshabilitado utilizando los controles reales. No fuerza una posición instantánea para producir la captura. La expectativa global de aparición se ajustó al contrato real de umbral/intersección, sin relajar las comprobaciones de las tarjetas visibles.

Los tres escenarios WebGL aprobaron render inicial, respuesta al puntero, reposo durante más de un segundo después del límite de asentamiento, movimiento reducido, pausa fuera del viewport y eliminación del canvas con colores forzados. En la consola se comprobó pérdida/restauración real del contexto WebGL con fallback SVG. El acabado posterior de la escultura de aseguradora se verificó en las capturas del retest integrado; su ciclo de vida no cambió. El cambio de pestaña mediante esta conexión CDP **no produjo un estado `document.hidden` observable**; la pausa de pestaña oculta no se presenta como comprobada.

Capturas principales disponibles en disco:

- [Hospital: seis filas](after/hospital-overview-1440x900.png).
- [Consola Atlas](after/control-admin-desktop.png) y [aseguradora](after/insurer-hospital-desktop.png).
- [Landing final](final-focused/landing-hero-desktop.png), [carrusel desktop](final-focused/landing-showcase-desktop.png) y [carrusel móvil](final-focused/landing-showcase-mobile-390.png).

Comandos desde `qa/`:

```sh
QA_MODE=baseline node identity-review.mjs
QA_MODE=preview node identity-review.mjs
node identity-review.mjs
QA_FILTER='^(landing|hospital|control|insurer)-(desktop|mobile-390|mobile-320|tablet-1024)$' node identity-review.mjs
QA_DEPLOYMENT_IMAGE=sha256:82f06c4467bbe3e3f4db8fd08e5524e41898f195151e0f8a4989a7dc8b0e445d QA_OUTPUT=final-focused QA_FILTER='^(landing-(desktop|mobile-390)|prismatic-reentry-desktop)$' node identity-review.mjs
```

Las medidas móvil/tablet (320, 390 y 1024 px) y preferencias son emuladas: no prueban dispositivos físicos Android/iOS, Safari ni Windows. Axe tiene limitaciones con gradientes, transparencias y canvas; sus resultados incompletos permanecen en los informes. No se infiere accesibilidad integral, aprobación estética, FPS, batería, carga productiva, seguridad completa ni autorización de publicación. Todos los contextos propios se cerraron; el navegador CDP compartido permanece abierto.
