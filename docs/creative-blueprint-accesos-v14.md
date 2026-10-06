# Atlas Link · Blueprint creativo V14 extendido

> **SUPERSEDIDO PARA DECISIONES VISUALES.** El 30 de septiembre de 2026 el usuario pidió eliminar el modelo visual anterior y rehacer toda la plataforma desde la referencia clara perla/violeta. Para cualquier implementación, la autoridad vigente es [global-visual-redesign-blueprint.md](./global-visual-redesign-blueprint.md). Este documento queda como antecedente de análisis funcional; no deben heredarse sus paletas, layouts ni contratos visuales.

**Estado:** histórico rechazado para toda decisión visual. El usuario indicó expresamente que los accesos y la plataforma anteriores no le gustaron y pidió rehacer las tres entradas; no deben describirse como aceptados ni recuperarse como dirección. El contrato activo está en [global-visual-redesign-blueprint.md](./global-visual-redesign-blueprint.md). La evidencia y el mapa funcional de este documento pueden seguir consultándose cuando no contradigan ese contrato.  
**Fecha:** 29 de septiembre de 2026.  
**Referencia:** captura de acceso compartida por el usuario. Se abstraen su franja contextual, composición asimétrica, fotografía y banda inferior compacta. No se replica su contenido, marco ni afirmaciones.

## 1. Comprensión del producto y evidencia

Atlas Link prepara y revisa cuentas hospitalarias antes de su entrega a aseguradoras. Opera con México/MXN. No es expediente clínico ni autoriza pagos. No hay hospital piloto: las cuentas, convenios y accesos de la demostración son sintéticos.

Los tres accesos existentes son `/login` (portal hospitalario), `/admin/login` (Consola Atlas) y `/insurer/login` (demo de consulta de aseguradora). El código comparte `components/login.tsx` y su módulo CSS: autenticación por correo y contraseña, perfiles demo que rellenan ambos campos sin enviar el formulario, visibilidad de contraseña, estados de carga/error y destino determinado por el rol. La demo de aseguradora conserva su rol de solo lectura y luego llega a `/hospital`.

Rutas autenticadas auditadas:

| Espacio | Entrada y rutas principales | Pantalla raíz y tareas observadas |
|---|---|---|
| **Hospital** | `app/hospital/layout.tsx`: `Workspace`; `/hospital`, `/hospital/accounts`, `/hospital/accounts/[id]`, `/hospital/review`, `/hospital/import`, `/hospital/agreements`, `/hospital/reports`, `/hospital/users`, `/hospital/audit`. | `/hospital` usa `Dashboard`: cuatro métricas del endpoint `/dashboard`, seis cuentas recientes, filtro por categoría y panel analítico. El flujo secundario cubre importar, revisar, preparar/exportar y registrar envío/respuesta según rol. |
| **Consola Atlas** | `app/admin/(workspace)/layout.tsx`: `Workspace platform`; `/admin`, `/admin/tenants`, `/admin/licenses`, `/admin/leads`, `/admin/users`, `/admin/audit`. | `/admin` usa `Dashboard platform`: portafolio de hospitales/licencias desde `/tenants` y `/licenses`, resumen de uso, solicitudes y actividad. No muestra detalle financiero de cuentas hospitalarias. |
| **Aseguradora demo** | **No existe `/insurer/*` autenticado.** `/insurer/login` obtiene `INSURER_DEMO` y redirige a `/hospital`; la misma ruta raíz y las rutas de cuentas se presentan como consulta de solo lectura. Menú actual: `Vista general` y `Cuentas`; el detalle de cuenta omite acciones de edición/envío. | `/hospital` reutiliza `Dashboard` y el endpoint de datos existente con variante de presentación por rol; `Accounts` y detalle muestran cuentas sintéticas del hospital demo. No es un portal comercial segregado por aseguradora. |

El shell común vive en `components/workspace.tsx`: cabecera de sistema, organización/usuario, búsqueda contextual, menú, contexto de módulo y pie. Hospital usa navegación horizontal; Atlas usa rail lateral desde escritorio amplio y adapta el menú en móvil; Aseguradora usa una navegación horizontal reducida. `components/dashboard.tsx` escoge `control`, `hospital` o `insurer` según `platform`/rol y compone portada (`systemCover`), datos reales de API, visualización y módulos de trabajo. La paleta V12 está en `components/portal.module.css`.

La revisión V12 define identidades distintas: hospital jade/mineral; Atlas cobalt/plata; aseguradora marfil/cobre. Capturas Docker reales suministradas para los tres sistemas (1440×1000 y 390×844) muestran una portada ancha, banda contextual, ribbon de métricas y zona operativa; la identidad también está diferenciada por navegación y orden del contenido. Hospital mantiene seis filas recientes y analítica a la derecha. Atlas usa rail, portafolio y uso mensual. Aseguradora conserva contexto de solo lectura, analítica antes del libro de cuentas y dos entradas de menú. En móvil el menú pasa a drawer, las métricas se apilan en dos columnas y las zonas de trabajo se apilan; tablas conservan desplazamiento horizontal o filas compactas según pantalla.

