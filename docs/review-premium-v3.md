# Revisión visual independiente — V3

Revisión del 24 de septiembre de 2026, render real de `http://127.0.0.1:4300` mediante Chrome/CDP 9430. Viewports: escritorio 1440 × 1000, móvil 390 × 844; se revisaron capturas completas y recortes a escala nativa. El viewport móvil simula espacio disponible, no acredita prueba de un dispositivo físico.

## Evidencia

- Capturas propias actuales: `evidence/premium-v3-review/desktop-hero.png`, `desktop-landing.png`, `desktop-login.png`, `desktop-dashboard.png`, `mobile-hero.png`, `mobile-landing.png`, `mobile-login.png`, `mobile-dashboard.png`.
- Detalle legible: `mobile-dashboard-top.png` y `mobile-team.png` en la misma carpeta.
- Consola Atlas: `evidence/premium-v3-portal/final-atlas-dashboard-1440.png` y `final-atlas-dashboard-390.png`.
- La landing se desplazó completa antes de la captura para cargar la fotografía editorial diferida. El navegador confirmó ambas imágenes cargadas. La revisión usa arquitectura Joel Filipe, no el pasillo anterior almacenado en caché.

## Evaluación

La tercera dirección produce un cambio perceptible frente a las dos propuestas rechazadas: el blanco y grafito ya dominan, el iris se concentra en interacción, los indicadores respiran sin tarjetas repetidas y las fotografías ocupan superficies protagonistas. La arquitectura circular comunica mejor tecnología y escala que el pasillo anterior. El login con fachada distingue el acceso de la landing y conserva una jerarquía clara entre formulario y demos.

Las gráficas tienen volumen reconocible y separan categorías sin saturar el panel. La leyenda permite leer valores exactos; la gráfica volumétrica es una vista complementaria. El dashboard hospitalario muestra los conteos reales del demo (3, 6 y 9; total 18), mientras la landing identifica su ejemplo ilustrativo. La consola muestra dos hospitales, con usos de 2 y 18. No se debe añadir historia temporal ficticia al frontend: la única barra mensual corresponde a un único periodo disponible y se explica como tal.

No se considera aceptada la estética por el usuario ni finalizada toda la plataforma por esta revisión. La mejora es visible; los siguientes detalles afectan su acabado.

## Correcciones enviadas a los responsables

| Prioridad | Pantalla y observación | Corrección concreta | Estado al revisar |
| --- | --- | --- | --- |
| Alta | Landing escritorio: la foto «Cada persona importa» recorta ambos rostros cerca de los ojos. En móvil también corta la frente del médico. | `object-position: 50% 20–22%`, conservando rostros, manos y tablet; validar ambos anchos. | Enviado a root. |
| Alta | Landing móvil: los títulos «Tu hospital.Su propio espacio.» y «Datos precisos.Decisiones humanas.» concatenan palabras al ocultar el salto de línea. | Conservar un espacio textual al eliminar el `br` o resolver los fragmentos con bloques/espaciado adaptable. | Enviado a root. |
| Alta | Dashboard hospitalario móvil: «Cuentas recientes» oculta estado de preauditoría y acción a la derecha; solo queda visible una franja de los badges. | Convertir la fila móvil en dos niveles: referencia/importe y fecha/estado, dejando acción visible. El estado debe leerse sin desplazamiento horizontal. | Enviado a agente de portales. |
| Media | Hero escritorio: la imagen comienza en y566, y el gráfico no entra completo al primer viewport de 1000 px. La parte superior dedica demasiado alto al texto antes de mostrar el diferencial visual. | Recuperar aproximadamente 80–90 px en separaciones del bloque introductorio, manteniendo el titular y el tamaño del gráfico. Validar además 1440 × 900. | Propuesta enviada a root; criterio de composición, no fallo funcional. |
| Media | Login escritorio: el email de aseguradora rompe su última «x» en una tercera línea aislada. | Email en una línea con ellipsis y `title`, manteniendo nombre y rol completos. | Agente confirma corregido; requiere captura final posterior. |
| Media | Dashboard móvil: heading de acciones se percibía apretado por tracking negativo y ancho. | 24 px, interlineado 1.15, tracking −0.025em y ancho máximo 17ch. | Corregido; comprobado en captura propia móvil. |

## Mantener

- Titular grande grafito y segundo nivel gris; no reintroducir una caja azul alrededor del hero.
- Fachada A en login y arquitectura B en landing; procedencia en `docs/assets-v3.md`.
- Gráfica de carriles en el panel protagonista, con cifras exactas y leyenda textual.
- Métricas abiertas y bordes discretos en los paneles operativos.
- Perfiles demo con nombre, rol y email identificables; la selección completa el formulario sin iniciar sesión por sí sola.
- Datos demostrativos identificados y ausencia de logos de supuestos hospitales clientes.

## Límites de esta revisión

Se inspeccionaron composición, lectura, recorte, ritmo, jerarquía, fotografía y representación 3D en navegador de escritorio y viewport móvil. Se abrió el login hospitalario y se usó el perfil demo para entrar al dashboard. Esta revisión no sustituye las pruebas funcionales, de permisos, rendimiento, accesibilidad completa o dispositivos físicos que llevan los responsables respectivos. Los hallazgos visuales se comunicaron sin editar CSS ni componentes propiedad de otros agentes.

## Cierre sobre capturas finales

Se revisaron las capturas finales entregadas por QA sin conectar otra sesión de navegador ni alterar su ejecución. Este cierre actualiza los estados pendientes de la tabla anterior.

| Corrección | Evidencia final inspeccionada | Estado verificado |
| --- | --- | --- |
| Fotografía editorial | `evidence/redesign/premium-v3-final/desktop-landing.png`, `mobile-landing.png`; recorte legible `evidence/premium-v3-review/mobile-team-final.png`. | Resuelta. Se ven completos ambos rostros y la interacción con la tablet, en escritorio y móvil. El recorte conserva el contexto del equipo. |
| Espacios en títulos móviles | `mobile-landing.png` y `mobile-team-final.png`. | Resuelta. Se leen «Tu hospital. Su propio espacio.», «Datos precisos. Decisiones humanas.» y «Un recorrido. Toda su historia.» con separación correcta. |
| Cuentas recientes en móvil | `evidence/premium-v3-portal/compact-accounts-mobile.png`. | Resuelta visualmente. Las cuatro filas muestran referencia, importe, fecha, badge de preauditoría y flecha dentro del panel. La medida de ancho útil/scroll de 339 px fue verificada y reportada por el responsable de portales; aquí se inspeccionó la captura. |
| Alto introductorio del hero | `evidence/redesign/premium-v3-final/desktop-landing-viewport.png`. | Resuelta la propuesta de composición. La fotografía comienza aproximadamente en y484 frente a y566 anterior: se recuperan 82 px. En la captura de 1000 px se ve la gráfica completa y sus valores junto a la arquitectura. |

Además, `desktop-hospital-login.png` confirma el email de aseguradora en una línea con ellipsis y sin la «x» aislada. El heading móvil de acciones ya había sido comprobado en la revisión anterior. No se encontraron nuevos problemas visuales críticos en estas superficies finales. Este resultado valida las correcciones observadas, sin atribuir aceptación estética al usuario ni extender la conclusión a módulos o dispositivos no inspeccionados.
