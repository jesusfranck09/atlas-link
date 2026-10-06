# Atlas Link — Delta creativo v16: redistribución de plataformas internas

**Estado:** dirección vigente para la siguiente reconstrucción de las áreas autenticadas.  
**Fecha:** 1 de octubre de 2026.  
**Base:** amplía `docs/creative-blueprint-plataformas-v15.md`; conserva sus rutas, usuarios, restricciones y lenguaje editorial.  
**Alcance:** reorganizar la composición y jerarquía de las páginas internas de Hospital, Consola Atlas y Aseguradora.  
**Excepciones explícitas:** no rediseñar, mover ni reemplazar el sidebar derecho ni su comportamiento; no modificar ninguno de los tres logins ni sus fondos, formularios o rutas.

## Motivo del delta

La composición actual deja la información interna mal distribuida. El problema no se resuelve retocando colores, radios o elevaciones: se debe volver a ordenar el contenido de cada página según la tarea, hacer que la información prioritaria ocupe el espacio disponible y dar una identidad cromática propia a cada plataforma. El sidebar aprobado en v15 se congela como está. El login aprobado también se congela.

## CREATIVE CONCEPT — «Tres corrientes, un espacio de trabajo»

Las tres plataformas comparten una base luminosa y una gramática de superficies translúcidas, pero cada una distribuye la información según su trabajo:

- **Hospital — flujo de cuidado:** jade clínico suave. La lectura avanza de situación operativa a cuenta prioritaria, cola y actividad.
- **Consola Atlas — red conectada:** lavanda/índigo suave. La organización y capacidad de la red dominan; licencias y actividad explican el estado de cada nodo.
- **Aseguradora — archivo de evidencia:** vino grisáceo suave. La consulta y la trazabilidad se leen como un expediente de solo lectura; la ausencia de acciones de autorización debe seguir siendo inequívoca.

La identidad común viene de tipografía, ritmo, controles, vidrio contenido y neutralidad; la identidad de cada plataforma viene de su acento, su orden informativo y su composición. No se crea un cuarto estilo para páginas secundarias.

## COLOR Y LIQUID GLASS

Usar los tokens existentes `--color-system-hospital*`, `--color-system-control*` y `--color-system-insurer*` como acentos por contexto. Los tonos más saturados/legibles se reservan para estados activos, indicadores y acciones; las superficies extensas permanecen casi neutrales. Los estados semánticos siguen usando sus tokens actuales y nunca se sustituyen por el acento del producto.

Liquid Glass se expresa como **material selectivo**, no como skin global:

- Aplicarlo a una superficie que realmente flota o agrupa controles transitorios: barra de filtros/búsqueda cuando permanece a mano, popover, panel contextual flotante o diálogo existente.
- Base blanca translúcida, tinte del sistema casi imperceptible, borde claro de baja opacidad y un highlight interior fino. Usar `backdrop-filter` con blur moderado solo en esas superficies y con fallback opaco equivalente.
- Mantener tablas, listas, lectura extensa, campos de contenido y áreas principales sobre superficies opacas claras para preservar contraste y lectura.
- Evitar que cada sección sea una placa acristalada. Como guía, la página debe conservar una gran superficie continua y emplear vidrio solo en pocos puntos de interacción.
- El glass no cubre, desenfoca ni reduce el contraste de datos clínicos, financieros, estados, etiquetas o focos de teclado. No sumar ruido, reflejos animados, arcoíris, glow ni sombras oscuras.

La acción primaria dentro de cada plataforma puede tomar el acento propio, con la misma forma, escala y estados del sistema global de botones. Esto no cambia los logins. El sidebar queda excluido de cualquier cambio cromático en este delta.

## DISTRIBUCIÓN — REGLAS COMPARTIDAS DEL ÁREA PRINCIPAL

Estas reglas aplican solo al contenido situado junto al sidebar existente:

