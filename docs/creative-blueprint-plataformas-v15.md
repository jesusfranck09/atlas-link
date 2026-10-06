# Atlas Link — Creative Blueprint para plataformas v15

**Estado:** addendum creativo vigente para los espacios internos autenticados.  
**Fecha:** 1 de octubre de 2026.  
**Precedencia:** amplía `docs/global-visual-redesign-blueprint.md`. Conserva su dirección editorial clara y sus tokens; reemplaza sus decisiones anteriores de navegación superior y disposición interna.  
**Alcance:** inicio y módulos autenticados de Hospital, Consola Atlas y Aseguradora. Los accesos y formularios de login ya aprobados quedan fuera de este rediseño.

## PRODUCT UNDERSTANDING

Atlas Link contiene tres espacios con tareas y permisos distintos:

- **Hospital:** recibe, organiza, revisa y prepara cuentas hospitalarias; gestiona convenios, equipo, informes y actividad.
- **Consola Atlas:** observa la red de hospitales y administra registros de organización, licencias, capacidad, solicitudes, equipo y actividad.
- **Aseguradora:** consulta cuentas compartidas y su evidencia demostrativa en modo de solo lectura. En la implementación existente usa las rutas hospitalarias y cambia la presentación/permisos por rol; no tiene un árbol autenticado independiente.

El shell presente ya determina rol, rutas permitidas, búsqueda, ayuda, sesión y cierre de sesión. La navegación visible actual es una banda horizontal común. En pantallas pequeñas se convierte en un panel desde la izquierda. Los homes actuales sí contienen vocabulario propio por sistema, aunque mantienen patrones de panel, encabezado y distribución que deben componerse de nuevo. Esta auditoría guía la dirección; no valida la calidad de cada estado renderizado.

## USER / BUSINESS CONTEXT

Los perfiles hospitalarios trabajan sobre cuentas y ciclos de revisión; necesitan reconocer prioridades y retomar un expediente sin perder contexto. Atlas opera una red y necesita comparar organizaciones, licencias y capacidad. La persona de aseguradora explora evidencia y necesita que la condición de solo lectura sea persistente e inequívoca. No se añaden permisos, acciones, datos ni procesos.

## EXPERIENCE INTENT

Convertir cada espacio en un escritorio editorial de operación: la tarea ocupa el campo principal a la izquierda, mientras un índice lateral permanente a la derecha da orientación y acceso inmediato a los módulos. La composición debe sentirse ligera y deliberada, con el contenido como foco y la navegación como instrumento silencioso. En móvil, la misma navegación aparece como cajón derecho y deja el documento o la tarea como contexto dominante.

## CREATIVE CONCEPT

### «Margen de operación»

Una página documental tiene un campo de lectura amplio y un margen que ordena referencias. Atlas Link adopta esa relación: el área izquierda es el folio de trabajo; el rail derecho es el índice vivo del espacio. No se imita una hoja física literal ni se repite la identidad gráfica del login. El margen permanece visualmente estable; el folio cambia de estructura según la tarea.

Consecuencias del concepto:

1. El shell debe hacer visible la separación entre trabajo y orientación sin encajonarlos en tarjetas paralelas.
2. El rail ofrece grupos breves, estado activo inequívoco y cuenta/ayuda al pie; no replica acciones que ya viven en la página.
3. Las páginas internas pueden ser un registro continuo, una hoja de detalle, un formulario o una composición analítica; no comparten una cuadrícula forzada.
4. Un acento propio por espacio expresa contexto, pero la silueta y el orden de la página también distinguen cada sistema.

## VISUAL METAPHOR

El **folio** reúne la información en curso; el **margen** permite localizar otros capítulos sin sacar a la persona del espacio de trabajo. En Hospital, el folio se lee como expediente en movimiento. En Atlas, como registro de red. En Aseguradora, como libro de evidencia consultable.

## ART DIRECTION