Renders base observados: `/private/tmp/atlas-workspace-baseline/{hospital,atlas,insurer}-{desktop,mobile}.png`. Evidencia previa versionada que ayuda a comparar: `evidence/identity-v12/after/hospital-overview-1440x900.png`, `evidence/identity-v12/after/insurer-accounts-desktop.png` y `evidence/premium-v10/after/atlas-day-desktop.png` (V10, referencia histórica para Atlas, no reemplaza el render actual). Los logins actuales sí siguen prácticamente la misma composición; en escritorio dejan mucho vacío alrededor de foto y formulario y en móvil ocultan la foto, con espacio vertical subcompuesto. Los renders de los workspaces tienen una base operativa clara y densidad útil; la mejora debe refinar composición/contexto sin reconstruir su arquitectura ni reducir esa densidad.

Activos revisados: `clinical-team.jpg` y `healthcare-editorial.jpg` muestran personal sanitario; `hospital-facade.jpg` aporta una geometría arquitectónica apropiada para Atlas; `hospital.jpg`, usado hoy por la aseguradora, contiene señalización de habitaciones legible que no debe parecer ubicación, cliente ni sede confirmada. Debe recortarse fuera de lectura o usarse otro activo existente tras revisión visual. Las fotografías siguen siendo ilustrativas.

`docs/redisenio-visual.md` se considera histórico/rechazado donde entra en conflicto con las decisiones actuales. La dirección se basa en `docs/review-identity-v12.md`, `docs/decisiones.md`, rutas/código vigentes y los renders reales anteriores; no revive propuestas previas ni modifica capacidades.

## 2. Usuario y objetivo de experiencia

**Usuarios:** personal hospitalario con roles de administración, caja/facturación, auditoría y dirección; personal Atlas que gestiona hospitales, licencias, solicitudes y equipo; y un rol de aseguradora que consulta datos sintéticos sin editar.

**Intención:** que cada persona ubique sistema, organización y módulo; llegue con pocas fricciones a su tarea principal; y pueda escanear datos operativos con confianza. La familia visual comparte marca y lenguaje de orientación, mientras Hospital, Atlas y Aseguradora conservan carácter, navegación, permisos y ritmo propios.

**Concepto creativo — Una estructura, tres ritmos:** la franja de orientación, la retícula y la jerarquía de datos dan continuidad a toda Atlas Link. Cada superficie ordena el trabajo con una composición distinta: hospital fluye entre cuentas y revisión; Atlas organiza entidades y licencias; aseguradora presenta una consulta tipo dossier.

**Metáfora:** un mismo mapa orienta a tres maneras de trabajar. El umbral de login introduce cada sistema. Dentro, una franja de contexto lleva de sistema a organización y módulo; la portada de vista general anticipa la tarea dominante y conecta con datos existentes. La metáfora modifica composición, geometría y material; nunca convierte consulta en edición ni cambia el flujo.

## 3. Auditoría KEEP / IMPROVE / REMOVE / REINVENT

| Acción | Decisión |
|---|---|
| **KEEP** | Marca Atlas Link; login y perfiles demo; autenticación, roles y API; context bar, búsqueda y ayuda; mapa de módulos existente; shell hospital horizontal, rail Atlas y nav reducida de aseguradora; ribbons/mediciones alimentados por API; tabla hospital de seis filas, portafolio Atlas y analítica previa al libro de consulta insurer. Mantener fondos claros y densidad operativa probada. |
| **IMPROVE** | Logins: cambiar el encuadre centrado vacío por composición asimétrica de referencia y paleta canónica. Workspaces: hacer que context bar, portada de overview, métricas y área de trabajo se lean como una secuencia compuesta; afinar recortes, alineaciones y señal de demostración. Fortalecer variación por geometría y orden, no solo por tinte. |
| **REMOVE** | Espacios sin propósito en login; captions estáticos que parezcan estado real (“Operación conectada” / “Red hospitalaria”) si no proceden de un estado medido; señalética fotográfica legible que sugiera sede; repetición de contenedores sin jerarquía. No añadir selector de sede, TLS, métricas clínicas, SSO/passkey/biometría ni insignias HIPAA/SOC 2. |
| **REINVENT** | Logins: imagen y firma por sistema frente a acceso abierto y estable. Overview Hospital: una ruta visual calma entre cuentas y preauditoría sin competir con seis filas. Atlas: estructura de portafolio y capacidad integrada con su rail y gráfico. Aseguradora: un dossier de consulta con lectura y analítica primero. En páginas secundarias, refinar títulos/acciones y zonas de lectura sin añadir una portada idéntica a todo módulo. |

## 4. Dirección de arte y composición común

### Escritorio