1. Dejar de apilar encabezado, mosaico de indicadores, varias secciones en cards idénticas y una tabla al final. La primera pantalla debe responder qué importa ahora y qué acción ya autorizada corresponde.
2. Diseñar la página en torno a **una región focal**, **una región de apoyo** y, cuando aporte contexto, **un flujo secundario**. No convertir esas regiones obligatoriamente en tres tarjetas.
3. El título, explicación breve y acción principal forman un encabezado compacto. No reservar un hero alto para texto de bienvenida genérico.
4. Integrar métricas al encabezado de una lista, a una línea de resumen o a una visualización con escala; no repetir un KPI por tarjeta.
5. Colocar filtros y búsqueda junto al contenido que controlan. En scroll largo pueden quedarse visibles como una tira de controles translúcida y delgada, nunca como un segundo header alto.
6. Usar superficies opacas abiertas para contenido continuo; glass únicamente en herramientas flotantes/transitorias. Un borde o fondo compartido debe corresponder a una unidad funcional real.
7. Mantener en el DOM y visualmente la misma información, acciones, destinos, carga, error, vacío, estado disabled, permisos y validaciones que ya existen. Este delta no autoriza cambiar el significado ni el comportamiento.

## BLUEPRINT POR PLATAFORMA Y TIPO DE PANTALLA

### Hospital — jade · flujo de cuidado

**Inicio `/hospital`:** ordenar de arriba hacia abajo: contexto/turno y señal de pendientes; recuento de estados como una sola banda de progresión; cola de cuentas como el mayor bloque de lectura; actividad como cronología lateral solo si el ancho disponible lo permite, y después de la cola en pantallas estrechas. La acción de recibir cuenta conserva su visibilidad solo para roles actuales. Nada de cuatro KPI cards ni una hero genérica.

**Cuentas `/hospital/accounts`:** título y total vinculados a la búsqueda/filtros; lista como región dominante de ancho completo. Destacar nombre, paciente/folio conforme a los datos existentes, estado y fecha mediante alineación y ritmo; llevar acciones al borde de cada registro. En móvil, convertir cada fila en un resumen legible que conserva los campos requeridos y acceso al detalle; no comprimir seis columnas.

**Detalle `/hospital/accounts/[id]`:** cabecera compacta con identidad, estado y acciones permitidas; cuerpo tipo expediente de dos zonas en escritorio: hechos/importe y navegación existente en un margen contextual, evidencia e historial en la región amplia. Evitar un mosaico de mini cards por cada dato. En móvil se vuelve una secuencia de secciones con anclas/tabs existentes y un resumen de cuenta antes del contenido.

**Revisión `/hospital/review` e importación `/hospital/import`:** no presentar formulario y contexto como dos paneles de igual peso. Dar el campo de revisión/importación al área principal; mostrar instrucciones, progreso o resumen operativo en una franja secundaria estrecha. Agrupar campos que ya existen por etapa lógica, sostener etiquetas y validaciones; una acción de continuación/final se mantiene junto al grupo pertinente. En móvil, acción primaria accesible al final de cada etapa, sin barra flotante que tape errores.

**Convenios `/hospital/agreements`:** organizar versiones como una línea temporal/registro contractual; la versión seleccionada encabeza su detalle y vigencia. Acciones de publicación/edición solo donde existen y según permisos actuales. Importación de archivo y confirmación usan superficies flotantes glass discretas; el texto contractual permanece en superficie opaca.

**Reportes `/hospital/reports`:** el periodo y filtros encabezan el informe en una línea compacta; una visualización principal y sus cifras de apoyo ocupan el foco. Tabla comparativa debajo como registro de ancho completo. Los acentos cromáticos tienen significado, no decoran múltiples series. En móvil, simplificar la visualización y permitir scroll accesible en tablas anchas.

**Usuarios y bitácora `/hospital/users`, `/hospital/audit`:** usuarios se leen como directorio alineado con rol/estado y acciones al extremo; bitácora como timeline cronológico con fecha, autor y acción comparables. Evitar una tarjeta por usuario o por evento. Filtros/búsqueda pueden ser el elemento translúcido contextual.

### Consola Atlas — lavanda/índigo · red conectada

