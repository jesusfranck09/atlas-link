# React Bits y MCP

Configurado el 24 de septiembre de 2026 por petición del usuario.

- `frontend/nxt-ui-atlas-link/package.json` contiene el registro `@react-bits` con `https://reactbits.dev/r/{name}.json`.
- Se ejecutó `npx shadcn@latest mcp init --client claude` desde `frontend/nxt-ui-atlas-link/`. Creó `frontend/nxt-ui-atlas-link/.mcp.json` e instaló `shadcn` 4.21.0 como dependencia de desarrollo, con su lockfile.
- El catálogo remoto respondió como JSON válido, con 832 variantes en el momento de la comprobación.
- Se verificó además el protocolo MCP con un cliente SDK temporal por stdio: el servidor reconoce `@react-bits` desde `package.json` y responde a la búsqueda de TrueFocus. [Resultado reproducible de la conexión](../evidence/tooling/reactbits-mcp.json). No equivale a haber abierto Claude ni ejecutado una instalación de componentes.
- Una segunda comprobación arrancó el comando exacto de `.mcp.json`, `npx shadcn@latest mcp`, sin modificar su configuración, y confirmó la conexión y el registro. [Evidencia del lanzador configurado](../evidence/tooling/reactbits-configured-launcher.json).
- El cliente debe abrir el proyecto desde `frontend/nxt-ui-atlas-link/` y cargar su configuración MCP. La creación del archivo no demuestra que un cliente Claude esté conectado. Esta sesión no anuncia herramientas MCP de shadcn.
- La instrucción visual posterior pide efectos originales, sin copiar componentes. No se instaló True Focus ni se copió su implementación; las esculturas y la tipografía prismática son código propio del proyecto.

Para comprobar el catálogo desde `frontend/nxt-ui-atlas-link/`:

```sh
npx shadcn search @react-bits --query TrueFocus --limit 2
```

Fuentes oficiales: [MCP de shadcn](https://ui.shadcn.com/docs/mcp), [lectura de registros desde package.json](https://ui.shadcn.com/docs/registry/api-reference#getregistriesconfig), [MCP de React Bits](https://reactbits.dev/get-started/mcp). `components.json` tiene precedencia si se añade posteriormente; hay que conservar allí el registro cuando se use la instalación de componentes con configuración completa.
