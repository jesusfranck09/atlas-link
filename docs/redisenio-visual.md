> HISTÓRICO: esta dirección fue rechazada por el usuario. La dirección vigente es V3, documentada en `docs/premium-v3.md`; estas comprobaciones no constituyen aceptación visual.

# Atlas Link / Precisión hospitalaria

Revisión de dirección: 24 de septiembre de 2026. Sustituye la dirección visual anterior. La instrucción actual del usuario es rehacer la calidad visual del producto completo, conservando las funciones y el stack. Las pantallas anteriores se inspeccionaron mediante la captura real `evidence/production-smoke/desktop-atlas-dashboard.png` y el código de los componentes. La revisión de esta nueva implementación renderizada se registra por separado al producir las capturas nuevas.

## Dirección y alcance

Producto de preauditoría de cuentas hospitalarias; la interfaz refleja información contractual, importes, revisiones y operación comercial. No simula expediente clínico ni sistemas que el alcance no contiene.

Se estudiaron dos direcciones: un hospital editorial de marfil/oliva y un instrumento operativo de perla/cobalt. Se desarrolla la segunda porque la primera conserva demasiados rasgos del diseño expresamente rechazado. Los tonos cálidos se reservan para la fotografía y los estados de atención. La firma propia combina la A de tres planos enlazados, tipografía editorial y documentos estructurados en escenas espaciales. No se necesitan sombras en los controles para dar profundidad al producto.

Tres experiencias comparten marca y controles, con composiciones diferenciadas:

- Landing: argumento editorial, escena original del proceso cuenta/convenio/revisión, producto explorable, licencia configurable y contacto real.
- Acceso: dos zonas claras, mensaje operativo y formulario; perfiles demo completos y clicables sin abreviar sus funciones.
- Aplicación: navegación estable, encabezado orientado a tareas, cifras en bandas con divisores, visualizaciones dominantes y tablas precisas. Las cuentas usan un banco de trabajo; los convenios se leen como folios contractuales, con una línea superior diferenciadora.

## Contrato y responsables

La fuente única de tokens es `frontend/src/app/globals.css`. El agente de dirección posee ese archivo y `components/ui.tsx`. La landing posee `landing.tsx` y su CSS Module; portal posee login, shell, dashboard, tabla de cuentas, plataforma y su CSS Module. No añadir una nueva capa de overrides al final de globals: corregir la regla que define el elemento. Las consultas al backend, permisos, estados y autofill no se sustituyen por mockups.

## Tokens

| Función | Token / valor |
|---|---|
| Texto principal | `--ink: #101E36` |
| Texto secundario | `--muted: #63718A` |
| Acción / identidad | `--accent`, `--blue: #3156ED` |
| Acción hover | `--accent-hover: #2343C7` |
| Azul de fondo | `--blue-soft: #EAF0FF` |
| Lienzo / superficie | `--canvas: #F4F6FA`, `--surface: #FFFFFF` |
| Superficie secundaria | `--surface-subtle: #F8F9FC` |
| Bordes | `--border: #DEE4EF`, `--border-strong: #C5CFDE` |
| Sin alerta | `--green: #15734A`, `--green-soft: #E9F4ED` |
| Atención | `--amber: #875E13`, `--amber-soft: #FFF5DF` |
| Prioridad | `--coral: #B54146`, `--coral-soft: #FFF0F0` |
| Acento auxiliar | `--violet: #6851AF`, `--violet-soft: #F0ECFB` |
| Elevación | `--shadow-surface: none` |
| Panel / control | `--radius: 16px`, `--radius-control: 10px` |
| Transición | 180 ms; `cubic-bezier(.2,.7,.3,1)` |

Los alias `--teal` conservan compatibilidad con los consumidores existentes y apuntan a cobalt. No representan el estado verde: los semáforos usan `--green` y los nombres de carril además del color. No se implementa modo oscuro por decisión explícita del usuario.

Contrastes calculados con luminancia relativa sRGB, disponibles en `brand/contrast.json`: texto principal sobre blanco 16.65:1; secundario sobre blanco 4.93:1 y lienzo 4.56:1; blanco sobre acción primaria 5.70:1; verde 5.20:1; ámbar 5.32:1; coral 4.98:1; cobalt sobre hielo 5.00:1. Estos cálculos de tokens no sustituyen el análisis de contrastes del navegador con todos los fondos renderizados.

## Tipografía, retícula y geometría

Manrope Variable local para títulos y cifras, Inter Variable local para lectura y controles. Sin solicitudes a servidores de fuentes.