**Inicio `/admin`:** no reutilizar la composición del inicio Hospital. Dar la mayor proporción al registro vivo de organizaciones y su capacidad/licencia; mostrar organizaciones, licencias y consumo como una sola escala de control integrada. Incorporar hospital es la acción principal existente y queda próxima al índice. Actividad/solicitudes comerciales se ordenan como una columna o secuencia de seguimiento según anchura, nunca en cuatro cards iguales.

**Hospitales `/admin/tenants`:** índice de red como superficie principal, con nombre e identidad primero, licencia/capacidad en línea y gestión al final. Search y registrar hospital alineados sobre el registro. Alta/edición conserva el diálogo y sus contratos; su tratamiento visual usa la capa elevada del sistema, sin cambiar el flujo.

**Licencias `/admin/licenses`:** representar cada licencia como relación organización–vigencia–capacidad, no como tres columnas de métricas desconectadas. Un resumen compacto explica totales; registro agrupado por hospital y filtro de estado domina la página. Capacidad se expresa con barra fina legible y número exacto.

**Solicitudes comerciales `/admin/leads`:** lista de solicitudes ordenada por estado/fecha conforme al orden existente; detalle y acciones quedan asociadas a cada solicitud. El índice de filtros no debe competir con el contenido ni forzar una cuadrícula uniforme.

**Usuarios y auditoría `/admin/users`, `/admin/audit`:** directorio y timeline siguen la misma legibilidad de Hospital, con composición de supervisión de red; la identidad del sistema se mantiene con índigo/lavanda y no con más ornamentación.

### Aseguradora — vino grisáceo · archivo de evidencia

La Aseguradora sigue usando las rutas autorizadas bajo `/hospital`; no se inventa `/insurer/*` ni se crea un sidebar distinto. Sus páginas internas no reutilizan el tablero Hospital editable.

**Inicio y cuentas `/hospital`, `/hospital/accounts` con `INSURER_DEMO`:** una marca de consulta/no edición, en vino suave, aparece en encabezado del área y próxima al archivo; a continuación el índice de cuentas y filtros autorizados; el archivo compartido ocupa la mayor parte de la lectura. La secuencia favorece buscar, comparar y abrir evidencia. No mostrar controles de carga, revisión, publicación o autorización. El contenido de evidencia queda opaco y de alto contraste; solo chips/filtros/popovers pueden usar el glass tenue.

**Detalle de cuenta autorizado:** conservar el expediente y su historial como registro de consulta, encabezando con folio/estado y origen de los datos; nunca sugerir aprobación de aseguradora. Solo renderizar acciones y destinos ya permitidos. En móvil, dejar la condición de solo lectura visible sin que tape el folio.

## RESPONSIVE — RECOMPOSICIÓN DEL CONTENIDO, SIDEBAR CONGELADO

El sidebar y su breakpoint/comportamiento actuales se mantienen sin cambios. El contenido aprovecha exactamente el espacio que el shell le entrega; no redefine el ancho del rail, la ubicación, su drawer o sus interacciones.

- **Escritorio amplio (≥1440 px):** una región focal amplia y una secundaria de hasta un tercio del área principal cuando ésta ayude a la tarea. Alinear encabezados, filtros y registros en el mismo eje; evitar espacios vacíos artificiales.
- **Escritorio/laptop (1080–1439 px, o hasta el límite útil del sidebar):** colapsar regiones secundarias debajo de la principal antes de estrechar listas o texto. Eliminar columnas accesorias, no los campos de negocio.
- **Tablet:** una sola columna de contenido por defecto; side facts pueden pasar a una franja horizontal de lectura. Filtros complejos abren el patrón de popover/drawer existente si ya lo hay; no crear acciones nuevas.
- **Móvil (320–767 px):** un flujo vertical reordenado por prioridad; título, estado y siguiente acción primero, búsqueda/filtros en control compacto, contenido después. Registros cambian a filas apiladas con etiquetas claras, sin esconder estado ni fecha. Visualizaciones se simplifican; tablas realmente tabulares conservan una región de scroll con nombre accesible.
- Reducir o quitar `backdrop-filter` en móvil y con preferencias de rendimiento reducidas; la superficie conserva color, borde y contraste suficientes. El foco siempre queda visible por encima del material.
- No introducir scroll horizontal a nivel de documento, no superponer controles a contenido y no depender de hover para revelar acciones.

