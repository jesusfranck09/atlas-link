# Revisión de seguridad — entorno local de demostración

Fecha: 2026-09-23. Alcance: código Java/Spring de `common` y `hospital-service`, contratos de identidad/control/gateway, migraciones PostgreSQL y revisión estática de sesiones/CSP en Next.js. Datos exclusivamente sintéticos. Esta revisión no equivale a una auditoría integral ni a una certificación de producción.

## Fronteras y activos

El navegador usa un token opaco; identidad comprueba su hash, vigencia y usuario activo. Hospital y control verifican ese token en identidad por petición. El hospital se obtiene del `Actor` autenticado, nunca de un encabezado enviado por el cliente. El gateway tiene un catálogo de rutas públicas y no reenvía la llave interna. Las consultas internas comerciales requieren token y llave de servicio.

Los activos son referencias de cuentas, pólizas y estimaciones financieras, convenios versionados, identidades, licencias y solicitudes comerciales. Aun cuando los ejemplos son sintéticos, el código no debe permitir que un hospital lea al otro, que un director escriba, que plataforma vea cuentas clínicas ni que una licencia suspendida permita modificaciones.

PostgreSQL separa esquemas y roles por servicio. Las transacciones fijan contexto local para RLS; las claves foráneas internas incluyen el hospital. El filtrado explícito por `tenant_id` complementa RLS. Las actualizaciones de cuentas verifican `version` y lo incrementan atómicamente antes de cambiar líneas; la creación usa un bloqueo asesor por hospital para serializar idempotencia y conteo mensual.

## Correcciones realizadas

| Hallazgo y precondición | Impacto y prioridad | Corrección / evidencia |
| --- | --- | --- |
| Un usuario con permiso de ingesta podía enviar un XLSX pequeño con muchas partes descomprimidas; POI limitaba cada parte, sin un presupuesto agregado. | Consumo de memoria/CPU; media, evidencia estática y reproducción sintética del límite. | Antes de construir `XSSFWorkbook`, recorrido ZIP de lectura acotada: 2 MB comprimidos, 12 MB expandidos y 100 entradas. Se rechazan nombres repetidos. Se mantienen controles de ratio y parte de POI. Test con tres partes de 5 MB rechazado antes del parseo de Excel. |
| El límite HTTP de formularios no cubre JSON directo a los servicios; no basta comprobar `Content-Length`. | Consumo excesivo al deserializar; media, comprobado con petición sintética. | Filtro común de 1 MB para cuerpos JSON, lectura de máximo límite+1 y respuesta 413. Tests de longitud declarada y ausencia de longitud; también se comprueba en ruta pública `/api/leads`. Multipart conserva su límite independiente. |
| `lines:[null]` superaba la validación anidada de Jakarta; `@Valid` no rechaza elementos nulos. | Error 500 en entrada malformada; baja. | `List<@NotNull @Valid Line>`; test de validación del elemento nulo. |
| Una corrección podía dejar la suma de cargos fuera de `numeric(14,2)`, aunque cada línea individual cupiera. | Cuenta imposible de reevaluar hasta corregir nuevamente; media para integridad operativa. | Se comprueba total de línea y cuenta bajo el bloqueo obtenido por `version`. La excepción revierte la transacción completa. Se verifica también línea retirada, porque PostgreSQL calcula su columna generada. |
| `removed:"true"` se interpretaba silenciosamente como `false`. | Restauración involuntaria de un cargo con cliente defectuoso; baja. | El campo, cuando está presente, debe ser booleano. Una entrada incompatible devuelve 400. |
| Las fórmulas fuera de las 16 columnas consumidas se ignoraban, aunque el contrato rechaza fórmulas. | Incumplimiento del contrato de importación; baja; no se observó ejecución de fórmulas. | Revisión de todas las celdas utilizadas; fórmulas incluso en columnas ocultas se rechazan. Datos extra fuera de la plantilla también se rechazan. |

Se conservaron las defensas de exportación: XLSX escribe valores de texto, sin crear fórmulas; CSV entrecomilla celdas, duplica comillas y antepone apóstrofo a prefijos que podrían interpretarse como fórmulas. Hay pruebas de espacios, tabulación, salto de línea y comillas. Reabrir y volver a guardar CSV con aplicaciones de terceros puede cambiar su interpretación; no se afirma neutralización universal en cada aplicación.

