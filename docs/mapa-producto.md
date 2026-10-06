# Mapa de producto y comercialización

## Qué se vende

Una suscripción hospitalaria que ayuda a preparar cuentas para revisión y entrega a aseguradoras: identifica diferencias con convenios, organiza correcciones, deja evidencia y facilita registrar el resultado. La unidad comercial inicial es el hospital con capacidad mensual de cuentas y límite de usuarios. Precios y condiciones se cotizan; no hay un precio inventado ni cobro automático conectado.

## Venta → operación → renovación

1. **Descubrimiento:** landing con propuesta, alcance y solicitud de demostración. La solicitud se guarda y aparece en la consola.
2. **Presentación:** perfiles demo y cuentas sintéticas permiten mostrar caja, dictaminador, dirección y administración.
3. **Calificación:** identificar ERP, volumen, aseguradoras, formato de cuenta y convenios disponibles. Estos datos no existen aún para un hospital real.
4. **Alta:** plataforma registra hospital, capacidad, vigencia y su primer administrador. Si falla identidad se conserva el cliente y se puede reintentar la provisión.
5. **Implantación:** cargar usuarios, homologación y tabuladores; comprobar casos acordados y formatos de salida antes de activar datos reales.
6. **Operación:** ingresar cuenta → evaluar → tomar/revisar → corregir/justificar → reevaluar → preparar → exportar → registrar envío → registrar respuesta.
7. **Seguimiento:** dirección ve métricas operativas del hospital; proveedor ve licencias, capacidad y conteos agregados, sin detalle de cuentas.
8. **Renovación:** proveedor modifica vigencia, plan y capacidad. Las licencias suspendidas/vencidas restringen nuevas operaciones y mantienen lectura/exportación según la política demostrativa implementada. No borran datos.

## Problemas que atiende cada área

| Persona | Problema | Funcionalidad |
| --- | --- | --- |
| Caja/facturación | Archivos inconsistentes y reintentos duplicados | Plantilla XLSX, validación por campo, idempotencia y carga manual/API |
| Dictaminador | Encontrar diferencias y saber quién trabaja cada cuenta | Bandeja, filtros, asignación, hallazgos por línea y control de versiones |
| Dictaminador | Corregir sin perder la explicación anterior | Motivo obligatorio, reevaluación, versión de convenio fija y trazabilidad |
| Caja/facturación | Preparar documentación y dar seguimiento | Exportación XLSX/CSV, envío manual registrado y resultado de aseguradora |
| Dirección | Ver carga de trabajo y resultados disponibles | Tablero, distribución por carril, montos y reportes basados en datos registrados |
| Administrador hospitalario | Gestionar permisos y parámetros | Usuarios por rol, activación/desactivación y convenios versionados |
| Empresa proveedora | Operar clientes y alcance contratado | Alta recuperable, licencias, vigencias, límites, conteos reales y leads |

## Fronteras

No es expediente clínico ni sistema de consultas, inventario o camas. El paciente no opera esta preauditoría y no necesita un portal dentro de este alcance. La aseguradora solo tiene una experiencia de lectura de demostración; no recibe envíos automáticos ni delega autorizaciones de pago. Los conectores reales dependen de acuerdos y formatos que deben obtenerse con el primer hospital.

## Decisiones pendientes para vender a un cliente real

Precio y contrato, definición de sede vs grupo hospitalario, soporte y horarios, política de suspensión/renovación, identidad corporativa/MFA, disponibilidad y recuperación, retención y datos personales, integración ERP/aseguradoras y validación de reglas. Esas condiciones comerciales y externas no se pueden demostrar con datos sintéticos. La arquitectura, código y flujo local están orientados a preparar esa validación, no a inventar que ya ocurrió.
