# Avances y estado de Atlas Link

Actualizado: 24 de septiembre de 2026. Última entrega funcional y visual: commit `7d073a1` (V12). Este resumen reúne lo documentado; no representa una nueva ejecución de pruebas.

## Modelo de negocio

La fuente principal es [Mapa de producto y comercialización](mapa-producto.md): qué se vende, hospital como unidad comercial, licencias con capacidad de cuentas y usuarios, recorrido de venta a renovación, responsables y problemas que resuelve el producto. [Decisiones](decisiones.md) conserva las reglas y los límites acordados.

El producto se presenta como preauditoría de cuentas hospitalarias por suscripción. Precio, contrato, soporte y condiciones definitivas de renovación siguen pendientes de validación comercial. Actualmente se trabaja con datos sintéticos y sin hospital piloto.

## Avance por área

| Área | Estado documentado | Detalle y evidencia |
| --- | --- | --- |
| Empresa y licencias | Solicitudes comerciales, alta de hospitales, administradores, licencias, vigencias, capacidad y usuarios implementados para la demostración. | [Cobertura T01](trazabilidad-entrega.md) y [recorrido demo](recorrido-demo.md). |
| Operación hospitalaria | Captura e importación de cuentas, convenios versionados, revisión, correcciones, reevaluación, exportación y registro manual de envío/respuesta. El motor cubre parte de las reglas del alcance original. | [Matriz completa de implementado y restante, T04–T13](trazabilidad-entrega.md). |
| Backend y base de datos | Microservicios Java/Spring, PostgreSQL, migraciones, datos sintéticos, permisos y aislamiento por hospital. | [Arquitectura](arquitectura.md), [servicios](backend-services.md) y [modelo de datos](database.md). |
| Seguridad | Autenticación local, sesiones revocables, controles por rol y aislamiento documentados. Las condiciones de identidad y operación productiva siguen abiertas. | [Revisión de seguridad](security-review.md) y [pendientes T12–T15](trazabilidad-entrega.md). |
| Interfaces V12 | Landing, consola Atlas, hospital y aseguradora demo con identidades propias; ubicación por módulo; login con perfiles clicables; esculturas 3D, títulos ópticos y carrusel originales. | [Entrega visual V12](review-identity-v12.md). |
| Herramientas | Registro React Bits y MCP para Claude configurados y comprobados mediante un cliente temporal. Efectos propios, sin instalar True Focus. | [Configuración y verificaciones MCP](react-bits-mcp.md). |

## Pruebas y revisiones

- Las verificaciones funcionales históricas, incluidos backend, PostgreSQL y recorridos de negocio, están en [Validación](validacion.md). Cada resultado corresponde a su ejecución y versión.
- La revisión V12 reúne evidencia aprobada de 20 escenarios distintos entre revisiones y 52 vistas de módulos. Tras el último arreglo del título se repitieron tres escenarios focales, todos aprobados; no se repitió toda la suite. Véanse [índice y límites](../evidence/identity-v12/README.md) y [procedencia de resultados](../evidence/identity-v12/result-index.json).
- Compilación, tipos y lint quedaron correctos en la entrega V12. Navegador probado: Chrome en macOS, con tamaños móviles/tablet emulados. No acredita pruebas físicas en Android/iOS/Windows ni preparación productiva.
- Las iteraciones visuales se conservan en los documentos `review-*.md`; la versión vigente es [V12](review-identity-v12.md), que incorpora los efectos de luz de [V11](review-sunlight-v11.md).

## Qué queda pendiente

La [matriz de trazabilidad](trazabilidad-entrega.md) conserva los requisitos sin completar, sin confundirlos con funcionalidades terminadas. Incluye identidad corporativa/MFA y credenciales técnicas por hospital, reglas y homologaciones todavía ausentes, procesamiento asíncrono/notificaciones, formatos e integraciones reales, auditoría adicional, retención y operación cloud.

Para vender y operar con un hospital real también deben concretarse precio, contrato, soporte, convenios y formatos autorizados, tratamiento de datos y recuperación operativa. Estos pendientes están descritos en el [modelo comercial](mapa-producto.md), las [decisiones](decisiones.md) y la [trazabilidad](trazabilidad-entrega.md). La demostración local no los da por cerrados.

## Accesos de presentación

| Sistema | Enlace local |
| --- | --- |
| Landing | http://localhost:4430/ |
| Consola de la empresa | http://localhost:4430/admin/login |
| Portal hospitalario | http://localhost:4430/login |
| Aseguradora demo de solo lectura | http://localhost:4430/insurer/login |

La entrada de aseguradora usa el rol de lectura y los datos sintéticos del hospital demo. No se ha construido un portal de pacientes dentro del alcance actual.