- Ambiente blanco/perla, sereno y luminoso; sin base oscura.
- El área principal es amplia y blanca, con lectura editorial, líneas finas solo para separar datos que lo necesiten y superficies elevadas reservadas para popovers, menús o acciones realmente flotantes.
- El rail derecho tiene superficie perla apenas diferenciada del folio y una línea de borde interior delicada. Debe parecer parte de la arquitectura de página, no una tarjeta alta flotando ni una barra de plantilla.
- Las agrupaciones se forman primero con alineación, espacio y escala tipográfica. No rodear cada grupo con un recuadro.
- Sin blobs, auroras, neón, partículas, glass ubicuo, sombras duras ni adornos médicos de stock.
- Mantener etiquetas de demo y límites de lectura existentes en una posición perceptible, pero secundaria.

## VISUAL PERSONALITY

La familia es compartida, no clonada:

| Espacio | Carácter | Composición que lo distingue | Acento existente |
|---|---|---|---|
| Hospital | Cuidado preciso y progresión operativa | Estado y ruta de cuentas preceden a la cola; el registro se lee por etapas y prioridad | Jade clínico `--color-system-hospital` |
| Consola Atlas | Supervisión de red y capacidad | Índice de organizaciones con capacidad/condición legibles en la misma línea de registro; la red es la figura principal | Lavanda `--color-system-control` |
| Aseguradora | Consulta documental y evidencia | Identificación persistente de solo lectura; resultados como índice y expediente consultable, sin controles de edición | Vino grisáceo `--color-system-insurer` |

La diferencia no se consigue intercambiando solo el color del rail. Cambian el orden, la densidad, la relación entre resumen y lista y el tratamiento del contenido principal.

## COLOR DIRECTION

Reutilizar los roles definidos en `frontend/src/app/globals.css`: fondo `#fafafa`, superficies blancas, superficie atenuada `#f5f5f6`, texto grafito `#2e2e36`, secundarios `#666671` / `#898994`, violeta de acción `#7969a7`, violeta suave `#f0ecfa`, bordes tenues y colores semánticos suaves. Para identificar cada sistema, conservar jade `#729e91`, lavanda `#8980bd` y vino grisáceo `#997f89` con sus variantes suaves actuales.

El acento del sistema aparece en selección de navegación, marcadores y visualizaciones pertinentes. Las acciones primarias continúan usando el color de acción compartido. Rojo, ámbar y verde conservan significado semántico actual; no se usan como marca ni se reinterpretan. No introducir nuevas familias ni valores hardcodeados.

## TYPOGRAPHY DIRECTION

Usar la pila sans existente (`Geist Variable`, `Inter Variable` y fallback de sistema). Jerarquía: nombre del espacio/contexto pequeño; título de página claro y moderado; títulos de sección compactos; datos clave con cifras tabulares; metadata silenciosa pero legible. Evitar mayúsculas espaciadas extensas en nombres largos, headlines gigantes, peso 700–900 por defecto y texto de ayuda reducido por debajo de lectura cómoda.

## GEOMETRY SYSTEM

Reutilizar `--radius-sm` (9px), `--radius-md` (12px), `--radius-lg` (18px), `--radius-xl` (24px), `--radius-2xl` (30px) y `--radius-full`. Aplicar radios grandes a superficies que flotan o contienen una acción contextual; las filas y el rail no deben convertirse en cápsulas repetidas. Las tablas pueden tener esquinas suaves como conjunto si realmente hay una superficie común, pero sus filas deben leerse como registro abierto.

## LAYOUT & SPATIAL COMPOSITION

### Escritorio

1. Crear un shell de dos zonas: **folio principal a la izquierda** y **sidebar persistente a la derecha**. Orden DOM y teclado: primero contenido principal, después navegación; la colocación visual no altera el orden semántico.
2. En escritorio amplio, el rail derecho mide aproximadamente 248–280px. Se mantiene a la vista al recorrer contenido largo, con scroll propio solo si sus elementos exceden la altura. El rail ocupa el borde derecho de la composición, no flota sobre el contenido.
3. El folio usa el ancho restante con un máximo legible y padding suficiente. El encabezado contextual, búsqueda y acciones de cuenta permanecen en el área principal y no crean una segunda navegación horizontal.
4. Encabezado por página: breadcrumb/contexto discreto donde aporte orientación, título, descripción corta y acciones primarias alineadas a la tarea. No reservar una banda de navegación superior bajo el encabezado.
5. Pie de página, cuando aporte contexto, va al final del folio, sin competir con el rail.

