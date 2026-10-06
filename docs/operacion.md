# Operación local y preparación de despliegue

## Datos de prueba

Las migraciones de demostración crean dos hospitales, usuarios por rol, licencias, aseguradoras y convenios ficticios, cuentas con distintas incidencias, evaluaciones y trazas. La suite de integración añade registros con prefijo QA. Nunca ejecutar estas semillas en un entorno que contenga datos reales.

`ATLAS_DEMO_ENABLED=true` junto al perfil `demo` habilita el modo de presentación. El modo `local` requiere configuración explícita y rechaza identidades y hospitales reservados de demostración. No se considera equivalente a un proveedor corporativo con MFA.

## Provisión privada

Para un entorno vacío sin datos demo: provisionar base/roles, ejecutar las migraciones con `demoEnabled=false`, crear el primer administrador mediante el script offline, arrancar identidad con `ATLAS_AUTH_MODE=local` y `ATLAS_DEMO_ENABLED=false`. No existe un endpoint público para tomar control inicial de plataforma.

```sh
python3 scripts/bootstrap-platform.py --email administrador@tuempresa.com --name 'Administrador'
```

La contraseña se solicita de forma privada o puede suministrarse mediante `ATLAS_BOOTSTRAP_PASSWORD` en un entorno controlado. El script usa el propietario de identidad, rechaza la provisión si ya hay un administrador y nunca sustituye credenciales existentes. En infraestructura externa configurar PGPASSWORD y los parámetros de conexión. No dejar estas variables disponibles al runtime ni compartirlas por logs/chat.

## Migraciones separadas

El arranque local incluye credenciales Flyway para facilitar la demostración. En producción se ejecutan desde un job separado; los procesos ordinarios reciben solo usuarios runtime y `ATLAS_MIGRATE=false` o `SPRING_FLYWAY_ENABLED=false` según servicio. Retirar FLYWAY_USER/PASSWORD del entorno después de migrar. Las cuentas de migración no son las de la aplicación.

## Disponibilidad

La ejecución nativa usa Identity18491, Control18492 y Hospital18493 para evitar puertos de otros proyectos. Gateway permanece en8095 y web en4300. Docker conserva puertos internos8091/8092/8097 en su red aislada. No detener procesos ajenos. Los health endpoints de cada servicio permiten verificar disponibilidad sin divulgar configuración interna.

Respaldar base y roles, guardar respaldos cifrados fuera del servidor y comprobar una restauración en otra base. Definir tiempos de recuperación y retención con el cliente. No asumir que la existencia de un archivo de respaldo acredita recuperabilidad.

Se ejecutó una restauración local de la base sintética con migraciones hastaV3: dump de PostgreSQL, recuperación en otra base, comprobación de20 cuentas/63 cargos/20 evaluaciones/8 usuarios, conciliación financiera y aislamiento RLS18/2 y trigger de evidencia V3. La base temporal se retiró y la original permaneció intacta. [Evidencia y límites](../evidence/restore-verification.json). No acredita recuperación ante pérdida del servidor ni respaldo externo cifrado.

## Docker Compose

El empaquetado de demostración incluye cuatro contenedores Java, PostgreSQL y Next.js. Los servicios y PostgreSQL no publican puertos al host; se accede por web en localhost4430. El volumen pertenece al proyecto `atlas-link-demo`, separado de PostgreSQL nativo.

```sh
python3 scripts/compose-env.py
docker compose --env-file .local/compose.env config --quiet
docker compose --env-file .local/compose.env up --build -d
docker compose --env-file .local/compose.env ps
```

Las credenciales son aleatorias y quedan en archivo privado. Conservar ese archivo mientras se conserve el volumen: cambiar contraseñas de entorno no rota automáticamente las ya creadas por PostgreSQL. `docker compose down` conserva datos; no agregar `--volumes` salvo que se quiera eliminar expresamente la demostración.

El Dockerfile web usa `output: standalone`, documentado por [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting). Las imágenes base son [Eclipse Temurin](https://hub.docker.com/_/eclipse-temurin) y [PostgreSQL](https://hub.docker.com/_/postgres). Los tags de desarrollo deben fijarse a digest al preparar una liberación reproducible en producción.

## Antes de un piloto real

Conectar identidad/MFA y recuperación de cuentas, transporte TLS y red privada, correo transaccional y facturación/pagos si se contratan, secretos gestionados, backups con restauración probada, límites/rate limiting compartidos, observabilidad y alertas. Contrastar plantilla ERP y exportaciones con el hospital/aseguradoras; validar convenios, responsabilidad financiera, protección de datos y retención. No anunciar aprobaciones oficiales ni ahorros sin evidencia.


## Estado al entregar

Queda activa la demostración Docker en http://localhost:4430, con los seis contenedores saludables y20 cuentas sintéticas originales. La instancia nativa de pruebas y su PostgreSQL se detuvieron después de validar para liberar recursos; conservan código y datos en `.local/` y se pueden iniciar con el procedimiento del README. No se detuvieron procesos de otros proyectos.
