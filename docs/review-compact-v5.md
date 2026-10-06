# Revisión visual cruzada — espacio de trabajo V5

Encargo: comprobar la respuesta visual a los componentes demasiado grandes, la alineación, el espacio de trabajo disponible y los rellenos oscuros. Esta revisión usa capturas renderizadas; no asigna una puntuación estética ni sustituye la aceptación del usuario.

## Referencia V4

Referencia inspeccionada: `evidence/premium-v4/workspace-admin-1440.png`.

En V4, la fila de cuatro métricas usa tarjetas altas para valores cortos. Debajo, la gráfica y la tarjeta de pendientes ocupan prácticamente otra pantalla; siguen tres accesos grandes antes de alcanzar la tabla. Las cifras se repiten entre indicadores, gráfica y llamada de atención. La tabla de cuentas no aparece en el primer pantallazo. La navegación lateral más el marco exterior reducen la anchura útil para trabajar.

## Criterios de contraste V5

- Tabla y datos de trabajo visibles al abrir el inicio en escritorio; analítica a un costado sin desplazar el listado.
- Métricas dimensionadas por su contenido, alineadas con el área operativa y sin paneles decorativos para una cifra.
- Densidad obtenida mediante estructura y espaciado, conservando texto legible y controles claros; rellenos blancos o pastel.

## Hospital V5 — escritorio

Capturas inspeccionadas: `evidence/premium-v5/workspace-admin-1440-viewport.png` y `evidence/premium-v5/workspace-admin-1440.png`.

La cabecera, los indicadores y los paneles comparten el mismo eje horizontal. Los indicadores son abiertos y de una línea principal, sin tarjetas altas. El área operativa empieza alrededor de y=300: las seis cuentas recientes y el pastel completo se ven en la captura de 1440×900. La tabla ocupa la mayor parte de la anchura y la analítica queda en una columna lateral de unos 350 px. Los valores, los estados y sus encabezados mantienen alineación; no se observan cifras cortadas ni texto amontonado. Los rellenos son blancos y pastel; no hay una superficie oscura dominante.

La estructura responde a los problemas concretos de V4 sin convertir la tabla en texto diminuto. No se identifican defectos materiales de composición en estas dos capturas ni se proponen cambios cosméticos adicionales.

## Consola y móvil V5

Capturas inspeccionadas: `workspace-atlas-1440-viewport.png`, `workspace-admin-390-viewport.png`, `workspace-admin-390.png`, `workspace-atlas-390-viewport.png` y `workspace-atlas-390.png`, en `evidence/premium-v5/`.

La consola de escritorio conserva la proporción tabla/analítica. Los dos hospitales, sus licencias, uso, equipo y vigencia están visibles junto al pastel en la misma pantalla. Los valores cortos no generan tarjetas sobredimensionadas. En móvil, las métricas se reagrupan en dos columnas y el listado precede a la gráfica: el trabajo sigue visible antes de recorrer la analítica. Se mantienen rellenos claros y controles separados.

### Hallazgo concreto

En la primera captura móvil hospitalaria, la referencia y la fecha rompían línea de manera distinta según la anchura de la etiqueta de estado: el año cabía en la primera cuenta y saltaba en otras. Esto afectaba la alineación de filas. **Corregido y confirmado visualmente** en las capturas actualizadas: referencia y fecha ocupan líneas propias, las seis filas mantienen el patrón y la acción de abrir conserva su columna. El saludo también quedó alineado con el área de trabajo móvil.

No quedan defectos materiales de composición detectados en las cuatro vistas revisadas. No se solicitan otros cambios cosméticos. El resultado responde a los problemas observables de tamaño, alineación y prioridad del trabajo señalados en este encargo; la preferencia estética final sigue correspondiendo al usuario.

## Alcance

Revisión de composición sobre imágenes en disco, sin modificar frontend ni ejecutar navegador. No certifica contraste, teclado o funcionamiento: esos resultados pertenecen a las verificaciones del equipo responsable. Tampoco implica aceptación estética del usuario.
