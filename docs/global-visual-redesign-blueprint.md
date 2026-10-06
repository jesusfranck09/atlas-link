# Atlas Link — contrato visual editorial

**Estado:** dirección vigente para accesos y espacios autenticados. Sustituye las propuestas visuales previas de login y dashboard.

**Fecha:** 30 de septiembre de 2026.

## Dirección

La referencia aprobada es la composición editorial de marca: tipografía sans protagonista, papel blanco y perla, grafito, una acción lavanda controlada, composición serena, detalle físico sutil y una pieza documental con contenido real del dominio. Se toma el lenguaje, no se copia una hoja de marca como layout de todas las pantallas.

La plataforma debe sentirse clara, precisa, ligera y cuidada, con legibilidad de producto. Nada de fondos oscuros dominantes, neón, luces arcoíris, blobs, glass ubicuo, sombras duras o componentes con aspecto de librería predeterminada. Las superficies y bordes existen solo cuando ayudan a leer o interactuar.

## Accesos

Los tres accesos pueden compartir el encuadre editorial solicitado —identidad arriba, credenciales compactas y documento protagonista—, pero cada uno debe reconocerse por el propósito, el acento, la silueta y el contenido de su documento. No se distinguen solo por cambiar el color o el título. La forma se adapta a móvil; el acceso y sus acciones siguen siendo utilizables.

| Sistema | Firma visual | Documento de muestra |
|---|---|---|
| Hospital | Jade clínico, señal lineal y título del portal hospitalario. | Expediente clínico sintético, vertical. Sin identidad personal ni diagnóstico. |
| Consola Atlas | Lavanda/cobalto, geometría de registro y administración de red. | Cédula de licencia apaisada con campos de organización, alcance, vigencia y capacidad. |
| Aseguradora | Vino suave, lectura documental y acceso explícito de solo lectura. | Estado de cuenta sintético, con folio e importe de referencia; no implica autorización de pago. |

El CTA conserva la lavanda de la referencia. Acentos institucionales aparecen en la marca, foco, selección y documento. Una etiqueta visible debe identificar toda cifra o registro inventado como demostración. No usar datos que parezcan corresponder a pacientes, pólizas o transacciones reales.

## Sistemas internos

Un único sistema de producto gobierna la tipografía, spacing, contraste, estados, controles y movimiento. Cada área compone su navegación y contenido según su tarea; no se replica el layout de acceso ni se convierten todos los datos en tarjetas.

- **Hospital:** bandeja de cuentas, etapas de revisión y trazabilidad. Jade identifica el espacio; rojo y ámbar se reservan para los estados semánticos existentes.
- **Consola Atlas:** organizaciones, licencias y capacidad en un registro de red; navegación superior ligera y violetas moderados.
- **Aseguradora:** índice y evidencia consultable de solo lectura; acento vino, filas claras y filtros por estado.
- **Módulos compartidos:** cuentas, detalle, carga, convenios, reportes, usuarios, bitácoras, hospitales, licencias y solicitudes conservan una composición propia dentro de la misma gramática visual.

## Foundation

`frontend/nxt-ui-atlas-link/src/app/globals.css` es la fuente de tokens globales de superficie, texto, marca, foco, estados, radios, sombras, spacing, tipografía y transiciones. Cada módulo debe reutilizar esos tokens y los componentes en `frontend/nxt-ui-atlas-link/src/components/ui.tsx`; los estilos de `portal.module.css`, `operations.module.css`, `platform.module.css` y `login.module.css` componen la interfaz según su contexto.

Los controles deben mantener labels, contraste, estados disabled/error/loading, foco visible, teclado y movimiento reducido. Tablas y formularios conservan su densidad y comportamiento por rol. En móvil se recompone la tarea y no se escala en pequeño el escritorio.

## Contrato funcional

La reconstrucción visual conserva rutas, autenticación, roles, permisos, modelos, APIs, validaciones, datos, filtros, acciones, estados y destinos. Aseguradora continúa en sus rutas y permisos actuales; no se añaden acciones de autorización. Los documentos del acceso son presentaciones sintéticas y no datos de runtime.

## Alcance de rutas

Accesos: `/login`, `/admin/login`, `/insurer/login`.

Producto público: `/`, `/privacidad`.

Hospital y consulta de aseguradora por rol: `/hospital`, `/hospital/accounts`, `/hospital/accounts/[id]`, `/hospital/review`, `/hospital/import`, `/hospital/agreements`, `/hospital/reports`, `/hospital/users`, `/hospital/audit`.

Consola Atlas: `/admin`, `/admin/tenants`, `/admin/licenses`, `/admin/leads`, `/admin/users`, `/admin/audit`.

## Criterios de cierre

- Cada ruta está renderizada y revisada en sus estados principales y con su rol previsto.
- Las tres entradas y los tres espacios son distinguibles por contenido y composición, además de color.
- No quedan estilos antiguos visibles ni controles de librería sin personalizar.
- No hay desbordamiento horizontal ni pérdida de acciones, etiquetas o columnas esenciales en escritorio, tablet y móvil.
- Las tareas, interacciones por rol y estados vacíos, error, carga, foco y selección siguen funcionando.
- Typecheck, lint y revisión visual sobre el render actual quedan limpios. La revisión visual no equivale a aprobación de producción.

## Evidencia de la iteración editorial

Render real de las 20 rutas y de las dos variantes por rol de `/hospital` en escritorio; los tres accesos, las tres vistas principales y el drawer de navegación se revisaron también en móvil. Las comprobaciones móviles realizadas no muestran overflow y el drawer permanece accesible. Esto cubre el primer render funcional de las vistas; no afirma que cada combinación de error, vacío y edición haya recibido revisión visual individual.
