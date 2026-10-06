# Validación de Atlas Link

## Estado de la comprobación

La suite final contra el entorno nativo pasó **25 de 25 pruebas**, sin fallos, omisiones ni reintentos, en **61.3 segundos**. Incluye doce recorridos de interfaz en escritorio 1440×1000, los mismos doce en móvil emulado 390×844 y un contrato financiero contra la API real. Hay **18 análisis axe con cero violaciones detectadas**, cero excepciones JavaScript y cero respuestas 500. Las cuatro respuestas 401 registradas en consola son las esperadas al probar la cuenta desactivada y la sesión revocada en ambos viewports. Los 16 resultados incompletos de axe se conservan: cero violaciones automáticas no equivale a una auditoría integral.

Evidencia final: `evidence/qa-final-summary.json`, `evidence/browser-report.json`, reporte HTML `evidence/browser-report/` y capturas/adjuntos `evidence/browser-results/`. Chrome153.0.8010.53 fue el navegador instalado, conectado por CDP; no se descargaron navegadores.

La primera integración HTTP pasó **18 grupos y 81 solicitudes** contra Spring/PostgreSQL real. Tras el cambio de puertos internos, el sandbox rechazó el socket de Python antes de enviar solicitudes; el bloqueo está en `evidence/api-preflight-failure.json`. Las 81 comprobaciones corresponden a aquella ejecución histórica, no se presentan como una segunda ejecución sobre los últimos JAR. La suite final de navegador sí ejerció los servicios actuales y su persistencia. La coordinación ejecutó además las comprobaciones de consumo agregado actual mediante curl: `evidence/licensing-metrics.json` y `evidence/tenant-metrics.json` contienen contadores reales por licencia/hospital, sin valoresnull.

La coordinación reportó **77 pruebas Maven aprobadas** tras incorporar evidencia congelada, importación de tabuladores y PDF; el resultado está en `evidence/java-test-summary.json`.

La versión empaquetada Docker en **4430 pasó 24 de 24 vistas en 22.7 segundos**, con cero errores de JavaScript, consola o HTTP. Incluye landing, ambos accesos, seis roles, cuentas, convenios y licencias en escritorio y móvil emulado. Los 24 análisis axe no detectaron violaciones; se conservaron 32 resultados incompletos. Se verificaron fotografía cargada, favicon, tres SVG de marca y esquema JSON público con respuesta 200, y movimiento reducido en ambos viewports. El script solo autentica y consulta: las **20 cuentas demostrativas permanecieron intactas**, confirmado por los contadores reales en ambas pasadas. Reporte `evidence/production-smoke.json`; capturas `evidence/production-smoke/`.

| Ejecución | Resultado y corrección |
| --- | --- |
| Primer arranque visual | 1 fallo por import de fuente inexistente, 1 interrumpida, 20 no ejecutadas. Fuente corregida; `evidence/browser-attempt-1-font-import`. |
| Segundo intento | 4 fallidas, 1 interrumpida, 17 no ejecutadas: contraste y API con timeout durante estabilización de puertos; `evidence/browser-attempt-2-contrast-api-timeout`. |
| Tercer intento completo | 8 aprobadas y14 fallidas: contraste y desbordes móviles. Se aumentó legibilidad, contraste y contención de las cuadrículas; `evidence/browser-attempt-3-ui-findings`. |
| Cuarto intento | 11 aprobadas y11 fallidas: colores residuales y un texto para lectores de pantalla mal contenido provocaba desborde. Corregido por el responsable visual; `evidence/browser-attempt-4-residuals`. |
| Quinto intento | 22 aprobadas, cero fallidas/omitidas; alcance anterior a las nuevas funciones. Conservado en `evidence/browser-attempt-5-passed`. |
| Contrato previo a corrección | Caso ingreso 31/agosto y egreso 1/septiembre: esperado ajuste 50 con tarifa de agosto, observado 0 porque se seleccionaba el convenio por egreso. Corregida la selección por ingreso; `evidence/contract-before-fix-admission-date`. |
| Sexto intento, nuevas funciones | 23 aprobadas y 2 fallidas. Los nuevos scrollables de evidencia y vista previa Excel no admitían foco de teclado en móvil. Se añadieron regiones con nombre accesible y foco; `evidence/browser-attempt-6-new-features-accessibility`. |
| Séptimo intento final | **25 aprobadas, cero fallidas/omitidas**, 18 análisis axe sin violaciones detectadas; `evidence/browser-report.json`. |