Los controles de POI por parte y ratio están descritos en [ZipSecureFile](https://poi.apache.org/apidocs/dev/org/apache/poi/openxml4j/util/ZipSecureFile.html). El presupuesto tras descompresión sigue la recomendación de limitar el tamaño expandido de archivos de [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Coordinación con otros responsables

- Identidad/control/gateway: se comunicó que variar el correo eludía el límite de leads. El responsable añadió cuota por IP además de correo, con almacenamiento acotado. La IP del proxy local agrupa clientes; el despliegue deberá definir proxies confiables antes de atribuir IP de origen.
- Identidad: se señaló el límite de 72 **bytes** UTF-8 de BCrypt frente a la validación por caracteres. El responsable añadió validación y prueba. El rol `INSURER_DEMO` se asigna solo en hospitales cuyo metadato comercial `is_demo=true`; no existe una operación pública que altere ese metadato.
- Frontend: su responsable confirmó que `unsafe-eval` queda exclusivamente en desarrollo y añadió `object-src 'none'`. La CSP con nonce y el transporte de sesión mediante BFF/cookie son mejoras posteriores; el contrato actual continúa usando bearer.

Estas correcciones externas pertenecen a sus responsables; sus pruebas deben consultarse en el resultado integrado, no se atribuyen a los tests de hospital.

## Validación ejecutada

```sh
cd backend
mvn -pl hospital-service -am test -q
```

Resultado local: **27 pruebas, 0 errores, 0 fallos**. Incluye las 12 pruebas originales y 15 nuevas. Desglose: 4 `JsonBodyLimitFilterTest`, 4 `AuthenticationBoundaryTest`, 4 `AccountSecurityValidationTest`, 7 `SpreadsheetServiceTest`, 8 `RulesEngineTest`.

Las pruebas HTTP de seguridad usan Spring Security/MockMvc y un verificador controlado: token ausente/ inválido, encabezados de rol/hospital no confiables, indisponibilidad de identidad que falla cerrado y ausencia de autenticación residual entre peticiones. Son pruebas de componente, **no** una simulación presentada como integración PostgreSQL.

Segunda pasada para identidad propia y arranque del gateway:

```sh
mvn -pl identity-service,gateway -am test -q
```

Resultado: **30 pruebas, 0 errores, 0 fallos**: 8 comunes, 16 de identidad y 6 de gateway. Se añadieron siete casos de modo local (incluyen login propio válido, ausencia de provisión/contraseñas automáticas, combinaciones de configuración inválidas y rechazo de credenciales/sesiones sintéticas) y dos del contexto real de la aplicación gateway. Ese contexto arranca con una única cadena de seguridad, sin `UserDetailsService`, datasource ni `TokenVerifier`, y responde correctamente a salud y rechazo de `/internal/**`. Los tests de identidad usan una base simulada; el alta privada sobre PostgreSQL corresponde al coordinador y a QA.

La evidencia existente `evidence/schema-verification.json` registra comprobaciones SQL ejecutadas por el coordinador: RLS sin contexto, dos hospitales, plataforma sin bypass, permisos entre esquemas y conciliación monetaria. La integración con los procesos reales se registra separadamente en `evidence/api-verification.json` cuando el coordinador ejecute el recorrido tras reconstruir los JAR; este documento no presume ese resultado.

## Límites operativos antes de datos reales

La identidad tiene dos modos separados explícitamente:

| Configuración | Comportamiento |
| --- | --- |
| `ATLAS_AUTH_MODE=demo` (valor por defecto), `ATLAS_DEMO_ENABLED=true`, perfil Spring `demo` | Permite usuarios sintéticos y publica las tarjetas demo. Sin los dos indicadores el arranque falla. |
| `ATLAS_AUTH_MODE=local`, `ATLAS_DEMO_ENABLED=false`, sin perfil Spring `demo` | Usa cuentas propias provisionadas privadamente; no crea usuarios ni contraseñas automáticamente. `/api/auth/demo-profiles` responde 404. Una configuración que combine local y demo falla al arrancar. |

En modo local, tanto login como validación de sesión rechazan el dominio reservado `@demo.atlaslink.mx`, los ocho UUID de usuarios sembrados, los dos UUID de hospitales sintéticos y el rol `INSURER_DEMO`. El control también impide crear o activar esas identidades. Esto evita que una base demo reutilizada accidentalmente conserve accesos sintéticos válidos, pero **no limpia esa base ni convierte sus datos en datos reales**. Una instalación propia debe usar una base nueva migrada con `demoEnabled=false`. El modo `oidc` falla explícitamente: aún no existe esa integración.

El primer `PLATFORM_ADMIN` se provisiona con una herramienta operativa privada fuera de HTTP; el coordinador mantiene `scripts/bootstrap-platform.py`. Después, el administrador de plataforma usa el flujo existente para dar de alta hospitales y sus administradores. La herramienta no debe contener credenciales por defecto, debe negarse a reprovisionar un administrador existente y solo necesita acceso privilegiado durante esa operación. No hay endpoint público para crear al primer administrador.

Las cuatro aplicaciones excluyen `UserDetailsServiceAutoConfiguration`: el `user` y password automático de Spring no forman parte del sistema. La autenticación efectiva continúa siendo BCrypt coste 12, tokens opacos aleatorios de 32 bytes, hash SHA-256 almacenado, expiración de ocho horas y revocación por logout/desactivación/cambio de rol.

La identidad local **no** incluye MFA, recuperación de contraseña verificada, SSO institucional/OIDC ni limitación distribuida de intentos. El modo configurable permite construir y probar el producto con identidades propias; no acredita que esté listo para tratar datos hospitalarios reales. Las credenciales demo publicadas son intencionales y deben existir solo en una base demo. Ocultar tarjetas no revoca usuarios ya sembrados. No hay credenciales, tokens ni datos de pólizas en los mensajes de error de `ApiErrors`; registra únicamente la clase de excepción no controlada.

El navegador conserva bearer en `sessionStorage`: un XSS del mismo origen podría leerlo. No se encontraron usos de `dangerouslySetInnerHTML`, `innerHTML`, `eval` o `Function` en `frontend/nxt-ui-atlas-link/src` durante esta revisión; esa búsqueda no prueba ausencia de XSS en todas las dependencias. La CSP actual necesita endurecimiento con nonce antes de exposición real.

`scripts/dev.py` facilita la demo pasando credenciales Flyway al mismo proceso que ejecuta el servicio. Para un despliegue real, ejecutar migraciones en un trabajo separado y retirar credenciales de dueño del runtime (`ATLAS_MIGRATE=false`). El rol runtime limitado protege errores habituales y consultas autorizadas, pero quien controla la conexión SQL puede fijar variables de contexto; RLS no reemplaza la protección de credenciales ni contiene por sí solo el compromiso del proceso.

No se ejecutaron pentests contra terceros, carga sostenida, revisión legal, restauración de backups, análisis completo de dependencias ni validación de todos los navegadores/sistemas operativos. TLS, secretos gestionados, observabilidad operativa, restauración comprobada, retención acordada e identidad productiva son trabajo verificable antes de operar con hospitales reales.
