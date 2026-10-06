# Revisión visual independiente — V6

Fecha: 24 de septiembre de 2026.

## Alcance y evidencia

Revisión de capturas renderizadas mediante `view_image`, limitada a composición, presencia visual y legibilidad. No se abrió una sesión de navegador ni se repitió QA funcional. Esta revisión no acredita aceptación estética por parte del usuario ni conformidad de accesibilidad.

Dirección consultada: `docs/visual-v6.md`, `docs/assets-v3.md` y `AGENTS.md`.

Capturas del acceso revisadas:

- `evidence/expressive-v6-login/desktop-hospital.png`
- `evidence/expressive-v6-login/mobile-hospital.png`
- `evidence/expressive-v6-login/narrow-hospital.png`

Referencia del portal anterior: `evidence/redesign/compact-v5-final/desktop-hospital-viewport.png`. Se usa como referencia de composición; no como comparación exacta de capturas con dimensiones y estado idénticos.

Capturas finales del portal revisadas:

- `evidence/expressive-v6-workspace/admin-1440-viewport.png`
- `evidence/expressive-v6-workspace/admin-390-viewport.png`
- `evidence/expressive-v6-workspace/admin-390.png`
- `evidence/expressive-v6-workspace/atlas-1440-viewport.png`
- `evidence/expressive-v6-workspace/atlas-390.png`

Capturas posteriores del acabado 3D final revisadas:

- `evidence/glass-v6/final-glass-panel.png`
- `evidence/glass-v6/final-glass-pie.png`

## Acceso hospitalario

La composición de escritorio resuelve la dirección acordada: fotografía y formulario abierto se equilibran en dos columnas asimétricas, sin un panel rectangular que encierre todo el acceso. Los márgenes y los ejes del texto, los campos y el selector demo resultan coherentes. La fotografía conserva los dos rostros y el contexto de colaboración; el recuadro translúcido inferior se sitúa sobre objetos y no oculta las caras.

El título establece la jerarquía y el violeta identifica la frase principal sin teñir toda la interfaz. Los campos y el botón tienen una altura cómoda y mantienen una lectura clara sobre el fondo hielo. El material translúcido es perceptible especialmente en el recuadro fotográfico y en el botón, con contornos más luminosos que el fondo.

Las seis opciones demo se resuelven como filas ligeras: rol, nombre y correo quedan completos en las capturas revisadas. En móvil pasan a una columna y el formulario queda antes de la fotografía. A 320 px el título, las opciones y el pie se adaptan sin solapamiento ni recorte visible. La fotografía queda después de los perfiles demo, por lo que la primera vista móvil tiene menos presencia editorial que escritorio; es una consecuencia de priorizar el acceso, no un fallo de composición que requiera reorganización.

**Hallazgos materiales:** no se observan recortes, solapamientos, problemas de encuadre ni fallos de alineación que requieran corregir este acceso en las capturas revisadas. No se propone aumentar tamaños o espacios de forma general.

## Portal hospitalario

En el escritorio hospitalario se ven completas las seis cuentas y el panel analítico dentro de la captura de 900 px de alto. Las cifras conservan proporción compacta y los bordes de tabla y panel arrancan al mismo nivel. La fotografía tiene una presencia contextual pequeña y no desplaza el trabajo. Frente a la referencia V5, la separación de navegación, lectura tabular y analítica es más perceptible por tono y material.

El panel analítico tiene mayor presencia que en V5: el pastel ocupa más ancho, sus categorías se distinguen por cyan, apricot y rosa, y la leyenda alinea etiquetas y valores. Los valores siguen visibles fuera del volumen 3D. La tabla mantiene una superficie más opaca que el panel, lo que evita que el fondo compita con cuentas, importes y estados. El estado de cada cuenta sigue escrito, además de tener color.

En móvil hospitalario, la secuencia encabezado, acciones, indicadores, cuentas y analítica prioriza las tareas. Las filas conservan referencia, importe y estado sin solapamiento visible. La gráfica y la leyenda se adaptan a una columna y permanecen completas en la captura larga. No se observa un recorte del volumen ni de la nota inferior.

**Hallazgos materiales:** no se detectan problemas visibles de legibilidad, encuadre, alineación entre paneles o desbordamiento que requieran una nueva composición. La captura de escritorio termina después del pie principal de tabla; no se interpreta el corte del viewport como un recorte del componente.

## Consola Atlas

Escritorio conserva el mismo lenguaje y la tabla de hospitales no se estira artificialmente para igualar la altura del gráfico. El espacio resultante responde a los dos registros demo. El directorio, las licencias y la leyenda mantienen nombres completos y separación legible.

En `atlas-390.png`, «Hospitales conectados» ocupa dos líneas y «Licencias vigentes» una. Por ello los dos valores de la primera fila de indicadores no comparten una línea base. Es una incoherencia localizada de alineación, sin pérdida de información.

## Corrección localizada y acabado final

Se propuso **un único ajuste localizado**: alinear los valores de los dos indicadores de la primera fila móvil de Atlas, manteniendo la escala actual. El coordinador informa que el equipo ya cambió la etiqueta a «Hospitales» para evitar el salto. La captura integrada posterior queda a cargo del coordinador; esta revisión no afirma haberla comprobado. Criterio pendiente: ambos valores «2» deben compartir línea base en móvil y las etiquetas deben seguir completas.

En las primeras capturas integradas, el vidrio era perceptible en navegación, botón y panel analítico, mientras las porciones del pastel se percibían como un sólido brillante. Se comunicó esa diferencia de material al coordinador; no era un fallo de lectura.

La revisión posterior de `final-glass-panel.png` y `final-glass-pie.png` confirma un reflejo amplio y continuo sobre las caras, cantos más claros y un volumen de lectura más definida. El acabado se percibe como vidrio tintado pulido, no como transparencia total. La banda de luz permanece sobre la gráfica y no invade la leyenda; etiquetas, valores y nota inferior siguen completos. No se detecta una corrección material adicional en estas capturas finales.

La presencia 3D ha aumentado respecto a la referencia V5. El grado de impacto estético y la aceptación del diseño quedan a evaluación del usuario.

No se proponen más cambios de alto impacto con esta evidencia. No se usaron `initial-glass-pie.png` ni `refined-glass-panel.png`, que correspondían a ediciones intermedias.

## Límites

### Cierre integrado por root

Inspeccionada `evidence/redesign/glass-v6-final/mobile-admin-viewport.png` tras empaquetar y desplegar la demo local: la etiqueta «Hospitales» ocupa una línea y los dos valores de la primera fila quedan alineados. La corrección localizada queda verificada. La captura integrada de escritorio muestra el acabado 3D final revisado; no quedan ajustes visuales pendientes identificados en este encargo.

Las capturas permiten revisar el resultado visual estático. Foco, teclado, selección, carga, errores, movimiento y renderizado en dispositivos físicos quedan fuera de esta revisión. La procedencia de las fotografías está documentada en `docs/assets-v3.md`; no se realizó aquí una nueva auditoría de licencias.