## Entorno y límites

- macOS; Node 24.14.0; Java21/Spring Boot; PostgreSQL15 local en5440.
- Gateway8095, identity18491, control18492, hospital18493; Next.js4300.
- Docker: seis servicios; web de producción en 4430, comprobada por separado con su base sintética sin mutaciones de negocio.
- Motor de reglas real, autenticación real, persistencia PostgreSQL y transferencia HTTP real; sin respuestas API simuladas.
- Datos exclusivamente sintéticos. Cada ejecución usa un prefijo `QA-<identificador>` o `QA-UI-<tipo>-<identificador>` para evitar dependencia de datos de otras ejecuciones.
- La concurrencia comprobada es de dos solicitudes simultáneas; no equivale a una prueba de carga.
- Sin correo externo, cobros, envío a aseguradoras ni integraciones de hospital real. Los envíos y respuestas se registran manualmente.
- Viewport móvil emulado en Chrome no demuestra ejecución en Android/iOS físicos ni en Safari/WebKit. No se ejecutó Windows ni pruebas de dispositivos reales.

## Integración HTTP ejecutada

| Escenario | Evidencia observable |
| --- | --- |
| Demos y autenticación | Siete perfiles activos autenticados; contraseña incorrecta y cuenta desactivada reciben401. |
| Roles | Director y aseguradora no ingieren cuentas; caja no gestiona licencias; plataforma no accede a cuentas clínicas. |
| Aislamiento | Listas sin intersección entre dos hospitales; consulta y mutación con UUID de otro hospital devuelven404. |
| Ingesta | Cuenta válida se evalúa; ausencia de llave idempotente y cantidades inválidas reciben400. |
| Idempotencia | Reintento idéntico conserva ID; mismo key con contenido distinto devuelve409. |
| Reconstrucción financiera | Facturado = ajuste contractual + estimación aseguradora + estimación paciente + pendiente; exceso sobre tarifa coincide con hallazgo. |
| Revisión | Motivo obligatorio, versión vigente y reevaluación posterior a la corrección. |
| Salida | Exportación CSV contiene el folio; XLSX es un ZIP OOXML real; estado RESOLVED se vuelve a consultar con otro usuario. |
| Concurrencia | Dos ingestas simultáneas con igual llave generan una cuenta; dos revisores sobre la misma versión tienen un ganador y un409. |
| Excel | Se descarga plantilla real, cambia folio y se importa; consulta posterior conserva datos. Fórmulas rechazadas. |
| Comercial | Consentimiento obligatorio; solicitud pública persiste y se recupera desde la consola. |
| Alta de hospital | Se crea hospital con administrador; sus credenciales permiten entrar en un ámbito vacío y separado. |
| Usuarios | Administrador hospitalario no crea rol de plataforma; desactivar usuario revoca su sesión existente. |
| Licencia | Suspensión bloquea ingesta y envío con402, conserva lectura y exportación, y rechaza actualización con versión anterior. |
| Cierre de sesión | Logout revoca token y `/auth/me` posterior responde401. |

## Suite de navegador implementada

`qa/tests/journeys.spec.ts` usa selectores por rol/nombre accesible y el login real. Comprueba landing, fotografía local y preferencia de movimiento reducido, solicitud comercial y lectura en consola, autocompletado de todos los perfiles, cinco roles hospitalarios, captura manual, revisión y corrección, registro de respuesta, importación de Excel desde plantilla, alta comercial de hospital, modificación persistida de licencia y sesión revocada.

