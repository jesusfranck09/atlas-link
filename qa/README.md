# Pruebas de sistema

La suite usa Playwright y Chrome instalado. No contiene mocks de API: requiere Next.js en4300 y los servicios Spring/PostgreSQL activos. Usa únicamente datos sintéticos y los perfiles de demostración configurados en el backend.

```sh
cd qa
npm ci
npm test
```

Chrome de escritorio y Chrome con viewport móvil emulado ejecutan los mismos doce recorridos. Un contrato API adicional comprueba convenio por fecha de ingreso, rechazo de solapamiento, snapshots históricos inmutables, repetición de cálculos y paginación de evaluaciones. Esto no es una comprobación en Safari, iOS, Android ni Windows reales.

Ese contrato también comprueba el aislamiento de los snapshots entre hospitales y la denegación a plataforma y usuarios anónimos. Puede ejecutarse sin frontend mediante `ATLAS_WEB_URL=http://127.0.0.1:8095 npx playwright test tests/contracts.spec.ts --project=chrome-desktop`; sigue creando datos sintéticos en el entorno nativo.

En un entorno que ya disponga de Chrome con depuración remota autorizada:

```sh
ATLAS_CDP_URL=http://127.0.0.1:9430 npm test
```

Esa opción conecta al navegador existente y cierra solo los contextos creados por cada prueba. Sin esa variable, Playwright inicia y cierra su propio Chrome. La configuración no descarga navegadores ni crea servidores.

Los resultados se guardan en `../evidence/browser-report.json`, `../evidence/browser-report/` y `../evidence/browser-results/`. No se capturan trazas ni vídeo que puedan incluir tokens. Se adjuntan capturas sintéticas, excepciones de navegador, respuestas500 y resultados axe. Los errores de consola se conservan para diagnóstico: algunos recorridos negativos producen401 esperado y se distinguen de fallos JavaScript o del servidor.

Después de una ejecución completa, `python3 helpers/summarize-browser.py` genera el resumen JSON y extrae los adjuntos de accesibilidad y contratos. Los escenarios de descarga comprueban XLSX, PDF y JSON histórico; el tabulador se prueba con archivo inválido, vista previa válida y publicación del borrador.

Las pruebas crean cuentas, solicitudes y hospitales con prefijoQA y UUID. No reinician la base ni borran datos compartidos. `python3 ../scripts/verify-api.py` amplía la comprobación de API, concurrencia, roles e integridad contra PostgreSQL real.

Para la demostración Docker en 4430 se dispone de una comprobación que solo consulta datos de negocio y autentica perfiles:

```sh
ATLAS_CDP_URL=http://127.0.0.1:9430 node production-smoke.mjs
```

Verifica 24 vistas, las dos superficies de acceso, seis roles, cuentas/convenios/licencias, accesibilidad automática, fotografía, SVG de marca, favicon, esquema JSON público, movimiento reducido, errores de hidratación y que la base demostrativa conserve 20 cuentas. El destino puede ajustarse mediante `ATLAS_PRODUCTION_URL`; el tamaño inicial esperado mediante `ATLAS_EXPECTED_DEMO_ACCOUNTS`. No se debe usar la suite de mutaciones `npm test` sobre la base que se desee conservar limpia para una presentación.

El rediseño tiene una revisión ampliada de todas las rutas principales, capturas completas y accesibilidad en escritorio y móvil emulado:

```sh
node redesign-review.mjs final
node performance-smoke.mjs
```

Requiere la web Docker en 4430 y Chrome CDP en 9430. Guarda evidencia en `evidence/redesign/`. La primera prueba autentica los seis perfiles y verifica que las 20 cuentas de negocio permanezcan intactas. La segunda observa carga, desplazamientos de diseño, recursos y tareas largas en un laboratorio local: sus resultados no equivalen a mediciones de dispositivos o redes de clientes. Las capturas requieren además revisión visual humana o por el agente; axe no determina calidad estética.

## Dirección visual V3

Con Chrome CDP disponible en 9430 y la aplicación empaquetada en 4430:

```sh
node redesign-review.mjs premium-v3-final
node sculpture-review.mjs
node performance-smoke.mjs
node premium-capture.mjs
```

`redesign-review` conserva 36 vistas de navegación real, accesibilidad y perfiles demo. `sculpture-review` comprueba geometrías Three.js, selección, reposo, movimiento reducido y recuperación de WebGL; no ejecutarlo simultáneamente con otros runners que emulen preferencias de movimiento en el mismo navegador CDP. `performance-smoke` registra 12 muestras locales de carga, con límites explícitos. `premium-capture` guarda vistas de presentación; admite `QA_BASE_URL` para un servidor de desarrollo. La escena anterior y su runner se retiraron al sustituir el diseño.