- Lienzo claro con una atmósfera de color muy tenue propia de cada sistema. Sin marco grueso alrededor del viewport, tarjetas repetidas ni sombras fuertes.
- Una franja superior baja alinea marca y nombre del sistema a la izquierda; a la derecha conserva el enlace actual a otro acceso. Una línea fina puede separar la franja del contenido. No mostrar selector de organización: el login no tiene contexto de una organización autenticada.
- Centrar el escenario en una retícula de ancho máximo aproximado 1280–1320 px, con márgenes fluidos de 40–64 px. A partir de ~1000 px, usar dos columnas asimétricas cercanas a 1.1:0.9 y un espacio de 48–64 px. La columna de acceso limita el formulario a ~420–460 px; no estirar los campos hasta el ancho de la foto.
- La columna visual contiene una identificación corta existente, una imagen horizontal dominante de proporción aproximada 1.45–1.7 y una banda ligera inferior para contexto permitido. La foto no necesita un panel opaco completo: la leyenda puede integrarse como pie sobre superficie clara o una franja abierta.
- La columna de acceso conserva “Bienvenido”, credenciales, acción primaria y perfiles demo. Los seis perfiles hospitalarios deben permanecer fáciles de escanear; Atlas y aseguradora muestran el perfil que corresponda. La banda visual no duplica datos ni desplaza los perfiles lejos del formulario.
- Pie institucional existente, alineado al mismo ancho. En alturas cortas, priorizar el formulario y permitir scroll natural en lugar de forzar centrado que lo recorte.

### Base de composición de los workspaces

La captura de login aporta principios de orientación y balance, no un layout que se copie dentro de cada vista operativa. En las pantallas autenticadas la base confirmada es:

1. **Cabecera de sistema:** marca y sistema a la izquierda; búsqueda, estado demo, ayuda y usuario/salida a la derecha. Conservar orden, comportamiento y el dato de organización que procede de `user.tenantName`.
2. **Navegación propia:** hospital horizontal, Atlas rail lateral en escritorio amplio, aseguradora horizontal compacta de dos ítems; en móvil los tres usan el drawer accesible existente.
3. **Franja contextual:** breadcrumb de sistema / organización / módulo, seguida de su estado actual. Conservar contenido y procedencia; no mostrar ubicación de hospital inventada.
4. **Solo en vistas generales:** `systemCover` como banda editorial baja, con nombre del espacio y acción prioritaria a un lado, escultura/fotografía y un motivo propio al otro; después, ribbon abierto con cuatro métricas que ya vienen del endpoint. El cover no debe convertirse en un “hero” alto que empuje abajo tablas y acciones.
5. **Superficie de trabajo:** primera tarea ocupa la mayor anchura; analítica se integra como pane lateral de apoyo donde ya corresponde. Las acciones se ubican junto al título/contexto de su módulo. No envolver cada cifra, fila o control en una tarjeta distinta.
6. **Páginas secundarias:** conservan `PageTitle`/acciones, formularios, folios, tablas y paneles de detalle existentes. Aplican tokens, alineación, jerarquía y geometría por sistema; no repiten foto, cover o métricas de overview.

El conjunto se percibe como una composición, no como una sucesión de cajas iguales: la franja contextual fija el eje; la portada (solo overview) da el foco; el ribbon funciona como línea informativa; tabla y análisis sostienen la lectura. La navegación mantiene su affordance actual y no se mueve para perseguir simetría.

### Reglas de densidad y adaptación operativa

- **Desktop (1440×1000):** mantener aproximadamente seis filas completas recientes en Hospital; portafolio y analítica de Atlas conservan tabla legible; Aseguradora mantiene el libro de cuentas amplio y el análisis a la izquierda. La cabecera/cover no consume altura a costa de esas tareas.
- **Tablet (761–1179 px):** conservar jerarquía y etiqueta de sistema; reducir o retirar fotografía antes que esconder búsqueda, estado, acción o columnas esenciales. Si las tablas requieren scroll, hacerlo dentro del contenedor etiquetado existente.
- **Móvil (390×844 y 320 px):** el cover se simplifica con la escultura/motivo estático reducido, no con una foto que ocupe alto. Mantener nav drawer, breadcrumb, tareas y métricas 2×2 actuales. Una sola columna para mesa de trabajo; analítica después del contenido prioritario (excepto el dossier insurer, cuya analítica precede la lista si sigue siendo la comparación principal). No reordenar elementos interactivos de forma que altere el flujo por rol.
- Respetar el clima/luz suave aprobados V9–V11 y los tokens V12; la iluminación no tapa cifras, filas, controles ni estados.

### Tableta y móvil

- Entre aproximadamente 760 y 999 px, reflujo a una composición apilada o compacta según el ancho real; no comprimir el formulario a una columna estrecha junto a una foto. La señal visual puede transformarse en una banda horizontal baja con imagen recortada y motivo propio.
- A 390 px, el formulario y el botón siguen primero en el orden de lectura; la identidad permanece como marca/sistema y un motivo lineal o emblema compacto. La foto completa puede omitirse. Los demos quedan después del formulario y conservan todos sus roles mediante una cuadrícula legible o lista compacta.
- A 320 px, no hay desplazamiento horizontal, campos truncados ni perfiles inaccesibles; el pie fluye bajo el contenido. No se intenta encajar la composición de escritorio reduciéndola.

## 5. Variantes visuales por sistema

Comparten retícula y controles, pero **no** el mismo contorno, foto teñida y acento intercambiable. Cada silueta debe reconocerse aunque el contenido de texto se desenfoque.