### Sidebar derecha

- Identidad de Atlas Link y nombre del espacio en el extremo superior.
- Grupos de navegación actuales, respetando los roles existentes y sus etiquetas.
- Selección por fondo tintado suave o marcador lineal lateral orientado al contenido; no usar bloque saturado, icono en caja repetido ni indicador ambiguo.
- La página activa se identifica con `aria-current="page"`; una ruta hija mantiene seleccionado el módulo padre según la regla ya existente.
- En el pie: usuario/rol, ayuda y cierre de sesión, conservando las mismas acciones funcionales. La condición de demo/solo lectura es visible, sin duplicar insignias decorativas.
- La búsqueda global puede residir al inicio del folio o como control compacto dentro del rail si su espacio y etiquetas siguen siendo claros; conservar sus destinos actuales (`/admin/tenants` o `/hospital/accounts`).

### Tablet y móvil

- Bajo el punto donde el rail reste ancho útil (objetivo inicial: alrededor de 1080px), convertirlo en cajón que entra **desde la derecha**. El contenido pasa a ancho completo y se reordena; no se comprime como mini escritorio.
- El botón de navegación queda en la zona superior derecha del folio, con nombre accesible y estado expandido. El cajón conserva grupos, active state, identidad y pie de usuario.
- Overlay tenue, cierre por Escape y botón explícito, foco inicial dentro, foco contenido mientras abierto, restauración al disparador y bloqueo del scroll de fondo. Tocar una ruta cierra el cajón.
- En pantallas estrechas, mostrar tabla como estrategia responsive ya existente (priorizar campos, permitir desplazamiento accesible o transformar filas), mantener acciones primarias alcanzables y permitir que filtros complejos se agrupen; no ocultar información de negocio silenciosamente.
- Reducir decoración antes que jerarquía o legibilidad. Objetivos mínimos de toque cercanos a 44px.

### Home por espacio

- **Hospital (`/hospital`):** comenzar con turno/contexto y señal de cuentas por revisar. El grupo de tres resultados de preauditoría es un trayecto o índice de estados con cantidades alineadas, no una fila de tres tarjetas. Debajo se prioriza la cola reciente y su acceso a todo el registro; actividad aparece como cronología compacta al final. «Recibir cuenta» conserva prominencia solo para roles que ya pueden importar.
- **Consola Atlas (`/admin`):** el registro de organizaciones y su lectura de licencia/capacidad forman el foco, no un tablero de KPIs en mosaico. Incorporación de hospital es la acción principal autorizada; capacidad total y licencias vigentes sirven como anotaciones integradas. Actividad y solicitudes comerciales quedan como rutas de seguimiento con contexto.
- **Aseguradora (`/hospital`, rol `INSURER_DEMO`):** mostrar primero el modo consulta/no edición, luego el índice de estados y el archivo compartido. No mostrar botones de importación, revisión, publicación o autorización. Reutilizar solo las acciones de lectura permitidas y actuales.

### Módulos

Los módulos usan el mismo encabezado y rail, pero su composición corresponde a la tarea:

- **Registros** (cuentas, hospitales, licencias, usuarios, solicitudes, bitácoras): búsqueda/filtros cerca del título y lista alineada a columnas. Nombre, estado, cantidad, fecha y acción mantienen columnas y pesos legibles; acciones secundarias discretas. La tabla puede ser un ledger de borde abierto, no un rectángulo administrativo pesado.
- **Detalle de cuenta:** encabezado de folio y estado; datos principales y cifra focal en jerarquía; tabs existentes para cargos, hallazgos, historial y evaluaciones; la evidencia conserva trazabilidad y lectura. Las acciones siguen sujetas a rol y estado actuales.
- **Revisión/importación:** formularios internos conservan campos, validaciones, progresión y callbacks actuales, reorganizados en grupos respirables y una acción final clara. El login no se toca.
- **Convenios:** cada versión y vigencia se distinguen como registro contractual; borrador/publicado y reglas permanecen explícitos, sin tarjetas idénticas que escondan la relación de versión.
- **Reportes:** filtros de periodo arriba, cifras de periodo integradas al informe y visualizaciones debajo/en composición asimétrica; evitar mosaico KPI y multicolor. Las notas de interpretación permanecen cerca de los gráficos que limitan.
- **Equipo y bitácora:** directorio o cronología escaneable con estados/roles visibles y acciones permitidas; orden temporal y autoría se preservan.

