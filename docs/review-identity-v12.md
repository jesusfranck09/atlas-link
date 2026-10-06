# Identidades, portadas y efectos V12

24 de septiembre de 2026. Petición: plataformas visualmente distintas y más cuidadas, portadas y efectos 3D, ubicación en cada módulo, tipografía con carácter y acceso a todos los sistemas. La última corrección pide efectos propios con React Bits como referencia de calidad, sin copiar sus componentes.

## Cambios

- **Consola Atlas:** rail lateral en escritorio amplio, cobalto y plata, fachada hospitalaria y núcleo prismático con órbitas. Gestión de hospitales, licencias, solicitudes y equipo conserva sus contratos.
- **Hospital:** navegación horizontal, jade y superficies minerales, fotografía de equipo clínico y escultura de eslabones nacarados. Métricas, cuentas y revisión usan los datos del backend.
- **Aseguradora demo:** marfil y cobre, dossier de consulta, fotografía propia, lentes ópticas apiladas y analítica a la izquierda. El perfil mantiene solo lectura y accede a datos sintéticos del hospital demo; no se presenta como portal comercial de aseguradora con segregación propia.
- **Ubicación:** cada módulo indica sistema, organización, módulo y detalle de cuenta cuando corresponde. La ruta se resuelve independientemente de los permisos del menú; cada página conserva su H1.
- **Landing:** conserva encabezado, fotografía y luz V11. Dos títulos reciben una firma prismática original, los bloques aparecen al entrar en pantalla y las tarjetas responden de forma finita. El nuevo carrusel de espacios tiene controles, desplazamiento táctil y teclado; sus tarjetas giran para mostrar módulos. Los enlaces de acceso permanecen disponibles en ambas caras.
- **Accesos:** estructura de login aprobada y demos con autofill conservados. Fotografía y paleta por sistema; entrada dedicada `/insurer/login` para el perfil de lectura, con destino compartido `/hospital` e identidad derivada del rol.

## Efectos y operación

Las esculturas son decorativas y no implican nuevas capacidades de IA. Cada sistema tiene geometría propia: núcleo, eslabones o lentes. Three.js carga bajo demanda en escritorio visible; SVG queda disponible desde el render del servidor y en móvil. DPR acotado a 1.5, sin bucle permanente en reposo; movimiento por puntero finito, pausa fuera de pantalla, recuperación de contexto y liberación de recursos.

`PrismaticText` conserva el texto una sola vez en el DOM y hereda tipografía y tamaño. Su entrada termina en 1.2 segundos; el reflejo responde al puntero. El contenido sigue visible sin JavaScript y con movimiento reducido. El carrusel no tiene reproducción automática; las caras inactivas usan `inert` y `aria-hidden`. No se añaden modelos de IA ni imágenes generadas.

React Bits queda registrado en `frontend/package.json`. MCP para Claude se preparó mediante el comando solicitado; la consulta del catálogo por protocolo se verificó con un cliente local temporal. Detalles en [react-bits-mcp.md](react-bits-mcp.md). No se instaló True Focus. La dependencia de desarrollo de shadcn no se importa en los componentes de la web.

Root integra landing, accesos, herramientas y entrega; `intent_visual_v12` delimita alcance, `ui_map_v12` verifica rutas y contratos, `platform_experience_v12` construye las identidades, `sunrays_v11` crea esculturas y tipografía, `visual_qa_v12` valida recorridos. Los archivos tienen responsables delimitados.

## Revisión y evidencia

Baseline nuevo en `evidence/identity-v12/before/`: landing y los tres perfiles operativos, escritorio 1440×1000 y móvil emulado 390×844, hora local simulada 14:00. Autenticación y microservicios/PostgreSQL locales reales, sin modificar cuentas ni información comercial.

La primera compilación Docker se interrumpió por `ECONNRESET` durante descarga de dependencias. Se añadió una caché npm persistente de BuildKit, sin cambiar el lockfile para sortear el error.

La compilación final de Next.js, `npm run lint`, `npm run typecheck` y `git diff --check` terminaron correctamente. Tras la corrección localizada de `PrismaticText`, se repitieron lint focal, TypeScript y compilación. El frontend se reconstruyó y arrancó localmente; imagen final ejecutada `sha256:82f06c4467bbe3e3f4db8fd08e5524e41898f195151e0f8a4989a7dc8b0e445d`. Los seis servicios de Compose reportaron estado saludable.

La primera revisión desplegada encontró tres defectos: contraste insuficiente en el índice del carrusel, foco del menú móvil retenido en su disparador y tabla de cargos de solo lectura sin acceso de teclado al desplazamiento. También midió cuatro filas completas a 1440×900 frente al objetivo de seis. La evidencia original se conserva en `evidence/identity-v12/initial-run/`; las correcciones se verifican por separado. El runner espera que el carrusel termine de desplazarse antes de capturarlo, para evitar confundir una transición con texto recortado.

La revisión posterior confirmó seis filas completas y los 12 escenarios de plataforma, con 52 vistas, correctos. Detectó además una carrera en el título óptico: el puntero podía alcanzar texto visible antes de la notificación de `IntersectionObserver`. Se registró el orden real de eventos en `evidence/identity-v12/diagnostic-native/prismatic-timing.json` y se corrigió la activación para atender inmediatamente la entrada visible del cursor. También se ajustó una expectativa del runner que exigía revelar una sección apenas un píxel visible, antes del umbral previsto.

La regresión final localizada aprobó sus tres escenarios: landing en escritorio, landing a 390 px y reentrada nativa de `PrismaticText` durante tres ciclos, con preferencias y reposo. No registró errores de navegador, consola o HTTP. Sus resultados están en `evidence/identity-v12/final-focused/review.json`. Las 52 vistas de plataforma y la landing en 320/1024 px conservan su evidencia del build anterior; el último arreglo se limitó a la interacción del título, comprobada de forma localizada en escritorio y 390 px, sin repetir todo aquel conjunto. Los ciclos WebGL aprobados se conservan de la primera corrida. El [índice de evidencia](../evidence/identity-v12/README.md) diferencia cada ejecución y sus límites.

Los recorridos usan autenticación y datos reales de la instalación local de demostración. No se modifican cuentas ni solicitudes comerciales. Las dimensiones móviles se emulan en Chrome sobre macOS: no equivalen a pruebas físicas en iOS, Android o Windows. La pausa de animación fuera del viewport se comprueba; el cambio de pestaña no expuso `document.hidden` de manera fiable a través de esta sesión CDP, por lo que no se afirma una comprobación de ese caso.

## Enlaces locales

| Experiencia | Acceso |
| --- | --- |
| Landing | http://localhost:4430/ |
| Consola Atlas | http://localhost:4430/admin/login |
| Hospital | http://localhost:4430/login |
| Aseguradora demo de lectura | http://localhost:4430/insurer/login |

Las rutas autenticadas siguen siendo `/admin` y `/hospital`; la aseguradora se distingue por su rol. El portal de pacientes se mencionó como ejemplo visual y no forma parte del producto de preauditoría vigente.
