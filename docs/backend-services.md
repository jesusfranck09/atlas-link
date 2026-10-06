# Contrato microservicios

Maven raíz backend: common (librería), identity-service, control-service, hospital-service y gateway. Puertos internos Docker:8091/8092/8097/8095; ejecución nativa:18491/18492/18493/8095. Schemas/roles independientes identity/control/hospital; PostgreSQL nativo5440, Docker5432 sin publicar al host. Sin joins/FK entre servicios. Migraciones backend/src/main/resources/db/migration/{identity,control,hospital}; añadir recurso de cada módulo con targetPath db/migration.

Variables por proceso DB_URL, DB_USER, DB_PASSWORD, FLYWAY_USER, FLYWAY_PASSWORD, DB_SCHEMA, ATLAS_DEMO_ENABLED, ATLAS_AUTH_MODE, INTERNAL_API_KEY, IDENTITY_URL, CONTROL_URL y HOSPITAL_URL. El script nativo fija todas las URLs a127.0.0.1 y sus puertos184xx; Compose usa nombres de servicio. Flyway placeholders.demoEnabled=${ATLAS_DEMO_ENABLED:false}. Modo demo exige perfil demo explícito; modo local usa ATLAS_AUTH_MODE=local y ATLAS_DEMO_ENABLED=false con provisión privada, sin identidades demo. Roles aplicación acceden solo su schema; propietarios migran. @Transactional + Db.scope(actor) fija app.tenant_id, app.platform_admin, app.actor_id, app.user_id.

Gateway no usa BD: /api/auth y /api/users → identity; /api/tenants,/api/licenses,/api/leads → control; demás /api → hospital. Bloquear /internal/**.

## Common existente

Actor(id,tenantId,name,email,role,tenantName) y métodos platform(), require(roles...), hospital(). TokenVerifier.verify(String) implementado por identity consulta identity.find_session_user(hash). En otros servicios bean RemoteIdentity(IDENTITY_URL), consulta GET /api/auth/me con bearer en cada request sin caché; falla cerrado. SecurityConfiguration bearer stateless, públicos auth/login, demo-profiles, actuator/health, POST leads. Db.list convierte snake_case a camelCase y JSONB a objeto; one, json, object, scope. Db.audit solo hospital.audit_event. Identity/control no llaman Db.audit; eventos propios si existen (coordinar DB).

## Control interno

Hospital antes de escribir consulta GET /internal/entitlement con bearer usuario y X-Internal-Key: INTERNAL_API_KEY. Respuesta {tenantId,status,monthlyAccountLimit,seatLimit,expiresAt}; tenant derivado exclusivamente del actor validado. Llave comparación constante; estado efectivo considerando expiresAt. Inexistente/suspendida/expirada 403/402. Hospital bloquea cuota mensual con advisory lock tenant al crear. Lectura/exportación permitidas aun vencida. Identity puede consultar entitlement para seatLimit al crear usuarios.

GET /internal/platform-summary con bearer plataforma + llave devuelve {activeTenants,activeLicenses,monthlyCapacity,leadsCount,tenants:[]}. Hospital dashboard plataforma hace esta consulta sin obtener datos clínicos.

POST /internal/usage existe en Identity y Hospital, exige bearer PLATFORM_ADMIN + llave interna y recibe {tenantIds:[UUID]} (máximo200). Devuelve únicamente conteos por hospital: Identity userCount activos; Hospital accountCount y usedAccounts del mes America/Mexico_City. Control agrega estos datos a GET /tenants y /licenses FUERA de transacciones SQL. Cada consulta aplica RLS a un tenant explícito; no se devuelven nombres de usuarios, cargos o cuentas. Si un servicio no responde se conserva null, nunca se fabrica cero. Gateway no publica estos endpoints.

Identity no hace JOIN control. tenantName de las semillas: Hospital Aurora · DEMO y Clínica Horizonte · DEMO. HOSPITAL_ADMIN usuarios de su tenant, nunca PLATFORM_ADMIN. PLATFORM_ADMIN administra solo usuarios plataforma. Login: token opaco32bytes aleatorio, SHA256 persistido,8h, BCrypt12, rate limit acotado IP/email. Sesiones revocables activas verificadas. Demo password solo modo explícito.

Control tenant+licencia TRIAL30d con defaults demo, no cobros. PATCH license version lock, capacidad/fechas validadas. Todas APIs públicas detalladas en api-contract.md.