## COMPONENT DNA

- **Page header:** patrón global de título, contexto y acciones; puede crecer en una cifra principal o reducirse en un índice. Máximo dos acciones inmediatas antes de mover el resto a menú.
- **Sidebar item:** icono lineal actual, etiqueta y estado de selección. Hit area cómoda, hover neutral y foco de alto contraste. Usar la familia de iconos vigente.
- **Metric/data annotation:** número tabular con nombre y unidad; ocupar línea o zona editorial sin envolver cada indicador en una tarjeta.
- **Record row:** alineación de columnas, estado semántico tenue, hover/foco discretos y acción local. Preservar selección/teclado y densidad necesaria.
- **Surface:** nivel base, contenido y flotante siguen los tokens actuales. No introducir card nueva solo para encerrar una sección.
- **Actions/controls:** reutilizar el sistema de controles existente con estilos personalizados y estados completos; cambiar el orden visual nunca altera validaciones, permisos ni envío.
- **Aseguradora:** etiqueta de solo lectura persistente tanto en el shell como en el inicio/encabezados pertinentes; no simular botones deshabilitados para expresar falta de permisos.

## INTERACTION LANGUAGE

- La selección del rail cambia de forma inmediata y predecible; respetar navegación Next existente.
- Hover aclara superficie/contraste con cambio sutil. Focus es visible y distinto del hover. Presionado breve sin rebote.
- Filtrado, búsqueda, tabs y botones conservan estado y resultado actuales.
- Menú contextual, ayuda y popover mantienen su dismiss por teclado/click-outside según componente vigente.
- Indicadores de progreso y estado solo animan cuando representan cambio real; no ambientar métricas con movimiento continuo.

## MOTION DIRECTION

Usar las duraciones globales `--motion-fast: 150ms`, `--motion-standard: 200ms` y `--motion-slow: 280ms`, con easing existente. Cambios de foco/hover priorizan rapidez; el cajón derecho puede usar transición estándar a lenta con desplazamiento corto y opacidad, respetando el origen derecho. Con `prefers-reduced-motion: reduce`, remover desplazamiento y transiciones no esenciales. No usar parallax, loops, rebotes, barridos de luz ni animación permanente.

## DOMAIN-SPECIFIC VISUAL EFFECT

No se requiere efecto gráfico avanzado para los espacios internos. La metáfora queda expresada por composición, ruta/índice de estados y continuidad de registros existentes. Si se conserva una representación de progreso de capacidad o distribución, usar CSS/SVG ya disponible, datos reales del endpoint y fallback estático; nada de WebGL, partículas ni falsas señales clínicas.

## RESPONSIVE STRATEGY

- **≥1080px (aprox.):** rail derecho persistente; folio toma ancho disponible. No fijar ancho que provoque columnas comprimidas.
- **Tablet:** folio reorganizado en una columna principal; rail se vuelve drawer derecho al cruzar el umbral real de legibilidad, no solo un ícono lateral apretado.
- **Móvil:** título y acción prioritaria primero; filtros se condensan/reagrupan; filas dan prioridad a nombre/estado/fecha y permiten abrir detalle con affordance clara. Drawer de ancho cómodo con scroll y cierre seguros.
- Cada módulo debe demostrar ausencia de overflow horizontal accidental. Cuando exista tabla amplia, el contenedor tiene región accesible y aviso/estrategia para desplazamiento.
- Los estilos por sistema definen acentos y personalidad, no tres implementaciones distintas del shell.

## ACCESSIBILITY GUARDRAILS

