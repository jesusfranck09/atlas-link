# Criterios de aceptación

Este registro separa comportamiento implementado de condiciones pendientes de un hospital real. Las pruebas concretas y sus resultados se guardan en `evidence/` y `docs/validacion.md`.

| Área | Comportamiento observable |
| --- | --- |
| Comercial | Landing explica el problema, alcance y oferta; solicitud de demo persiste y aparece en consola. Sin métricas o clientes inventados. |
| Demos | Cada login muestra perfiles de su ámbito; pulsar rellena credenciales, entrar valida en identity-service; cuenta desactivada no entra. |
| Licencias | Empresa ve hospitales/licencias, crea cliente y modifica capacidad/vigencia; hospital suspendido no ingesta ni altera cuentas, conserva lectura/exportación. |
| Aislamiento | Un usuario de hospital A no lista, consulta ni modifica datos de B, incluso usando UUID conocido. Plataforma no recibe detalle clínico. Roles SQL separados. |
| Ingesta | JSON/Excel aceptan datos válidos y rechazan errores precisos; idempotencia devuelve la misma cuenta ante reintento sin duplicar consumo. |
| Motor | Cada monto puede reconstruirse con cuenta + convenio + versión del motor; dinero exacto, códigos sin homologar y póliza incompleta generan revisión. |
| Revisión | Responsable toma cuenta; cambios requieren versión y motivo; conflictos devuelven409; historial conserva acciones; reevaluación fija convenio. |
| Salida | Cuenta preparada exporta archivo real; envío y respuesta registrados manualmente. No simula comunicación con aseguradora. |
| Convenios | Borrador publicable si válido, publicación inmutable, vigencias no ambiguas. |
| Dirección | Métricas provienen de cuentas y eventos, filtros y reportes muestran datos del tenant. |
| Usuarios | Administrador hospital crea/desactiva y asigna roles de su ámbito, no escala a plataforma. Sesiones se revocan/desactivan. |
| UX | Escritorio y móvil sin desbordes críticos; navegación por teclado; foco visible; errores legibles; formularios en español; carga/estado vacío. |
| Performance | Imágenes locales optimizadas y tamaños responsivos; 3D progresivo, reduced-motion, sin bucles de render perpetuos en pantallas operativas. |
| Operación | Arranque reproducible, health checks, logs sin cuentas clínicas, secretos locales excluidos de Git, migraciones por servicio y documentación de recuperación. |

## Condiciones para un cliente real

Validar contrato de servicio y tratamiento de datos, identidad/MFA, formatos ERP/aseguradoras, tabuladores autorizados, reglas de responsabilidad financiera, correo/cobros, política de retención y recuperación. La demostración no constituye verificación de estas integraciones o condiciones.

## Escenarios sintéticos

Cuenta verde, exceso de tabulador, exceso de cantidad, concepto excluido, código desconocido, falta de póliza, convenio inexistente, cuenta en revisión, preparada, enviada y con resultado. Hospital secundario sirve para probar aislamiento; sus datos no aparecen al cliente principal.
