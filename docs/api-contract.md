# API Atlas Link v1 — contrato de implementación

Base `/api`, JSON camelCase, UUID, importes JSON decimales MXN, fechas ISO. `Authorization: Bearer <token>`; errores `{code,message}`. Listados arrays, límite 200 por defecto. Los cambios de cuentas llevan `{version: númeroActual}` y responden el detalle actualizado; conflicto 409 exige recargar.

## Identidad

`GET /auth/demo-profiles` → `[{email,name,role,tenantName,password}]` solo perfil demo. `POST /auth/login {email,password}` → `{token,expiresAt,user:{id,name,email,role,tenantId,tenantName}}`. `GET /auth/me` → user. `POST /auth/logout` invalida token. Credencial demo `AtlasDemo2026!`. Roles: PLATFORM_ADMIN, HOSPITAL_ADMIN, BILLING, REVIEWER, DIRECTOR, INSURER_DEMO. Demo correo `atlas|admin|caja|auditor|direccion|aseguradora@demo.atlaslink.mx`.

## Cuentas

`GET /accounts?status=&lane=&search=` → `[{id,folio,patientReference,insurer,insurerId,admissionDate,dischargeDate,total,lane,status,anomalyCount,assignedTo,createdAt,version}]`. `GET /accounts/{id}` agrega `policyNumber,diagnosis,policy:{deductible,coinsuranceRate,coinsuranceCap,coverageAvailable},lines,evaluation,history`.

Línea `{id,code,description,category,quantity,unitPrice,total,status,reason,justification}`. Evaluación `{billedTotal,excludedTotal,tariffAdjustment,deductible,coinsurance,insurerEstimate,patientEstimate,unresolvedAmount,lane,findings:[{lineId,code,message,severity,amount}],agreementVersion,engineVersion,createdAt}`. Historial `{id,action,actor,createdAt,detail}`.

`POST /accounts` recibe `{folio,patientReference,insurerId,admissionDate,dischargeDate,policyNumber,diagnosis,policy:{deductible,coinsuranceRate,coinsuranceCap,coverageAvailable},lines:[{code,description,category,quantity,unitPrice}]}`. Header `Idempotency-Key` obligatorio, UUID generado por navegador; devuelve cuenta evaluada. Policy opcional → revisión sin asignar responsabilidad no comprobada. `GET /insurers` → `[{id,name,code}]`.

`PATCH /accounts/{id}/lines/{lineId}` recibe `{version,quantity,unitPrice,justification,removed?}`; exige justificación, responsable de revisión y reevaluar después.

`POST /accounts/{id}/claim {version}`, `/evaluate {version}`, `/ready {version,acceptRisk?:boolean,reason?:string}`, `/send {version}` y `/outcome {version,result,authorizedAmount,reason}`. Estados RECEIVED,EVALUATED,IN_REVIEW,READY,SENT,RESOLVED. Result APPROVED,ADJUSTED,REJECTED. Los hallazgos financieros no desaparecen por justificar; aceptación explícita de riesgo requerida para preparar una cuenta con alertas.

`GET /accounts/{id}/export?format=xlsx|csv|pdf` descarga formato genérico de demostración. `GET /accounts/template` descarga plantilla XLSX; `POST /accounts/import` multipart `file`, Idempotency-Key obligatorio. Plantilla una cuenta, encabezados repetidos por línea: folio,patientReference,insurerCode,admissionDate,dischargeDate,policyNumber,diagnosis,code,description,category,quantity,unitPrice,deductible,coinsuranceRate,coinsuranceCap,coverageAvailable. Límite 2MB/1000 líneas. Fechas YYYY-MM-DD; cantidades y precios numéricos. Sin fórmulas.

## Operación y administración

`GET /dashboard` → `{totalAccounts,pendingReview,readyToSend,totalBilled,insurerEstimate,patientEstimate,unresolvedAmount,byLane:{GREEN,YELLOW,RED},recentAccounts,monthly:[{label,total,count}],activity:[{id,action,actor,createdAt,detail}],activeTenants?,activeLicenses?,monthlyCapacity?,leadsCount?}`. Métricas solo del tenant, plataforma ve métricas de licencias y agregados sin detalle paciente.