- Mantener `<main>`, `<nav aria-label>`, landmarks y enlace de salto al contenido.
- Orden de foco coincide con orden lógico del contenido; el rail se alcanza después de las tareas principales.
- Drawer móvil con nombre, `aria-modal`, `aria-expanded`, Escape, gestión/restauración de foco y bloqueo de fondo.
- Foco visible conforme a los tokens de foco; no depender solo del color para estado activo o estado de cuenta.
- Verificar contraste de acento jade, lavanda y vino sobre perla. Texto secundario no se reduce solo por considerarse metadata.
- Etiquetas accesibles para icon buttons, tablas con encabezados y controles con label. Estados de error/loading/vacío continúan anunciándose.
- No retirar avisos de solo lectura, demo, estimación o límites de autorización de las vistas existentes.

## PERFORMANCE GUARDRAILS

Implementar rail y drawer con CSS y comportamiento React ya presente; evitar imágenes o dependencias visuales adicionales. Evitar filtros blur extensos, scroll listeners innecesarios y animaciones de layout en listas largas. El shell debe ser utilizable antes de completar cargas de datos y no debe reservar al rail animaciones constantes.

## ANTI-PATTERNS

- No mantener la banda de navegación horizontal además del nuevo rail.
- No colocar un sidebar a la izquierda ni mover visualmente el main a la derecha.
- No alterar logins, sus formularios, sus fondos aprobados, `/`, `/privacidad` o la identidad ya acordada para accesos.
- No resolver el rediseño cambiando solo acentos/radios sobre el markup actual.
- No repetir cuatro KPI cards, cardificar cada módulo o usar la misma distribución para los tres sistemas.
- No ocultar elementos del menú por estilo: seguir el filtrado de roles que ya hace el workspace.
- No crear nuevas rutas, endpoints, reglas de permisos, cambios de modelo o acciones para aseguradora.
- No oscurecer el rail ni hacerlo destacar más que el folio.
- No usar textos de ejemplo como datos clínicos reales ni cambiar términos de negocio.

## UX HANDOFF

Preservar etiquetas, destinos y restricciones actuales. Validar que el índice a la derecha no retrase la tarea más frecuente y que el usuario comprenda qué espacio y qué módulo está usando. Mantener navegación por rol; no añadir elementos solo para llenar grupos. En móvil, reordenar la página según prioridad de acción e información.

## UI HANDOFF

Formalizar el rail como variante del sistema de navegación vigente: lado derecho, selección suave, grupos cortos y pie utilitario. El sistema comparte escala de tipo, espacios y estados; evitar contornos por defecto en cada superficie. Asegurar una versión completa, colapsable como drawer a partir del breakpoint definido por el contenido.

## DESIGN SYSTEM HANDOFF

Tomar tokens de `frontend/src/app/globals.css`, incluidos colores por sistema, estados, radios, superficies, sombras, escala `--space-*`, sans actual y transiciones. Si el shell necesita nuevos tokens semánticos (por ejemplo, ancho del rail o fondo del margen), agregarlos una sola vez a la fundación compartida; no crear colores hex/radios/espacios locales equivalentes ni forks por sistema. El acceso autenticado debe compartir `workspace.tsx`; el modo insurer deriva del rol existente.

## MOTION / 3D HANDOFF

No asignar especialista 3D ni añadir efectos. La única transición distintiva es el drawer que entra desde la derecha y se desvanece; implementar con CSS, con alternativa sin movimiento. Los índices de flujo existentes pueden mantener una línea estática.

## FRONTEND HANDOFF

Reconstruir el shell y presentación de rutas internas preservando en `workspace.tsx` los contratos de AuthBoundary, `useUser`, filtrado por roles, `pathname`, search/router, ayuda, logout y destinations. Mantener llamadas API, estados, formularios, tablas, exportación y acciones. Verificar los tres contextos de `/hospital`, todas las rutas internas listadas, subrutas de detalle, drawer right-side con teclado y composición en escritorio/tablet/móvil. Mantener los tres accesos intactos.

## VISUAL QA HANDOFF

Revisar render real (no solo CSS) por composición, orden lectura, rail derecho, identidad propia, overflow y elementos que todavía utilicen la antigua banda superior. Recorrer rutas autorizadas con rol Hospital, rol Atlas y `INSURER_DEMO`; confirmar que rol insurer sigue en modo lectura y que el rail no expone enlaces no autorizados. Validar drawer desde la derecha con teclado, foco, Escape y restauración; revisar contraste, `prefers-reduced-motion`, loading/error/empty y al menos un estado de datos por módulo. Marcar como pendiente cualquier estado no renderizado; no inferir QA de código fuente.