| Acceso | Identidad y superficie | Imagen / composición | Firma gráfica y contenido verificable |
|---|---|---|---|
| **Hospital · `/login`** | Jade/mineral; base fría muy clara. Contenedor visual de borde orgánico asimétrico y curvas serenas, asociado al tratamiento V12 hospitalario. | Preferir una toma horizontal del equipo ya existente (`clinical-team.jpg`) como candidata para la relación panorámica; comparar el recorte con `healthcare-editorial.jpg`, que es retrato y ya usa el login. Mantenerla ilustrativa, sin sugerir paciente o sede real. | Un trazo fino que enlaza **Cuenta → Convenio → Preauditoría**, términos presentes en el producto. Es una etiqueta/gráfico estático, nunca ECG, telemetría ni señal clínica. El autofill sigue bajo el formulario. |
| **Consola Atlas · `/admin/login`** | Cobalt/plata; superficies frías y geometría más precisa. Silueta arquitectónica con esquinas controladas y líneas paralelas, en lugar de la curva orgánica del hospital. | `hospital-facade.jpg` tiene una fachada geométrica con espacio de cielo aprovechable. Encuadre vertical u horizontal según la retícula, sin identificarla como cliente de Atlas. | Capas/planos estáticos evocan administración de hospitales y licencias. El único demo visible conserva la identidad “Administración Atlas”. No incluir conteos de hospitales, licencias, red activa ni otros datos no cargados desde una fuente real. |
| **Aseguradora · `/insurer/login`** | Marfil/cobre; sensación de folio de consulta. Silueta editorial más contenida y alargada; líneas finas y una lente/óvalo estático, sin repetir el borde del hospital. | La foto actual `hospital.jpg` debe ocultar por recorte las señales de habitación legibles; no atribuir el edificio a una aseguradora. Reutilizar otro activo existente solo si el responsable valida que expresa consulta sin sugerir una sede o relación comercial real. | Dossier resumido y sello textual existente **Demo · Solo lectura** o “Aseguradora · lectura”. El aviso no debe parecer autorización, convenio comercial ni segregación real de datos por aseguradora. |

Los nombres de los sistemas y roles se toman del código actual (`Portal hospitalario`, `Consola Atlas`, `Aseguradora · Demo de consulta`, `Administración Atlas`, roles hospitalarios y `Aseguradora · lectura`). Si se necesita una leyenda adicional, reutilizar texto aprobado existente como `Datos de demostración`; no redactar slogans nuevos en esta fase.

### Firma de los workspaces

| Workspace | Silueta y navegación que se conservan | Composición de overview que debe refinarse | Tareas/subpáginas que gobiernan la jerarquía |
|---|---|---|---|
| **Hospital** (`data-system="hospital"`) | Jade/mineral y nav horizontal abierta. Cover con esquina orgánica superior derecha; eslabones nacarados y foto de equipo como señales complementarias. | Mantener cover bajo; el CTA de carga y refresco quedan con el saludo existente. Ribbon de cuentas recibidas / por revisar / listas para envío / total facturado sigue abierto en una línea. Después: seis filas de cuentas recientes a la izquierda y distribución/volumen de preauditoría a la derecha. La métrica no sustituye a la tabla. | Importación, revisión, convenios, reportes, equipo y actividad conservan accesos según su matriz vigente. En detalle, la lectura financiera (estimación) se distingue de estados/acciones; jamás sugerir autorización de pago. |
| **Consola Atlas** (`data-system="control"`) | Cobalt/plata y rail lateral fijo desde 1180 px; cabecera global, organización Atlas y navegación agrupada PLATAFORMA/CRECIMIENTO/GESTIÓN. Motivo de planos/prisma y fachada. | Mantener cover de gestión, `Nuevo hospital` y actualización; ribbon con hospitales, licencias vigentes, capacidad contratada y solicitudes. Portfolio (hospital/licencia/uso/equipo/vigencia) es el bloque principal; uso mensual acompaña en un lateral. No trasladar la foto al centro de la tarea. | Gestión comercial de hospitales, licencias/capacidad, solicitudes, equipo Atlas y bitácora. No agregar datos de cuentas clínicas al rail/portfolio ni inferir acceso de Atlas a detalle hospitalario. |
| **Aseguradora demo** (`data-system="insurer"`, rol en `/hospital`) | Marfil/cobre y navegación horizontal breve de dos ítems; apariencia de folio/dossier y lentes apilados. Chip `Demo · Solo lectura` persistente en cabecera/contexto. | Conservar la franja de consulta, acción `Explorar cuentas`, ribbon existente solo si el contrato `/dashboard` autoriza sus campos al rol y su semántica está confirmada. Mantener análisis de preauditoría antes de la lista de cuentas, como la composición actual. | Vista general, cuentas y detalle como consulta; retirar acción visual que parezca editar/enviar. Los datos son sintéticos del hospital demo; no dibujar una aseguradora cliente, un convenio negociado ni un espacio segregado. |

La variante Aseguradora no tiene dashboard nuevo, API ni modelo de datos propio: su identidad se deriva del rol y de las rutas hospitalarias compartidas. No crear rutas `/insurer/*` ni duplicar las vistas para lograr diferenciación visual.

## 6. Sistema visual y DNA de componentes

### Color

Reutilizar los roles V12 ya definidos en `portal.module.css` y asignarlos al login, en vez de mantener acentos alternativos parecidos:

