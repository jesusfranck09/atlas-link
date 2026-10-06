# Atlas Link

Preauditoría de cuentas hospitalarias como servicio. La plataforma reúne una landing comercial, el portal del hospital y una consola para operar clientes y licencias. Los convenios, aseguradoras y pacientes de la demostración son sintéticos.

## Stack

Java 21, Spring Boot 3.5, microservicios independientes, PostgreSQL 15+, Next.js App Router, React, TypeScript y Tailwind. La corrección tecnológica del usuario prevalece sobre el documento original que mencionaba Angular/monolito.

| Componente | Puerto local | Responsabilidad |
| --- | --- | --- |
| Web Next.js | 4300 | Landing, acceso, hospital y consola |
| Gateway Spring | 8095 | API pública y enrutamiento |
| Identity | 18491 | Usuarios, autenticación y sesiones |
| Control | 18492 | Hospitales, licencias y solicitudes comerciales |
| Hospital | 18493 | Cuentas, convenios, preauditoría y trazabilidad |
| PostgreSQL propio | 5440 | Base atlas_link, esquemas/roles independientes |

## Presentación con Docker

La versión de presentación se abre en **<http://localhost:4430>**. El portal del hospital está en `/login`, la consola de tu empresa en `/admin/login` y la aseguradora demo de solo lectura en `/insurer/login`. Los tres accesos incluyen perfiles clicables que rellenan el formulario. Contraseña demo: `AtlasDemo2026!`.

Requisitos: Docker con Compose y Python3 para generar las credenciales locales una sola vez.

```sh
python3 scripts/compose-env.py
docker compose --env-file .local/compose.env up --build -d
docker compose --env-file .local/compose.env ps
```

Los seis contenedores tienen red y volumen propios; solo la web publica un puerto en este equipo. Esta base conserva los datos de presentación separados de las pruebas nativas. Para detener: `docker compose --env-file .local/compose.env down` (conserva datos).

## Desarrollo nativo

Requisitos: Java21, Maven, Node24/npm, Python3 y PostgreSQL15+ en PATH (el script también detecta Homebrew PostgreSQL15). Desde esta carpeta:

```sh
cd frontend
npm ci
cd ..
python3 scripts/dev.py start --build
```

El script crea un clúster PostgreSQL exclusivo dentro de `.local/postgres`, provisiona contraseñas aleatorias y roles separados, compila y arranca los procesos. No modifica otras bases. Los datos y secretos de desarrollo viven en `.local/`, excluido de Git. Los logs por servicio están en esa misma carpeta.

- Producto: <http://localhost:4300>
- Hospital: <http://localhost:4300/login>
- Consola empresa: <http://localhost:4300/admin/login>
- Aseguradora demo: <http://localhost:4300/insurer/login>

Los logins incluyen tarjetas para rellenar el formulario. Contraseña exclusivamente demo: `AtlasDemo2026!`.

```sh
python3 scripts/dev.py status
python3 scripts/dev.py stop
python3 scripts/dev.py stop --database
```

## Verificación

```sh
cd backend
mvn test
cd ../frontend
npm run build
cd ..
python3 scripts/verify-api.py
```

La verificación HTTP usa los cuatro procesos reales y PostgreSQL; crea registros sintéticos marcados QA. `scripts/verify-schema.py` está destinado a un esquema vacío antes del primer arranque: prueba migraciones, semillas y RLS dentro de una transacción que se revierte.

## Documentación

- [Avances, estado actual y pendientes](docs/avances.md)
- [Decisiones y alcance](docs/decisiones.md)
- [Modelo de negocio, producto y comercialización](docs/mapa-producto.md)
- [Contrato HTTP](docs/api-contract.md)
- [JSON Schema y ejemplo ERP](docs/contracts/README.md)
- [Trazabilidad contra el alcance original](docs/trazabilidad-entrega.md)
- [Contratos entre servicios](docs/backend-services.md)
- [Modelo de datos y aislamiento](docs/database.md)
- [Criterios de aceptación](docs/aceptacion.md)
- [Recorrido de presentación](docs/recorrido-demo.md)
- [Entrega visual vigente: identidades y efectos V12](docs/review-identity-v12.md)
- [Evidencia de revisión V12](evidence/identity-v12/README.md)
- [Configuración React Bits y MCP](docs/react-bits-mcp.md)
- [Procedencia de fotografías vigentes](docs/assets-v3.md)
- [Operación y contenedores](docs/operacion.md)
- [Validación ejecutada](docs/validacion.md)
- [Recursos y límites de rendimiento](docs/rendimiento.md)
- [Revisión de seguridad](docs/security-review.md)
- [Revisión de las nuevas funciones](docs/security-followup.md)
- [Participación del equipo](docs/equipo.md)
- [Documento original](docs/alcance-original.md)

## Alcance comercial de esta entrega

La operación local permite preparar y demostrar el producto con datos sintéticos. Una preauditoría es una estimación, no autorización de pago. Los archivos de salida son formatos genéricos de demostración, pendientes de contrastar con el hospital y las aseguradoras reales.

El alta comercial real requiere identidad/MFA configurada, convenios autorizados, formatos validados, contratos de servicio y datos, políticas de retención, cobros/notificaciones y despliegue con recuperación probada. No hay cobros ni envíos automáticos a aseguradoras o servicios externos sin configuración explícita.
