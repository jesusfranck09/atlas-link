# Revisión de la ampliación de preauditoría

Fecha: 2026-09-24. Alcance: PDF, importación de tabuladores, paginación de cuentas, reportes e historial reproducible de evaluaciones. Revisión estática de código y lectura de informes de pruebas ya generados; no se ejecutaron pruebas de carga, llamadas a terceros ni consultas de avisos de dependencias. La revisión no acredita la preparación para datos hospitalarios reales.

## Hallazgo comunicado al coordinador

**SEC-F01 — Historial de evaluaciones sin límite de respuesta. Severidad media; confianza alta. Corregido en código; prueba integrada pendiente.**

- Ubicación: `AccountService.evaluations`, consulta de `hospital.evaluation` para `GET /api/accounts/{id}/evaluations`.
- Comportamiento previo observado: devolvía todas las evaluaciones de una cuenta sin `LIMIT`, cursor ni paginación. `evaluate` admite reevaluaciones consecutivas de una cuenta en estado `EVALUATED` o `IN_REVIEW`; cada ejecución conserva una evaluación nueva. La consulta seleccionaba metadatos, no todos los snapshots, pero la cantidad de filas no estaba acotada.
- Precondiciones: usuario hospitalario autenticado con acceso a la cuenta para leer el historial; para producir crecimiento acelerado, `HOSPITAL_ADMIN` o `REVIEWER`, licencia activa y versiones vigentes de esa cuenta.
- Impacto: memoria, serialización y respuesta proporcionales al historial acumulado. No se observó ruptura de aislamiento ni se reprodujo agotamiento de recursos. La creación de evaluaciones conserva controles de rol, asignación y versión; esos controles no limitan el tamaño de esta lectura.
- Corrección comprobada por lectura después del cambio del coordinador: `HospitalController` recibe `offset=0` y `limit=50` por defecto; `AccountService` rechaza offset fuera de 0–1.000.000 y limit fuera de 1–200, pasa ambos como parámetros SQL y conserva orden por fecha e ID, restricciones de cuenta/tenant y acceso individual a la evidencia. El overload anterior también queda acotado a 50 filas.
- Verificación pendiente: más filas que una página, páginas consecutivas sin pérdida/duplicado, límites inválidos y cuenta/evaluación de otro hospital. La interfaz paginada está a cargo de frontend; no se verificó aquí su ejecución. No se modificó código de otros responsables.

## Controles observados

| Superficie | Control comprobado por lectura |
| --- | --- |
| Historial y evidencia individual | `actor.hospital()` rechaza a plataforma; contexto transaccional con `Db.scope`; consulta usa tenant, cuenta y evaluación. La evidencia de otra cuenta no se obtiene cambiando únicamente `evaluationId`. |
| Reportes | Solo `HOSPITAL_ADMIN` y `DIRECTOR`; tenant derivado de identidad. SQL parametrizado, aseguradora UUID y fechas convertidas a límites en `America/Mexico_City`. |
| Página de cuentas | `limit` 1–200; offset no negativo; estados y carril validados. Búsqueda de hasta 100 caracteres con comodines escapados; valores como parámetros SQL. |
| Importación de convenio | Solo administrador hospitalario y licencia activa. Reparseo del XLSX recibido en confirmación; compara SHA-256 con el preview y repite validación de reglas al crear el borrador. El checksum comprueba correspondencia de archivo; no es una credencial ni prueba de que un humano revisó el preview. |
| Límites XLSX | 2 MB comprimidos, 12 MB expandidos, 100 entradas ZIP, nombres no repetidos, una hoja y hasta 1.000 conceptos. Se rechazan fórmulas y columnas adicionales, incluidas ocultas. No se ejecutan fórmulas. Errores de preview limitados a 100. |
| PDF | Generación mediante PDFBox, sin HTML ni recursos de red. Exportación usa permisos de `exportData` y exige estado `READY`, `SENT` o `RESOLVED`; proveedor, director y aseguradora demo no pueden exportar. Texto se normaliza a glifos soportados; nombre del archivo usa UUID. |
| Respuestas/errores | Descargas y gateway envían `Cache-Control: no-store`. Errores de parseo/BD no reflejan contenido del archivo, SQL, contraseñas ni trazas. |
| Gateway | Rutas y métodos nuevos en lista explícita; continúa rechazando rutas internas o ambiguas. Solo reenvía cabeceras permitidas y descarta claves internas aportadas por el cliente. |
| Evidencia inmutable | V1 concede al rol de ejecución solo SELECT/INSERT sobre evaluaciones y añade trigger contra UPDATE/DELETE. V3 exige cuatro componentes completos para inserciones nuevas; los históricos permanecen marcados sin evidencia, sin reconstrucción ficticia. |
| Replay | Snapshots serializados de entrada, reglas y resultado; hash del bytecode del motor y sus tipos anidados. Replay exige el mismo artefacto y versión de esquema, sin leer líneas/convenios actuales. No existe endpoint público para ejecutar snapshots arbitrarios. |
| Carreras de revisión | Reevaluación confirma versión mediante UPDATE antes de persistir evidencia. Corrección adquiere el bloqueo de cuenta mediante versión antes de modificar cargos. Una carrera pierde con conflicto y rollback, sin persistir resultado de versión obsoleta. |

## Evidencia disponible y límites

Se leyeron cinco informes Surefire existentes: `AgreementSpreadsheetTest` (3), `DocumentExportsTest` (2), `EvaluationEvidenceTest` (6), `AccountReadAndResolutionTest` (7) y `GatewayControllerTest` (4): **22 pruebas, cero fallos/errores/omitidas**. Son informes del build ejecutado por el coordinador; esta revisión no los vuelve a presentar como pruebas nuevas ni como comprobación HTTP/SQL real.

Los casos cubren hash estable, errores de filas, fórmulas ocultas, PDF multipágina, conservación de precisión y snapshots tras mutación de fuentes, rechazo de artefacto/esquema de replay diferente, plataforma sin acceso, filtros y rutas. La prueba de tenant cruzado y aplicación real de V3 pertenece al recorrido integrado del coordinador/QA.

No se identificó en esta ampliación una nueva vulnerabilidad alta/crítica demostrada. SEC-F01 tiene corrección de código revisada; resta verificar el despliegue y recorrido integrado. No se evaluaron avisos actuales de PDFBox/POI ni seguridad completa de producción. Las limitaciones de identidad local y separación de datos demo documentadas en `security-review.md` siguen vigentes; esta ampliación no las elimina.