| Rol | Hospital | Atlas | Aseguradora |
|---|---|---|---|
| Acento | `#256E63` | `#315FAB` | `#8D5E3F` |
| Tinte | `#EAF3EF` | `#EAF0FB` | `#F4ECE2` |
| Lienzo | `#F6F8F6` | `#F5F7FB` | `#FBF9F5` |
| Texto principal | `#273D37` | `#253650` | `#46372A` |
| Línea sutil | `#DCE6E1` | `#DBE3F0` | `#E7DFD3` |

Las superficies amplias permanecen neutrales; el acento se concentra en identidad, foco y acción. Estados semánticos mantienen su propio significado y contraste, sin convertirse en decoración.

### Tipografía, formas y superficies

- Mantener las fuentes locales existentes (Geist Variable/Inter Variable); no descargar fuentes. Encabezado de acceso de escala moderada (aprox. 32–36 px escritorio y 30–34 px móvil), peso medio, sin una frase de marketing añadida.
- Campo de 46–50 px como mínimo, etiqueta legible de 13–14 px, texto de control de 15–16 px. Acción primaria en 48–52 px. El foco visible no puede depender solo del cambio de color.
- Familias de geometría: hospital orgánica, Atlas angular controlada, aseguradora editorial/óvalo. Usar una curva protagonista por identidad y radios de control compartidos; no aplicar un único radio gigante a todos los elementos.
- Jerarquía de superficie: lienzo → foto/escena → campos y acción. Los campos usan fondo claro y borde suave; demos como filas compactas con separadores o superficie tenue, no seis tarjetas flotantes. Una sola acción visual domina.
- Profundidad mediante encuadre, contraste de superficies y un borde de luz sutil. Evitar vidrio en todas las superficies, sombras largas, gradientes de alto contraste y 3D/WebGL en el acceso.

### Component DNA de workspace

| Componente candidato | Refinamiento visual implementable | Contrato que conserva |
|---|---|---|
| `Workspace` · topbar, contexto, footer | Alinear el system label, búsqueda, demo/solo lectura, persona, breadcrumb y cuerpo a una retícula clara. Hacer que el estado sea visible por texto además de color; conservar luz ambiental tenue y específica. | Búsqueda/destino, organización real, ayuda, logout, módulo y footer existentes. |
| Navegación | Llevar el acento al estado activo y limpiar líneas/espaciado. Reforzar la silueta existente: rail Atlas, franja horizontal Hospital, dos ítems Aseguradora. En móvil conservar drawer, foco y `aria-current`. | Ítems, agrupación, filtros por rol, acciones por módulo, tamaño táctil y accesibilidad. |
| `systemCover` | Tratarlo como portada baja de overview: copy/acción forman el foco; escultura y fotografía se integran como una sola escena con recorte deliberado. Retirar badges que aparentan estado en vivo sin dato. Evitar borde/card genéricos iguales. | CTA, refresh, copy aprobado, ilustración, lazy-load, `data-system` y datos contextuales actuales. |
| `metricRibbon` / `Metric` | Mantener como banda abierta con divisores/alineación numérica, no cuatro tarjetas. Aplicar acento con mesura; conservar contexto/unidad; en móvil 2×2. | Valor/label/caption y fuente API; no reetiquetar o recalcular. |
| `workGrid`, `workPanel`, `analyticsPanel` | Una tarea principal ocupa el ancho; análisis auxiliar tiene forma/material propio. Hospital: tabla primero; Atlas: portfolio primero; insurer: análisis primero. Usar espacio/divisores como grupo, no una tarjeta por cada elemento. | Orden de tareas, query/filter/state y contenido dinámico. |
| `AccountsTable`, `PlatformPortfolio` y tablas secundarias | Mantener columnas, alineación, densidad, estados semánticos, filas clicables, paginación/scroll. Refinar hover, encabezado, focus y separadores conforme al sistema. | Datos, orden, acciones, permisos de rol, label, navegación y responsive dentro de región. |
| `SystemSculpture`, `AnalyticsSculpture` | Mantener objetos propios de Atlas/hospital/aseguradora y gráficas ligadas a valores reales; ajustar escala solo si ayudan a la composición. Fallback legible primero; nada de objeto 3D sin significado. | Tecnología y ciclo de vida V12, leyenda, datos, fallback, rendimiento y reduced-motion. |
| `PageTitle`, formularios, detail/folio, modals | Aplicar tokens, estructura de superficie y foco al formulario/lectura/confirmación; resaltar una acción primaria; reservar superficies fuertes para confirmación/severidad. | Labels, validación, errores, aviso financiero, auditoría/historial y autorizaciones actuales. |

Estos candidatos describen superficies para refinamiento después del blueprint; no requieren refactor de componentes ni permisos. Para subpáginas, mejorar ritmo, encabezado, anchura de lectura y estado sin introducir `systemCover`/imagen repetida.

## 7. Interacción y contrato funcional

La dirección es visual; conserva íntegro el contrato actual de `Login`:

