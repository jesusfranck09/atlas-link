# Atlas Link — Árbol de Alcance del MVP

_Creado: 2026-09-23 21:38:14 UTC_

Este documento describe cada sección del MVP de Atlas Link: por qué se llama así, qué hace exactamente, qué recibe, qué entrega, de qué depende y qué queda fuera. Es el resultado de la sesión de definición de alcance y sirve como base para dimensionar el esfuerzo contra el calendario de 4 meses.

Los nombres de sección, tablas, estados y códigos que aparecen aquí son una **propuesta de diseño**. Deben validarse con el equipo antes de implementarse.

## Índice

- [Decisiones de alcance tomadas](#decisiones-de-alcance-tomadas)
- [Árbol completo](#árbol-completo)
- [Cómo leer este documento](#cómo-leer-este-documento)
- [1. Ingesta hospital (ingestion)](#1-ingesta-hospital-ingestion)
- [2. Contrato de datos (contract)](#2-contrato-de-datos-contract)
- [3. Convenios y tabuladores (agreements)](#3-convenios-y-tabuladores-agreements)
- [4. Motor de reglas (rules)](#4-motor-de-reglas-rules)
- [5. Revisión interna (review)](#5-revisión-interna-review)
- [6. Paquete de salida (export)](#6-paquete-de-salida-export)
- [7. Identidad y roles (identity)](#7-identidad-y-roles-identity)
- [8. Periféricos (notifications)](#8-periféricos-notifications)
- [9. Seguridad y cumplimiento](#9-seguridad-y-cumplimiento)
- [10. Frontend Angular (portal)](#10-frontend-angular-portal)
- [11. Infraestructura y DevOps](#11-infraestructura-y-devops)
- [Fuera del MVP: Fase Expand](#fuera-del-mvp-fase-expand)
- [Pendientes de discovery](#pendientes-de-discovery)

---

## Decisiones de alcance tomadas

| Tema | Decisión |
| :--- | :--- |
| Naturaleza del MVP | Pre-auditoría del lado del hospital. El hospital sigue subiendo las cuentas a los portales de cada aseguradora; Atlas Link las revisa antes. |
| Origen de las reglas | Los convenios que el hospital ya tiene firmados con cada aseguradora. |
| Aseguradoras en el piloto | 2 o 3. |
| Hospitales en el piloto | 1, con arquitectura multi-tenant desde el día uno. |
| Equipo | Adrian + 1 o 2 desarrolladores. |
| Roles | Caja/facturación, dictaminador del hospital, dirección del hospital, administrador de Atlas Link, dictaminador de aseguradora (solo lectura, datos demo). |
| Ingesta | Drag-and-drop de Excel + endpoint REST genérico. SFTP y DB polling esperan a conocer el ERP del hospital. |
| Backend | Java + Spring Boot, monolito modular (Spring Modulith). |
| Base de datos | PostgreSQL en Cloud SQL. |
| Reglas | Validaciones fijas en código Java + parámetros por convenio en tablas. |
| Colas | Google Cloud Pub/Sub. Sin n8n en ninguna parte del sistema. |
| Identidad | Google Identity Platform. |
| Frontend | Angular + CSS puro (sin Tailwind ni librería de componentes), con Angular CDK. |

---

## Árbol completo

```
Atlas Link (MVP) — Pre-auditoría hospitalaria · 1 hospital, arquitectura multi-tenant
Java 21 · Spring Boot · Spring Modulith · PostgreSQL (Cloud SQL) · Angular + CSS puro · GCP

├── 1. Ingesta hospital                         [ingestion]
│   ├── 1.1 Portal drag-and-drop (.xlsx)
│   ├── 1.2 Endpoint REST genérico
│   ├── 1.3 Registro de recepción y deduplicación
│   └── 1.4 SFTP · DB polling (post-discovery del ERP)
├── 2. Contrato de datos                        [contract]
│   ├── 2.1 Esquema JSON versionado
│   ├── 2.2 Modelo canónico (incluye parámetros de póliza)
│   ├── 2.3 Mapeadores de entrada
│   └── 2.4 Dictamen de salida
├── 3. Convenios y tabuladores                  [agreements]
│   ├── 3.1 Convenio y versiones con vigencia
│   ├── 3.2 Parámetros por tipo de regla
│   ├── 3.3 Catálogos y homologación de códigos
│   └── 3.4 Carga masiva
├── 4. Motor de reglas                          [rules]
│   ├── 4.1 Resolución del convenio aplicable
│   ├── 4.2 Validadores (lista cerrada)
│   ├── 4.3 Cálculo financiero estimado
│   ├── 4.4 Clasificador Verde / Amarillo / Rojo
│   └── 4.5 Traza de evaluación
├── 5. Revisión interna                         [review]
│   ├── 5.1 Bandeja del dictaminador del hospital
│   ├── 5.2 Corrección y justificación de líneas
│   ├── 5.3 Re-evaluación
│   └── 5.4 Máquina de estados de la cuenta
├── 6. Paquete de salida                        [export]
│   ├── 6.1 Exportador por aseguradora
│   └── 6.2 Registro del resultado real
├── 7. Identidad y roles                        [identity]
│   ├── 7.1 Google Identity Platform (tenant por hospital)
│   ├── 7.2 Spring Security y aislamiento por tenant
│   ├── 7.3 Administración de usuarios
│   ├── 7.4 Matriz de roles (RBAC)
│   └── 7.5 Credencial de servicio para el endpoint REST
├── 8. Periféricos                              [notifications]
│   ├── 8.1 Notificaciones operativas
│   └── 8.2 Generación de PDF
├── 9. Seguridad y cumplimiento
│   ├── 9.1 Cifrado
│   ├── 9.2 Retención de 30 días
│   ├── 9.3 Log de auditoría append-only
│   └── 9.4 Obligaciones de protección de datos
├── 10. Frontend Angular                        [portal]
│   ├── 10.1 Base de la aplicación
│   ├── 10.2 Sistema de diseño propio en CSS puro
│   └── 10.3 Vistas por rol
└── 11. Infraestructura y DevOps
    ├── 11.1 Servicios de GCP
    ├── 11.2 CI/CD
    ├── 11.3 Ambientes
    ├── 11.4 Generador de datos sintéticos
    └── 11.5 Observabilidad

⇢ Fase Expand: SFTP/polling, conectores de aseguradora, dictamen oficial, Carta Finiquito
Pendientes de discovery: ver sección final
```

---

## Cómo leer este documento

Cada sección tiene la misma estructura:

- **Por qué se llama así:** el origen del nombre y la razón por la que existe como sección separada.
- **Qué hace:** su función general dentro del sistema.
- **Ficha:** qué recibe, qué entrega, quién la usa, de qué depende y qué **no** hace.
- **Subsecciones:** el detalle concreto de cada elemento del árbol.

Los nombres entre paréntesis (`ingestion`, `rules`, etc.) son los nombres de los módulos en el código. Van en inglés por convención de programación: así paquetes, clases y carpetas son consistentes con Spring y con el resto del ecosistema. Spring Modulith usa esos nombres para verificar que los módulos no se llamen entre sí saltándose sus interfaces públicas.

---

## 1. Ingesta hospital (ingestion)

**Por qué se llama así.** "Ingesta" es el término técnico estándar para la entrada de datos a un sistema. "Hospital" porque en el MVP es el único origen: la aseguradora no envía nada a Atlas Link. Los documentos del proyecto llaman a esta etapa "primera milla", el tramo entre el sistema del hospital y Atlas Link. Es una sección separada porque cada hospital tendrá una madurez tecnológica distinta, y aislar la entrada permite agregar vías nuevas sin tocar el motor.

**Qué hace.** Recibe la cuenta del paciente cuando se firma el alta, verifica que sea legible y completa, evita duplicados y la entrega al módulo de contrato para convertirla al formato interno. No juzga si la cuenta está bien o mal cobrada; eso es trabajo del motor.

| Ficha | |
| :--- | :--- |
| Recibe | Archivo `.xlsx` (portal) o JSON por HTTP (endpoint REST). |
| Entrega | Una cuenta aceptada para evaluación, o un reporte de errores por fila/campo. |
| La usa | Caja/facturación (portal); el ERP del hospital (REST). |
| Depende de | `contract` (formato canónico), `identity` (quién envía). |
| No hace | Evaluar la cuenta, guardar el archivo original, modificar datos del ERP. |

### 1.1 Portal drag-and-drop (.xlsx)

El cajero exporta la cuenta desde su sistema a Excel y la arrastra al portal. El backend recibe el archivo como `multipart/form-data` y lo lee con Apache POI **en memoria**. Para archivos grandes se usa el modo de lectura por eventos (streaming) de POI, que no carga todo el libro a la vez. El archivo nunca se escribe en disco; al terminar de leerlo, los bytes se descartan.

Validaciones concretas antes de aceptar:

- Tipo de archivo y tamaño máximo (por ejemplo 10 MB, a definir).
- Presencia de las hojas y columnas esperadas.
- Tipos de dato: cantidades numéricas positivas, precios con máximo dos decimales, fechas válidas.
- Campos obligatorios del encabezado: póliza, aseguradora, fechas de ingreso y egreso, diagnóstico principal.

Los errores se devuelven por fila y columna, por ejemplo: `Fila 37, columna "Cantidad": valor vacío`. El cajero corrige su Excel y vuelve a subirlo.

Punto clave: cada hospital exporta su Excel con columnas distintas. Por eso existe una **plantilla de mapeo por hospital**, configurada una sola vez por el administrador, que indica qué columna del Excel corresponde a qué campo canónico (por ejemplo, la columna "Cant." es `quantity`).

### 1.2 Endpoint REST genérico

Un endpoint `POST /api/v1/accounts` que recibe el JSON ya en formato canónico. Existe porque, cuando se conozca el ERP del hospital, un endpoint listo reduce la integración a que el ERP (o un script del hospital) haga una llamada HTTP. Sale casi gratis: el parser de Excel ya produce ese mismo JSON.

Comportamiento concreto:

- Responde `202 Accepted` con el identificador de la cuenta y la procesa de forma asíncrona. El resultado se consulta después o se notifica.
- Exige una **llave de idempotencia** (`Idempotency-Key`) para que, si el ERP reintenta por un error de red, no se creen dos cuentas iguales.
- Se autentica con una credencial de servicio, no con usuario y contraseña (ver [7. Identidad y roles](#7-identidad-y-roles-identity)).

### 1.3 Registro de recepción y deduplicación

Cada cuenta recibida genera un registro: quién la envió, cuándo, por qué vía, cuántas líneas traía y un hash SHA-256 del contenido. El hash sirve para detectar que la misma cuenta se subió dos veces (por ejemplo, un cajero que arrastra el mismo Excel dos veces). En ese caso el sistema avisa en lugar de crear un duplicado.

### 1.4 SFTP y DB polling (post-discovery del ERP)

Se mantienen en el árbol pero **fuera del MVP inicial**. El SFTP detecta archivos que el ERP deja en una carpeta segura; el DB polling consulta periódicamente una vista de solo lectura en la base del ERP. Ambos dependen de saber qué ERP usa el hospital, qué exporta y si su área de TI permite esas conexiones. Construirlos antes sería invertir en canales que quizá nunca se usen.

---

## 2. Contrato de datos (contract)

**Por qué se llama así.** Un "contrato" es un acuerdo formal entre dos partes. Aquí el acuerdo es sobre la forma de los datos: si el hospital envía esta estructura, Atlas Link responde con esta otra. Es una sección separada porque el contrato es lo que todos los demás módulos comparten; si cada módulo interpretara los datos a su manera, el sistema sería frágil.

**Qué hace.** Define un **modelo canónico** (un solo formato interno para toda cuenta), traduce cada vía de entrada a ese modelo y define la forma del dictamen de salida. Gracias a esto, el motor de reglas nunca sabe ni necesita saber si la cuenta vino de un Excel o de una API.

| Ficha | |
| :--- | :--- |
| Recibe | Datos crudos ya leídos por `ingestion`. |
| Entrega | Una cuenta en modelo canónico; el formato del dictamen de salida. |
| La usa | Todos los módulos del backend. |
| Depende de | `agreements` (catálogos para validar códigos). |
| No hace | Aplicar reglas de negocio ni decidir carriles. |

### 2.1 Esquema JSON versionado

El contrato se publica como un JSON Schema con versión (`v1`). Reglas de versionado:

- Agregar un campo **opcional** es un cambio compatible: no cambia la versión mayor.
- Quitar un campo, renombrarlo o volverlo obligatorio es un cambio incompatible: se publica `v2` y `v1` sigue funcionando un tiempo.

Esto protege a quien ya esté integrado cuando el contrato evolucione.

### 2.2 Modelo canónico (incluye parámetros de póliza)

La cuenta canónica tiene cuatro bloques:

- **Encabezado:** hospital (`tenant_id`), aseguradora, número de póliza, identificador del paciente (seudonimizado, nunca nombre completo en este bloque), número de siniestro o autorización si existe.
- **Datos clínicos:** fecha y hora de ingreso y egreso, diagnóstico principal CIE-10, diagnósticos secundarios, procedimientos, días de estancia por tipo de área (habitación, terapia intermedia, terapia intensiva).
- **Parámetros de la póliza del paciente:** deducible, porcentaje de coaseguro, tope de coaseguro y suma asegurada disponible. Este bloque es necesario porque **el deducible y el coaseguro dependen de la póliza de cada paciente, no del convenio del hospital**. En el piloto los captura el hospital a partir de la carta de autorización de la aseguradora.
- **Líneas de cargo:** código interno del hospital, categoría (farmacia, material, honorarios, estancia, estudios), descripción, cantidad, precio unitario, total y fecha del cargo.

Normalizaciones que aplica el modelo:

- Montos en decimal exacto con dos decimales (`BigDecimal` en Java; nunca `double`, que introduce errores de redondeo en dinero).
- Fechas en ISO 8601 con zona horaria `America/Mexico_City`.
- Códigos en mayúsculas y sin espacios.
- Verificación aritmética: el total de cada línea debe ser cantidad × precio unitario.

### 2.3 Mapeadores de entrada

Clases que traducen cada fuente al modelo canónico: `ExcelAccountMapper` (usa la plantilla de mapeo del hospital, ver 1.1) y `RestAccountMapper`. Cuando se agregue SFTP o DB polling, solo se escribe un mapeador nuevo; el motor no cambia.

### 2.4 Dictamen de salida

Es la respuesta de Atlas Link sobre una cuenta evaluada:

- `status`: `GREEN`, `YELLOW` o `RED`.
- Resumen financiero estimado: total facturado, monto excluido, ajuste por tabulador, deducible, coaseguro, estimado a cargo de la aseguradora y estimado a cargo del paciente.
- Resultado por línea: aceptada o con anomalía, código del motivo (por ejemplo `PRECIO_SOBRE_TABULADOR`) y descripción legible.
- Identificador de la evaluación y versión del convenio aplicado, para trazabilidad.

El dictamen es una **pre-auditoría**, no una autorización de pago. El texto que vea el usuario debe dejarlo claro.

---

## 3. Convenios y tabuladores (agreements)

**Por qué se llama así.** Son los términos que usa el propio sector. Un **convenio** es el acuerdo comercial entre el hospital y una aseguradora (precios pactados, condiciones, exclusiones). Un **tabulador** es la lista de precios y honorarios máximos que forma parte de ese convenio. Es una sección separada porque decidiste que las reglas salen de los convenios del hospital: sin este módulo, el motor no tiene contra qué comparar.

**Qué hace.** Guarda y administra toda la información que el motor necesita para evaluar: aseguradoras, convenios, sus versiones en el tiempo, los parámetros de cada regla y los catálogos que sirven como diccionario común.

| Ficha | |
| :--- | :--- |
| Recibe | Convenios y tabuladores que el hospital entrega (normalmente en Excel o PDF). |
| Entrega | Parámetros vigentes para una aseguradora y una fecha dadas. |
| La usa | Administrador de Atlas Link. |
| Depende de | `identity` (solo el administrador puede modificar). |
| No hace | Evaluar cuentas; negociar ni validar legalmente los convenios. |

### 3.1 Convenio y versiones con vigencia

Estructura propuesta de tablas:

- `insurer`: la aseguradora (GNP, AXA, MetLife, etc.).
- `agreement`: el convenio entre un hospital y una aseguradora.
- `agreement_version`: cada versión del convenio, con `valid_from`, `valid_to` y estado (`DRAFT` o `PUBLISHED`).

Reglas:

- Una versión publicada **no se modifica nunca**. Cualquier cambio crea una versión nueva.
- Una cuenta se evalúa con la versión vigente en la **fecha de ingreso** del paciente. Una cuenta de agosto se evalúa con el convenio de agosto, aunque en septiembre haya cambiado.

Ambas reglas existen por auditoría: si alguien pregunta dentro de seis meses por qué una cuenta salió en verde, se puede reconstruir exactamente con qué parámetros se evaluó.

### 3.2 Parámetros por tipo de regla

Cada tipo de validación del motor tiene su propia tabla de parámetros, colgada de `agreement_version`:

| Tabla | Qué guarda | Ejemplo |
| :--- | :--- | :--- |
| `tariff_item` | Precio máximo pactado por código | Paracetamol 1 g IV: máximo $150.00 |
| `quantity_cap` | Cantidad máxima por evento o por día, opcionalmente condicionada a un procedimiento | Gasas: máximo 3 por colecistectomía |
| `exclusion` | Códigos o categorías que el convenio no cubre | Artículos personales, llamadas, alimentos de acompañante |
| `coherence_rule` | Qué procedimientos son coherentes con qué diagnósticos, y qué insumos se esperan para cada procedimiento | Apendicitis (K35.x) → apendicectomía |
| `lane_threshold` | Umbrales que deciden el carril | Anomalías menores hasta $2,000 o 2 % del total → amarillo |

### 3.3 Catálogos y homologación de códigos

- **CIE-10:** catálogo de diagnósticos, en la versión que usa el sector salud en México.
- **Procedimientos:** los documentos del proyecto usan CPT. Hay que confirmar qué codificación usan realmente las aseguradoras del piloto, y tomar en cuenta que el uso comercial de CPT requiere licencia de la American Medical Association.
- **Insumos y servicios:** catálogo propio de Atlas Link.

La **homologación** resuelve un problema concreto: cada hospital usa sus propios códigos internos (por ejemplo `GASA-10X10-EST`) y cada aseguradora los suyos. La tabla de homologación dice que el código del hospital corresponde a tal elemento del catálogo. Una línea sin homologar no se puede evaluar y se marca como anomalía (`CODIGO_SIN_HOMOLOGAR`). Construir esta tabla para el hospital piloto es trabajo de datos, no de programación, y conviene planearlo como tal.

### 3.4 Carga masiva

Un tabulador puede tener miles de renglones; nadie los va a capturar a mano. El flujo es:

1. El administrador descarga una plantilla Excel por tipo de parámetro.
2. La llena con la información del convenio y la sube.
3. El sistema muestra una vista previa: "se cargarán 3,412 precios; 12 renglones tienen error" con el detalle de cada error.
4. Si confirma, la carga es transaccional: entra todo o no entra nada. El resultado queda en una versión en estado `DRAFT`.
5. El administrador revisa y publica la versión.

La estructura de las tablas se versiona con migraciones Flyway, de modo que cada ambiente tiene exactamente el mismo esquema.

---

## 4. Motor de reglas (rules)

**Por qué se llama así.** "Motor" porque es el componente que ejecuta la lógica: recibe una cuenta, aplica reglas y produce un resultado. Es el cerebro del producto. El semáforo no es el motor, sino su resultado. Es una sección separada porque es lo que más debe protegerse de cambios accidentales: su comportamiento tiene que ser predecible y comprobable.

**Qué hace.** Evalúa cada cuenta contra el convenio vigente, línea por línea, calcula el reparto estimado entre aseguradora y paciente, asigna el carril y deja registro exacto de por qué.

| Ficha | |
| :--- | :--- |
| Recibe | Una cuenta en modelo canónico. |
| Entrega | Un dictamen (carril + resultado por línea + cálculo financiero) y su traza. |
| La usa | Nadie directamente; lo invocan `ingestion` (primera evaluación) y `review` (re-evaluación). |
| Depende de | `contract`, `agreements`. |
| No hace | Usar IA ni modelos probabilísticos; modificar la cuenta; autorizar pagos. |

### 4.1 Resolución del convenio aplicable

Con la aseguradora de la póliza y la fecha de ingreso, busca la versión publicada del convenio vigente en esa fecha. Si no existe, la cuenta va directo a **rojo** con el motivo `SIN_CONVENIO_VIGENTE`. No se inventa ni se adivina un convenio.

### 4.2 Validadores (lista cerrada)

Cada validador es una clase Java con una sola responsabilidad. Lee sus parámetros de las tablas de la sección 3.2 y devuelve, por línea, uno de tres resultados: `OK`, `ANOMALIA_MENOR` o `ANOMALIA_MAYOR`, con un código de motivo.

Propuesta inicial de la lista:

| Validador | Qué revisa | Ejemplo de anomalía |
| :--- | :--- | :--- |
| `ArithmeticValidator` | Total = cantidad × precio unitario | Línea con total mal calculado |
| `CodeMappingValidator` | Que el código esté homologado | Código del hospital sin equivalente |
| `TariffPriceValidator` | Precio unitario ≤ tabulador | Paracetamol cobrado a $220 con tabulador de $150 |
| `QuantityCapValidator` | Cantidad ≤ tope | 5 cajas de gasas con tope de 3 |
| `ExclusionValidator` | Que el concepto esté cubierto | Cargo de llamadas telefónicas |
| `DiagnosisProcedureValidator` | Procedimiento coherente con diagnóstico | Procedimiento sin relación con el diagnóstico |
| `SupplyCoherenceValidator` | Insumo esperado para el procedimiento | Insumo de cirugía cardíaca en una apendicectomía |
| `StayLengthValidator` | Días de estancia razonables para el procedimiento | 9 días en una cirugía ambulatoria |
| `ValidityValidator` | Fechas dentro de la vigencia de póliza y convenio | Ingreso anterior al inicio de la póliza |

"Lista cerrada" significa que un tipo de regla nuevo es **trabajo de desarrollo**: una clase nueva, con sus pruebas y su tabla de parámetros. En cambio, cambiar un precio o un tope es **configuración** y no requiere programar. Esta diferencia debe quedar clara en la venta para no prometer "todo configurable".

### 4.3 Cálculo financiero estimado

Orden de cálculo propuesto:

1. Total facturado.
2. Menos montos excluidos.
3. Ajuste de precios al tabulador (lo que exceda el precio pactado no se reconoce).
4. Aplicación del deducible de la póliza.
5. Aplicación del coaseguro, respetando su tope.
6. Resultado: estimado a cargo de la aseguradora y estimado a cargo del paciente.

Todo con `BigDecimal` y redondeo a centavos con una regla fija y documentada (por ejemplo, redondeo al medio hacia arriba). El resultado se muestra siempre como **estimación**, porque el monto definitivo lo decide la aseguradora.

### 4.4 Clasificador Verde / Amarillo / Rojo

Reglas de asignación, con umbrales configurables por convenio (`lane_threshold`):

- **Verde:** todas las líneas en `OK`.
- **Amarillo:** solo hay anomalías menores y su monto total queda por debajo del umbral.
- **Rojo:** cualquier anomalía mayor, convenio no encontrado, monto de anomalías por encima del umbral, estancia en terapia intensiva, o procedimiento incluido en la lista de alta complejidad del convenio.

### 4.5 Traza de evaluación

Cada evaluación guarda:

- Identificador de la evaluación y de la cuenta.
- Versión del convenio aplicada.
- Versión del motor (el identificador del commit del código desplegado).
- Por cada línea: qué validadores corrieron, con qué parámetros y qué resultado dieron.

Con eso se cumple la promesa central del producto: **la misma cuenta, con la misma versión de convenio y la misma versión del motor, siempre da el mismo resultado**, y siempre se puede explicar por qué. Esta propiedad debe tener una prueba automática que re-evalúe cuentas guardadas y compare resultados.

---

## 5. Revisión interna (review)

**Por qué se llama así.** "Interna" porque la hace el dictaminador **del hospital**, antes de enviar la cuenta. El nombre la distingue del dictamen oficial de la aseguradora, que en el MVP sigue ocurriendo fuera de Atlas Link. Es una sección separada porque es donde está el valor del MVP: corregir la objeción antes de que la aseguradora la haga, en lugar de esperar horas a que la rechace.

**Qué hace.** Gestiona el trabajo humano sobre las cuentas en amarillo y rojo, registra cada corrección y controla por qué etapas pasa cada cuenta.

| Ficha | |
| :--- | :--- |
| Recibe | Cuentas evaluadas en amarillo o rojo. |
| Entrega | Cuentas corregidas y marcadas como listas para envío. |
| La usa | Dictaminador del hospital (y caja para consultar). |
| Depende de | `rules` (re-evaluación), `identity`. |
| No hace | Editar el expediente clínico ni las notas médicas; comunicarse con la aseguradora. |

### 5.1 Bandeja del dictaminador del hospital

Lista de cuentas pendientes de revisión con filtros por carril, aseguradora y antigüedad, ordenada por tiempo transcurrido desde el alta firmada. Muestra un contador de tiempo por cuenta, porque el objetivo del producto es reducir ese tiempo.

Para evitar que dos dictaminadores trabajen la misma cuenta, uno la **toma** y queda asignada a su nombre. Técnicamente se protege con bloqueo optimista (un número de versión en el registro que impide que dos cambios simultáneos se pisen).

### 5.2 Corrección y justificación de líneas

En amarillo, la pantalla muestra solo las líneas con anomalía. En rojo, la cuenta completa ya estructurada. Por cada línea, el dictaminador puede:

- **Corregir** cantidad o precio, indicando un motivo.
- **Justificar**, agregando un texto que referencia la nota médica que respalda el cargo (el texto, no el expediente).
- **Retirar** el cargo de la cuenta.
- **Aceptar el riesgo**, es decir, enviarla tal cual sabiendo que puede ser objetada.

Cada acción queda registrada con usuario, fecha, valor anterior y valor nuevo.

### 5.3 Re-evaluación

Después de corregir, la cuenta vuelve a pasar por el motor con la **misma versión del convenio**. La nueva evaluación queda enlazada con la anterior, de modo que se ve el historial completo: cómo llegó, qué se corrigió y cómo quedó.

### 5.4 Máquina de estados de la cuenta

Estados propuestos:

```
RECIBIDA ─> EVALUADA ─┬─> (verde) ──────────────────────> LISTA_PARA_ENVIO ─> ENVIADA ─> RESULTADO_REGISTRADO
                      └─> (amarillo/rojo) ─> EN_REVISION ─┘
RECHAZADA_EN_INGESTA (error de formato; el hospital corrige y vuelve a subir)
```

Cada transición tiene reglas: solo el dictaminador pasa una cuenta de `EN_REVISION` a `LISTA_PARA_ENVIO`; solo caja marca `ENVIADA` y registra el resultado. Cada transición guarda su fecha y hora. De esas marcas de tiempo salen el tablero en tiempo real y las métricas de la dirección (por ejemplo, tiempo promedio entre recepción y lista para envío).

---

## 6. Paquete de salida (export)

**Por qué se llama así.** "Paquete" porque lo que sale es un conjunto listo para entregar: la cuenta revisada, en el formato que exige cada aseguradora. "Salida" como contraparte de la ingesta. Es una sección separada porque cada aseguradora pide un formato distinto y esos formatos cambiarán; aislarlos evita que un cambio de GNP afecte a AXA.

**Qué hace.** Genera el archivo que el personal del hospital sube al portal de cada aseguradora y registra qué respondió la aseguradora.

| Ficha | |
| :--- | :--- |
| Recibe | Cuentas en estado `LISTA_PARA_ENVIO`. |
| Entrega | Archivo por aseguradora; registro del resultado real. |
| La usa | Caja/facturación. |
| Depende de | `review`, `agreements` (códigos de la aseguradora). |
| No hace | Enviar nada a la aseguradora; conectarse a sus portales. |

### 6.1 Exportador por aseguradora

Una clase por aseguradora que sabe armar su formato: columnas, orden, códigos propios de esa aseguradora (vía homologación) y tipo de archivo (Excel, CSV o PDF). Incluye las justificaciones capturadas en la revisión, que es justo lo que evita la objeción. Los formatos exactos dependen del discovery con el hospital piloto.

### 6.2 Registro del resultado real

Cuando la aseguradora responde, caja registra en Atlas Link:

- Resultado: aprobada, aprobada con ajustes u objetada.
- Monto autorizado.
- Motivo de la objeción, elegido de un catálogo.
- Fecha y hora de la respuesta.

Con esos datos se calculan las métricas que venderán la fase Expand: porcentaje de cuentas en verde que la aseguradora aprobó sin objeción (precisión del semáforo), objeciones evitadas, tiempo total de alta y motivos de objeción más frecuentes. Estos últimos sirven también para ajustar los parámetros del convenio.

---

## 7. Identidad y roles (identity)

**Por qué se llama así.** "Identidad" responde a quién eres (autenticación). "Roles" responde a qué puedes hacer (autorización). Son dos preguntas distintas que el sistema resuelve por separado. Es una sección separada porque, con datos de salud y varios hospitales en la misma plataforma, un error de permisos es el peor error posible.

**Qué hace.** Controla el inicio de sesión, determina qué puede ver y hacer cada usuario, y garantiza que ningún hospital vea datos de otro.

| Ficha | |
| :--- | :--- |
| Recibe | Credenciales de usuarios y de sistemas. |
| Entrega | Un token con identidad, rol y hospital; decisiones de permiso en cada petición. |
| La usa | Todos; el administrador gestiona usuarios. |
| Depende de | Google Identity Platform. |
| No hace | Guardar contraseñas en la base de Atlas Link. |

### 7.1 Google Identity Platform (tenant por hospital)

Cada hospital es un **tenant** independiente dentro de Identity Platform, con sus propios usuarios. Los usuarios internos de Atlas Link (administradores) y el usuario de demostración de aseguradora viven en un tenant propio. Se recomienda activar autenticación de dos factores por el tipo de datos que se manejan. Al iniciar sesión, el usuario recibe un JWT con **custom claims**: su rol y su `tenant_id`.

### 7.2 Spring Security y aislamiento por tenant

El backend funciona como resource server: en cada petición verifica la firma del JWT, su emisor, su audiencia y su vigencia, y extrae rol y `tenant_id`. El aislamiento entre hospitales se aplica en dos capas:

- **Aplicación:** toda consulta filtra por el `tenant_id` del token.
- **Base de datos:** Row-Level Security de PostgreSQL, que hace que la propia base se niegue a devolver filas de otro tenant aunque el código tenga un error.

La segunda capa es la defensa en profundidad: protege incluso contra un bug.

### 7.3 Administración de usuarios

El administrador crea usuarios desde el portal. El backend usa el Admin SDK de Identity Platform para crearlos en el tenant correcto, asignarles rol y `tenant_id` como custom claims y enviarles la invitación. También permite desactivar usuarios, por ejemplo cuando alguien deja el hospital.

### 7.4 Matriz de roles (RBAC)

| Acción | Caja | Dictaminador hospital | Dirección | Admin Atlas Link | Dictaminador aseguradora (demo) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Subir cuentas | Sí | Sí | No | No | No |
| Ver tablero de cuentas | Sí | Sí | Sí | No | Solo datos demo |
| Tomar y corregir cuentas | No | Sí | No | No | No |
| Marcar lista para envío | No | Sí | No | No | No |
| Exportar paquete y registrar resultado | Sí | Sí | No | No | No |
| Ver reportes y métricas | No | No | Sí | Sí | No |
| Gestionar convenios y catálogos | No | No | No | Sí | No |
| Gestionar usuarios | No | No | No | Sí | No |

Esta matriz es una propuesta y debe validarse con el hospital piloto.

### 7.5 Credencial de servicio para el endpoint REST

El endpoint REST lo llama un sistema, no una persona, así que no puede usar usuario y contraseña. Necesita una credencial de servicio por hospital, rotable y revocable. El mecanismo exacto queda como pendiente de diseño (ver [Pendientes de discovery](#pendientes-de-discovery)).

---

## 8. Periféricos (notifications)

**Por qué se llama así.** "Periféricos" porque están fuera de la ruta crítica: si fallan o tardan, la evaluación de la cuenta no se detiene. Es el término que ya usan los documentos del proyecto. Es una sección separada precisamente para que un problema con el correo o con un PDF nunca bloquee un dictamen.

**Qué hace.** Ejecuta tareas en segundo plano a partir de eventos del sistema, a través de Google Cloud Pub/Sub.

| Ficha | |
| :--- | :--- |
| Recibe | Eventos: `CuentaEvaluada`, `CuentaRequiereRevision`, `CuentaListaParaEnvio`, entre otros. |
| Entrega | Correos de aviso y archivos PDF. |
| La usa | Indirectamente, todos los roles. |
| Depende de | Pub/Sub, un proveedor de correo transaccional (a definir), Cloud Storage. |
| No hace | Enviar datos clínicos por correo; usar n8n. |

### 8.1 Notificaciones operativas

Cuando ocurre un evento, el backend lo publica en Pub/Sub. Un suscriptor lo recibe y envía un correo con el formato "El folio 12345 requiere revisión. Entra al portal para verlo", **sin diagnósticos, montos ni nombres**. Si el envío falla, Pub/Sub reintenta; después de varios fallos, el mensaje pasa a una cola de mensajes fallidos (dead-letter) para revisión manual.

### 8.2 Generación de PDF

Genera el resumen de pre-auditoría: carril, líneas con anomalía, justificaciones y cálculo estimado. Se guarda en Cloud Storage y se comparte mediante **URLs firmadas que expiran** (por ejemplo, en 15 minutos), nunca con URLs públicas permanentes. Los PDFs también están sujetos a la regla de retención de la sección 9.2.

---

## 9. Seguridad y cumplimiento

**Por qué se llama así.** "Seguridad" es la protección técnica de los datos. "Cumplimiento" son las obligaciones legales en materia de protección de datos personales. No tiene nombre de módulo porque no vive en un solo lugar: atraviesa todo el sistema.

**Qué hace.** Protege los datos en tránsito y en reposo, limita cuánto tiempo se conservan, deja un registro inalterable de lo que ocurre y aterriza las obligaciones legales.

| Ficha | |
| :--- | :--- |
| Aplica a | Todos los módulos. |
| Responsable | Todo el equipo; conviene que una persona sea dueña del tema. |
| No hace | Sustituir la asesoría legal. |

### 9.1 Cifrado

- **En tránsito:** HTTPS en toda comunicación. El mínimo de versión de TLS se configura en el balanceador o en Cloud Run y debe verificarse en el despliegue contra el objetivo de TLS 1.3 de los documentos.
- **En reposo:** Cloud SQL y Cloud Storage cifran por defecto con AES-256. Opcionalmente se pueden usar llaves administradas por Atlas Link (CMEK con Cloud KMS) para tener control sobre la llave.

### 9.2 Retención de 30 días

Un job programado con Cloud Scheduler corre a diario y borra, para cuentas con más de 30 días desde su recepción: las líneas de cargo, los datos clínicos y los PDFs. Conserva:

- El hash SHA-256 del contenido original, que permite demostrar que una cuenta existió y no fue alterada sin guardar la información.
- Totales, carril, estados y marcas de tiempo, que alimentan las métricas y no contienen detalle clínico.

El hospital conserva sus originales en su propio ERP, así que Atlas Link no necesita ser un archivo histórico.

### 9.3 Log de auditoría append-only

Una tabla `audit_event` donde **solo se pueden agregar registros**. El usuario de la base con el que corre la aplicación tiene permiso de insertar, pero no de actualizar ni borrar. Registra: inicios de sesión, cambios en convenios, correcciones de líneas, cambios de estado, exportaciones y accesos al detalle de una cuenta. Opcionalmente, cada registro puede incluir el hash del anterior (encadenamiento), lo que vuelve evidente cualquier intento de manipulación.

### 9.4 Obligaciones de protección de datos

Puntos a resolver con asesoría legal:

- En este esquema, el hospital es el **responsable** de los datos del paciente y Atlas Link actúa como **encargado** que los trata por cuenta del hospital. Esto requiere un contrato de encargo entre ambos.
- Los datos de salud son datos sensibles y requieren consentimiento expreso del paciente, que normalmente obtiene el hospital en su aviso de privacidad.
- La LFPDPPP fue sustituida por una nueva ley en marzo de 2025, con cambios en la autoridad supervisora. Conviene confirmar con un abogado las obligaciones vigentes antes del piloto.

---

## 10. Frontend Angular (portal)

**Por qué se llama así.** Es la capa visible del sistema. "Portal" porque es la puerta de entrada web para los cinco roles. Es una sección separada porque, al haber elegido CSS puro sin librería de componentes, incluye su propio sistema de diseño, que es trabajo considerable.

**Qué hace.** Es la interfaz con la que cada rol trabaja: subir cuentas, revisarlas, administrar convenios y consultar métricas.

| Ficha | |
| :--- | :--- |
| Recibe | Datos del backend vía API REST, con el JWT del usuario. |
| Entrega | Pantallas por rol. |
| La usa | Los cinco roles. |
| Depende de | Backend, Identity Platform. |
| No hace | Tomar decisiones de seguridad; toda autorización real está en el backend. |

### 10.1 Base de la aplicación

- Angular con componentes standalone, Signals y el nuevo control flow.
- Rutas con carga diferida por área (cada rol descarga solo lo que usa).
- Un interceptor HTTP que agrega el JWT a cada petición y maneja la sesión expirada.
- Guards (`authGuard`, `roleGuard`) que impiden entrar a pantallas no autorizadas. Son una ayuda de usabilidad, no una barrera de seguridad: si alguien los evita, el backend igual rechaza la petición.
- Angular CDK para scroll virtual, overlays y accesibilidad de teclado, sin imponer estilos.

### 10.2 Sistema de diseño propio en CSS puro

- **Tokens:** variables CSS para color, tipografía, espaciado, bordes y sombras. Los colores del semáforo siempre van acompañados de ícono y texto, porque un usuario con daltonismo no distingue rojo de verde solo por color.
- **Tabla de datos:** el componente más costoso. Necesita scroll virtual (una cuenta puede tener miles de líneas), ordenamiento, filtros, encabezado fijo y resaltado de la línea anómala con su motivo.
- **Dropzone:** zona para arrastrar archivos, con validación de tipo y tamaño antes de subir y barra de progreso.
- **Formularios:** formularios reactivos con mensajes de error consistentes.
- **Modal:** construido sobre el overlay del CDK, con el foco atrapado dentro mientras está abierto.
- **Toast:** avisos breves de éxito o error.
- **Badge de semáforo:** indicador de carril reutilizable en tablas y detalle.

### 10.3 Vistas por rol

| Vista | Rol | Qué muestra | Acciones |
| :--- | :--- | :--- | :--- |
| Carga de cuentas | Caja | Dropzone e historial de cargas | Subir, ver errores por fila |
| Tablero | Caja, dictaminador, dirección | Cuentas por estado y carril, con tiempo transcurrido | Filtrar, abrir detalle |
| Bandeja de revisión | Dictaminador hospital | Cuentas amarillas y rojas pendientes | Tomar, corregir, justificar, re-evaluar |
| Detalle de cuenta | Caja, dictaminador | Líneas, resultado por línea, cálculo estimado, historial | Exportar paquete, registrar resultado |
| Convenios | Admin | Aseguradoras, convenios, versiones | Cargar, revisar, publicar |
| Usuarios | Admin | Usuarios por hospital | Crear, asignar rol, desactivar |
| Reportes | Dirección | Tiempo promedio de alta, porcentaje por carril, objeciones evitadas, precisión del semáforo | Filtrar por periodo y aseguradora |
| Demo aseguradora | Dictaminador aseguradora | Cuentas sintéticas con su dictamen | Solo lectura |

---

## 11. Infraestructura y DevOps

**Por qué se llama así.** "Infraestructura" es dónde corre el sistema. "DevOps" es cómo llega el código ahí de forma repetible y segura. Es una sección separada porque con un equipo de 2 o 3 personas, automatizar el despliegue es lo que permite dedicar el tiempo al producto y no a tareas manuales.

**Qué hace.** Aprovisiona los servicios en la nube, automatiza pruebas y despliegues, separa ambientes y permite saber qué está pasando en producción.

| Ficha | |
| :--- | :--- |
| Recibe | Código del repositorio. |
| Entrega | El sistema corriendo en cada ambiente. |
| La usa | El equipo de desarrollo. |
| No hace | Guardar datos clínicos en logs. |

### 11.1 Servicios de GCP

| Servicio | Uso en Atlas Link |
| :--- | :--- |
| Cloud Run | Ejecuta el backend en contenedores; escala según la carga y puede bajar a cero de noche. |
| Cloud SQL (PostgreSQL) | Base de datos transaccional. |
| Cloud Storage | PDFs y archivos temporales. |
| Pub/Sub | Colas de eventos para los periféricos. |
| Secret Manager | Contraseñas de base de datos, llaves y credenciales. |
| Identity Platform | Usuarios, tenants y tokens. |
| Cloud Scheduler | Job de retención y otras tareas programadas. |
| Cloud Logging y Monitoring | Logs, métricas y alertas. |

### 11.2 CI/CD

Cada cambio al repositorio pasa por un pipeline que:

1. Compila backend y frontend.
2. Corre pruebas unitarias.
3. Corre la verificación de Spring Modulith (que ningún módulo viole los límites de otro).
4. Corre pruebas de integración contra un PostgreSQL real en contenedor (Testcontainers).
5. Corre la prueba de reproducibilidad del motor (sección 4.5).
6. Construye la imagen y la despliega: automático a desarrollo, manual a staging, con aprobación explícita al piloto.

Las migraciones Flyway se aplican en cada despliegue. La herramienta (GitHub Actions o Cloud Build) queda por definir.

### 11.3 Ambientes

- **Desarrollo:** datos sintéticos; se despliega con cada cambio.
- **Staging:** misma configuración que el piloto, datos sintéticos; donde se valida antes de liberar.
- **Piloto:** datos reales del hospital, acceso restringido.

Se recomienda un proyecto de GCP por ambiente, para que un error en desarrollo no pueda tocar datos del piloto.

### 11.4 Generador de datos sintéticos

Genera cuentas realistas y coherentes por escenario: verde limpio, amarillo con exceso de gasas, rojo por estancia en terapia intensiva, sin convenio, con código sin homologar, etc. Se usa para tres cosas: la demo del dictaminador de aseguradora, las pruebas de extremo a extremo y las pruebas de carga. Permite trabajar sin exponer datos reales de pacientes.

### 11.5 Observabilidad

Logs estructurados, métricas y alertas en Cloud Logging y Monitoring. Alertas mínimas: errores 5xx, mensajes acumulados en Pub/Sub o en la cola de fallidos, fallas del job de retención y tiempo de evaluación por encima de lo esperado. Regla estricta: **los logs nunca contienen datos clínicos ni nombres**, solo identificadores.

---

## Fuera del MVP: Fase Expand

Elementos que se conservan en la visión del producto pero no se construyen en los 4 meses:

- **SFTP y DB polling:** en cuanto se conozca el ERP del hospital y se justifique.
- **Conectores de aseguradora:** envío directo de la cuenta a la aseguradora y recepción de su respuesta, sin que el hospital suba nada a portales.
- **Dictamen oficial:** que la aseguradora acepte el carril verde de Atlas Link como aprobación real. Requiere un acuerdo formal con la aseguradora.
- **Carta Finiquito:** la emite la aseguradora; Atlas Link solo podría generarla si la aseguradora lo delega.
- **Migración a microservicios:** según los criterios del documento de highlights, con los módulos de Spring Modulith como línea de corte.

---

## Pendientes de discovery

| Pendiente | Por qué importa | Sección afectada |
| :--- | :--- | :--- |
| ERP que usa el hospital piloto | Define si se construyen SFTP, DB polling o si basta el Excel. | 1 |
| Formato del Excel que exporta el hospital | Define la plantilla de mapeo. | 1.1 |
| Origen de deducible y coaseguro por paciente | Sin esos datos no hay cálculo financiero. | 2.2, 4.3 |
| Codificación de procedimientos que usan las aseguradoras | CPT requiere licencia; quizá usen otra codificación. | 3.3 |
| Convenios y tabuladores reales del hospital, y en qué formato los tiene | Define el esfuerzo de carga y homologación. | 3 |
| Formatos que piden los portales de las 2-3 aseguradoras | Define los exportadores. | 6.1 |
| Mecanismo de credencial de servicio para el endpoint REST | Seguridad de la integración de sistemas. | 7.5 |
| Proveedor de correo transaccional | Necesario para notificaciones. | 8.1 |
| Herramienta de CI/CD | GitHub Actions o Cloud Build. | 11.2 |
| Obligaciones legales vigentes en protección de datos | Contrato de encargo, aviso de privacidad. | 9.4 |