Las funciones añadidas comprueban descarga de XLSX, PDF con cabecera y terminador verificables, selección de evaluación histórica y descarga del JSON correspondiente, estado explícito de evidencia sin convenio aplicable, tabulador inválido rechazado sin crear convenio, vista previa válida, importación en borrador y publicación posterior. Los datos guardados se vuelven a consultar desde API o recarga de página; no se considera persistencia el mero eco de un formulario.

`qa/tests/contracts.spec.ts` crea un hospital aislado con dos convenios consecutivos. Una cuenta que cruza de agosto a septiembre se resuelve por su fecha de ingreso; publicar un convenio con solapamiento inclusivo devuelve 409 y conserva el borrador. El precio original 150 frente a tarifa 100 produce ajuste 50. Tras corregirlo a 180 se obtiene 80, mientras los snapshots originales de entradas, reglas y resultado conservan los mismos valores y SHA-256 del motor. La reingesta de las entradas originales como cuenta sintética independiente vuelve a producir los ocho importes financieros originales, incluido ajuste 50. Esto verifica reproducción con el mismo artefacto; no supone disponibilidad futura de cualquier versión del motor.

Tras completar la suite se amplió y ejecutó otra vez únicamente ese contrato directamente contra el gateway nativo 8095, **1 aprobada en 1.5 segundos**, para comprobar paginación y acceso a evidencia. Los límites 0 y 201 y offset −1 reciben 400; páginas de un registro tienen IDs distintos, ambas cubren las dos evaluaciones y la página posterior está vacía. Otro hospital recibe 404 tanto al listar como al consultar snapshots ajenos; plataforma recibe 403 y una petición anónima recibe 401. Reporte separado `evidence/contract-pagination-report.json`; adjuntos `evidence/evaluation-pagination-contract.json` y `evidence/evaluation-access-contract.json`, sin reemplazar la evidencia de las 25 pruebas. Un intento intermedio encontró el frontend de desarrollo 4300 detenido antes de enviar el primer login; se conserva en `evidence/contract-access-environment-block.json` y se resolvió usando el gateway activo, sin alterar Docker.

Las comprobaciones de accesibilidad con axe reportan violaciones e incompletos; no sustituyen una auditoría manual integral. Se registran errores de consola, excepciones JavaScript y respuestas500; capturas solo con datos sintéticos. Se deshabilitan trazas y vídeo porque pueden contener bearer tokens o credenciales de prueba. No se usan reintentos automáticos que oculten fallos.

## Reproducir

Con servicios y web levantados:

```sh
python3 scripts/verify-api.py
cd qa
npm test
python3 helpers/summarize-browser.py
```

Si Chrome ya está disponible por CDP autorizado, ejecutar `ATLAS_CDP_URL=http://127.0.0.1:9430 npm test`; esa conexión cierra únicamente los contextos propios. Para repetir solo la comprobación de Docker: `ATLAS_CDP_URL=http://127.0.0.1:9430 node production-smoke.mjs` desde `qa`. No dirigir la suite que crea datos a la base Docker reservada para presentación.

Se conserva la evidencia de cada recorrido en `evidence/browser-results`, el reporte JSON en `evidence/browser-report.json` y el reporte HTML en `evidence/browser-report/`. La ejecución HTTP deja registros sintéticos identificables en el entorno de demostración; su hospital aislado de prueba termina con licencia suspendida. No borra tablas ni modifica datos de proyectos ajenos. `evidence/browser-attempt-7-passed/` conserva además una copia de la ejecución completa final.

## Pendiente de uso comercial real

Contraste con formatos/convenios de un hospital piloto, identidad/MFA, cobros, comunicaciones externas, revisión de privacidad y servicio, despliegue y restauración de respaldos probada, carga representativa y validación en dispositivos/navegadores objetivo. Esta evidencia demuestra únicamente los escenarios efectivamente ejecutados en el entorno indicado.