1. Cargar y presentar perfiles desde `/auth/demo-profiles`; mostrar el esqueleto, error con reintento y estado sin demos si corresponde.
2. Seleccionar una tarjeta demo rellena correo y contraseña, indica la selección y **no** envía el formulario. Una edición manual quita la selección como ocurre hoy.
3. Correo y contraseña mantienen `username` y `current-password`, validación del navegador, alternancia visible/oculta y labels conectados.
4. Envío real a `/auth/login`; error anunciado con `role="alert"`; loading deshabilita la acción; éxito guarda la sesión y dirige a `/admin` solo para `PLATFORM_ADMIN`, a `/hospital` para los roles restantes.
5. La demo `INSURER_DEMO` continúa de solo lectura por sus permisos existentes. La presentación de acceso no añade ni concede permisos.
6. Mantener los enlaces entre accesos y el pie legal existentes. No crear “olvidé mi contraseña”, SSO, passkey, biometría, selector de sede ni nuevos pasos de acceso.

Transiciones breves (150–220 ms) para foco, hover y presión de botón, con movimiento mínimo. No hay movimiento ambiente continuo; el gráfico de proceso queda estático o usa una única entrada breve que se desactiva con `prefers-reduced-motion`. El formulario, sus datos y su orden no esperan a una animación o efecto gráfico.

### Workspace

- Conservar `AuthBoundary`, `useUser`, `RoleGate`, llamadas `useResource`/API, navegación de búsqueda, rutas por módulo, logout y restricciones de rol. El styling no decide permisos ni fabrica estados vacíos/datos.
- Atlas overview sigue consultando `/dashboard`, `/tenants` y `/licenses`; Hospital/Aseguradora overview y cuentas siguen consumiendo `/dashboard`, `/accounts/page` y los datos de detalle existentes. Indicadores, importes y listas son de esas respuestas; no se duplican en arte, no se derivan métricas nuevas y no se reemplazan con ejemplos visuales.
- Conservar acciones de negocio tal como están condicionadas por rol: `Nuevo hospital`; importar/cargar; revisar; preparar/exportar; registrar envío/respuesta. La vista insurer no recibe CTAs de mutación. Conservar semántica de badges, la etiqueta MXN y los avisos de preauditoría/estimación.
- La búsqueda del header conserva destino Atlas `/admin/tenants` y hospital/insurer `/hospital/accounts`. No cambiar rutas para que la identidad visual aparente un producto separado.
- Mantener filtros, orden, paginación, estados vacíos/carga/error, actualización, foco, teclas y accesibilidad de tablas/gráficas. Las visualizaciones 3D existentes conservan su lazy-load, SVG/fallback, limpieza de recursos, DPR acotado y movimiento reducido; no añadir escenas a módulos que no tienen una.

## 8. Accesibilidad y rendimiento

- Orden de lectura: marca/sistema, contexto visual pertinente, título, formulario, estado, perfiles demo, pie. En móvil, no insertar la imagen antes del formulario si empuja el acceso fuera de la primera zona útil.
- Conservar navegación de teclado y foco visible para enlaces, campos, mostrar contraseña y cada perfil; foco no debe quedar oculto por una imagen/overlay. Targets interactivos de al menos 44×44 px.
- Las imágenes con significado tienen texto alternativo fiel a lo visible y “fotografía ilustrativa” cuando corresponda; ornamento SVG usa `aria-hidden="true"`. No incluir nombres, folios ni datos personales en arte.
- Verificar contraste de texto, placeholder, bordes, selección y foco contra cada paleta, incluyendo modo de contraste forzado; color no será el único indicador de selección o error.
- Usar `next/image` con recorte responsivo, formatos/tamaños existentes y dimensiones estables. En móvil se omite o reduce la foto. El efecto es CSS/SVG estático; no cargar Three.js, Canvas ni WebGL para el login.
- En workspaces, preservar los atributos semánticos del breadcrumb, navegación y menú drawer; `aria-current`, teclado, cierre por Escape, foco y scroll de tabla. Las gráficas conservan su alternativa textual/datos tabulados y descripción.
- No reducir tamaño/contraste de los estados de revisión para dar una apariencia más editorial. Las métricas usan cifras tabulares; los importes conservan alineación, unidad y etiqueta; ninguna sección depende solo del tinte de sistema.
- Las esculturas existentes de overview siguen la configuración progresiva V12: bajo demanda, fuera de viewport pausadas, limitadas para móvil, con fallback y alternativa de movimiento reducido. No se agrega WebGL continuo ni blur extenso a navegación/tablas.

## 9. Riesgos y pendientes de dominio

### Riesgos controlables

