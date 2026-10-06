# Contrato mínimo compartido

IDs UUID. JSON camelCase. Dinero decimal exacto en backend/PostgreSQL; ISO 8601 UTC y visualización America/Mexico_City. MXN. Claves de estado y rol en inglés; interfaz en español.

Roles: PLATFORM_ADMIN, HOSPITAL_ADMIN, BILLING, REVIEWER, DIRECTOR, INSURER_DEMO. Tenant demo principal `11111111-1111-1111-1111-111111111111`, otro tenant `22222222-2222-2222-2222-222222222222`. Usuarios sintéticos: atlas@demo.atlaslink.mx (PLATFORM_ADMIN), admin@demo.atlaslink.mx (HOSPITAL_ADMIN), caja@demo.atlaslink.mx (BILLING), auditor@demo.atlaslink.mx (REVIEWER), direccion@demo.atlaslink.mx (DIRECTOR), aseguradora@demo.atlaslink.mx (INSURER_DEMO). Contraseña demo `AtlasDemo2026!` solo modo local/demo.

Estados cuenta: RECEIVED, EVALUATED, IN_REVIEW, READY, SENT, RESOLVED. Lane GREEN/YELLOW/RED. Resultado aseguradora APPROVED/ADJUSTED/REJECTED. Convenio DRAFT/PUBLISHED, publicado inmutable. Licencia TRIAL/ACTIVE/SUSPENDED/EXPIRED. Sin precio de venta validado: planes comerciales por cotización, capacidad configurable.

API /api; bearer token. Frontend Next.js/React/Tailwind puerto 4300 con rewrite a gateway 8095, PostgreSQL aislado puerto 5440 base atlas_link. Backend microservicios Spring Boot con procesos y roles PostgreSQL separados (identity18491, control18492, hospital18493; gateway8095). Producción exige proveedor de identidad real/configurado; demo local explícito.

Endpoints mínimos (backend precisa DTOs aquí o en api-contract.md inmediatamente): POST /auth/login, GET /auth/me, GET /auth/demo-profiles; GET /dashboard; GET /accounts y /accounts/{id}; POST /accounts, POST /accounts/import (.xlsx), PATCH /accounts/{id}/lines/{lineId}; POST /accounts/{id}/claim, /evaluate, /ready, /send, /outcome; GET /accounts/{id}/export; GET/POST /agreements, POST /agreements/{id}/publish; GET/POST /users; PATCH /users/{id}; GET /tenants, GET /licenses, PATCH /licenses/{id}; GET /audit; POST /leads. Listados devuelven arrays salvo contrato explícito acordado.

Cuenta: id, folio, patientReference (seudónimo), insurer, insurerId, admissionDate, dischargeDate, total, lane, status, anomalyCount, assignedTo, createdAt, version. Detalle incluye lines, evaluation, history. Línea: id, code, description, category, quantity, unitPrice, total, status, reason, justification. Evaluación: billedTotal, excludedTotal, tariffAdjustment, deductible, coinsurance, insurerEstimate, patientEstimate, unresolvedAmount, lane, findings[], agreementVersion, engineVersion. No atribuir descuentos contractuales automáticamente al paciente.

Cálculo determinista con datos convenio demo: precisión BigDecimal; distinguir ajustes contractuales de responsabilidad paciente; faltantes de póliza generan revisión; topes/suma disponible explícitos; corrección crea traza; convenio fijado en reevaluación. Ningún cambio de tenant desde input se considera identidad. Permisos server-side, errores legibles sin stacktraces ni datos sensibles, límites importación, transacciones, idempotencia y bloqueo optimista.

Demo no debe disfrazarse de integración real ni enviar automáticamente a aseguradoras. El portal exporta CSV/XLSX real y registra resultado manual. Leads persistidos localmente; proveedor de cobros y GCP preparados/configurables, sin llamadas facturables no configuradas.