- Hero: 72–80 px en escritorio; 42–48 px en móvil; peso 600; tracking entre −0.05 y −0.065 em. Su tamaño se ajusta a la composición, no a una línea forzada.
- Título de aplicación: 38 px / 29 px móvil; peso 620; tracking −0.045 em.
- Secciones: 18–27 px según jerarquía. Cuerpo 14–16 px; tablas 13 px; metadata 11–12 px. No usar texto operativo a 6–9 px.
- Importes: cifras tabulares, alineación derecha; nunca usar perspectiva 3D para comparar magnitudes financieras.
- Contenido público: máximo 1320 px con márgenes de 56 px en escritorio, 28 px en medio y 20 px en móvil.
- Retícula funcional: espaciado base 4 px; separación entre bloques 24–32 px; interior de paneles 26–30 px; formularios 20–22 px entre campos.
- Controles: mínimo 44 px; icon buttons 40 px; tabla botón de acción 38 px. Foco visible de 3 px con margen de 4 px. Objetivos mínimos nunca menores de 24 px.
- Paneles 16 px, modales 20 px, botones/inputs 10 px, estados 6 px. Convenios con borde superior 3 px y esquinas superiores 5 px: la jerarquía se reconoce por forma y composición, no solo por color.

## Estados e interacción

Los botones primarios oscurecen el cobalt al hover; secundarios modifican suavemente borde y fondo. No se elevan, desplazan ni añaden sombra al apuntarlos. Loading conserva el ancho funcional de los controles y usa aria-busy. Disabled conserva estructura, reduce opacidad y comunica su indisponibilidad con el atributo nativo.

Campos: etiqueta encima, ayuda debajo, placeholder legible; borde/foco consistentes; errores visibles y semánticos. En móvil inputs generales a 16 px para evitar el zoom involuntario de Safari. Tabla: row-hover suave, folio identificable, fechas secundarias, importes legibles. Celdas largas se ajustan; tablas densas desplazan su propio contenedor.

Modales: dialog nativo, límite al alto de viewport, scroll interno, cierre explícito y Escape. Avisos mediante regiones live. Empty states describen lo que falta y ofrecen acciones reales cuando existen. No inventar actividad, hospitales, ahorros ni tasas de éxito para llenar espacios vacíos.

Móvil: navegación colapsable propia; métricas pasan a dos columnas; detalle cuenta y reportes pasan a una; formularios conservan las parejas que permiten ancho suficiente; acciones se envuelven y no empujan el documento. En 390 px no debe existir scroll horizontal del documento.

## Material y 3D

Las superficies de lectura son opacas. El desenfoque se restringe a navegación si el equipo de landing lo aplica y al backdrop del modal. No usar tarjetas transparentes superpuestas para datos de trabajo. Donde no existe soporte, el modal dispone de fondo opaco suficiente.

Escena pública: arquitectura espacial original del flujo hospitalario, tres documentos o planos enlazados, cobalt cerámico y vidrio moderado, base perla. Una cámara isométrica controlada debe hacer reconocible el sujeto, evitando los iconos flotantes sin relación con el proceso. La iluminación y materiales se especifican en el componente de escena entregado por el responsable VFX. No presentar una ilustración como gráfico de datos ni una escena estática como WebGL interactivo.

Las escenas no bloquean la lectura ni el CTA. Alternativa móvil legible y estática. Preferencia de movimiento reducido elimina loops y transiciones prolongadas. Las sombras físicas de los objetos de la escena no autorizan sombras en los controles. No nuevas imágenes IA; las fotografías reales mantienen atribución/procedencia. La marca se dibuja con SVG propio, no imagen rasterizada.

## Marca entregada

El isotipo forma una A con tres planos de geometría propia en `viewBox="0 0 48 44"`, sin contenedor obligatorio. Se utiliza cobalt, con un plano a 72% de opacidad para distinguir el enlace. `Brand` usa la misma geometría que `brand/atlas-link-mark.svg`; `atlas-link-wordmark.svg` y `favicon.svg` completan el kit. La firma exportable usa Arial/Helvetica del sistema; la UI usa Manrope local. El favicon reserva el recuadro cobalt al tamaño pequeño.

El antiguo `brand/preview.png` es evidencia de una versión anterior; no usarlo como previsualización de esta entrega ni copiarlo sobre recursos nuevos.

## Criterios de revisión

1. Landing, ambos logins, dashboards y las rutas de trabajo visibles comparten tokens nuevos y no conservan superficies oliva/teal del diseño rechazado.
2. Cambio reconocible de composición, jerarquía, tipografía, escenas y componentes; no se limita a cambiar la paleta.
3. Login conserva selección de perfiles, autofill y autenticación real; permisos y cifrado permanecen en backend.
4. Revisar escritorio 1440 px y móvil 390 px con contenido real demo, estados vacíos y datos largos. Probar foco, modales, filtros y scroll de tablas.
5. Ejecutar build y análisis axe en navegador; conservar fallos y correcciones como evidencia. No afirmar calidad visual solo a partir del código.
6. Comparar las capturas nuevas con las previas. Los hallazgos de composición se corrigen por pantalla sin añadir una segunda fuente global de tokens.
7. La validación Chrome/macOS o móvil emulado no se presenta como prueba de dispositivos Windows, Android o iOS reales.
