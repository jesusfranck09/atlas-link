# Contratos versionados

El esquema de entrada v1 se publica en `/contracts/account-v1.schema.json`, desde [su fuente](../../frontend/nxt-ui-atlas-link/public/contracts/account-v1.schema.json). Usa JSON Schema2020-12 y describe el comportamiento implementado de `POST /api/accounts`.

[El ejemplo](account-v1.example.json) contiene únicamente datos sintéticos. Antes de enviarlo, reemplazar insurerId con un ID de `GET /api/insurers`, códigos con los del convenio y folio con uno único. Enviar bearer válido e `Idempotency-Key` único; repetir esa misma clave con el mismo cuerpo recupera la cuenta existente.

El hospital no se acepta desde el cuerpo: se deriva del usuario autenticado. La API actual responde sincrónicamente con el resultado; una respuesta exitosa no equivale a autorización de pago. Las credenciales técnicas del ERP y el procesamiento asíncrono se rastrean separadamente en la matriz de alcance.

El contrato admite nuevos campos opcionales compatibles en v1. Renombrar, eliminar o exigir campos existentes requiere una versión mayor y un periodo de convivencia por acordar. La validación de relaciones entre fechas, catálogo, responsabilidad financiera, licencia, idempotencia y límites agregados permanece en el backend; no puede sustituirse con este esquema.

Referencia del formato: [JSON Schema2020-12](https://json-schema.org/draft/2020-12).
