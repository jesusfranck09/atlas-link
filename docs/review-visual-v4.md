# Revisión visual V4: acceso y landing

Fecha: 2026-09-24. Revisión realizada por el agente de gráficos sobre superficies que no implementó. El pastel 3D y el resto del portal quedan fuera de esta revisión; su autor no los evalúa aquí como trabajo independiente.

## Alcance observado

- Login hospitalario: capturas existentes de escritorio y móvil en `evidence/soft-v4-login/desktop-hospital.png` y `mobile-hospital.png`.
- Landing: inspección de capturas nuevas de Chrome 153, escritorio 1440 × 1000 y móvil emulado 390 × 844, sobre `http://127.0.0.1:4300`. Capturas en `evidence/premium-v4/review-{desktop,mobile}-{hero,landing,team}.png`.
- La landing se recorrió para cargar y decodificar ambas fotografías antes de guardar la captura completa. Las fotografías se ven correctamente; el área inicialmente vacía en una captura sin desplazamiento era una imagen diferida todavía fuera del viewport.

## Resultado visual

**Login.** La composición central abierta sustituye el formulario dentro de una tarjeta rectangular. Las fotografías recortadas en círculos, los arcos finos y las cápsulas del formulario pertenecen a un mismo lenguaje. El título conduce al formulario y el botón grafito tiene la mayor prioridad entre las acciones. Los perfiles demo conservan nombres, roles y correos completos; forman una franja separada en escritorio y una lista vertical en móvil. No observé recortes accidentales, campos encimados ni ruptura de jerarquía en las capturas revisadas.

**Landing.** Conserva el titular centrado, la fotografía arquitectónica dominante y el panel de producto que daban identidad a la versión anterior aceptada. La navegación agrupada, los botones redondeados y las superficies de iris tenue enlazan visualmente con el nuevo acceso. Las secciones de producto, equipo, licencia y contacto tienen composiciones diferenciadas sin perder la tipografía y los colores comunes. La fotografía de personas mantiene rostros y contexto legibles tanto en escritorio como en móvil; el selector de perfiles permanece completo en el ancho móvil revisado.

**Defectos concretos detectados: ninguno en el alcance visual observado.** No propongo cambios cosméticos adicionales sin una nueva evidencia o preferencia del usuario.

## Límites

Esta revisión es de composición y legibilidad visible, no una certificación de belleza ni una aprobación funcional o de accesibilidad. No ejecutó un segundo recorrido de autenticación, envío de formulario o navegación por roles; esas pruebas corresponden al responsable de QA integrado. El móvil fue emulado en macOS, no probado en un dispositivo físico. No se inspeccionaron aquí Windows, Safari comercial ni GPU adicionales.