`GET /agreements` → `[{id,name,insurerId,insurer,version,status,validFrom,validTo,rules,createdAt}]`; rules `{tariffs:{"CODE":money},excludedCodes:["CODE"],maxQuantities:{"CODE":number},highRiskThreshold:money}`. `POST /agreements {name,insurerId,validFrom,validTo,rules}` crea DRAFT. `POST /agreements/{id}/publish` publica inmutable. Solo HOSPITAL_ADMIN. `GET /users` → `[{id,name,email,role,active,createdAt}]`; `POST /users {name,email,role,password}`; `PATCH /users/{id} {active,role}` solo HOSPITAL_ADMIN (mismo tenant) o PLATFORM_ADMIN (usuarios plataforma).

`GET /tenants` → `[{id,name,slug,status,createdAt,accountCount,userCount}]`; `POST /tenants {name,slug}` crea tenant y licencia TRIAL. `GET /licenses` → `[{id,tenantId,tenantName,plan,status,monthlyAccountLimit,seatLimit,startsAt,expiresAt,usedAccounts,version}]`; `PATCH /licenses/{id} {version,plan,status,monthlyAccountLimit,seatLimit,expiresAt}`. Solo PLATFORM_ADMIN. `GET /audit` → historial del ámbito autenticado. `POST /leads {name,email,organization,message,consent:true}` público, persiste solicitud (no envía correo). `GET /leads` solo PLATFORM_ADMIN.

Plataforma no accede a cuentas hospitalarias. DIRECTOR e INSURER_DEMO solo lectura; aseguradora solo tenant sintético. HOSPITAL_ADMIN administra y realiza operaciones del hospital. BILLING ingesta, exporta, marca envío y resultado. REVIEWER ingesta, toma/corrige/evalúa/prepara/exporta. Licencias vencidas/suspendidas bloquean escrituras hospitalarias, conservan lectura/exportación.


## Paginación, reportes y evidencia de evaluación

`GET /accounts/page?offset=0&limit=25&status=EVALUATED,IN_REVIEW&lane=&search=` devuelve `{items,total,offset,limit}`. Los filtros y conteos se aplican en PostgreSQL al hospital autenticado; no filtran únicamente una página en el navegador. El endpoint anterior `/accounts` mantiene su límite200 por compatibilidad.

`GET /accounts/report?from=YYYY-MM-DD&to=YYYY-MM-DD&insurerId=UUID` calcula todo el ámbito filtrado y devuelve `{totalAccounts,totalBilled,greenCount,resolvedCount,byLane,byInsurer:[{insurerId,name,count,total,green,pending}]}`. Fechas de recepción en America/Mexico_City, extremos inclusivos por día. Solo administración/dirección.

`GET /accounts/{id}/evaluations?offset=0&limit=50` lista las evaluaciones de la cuenta (limit de1 a200, offset de0 a1000000); orden descendente por fecha e ID. `GET /accounts/{id}/evaluations/{evaluationId}` entrega entradas, reglas y resultado congelados, trazas y hash del código del motor. La evidencia nueva no puede modificarse. Las evaluaciones anteriores aV3 indican falta de snapshot; no se fabrica información histórica. La selección inicial del convenio usa la fecha de ingreso y las reevaluaciones conservan el convenio fijado.

## Importación de tabuladores

`GET /agreements/template` entrega una plantilla XLSX de cuatro columnas: `code,unitPrice,maxQuantity,excluded`. Entre1 y1000 conceptos; 2MB comprimidos y12MB expandidos, sin fórmulas ni columnas ocultas adicionales.

`POST /agreements/preview` multipart `file` devuelve `{valid,checksum,rowCount,errors:[{row,column,message}],rules,sample}` sin guardar el convenio. Hasta100 errores y12 filas de muestra.

`POST /agreements/import` multipart `file,name,insurerId,validFrom,validTo,expectedHash,highRiskThreshold?` vuelve a leer y validar el archivo y su checksum. Solo si es válido crea todo el convenio en DRAFT dentro de una transacción. No publica automáticamente. Publicar exige vigencia sin solaparse con otro convenio publicado de la misma aseguradora/hospital. Solo HOSPITAL_ADMIN con licencia activa.

## JSON Schema

El contrato de entrada versionado está publicado en `/contracts/account-v1.schema.json`; fuente y ejemplo en `docs/contracts/`. Describe la API síncrona implementada y las validaciones adicionales que debe aplicar el servidor.