- Recortar `hospital.jpg` sin advertir su señalética puede sugerir una sede extranjera o real. Debe desaparecer cualquier texto de ubicación legible.
- Una banda inferior de login con apariencia KPI puede percibirse como información operativa; no hay métricas autorizadas allí. En workspace, cifras existentes solo aparecen desde la API y con unidades/significado actual, no se inventan.
- En móvil, esconder la foto no debe borrar la diferenciación. La firma gráfica propia y el color canónico han de permanecer sin aumentar altura innecesaria.
- Los enlaces de acceso no deben dar a entender que la aseguradora es un cliente autenticado con espacio segregado: es una demo sintética de solo lectura.
- Las portadas actuales incluyen captions `Operación conectada` y `Red hospitalaria`. Si representan solo el render estático, parecen estados de conectividad/relación. Sustituirlas visualmente por contexto cierto ya existente (por ejemplo `Datos de demostración` o `Solo lectura`) o por una descripción ilustrativa; no mostrarlas como indicador en vivo sin estado medido.
- En la variante insurer los cuatro valores del `metricRibbon` vienen del dashboard compartido. La pertinencia de presentar “Por revisar” y “Listas para envío” a la persona de consulta es un pendiente semántico del contrato `/dashboard`; no ocultar, relabelar ni recalcular métricas por criterio visual. Mostrar solo los campos que negocio/backend han autorizado para `INSURER_DEMO` una vez se confirme ese contrato.
- **Hallazgo separado:** `/hospital/review` se oculta en navegación para `INSURER_DEMO`, pero su `page.tsx` actual no usa `RoleGate`. La visibilidad del menú no demuestra autorización de ruta o API. Mantenerlo fuera de la intervención visual y no presentarlo como permiso acordado; requiere revisión de dominio/seguridad por el responsable correspondiente.

### Alcance confirmado y límites

La ampliación a los tres workspaces está confirmada. El blueprint cubre su sistema de composición y pantallas principales, además de los logins. El split de login no se traslada a cada módulo ni cambia la arquitectura de navegación. La auditoría de seguridad de `/hospital/review` y la decisión semántica sobre métricas de insurer son pendientes separados, no aprobación implícita para cambiar roles o el contrato de datos.

## 10. Criterios de aceptación visual

La implementación posterior podrá revisarse contra estos criterios; este documento aún no certifica un resultado renderizado.

### Logins

1. En 1440×1000, header, escenario principal y pie comparten retícula; desaparece el gran vacío observado y la foto/formulario forman una composición deliberada. Ninguna sección se corta por la altura.
2. `/login`, `/admin/login` y `/insurer/login` conservan la misma lógica de orientación y acceso, pero la silueta hospital, Atlas y aseguradora se distingue sin leer el acento cromático.
3. La paleta de cada login coincide con los roles V12 del workspace correspondiente y mantiene texto/controles legibles. No hay fondos oscuros ni claims de seguridad o disponibilidad no demostrados.
4. En la pantalla hospitalaria los seis perfiles demo siguen identificables y accesibles; en Atlas y aseguradora se conserva el perfil correcto. Ningún perfil provoca login automático al seleccionarse.
5. La fotografía no contiene texto de sede legible ni aparenta ser un cliente confirmado. En móvil el acceso no depende de fotografía, el motivo propio permanece visible y el formulario conserva prioridad.
6. En 390×844 y 320 px no hay overflow horizontal; labels, inputs, toggle, botón, perfiles, estados y footer siguen alcanzables con scroll normal.
7. Teclado, lectores de pantalla, foco, errores, contraste y movimiento reducido conservan el comportamiento funcional actual; las decoraciones no interceptan clics.
8. No aparecen métricas añadidas, selector de organización, TLS/HIPAA/SOC 2, SSO/passkey/biometría, datos de hospital real ni nuevas capacidades.

### Workspaces autenticados

1. A 1440×1000, la cabecera, navegación, contexto y cuerpo comparten un eje; los tres se distinguen con silueta además de color. Atlas conserva su rail, Hospital su nav horizontal y Aseguradora el menú breve de dos rutas.
2. La vista general usa la secuencia `systemCover → metricRibbon → zona operativa` con alturas controladas. Las acciones prioritarias permanecen en la portada existente y no se repite esa portada en cada página secundaria.
3. Hospital conserva seis filas recientes y el pane de análisis; Atlas conserva tabla de hospitales/licencias y uso mensual; Aseguradora conserva el orden dossier/analítica/lista y el indicador `Demo · Solo lectura`. La jerarquía no sustituye tareas por una grilla decorativa.
4. En `390×844` y `320 px`, el menú drawer mantiene uso por teclado y el contenido pasa a una columna legible; métricas 2×2, navegación, búsqueda, estado de rol y acciones principales siguen reconocibles. Tablas se desplazan dentro de sus regiones, no toda la página; no hay overflow horizontal global.
5. Los datos mostrados corresponden a las mismas respuestas API y conservan nombre, unidad, fecha, orden, estado y semántica. No se añaden indicadores, hospitales o métricas de ejemplo al arte; no se etiqueta un estado como “conectado” si no proviene de fuente dinámica.
6. Los roles y destinos existentes se conservan. Atlas sigue limitado a su portfolio comercial, hospital conserva tareas según rol y `INSURER_DEMO` no adquiere controles de edición/envío ni una ruta propia.
7. Tablas, badges, filtros, búsqueda, paginación, formularios, empty/loading/error, gráficas, lector de pantalla y foco siguen visibles y alcanzables. El número de filas y el orden de análisis no degradan sin un motivo de uso documentado.
8. En móvil las esculturas se simplifican según el fallback V12; gráficos continúan legibles sin WebGL, bajo `prefers-reduced-motion` y en carga lenta. Sol/luz ambiental se mantiene bajo y no lava superficies.

## 11. Creative Contract

**VISUAL CONCEPT:** Una estructura, tres ritmos: continuidad de orientación, contexto y jerarquía de trabajo; Hospital, Atlas y Aseguradora se reconocen por distribución, geometría y color propios.

