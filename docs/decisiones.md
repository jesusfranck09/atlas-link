# Decisiones de producto y arquitectura

## Alcance confirmado

Atlas Link prepara y revisa cuentas hospitalarias antes de su entrega a aseguradoras. México/MXN. Venta por suscripción a hospitales, mensual/anual y capacidad contratada, precios por cotización hasta validación comercial. Landing, consola proveedora, portal hospitalario y demo aseguradora. Sin hospital piloto: toda la operación inicial usa datos sintéticos. No sustituye expediente clínico ni autorización de pago.

Corrección expresa del usuario: microservicios Java/Spring y Next.js/React/Tailwind, reemplazando el monolito y Angular del documento de origen. PostgreSQL conservado. Interfaces claras, 3D progresivo, sin imágenes generadas por IA.

## Entrega ejecutable

Servicios identity (18491), control (18492), hospital (18493), gateway (8095), web nativa (4300), presentación Docker (4430). PostgreSQL aislado (5440). Cada servicio tiene proceso y rol de datos propios. Red interna para verificación de sesión y consulta de licencia; no compartir credenciales de acceso general entre servicios. La consola proveedora ve metadatos comerciales, no adquiere acceso automático al detalle hospitalario.

## Reglas trazables

- Resultado siempre presentado como preauditoría/estimación, nunca autorización ni indicación clínica.
- Convenios demo explícitos, publicados inmutables; reevaluaciones conservan versión del convenio.
- Reintentos con la misma clave de idempotencia no consumen otra cuenta.
- Deducible, coaseguro y suma disponible vienen de la póliza; faltantes requieren revisión.
- Descuentos contractuales y conceptos excluidos no se imputan automáticamente al paciente.
- Corrección no borra la historia; justificar un cargo no elimina por sí solo una anomalía.
- Licencia suspendida/vencida bloquea nuevas operaciones según política demostrativa, conserva lectura/exportación. No borra datos.
- Acceso demo activado por configuración y cuentas sintéticas; producción exige configuración de identidad y secretos explícita.

## Inconsistencias del documento original por resolver

1. Retención de 30 días contradice reconstrucción posterior y puede eliminar cuentas pendientes. No activar borrado indiscriminado. Definir política real con cliente/contrato, incluyendo backups, evaluación, cierre y datos identificables en auditoría.
2. Homogeneizar matriz permisos: caja registra envío/respuesta; dictaminador toma/corrige/prepara/exporta; administración hospitalaria puede operar según privilegios explícitos. Dirección y aseguradora demo solo lectura.
3. Medir recepción y preparación por separado del alta; no llamar tiempo de alta al tiempo de procesamiento si no se dispone del hito clínico.
4. Mostrar observaciones corregidas y resultados registrados; no afirmar objeciones evitadas o ahorro sin línea base.
5. Reglas de coherencia clínica no se inventan ni se activan como criterio médico; requieren convenio/fuentes y revisión competente.

## Preparación de venta

La demostración prueba el flujo con convenios sintéticos, no compatibilidad certificada con aseguradoras. Exportaciones genéricas se identifican como tales. Activación comercial de un hospital requiere mapear su Excel, validar tabuladores y cobertura de códigos, probar sus formatos de salida y acordar políticas operativas. No se inventan avales, logos de clientes ni métricas de éxito.