## CREATIVE CONTRACT — DELTA V16

**VISUAL CONCEPT:** Tres corrientes, un espacio de trabajo: Hospital como flujo de cuidado, Atlas como red, Aseguradora como archivo consultable.  
**PRIMARY FEELING:** Cada vista se entiende rápidamente, respira y se siente ligera; la identidad del sistema es evidente sin saturar el contenido.  
**GEOMETRY:** Superficies amplias y contenidas, con agrupaciones solo donde existen unidades de tarea.  
**COLOR:** Jade clínico para Hospital; lavanda/índigo para Atlas; vino grisáceo para Aseguradora. La superficie es neutral clara. Sidebar y logins no cambian.  
**PRIMARY MOTIF:** Flujo de cuentas; red/capacidad; índice y evidencia respectivamente.  
**MOTION:** Solo feedback corto y estado real; no animar vidrio o métricas en reposo.  
**SPECIAL EFFECT:** Liquid Glass selectivo para herramientas flotantes/contextuales con fallback opaco; nunca aplicado a toda la pantalla.  
**LAYOUT INTENT:** Reconstruir la distribución completa del área principal de cada ruta a partir de su tarea; sidebar derecho queda intacto. Inicio, listados, formularios operativos, reportes, detalle y cronologías tienen estructuras deliberadamente distintas.  
**TYPOGRAPHY INTENT:** Mantener Geist/Inter y tokens globales, con jerarquía de título moderada y valores/datos alineados.  
**DEPTH:** Transparencia, borde claro e highlight sutil solo para capas elevadas; superficies de lectura planas y claras.  
**RESPONSIVE INTENT:** Reordenar y apilar según prioridad sin modificar el sidebar; conservar contenido, permisos, legibilidad, foco y acciones.  
**DO NOT:** tocar el sidebar o los logins; aplicar glass globalmente; copiar una misma composición en tres plataformas; envolver cada bloque en cards; alterar lógica, API, rutas, roles, datos, acciones o flujos.

## FRONTEND HANDOFF Y ACEPTACIÓN

La implementación es visual y de composición. Se pueden reorganizar markup y CSS del área principal sin cambiar contratos funcionales. No se deben tocar el componente/estilos/comportamiento del sidebar ni archivos de login. Antes de intervenir un selector compartido, comprobar que no se usa en el sidebar/login; aislar la presentación del área principal si fuera necesario.

Una plataforma queda revisada cuando:

- el sidebar se ve y funciona igual que antes;
- el login del sistema conserva su render y flujo;
- home, registro, detalle, formulario, reporte y timeline presentan jerarquías apropiadas, no una plantilla común;
- se identifica el acento correcto en contenido y controles internos, con contraste legible y estados semánticos intactos;
- Liquid Glass aparece solo en superficies contextuales designadas y tiene fallback legible;
- los roles, rutas, etiquetas, llamadas, acciones y condiciones read-only siguen intactos;
- desktop, tablet y móvil recomponen el contenido; se revisa al menos un render real por plataforma y un viewport móvil;
- loading, vacío, error, disabled, hover, focus y teclado siguen siendo perceptibles y utilizables.

## RUTAS INCLUIDAS / EXCLUIDAS

**Hospital:** `/hospital`, `/hospital/accounts`, `/hospital/accounts/[id]`, `/hospital/review`, `/hospital/import`, `/hospital/agreements`, `/hospital/reports`, `/hospital/users`, `/hospital/audit`.  
**Consola Atlas:** `/admin`, `/admin/tenants`, `/admin/licenses`, `/admin/leads`, `/admin/users`, `/admin/audit`.  
**Aseguradora:** variante `INSURER_DEMO` de `/hospital` y rutas de consulta ya autorizadas.  
**Explícitamente fuera:** sidebar en cualquier viewport; `/login`, `/admin/login`, `/insurer/login`; landing pública y privacidad; APIs, autenticación, autorización, modelos y lógica funcional.