**PRIMARY FEELING:** Claridad operativa, calma y precisión en login y tareas. Hospital humano y fluido; Atlas estructurado y competente; aseguradora sobria, consultiva y explícitamente demostrativa.

**GEOMETRY:** Hospital con curva mineral orgánica; Atlas con rail y planos arquitectónicos precisos; aseguradora con dossier/óvalo editorial. Las formas se extienden a cover, métrica y pane de análisis sin convertir todas las tablas y paneles en una tarjeta idéntica. Controles conservan medidas y estados.

**COLOR:** Usar los tokens V12 jade/mineral, cobalt/plata y marfil/cobre con bases claras y acento dosificado. Colores semánticos siguen comunicando estados.

**PRIMARY MOTIF:** Hospital: eslabones de operación existente y relación cuenta–convenio–preauditoría, sin metáforas clínicas. Atlas: planos/estratos de gestión de hospitales, licencias y capacidad. Aseguradora: dossier y lentes de consulta. La escultura/analítica 3D solo aparece donde ya hay datos para sustentarla, nunca como estado o métrica.

**MOTION:** Controles y cambios de estado breves y localizados (150–220 ms). Mantener efectos V12 finitos y limitados a superficies/gráficas existentes; no añadir movimiento continuo. Respetar `prefers-reduced-motion`.

**SPECIAL EFFECT:** Ningún efecto 3D en login. En workspaces, conservar Three.js/esculturas V12 en overview y gráficas con lazy-load, pausa, DPR acotado y alternativa SVG/textual; no añadir un efecto a cada módulo.

**LAYOUT INTENT:** Login: franja contextual, columnas asimétricas en escritorio y acceso claro; en móvil, firma compacta y formulario primero. Workspace: shell de sistema + navegación + breadcrumb/contexto; overview con portada baja → ribbon API → tarea dominante/analítica de apoyo. Páginas secundarias con títulos, acciones y contenido funcional propio; no replicar el split del login.

**TYPOGRAPHY INTENT:** Geist/Inter local; jerarquía media y concisa, título controlado, labels claros y credenciales cómodas de leer. Sin slogan ni titular gigantesco.

**DEPTH:** Login mediante encuadre, contraste de superficie y separadores. Workspace mediante superposición ligera, luz V9–V11 y material V12; mantener tablas casi opacas y lectura financiera precisa. Evitar glassmorphism genérico, sombras fuertes, blur sobre contenido y paneles opacos repetidos.

**RESPONSIVE INTENT:** Login mantiene sistema/motivo al ocultar foto. Workspace mantiene el rol, navegación compactada, `systemCover`, métricas 2×2 y zona de trabajo en flujo; tabla usa su scroll local y análisis se apila conforme al orden propio del sistema.

**DO NOT:** copiar el contenido de la captura; mostrar ubicación/organización no disponible; inventar métricas, estados, hospitales, claims o capacidades; convertir insurer en portal segregado o añadir rutas; permitir que estética determine roles/permisos; introducir SSO, biometría, passkey o datos clínicos; trasladar login/cover con foto a todos los módulos; homogeneizar navegación, ordenar todas las vistas igual o reducir datos/densidad sin razón.

## 12. Handoff y revisión

- **UX/UI:** login prioriza formulario y perfiles; overview prioriza tarea/consulta y los datos existentes; subpáginas preservan sus flujos. No se agregan capacidades ni rutas.
- **Design system:** mapear login al token V12 y reutilizar la misma fuente por `data-system` en el workspace. Conservar variaciones de navegación, color, forma y orden de contenido intencionadas; mantener semantic color separado.
- **Frontend login:** parametrizar presentación por sistema sin reescribir `Login`, sus estados, API, roles o destinos.
- **Frontend workspace:** refinar `workspace.tsx`, `dashboard.tsx`, `portal.module.css` y componentes visibles solo donde el cambio aporta; conservar contratos de `Workspace`, endpoints, `RoleGate`, tabla, `PageTitle`, gráficos y responsive actual. La base común no exige el mismo layout interno.
- **Visual review completada:** capturas de los tres logins en 1440×1000, 1024×768, 390×844 y 320×844; vistas principales autenticadas en escritorio, tablet y móvil. La revisión de fidelidad aceptó los tres accesos y los tres overviews; pidió y verificó dos ajustes puntuales de Atlas móvil (estado demo visible y pista/foco de desplazamiento en tabla). Evidencia en `/private/tmp/atlas-v14-render-final/` y `/private/tmp/atlas-workspace-after-v15/`. Las subpáginas usan el shell/tokens refinados, pero no se afirma revisión visual individual de cada ruta secundaria.
- **Validación técnica:** `npm run typecheck` y `git diff --check` pasaron; el frontend actualizado está saludable en `127.0.0.1:4430` y las cuatro rutas públicas de acceso responden HTTP 200. No se ejecutaron suites de pruebas.
- **Pendientes funcionales ajenos al rediseño:** confirmar semántica/visibilidad del ribbon para `INSURER_DEMO`; gestionar por separado la falta de `RoleGate` en `/hospital/review`. Ninguno autoriza a frontend a cambiar permisos o datos en este encargo visual.