## CREATIVE CONTRACT

**VISUAL CONCEPT:** Margen de operación; folio de trabajo a la izquierda, índice vivo a la derecha.  
**PRIMARY FEELING:** Serenidad precisa, orientación inmediata y confianza documental.  
**GEOMETRY:** Superficies suaves y abiertas; rail estructural al extremo derecho; redondeo actual solo donde expresa agrupación o flotación.  
**COLOR:** Blanco/perla y grafito dominan; lavanda es acción compartida; jade identifica Hospital; lavanda contextualiza Atlas; vino grisáceo identifica Aseguradora. Estados conservan su semántica actual.  
**PRIMARY MOTIF:** Folio más margen/índice persistente, expresado con navegación y relaciones entre registros.  
**MOTION:** Breve y funcional; drawer desde la derecha; sin ambiente animado.  
**SPECIAL EFFECT:** Ninguno requerido; los registros y sus estados son el elemento visual del dominio.  
**LAYOUT INTENT:** Página interna de trabajo a la izquierda con ancho y jerarquía propios; sidebar persistente a la derecha en desktop; drawer desde la derecha en tablet/móvil. No banda de navegación horizontal. Homes distintas según propósito.  
**TYPOGRAPHY INTENT:** Geist/Inter de los tokens vigentes; títulos moderados; datos tabulares; metadatos legibles y secundarios.  
**DEPTH:** Contraste de superficie y borde suave; sombra solo para drawer/popover cuando se separan del folio.  
**RESPONSIVE INTENT:** Cambiar navegación a drawer derecho y recomponer cada página por prioridad; no reducir desktop proporcionalmente.  
**DO NOT:** cambiar logins, landing pública o privacidad; copiar un dashboard genérico; cardificar todos los módulos; oscurecer navegación; inventar rutas, datos, acciones o permisos.

## FINAL CREATIVE GUARDRAILS

La auditoría creativa detecta una desviación que debe corregirse: la navegación horizontal común presente en `workspace.tsx` y `portal.module.css` contradice el nuevo pedido de sidebar derecha; las reglas específicas por sistema y las reglas globales repetidas dificultan una lectura visual estable. El rediseño debe retirar visualmente esa banda y unificar el shell sin borrar la diferenciación de los tres espacios.

Las vistas existentes son el mapa de comportamiento. El resultado debe conservar ese comportamiento, pero establecer una composición nueva que se reconozca en la primera carga: main a la izquierda, margen de navegación a la derecha, hogar y módulos estructurados según su objetivo.

## RUTAS Y ARCHIVOS REVISADOS

### Fundamento compartido

- `docs/global-visual-redesign-blueprint.md`
- `frontend/src/components/workspace.tsx`
- `frontend/src/components/portal.module.css`
- `frontend/src/components/dashboard.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/components/operations.module.css`
- `frontend/src/components/platform.module.css`
- `frontend/src/components/platform.tsx`
- `frontend/src/components/accounts.tsx`
- `frontend/src/components/account-detail.tsx`
- `frontend/src/components/agreements.tsx`
- `frontend/src/components/import-account.tsx`
- `frontend/src/components/reports.tsx`
- `frontend/src/components/users.tsx`
- `frontend/src/components/audit.tsx`

### Rutas internas verificadas en el árbol App Router

**Hospital (con variantes de contenido por rol):** `/hospital`, `/hospital/accounts`, `/hospital/accounts/[id]`, `/hospital/review`, `/hospital/import`, `/hospital/agreements`, `/hospital/reports`, `/hospital/users`, `/hospital/audit`.

**Consola Atlas:** `/admin`, `/admin/tenants`, `/admin/licenses`, `/admin/leads`, `/admin/users`, `/admin/audit`.

**Aseguradora:** rol `INSURER_DEMO` dentro de `/hospital` y sus rutas permitidas, particularmente `/hospital` y `/hospital/accounts`; no se encontró layout autenticado `/insurer/*`.

**Fuera del alcance visual de esta iteración:** `/`, `/privacidad`, `/login`, `/admin/login`, `/insurer/login`.
