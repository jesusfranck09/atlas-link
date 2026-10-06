# Revisión de distribución del acceso — V7

Fecha: 24 de septiembre de 2026.

## Alcance

Revisión visual independiente de `/login` y `/admin/login`. El usuario considera el acceso anterior abultado de texto, mal alineado y distribuido. Esta iteración reduce contenido y unifica la retícula, conservando la paleta y los materiales V6. El portal y la landing quedan fuera de esta revisión.

El coordinador implementa el formulario y sus estilos. Esta revisión no modifica código ni abre una sesión de navegador. La captura nueva adjunta por el usuario no está disponible en el contexto de este revisor; el feedback se recibió del coordinador. Como referencia anterior se revisaron las capturas `evidence/expressive-v6-login/desktop-hospital.png`, `mobile-hospital.png` y `narrow-hospital.png`.

## Observaciones previas compartidas

1. Título, campos, botón y demos deben usar los mismos bordes del mismo contenedor, sin anchos máximos internos diferentes. El bloque fotográfico debe comenzar y terminar con el bloque de acceso, sin prolongarse como un hero.
2. A 1366 × 768 deben verse el formulario y los seis perfiles: cabecera contenida, separación superior moderada y eliminación del subtítulo genérico bajo «Bienvenido», además de los slogans y captions exteriores. Mantener una sola etiqueta funcional para identificar portal o consola.
3. El selector demo 2 × 3 necesita filas de altura uniforme que admitan dos líneas de rol. Nombres y correos no deben triplicar el contenido inicial. En 320 px, comprobar los roles más largos sin reducir la tipografía para forzarlos. La fotografía no debe añadir un bloque largo después del acceso móvil.

## Implementación y revisión final del coordinador

Se eliminaron los eslóganes, el caption fotográfico, el subtítulo y las tres líneas de texto por perfil. El acceso ahora contiene una etiqueta del portal, «Bienvenido», los campos y el selector demo. La fotografía conserva el mismo alto que el bloque de acceso; formulario, botón y perfiles comparten ambos bordes. Los nombres y correos siguen disponibles en las etiquetas accesibles y en el título de cada botón. Seleccionar un perfil completa los campos sin enviar el formulario.

El coordinador inspeccionó las capturas finales de ambos accesos en 1366 × 768 y del portal hospitalario en 390 × 844 y 320 × 740. En portátil se ven los seis perfiles y el pie sin desplazamiento. En móvil se oculta la fotografía; los roles largos se ajustan en dos líneas, conservando un tamaño de 12 px y áreas pulsables de al menos 54 px de alto. A 320 px solo el final del pie requiere un desplazamiento vertical breve. No hay desbordamiento horizontal.

La revisión independiente aportó las observaciones iniciales. Su revisión final no se ejecutó porque el agente alcanzó su límite de uso; las comprobaciones finales anteriores corresponden al coordinador. No se atribuye aceptación estética al usuario.

## Validación ejecutada

- Compilación de producción de Next.js y lint correctos. La imagen actualizada está levantada en `http://localhost:4430`.
- [Informe de QA](../evidence/login-v7/report.md): 95 comprobaciones correctas, cero fallos, ocho vistas entre ambos accesos. Chrome en macOS; móvil emulado.
- Autocompletado de todos los perfiles, mostrar/ocultar contraseña, edición que limpia la selección, rechazo de la cuenta desactivada y entrada/salida reales de hospital y consola Atlas, contra los servicios locales.
- Suite existente: cuatro recorridos correctos en escritorio y móvil emulado (`both login surfaces` y `hospital role admin`). Se actualizaron los selectores del botón «Iniciar sesión» y se precisó la espera de navegación y la tabla de cuentas para evitar confundirla con la tabla accesible del gráfico.
- Cero incidencias detectadas por axe en las ocho vistas iniciales; esto no sustituye una auditoría completa de accesibilidad.

Las capturas locales y las medidas están en `evidence/login-v7/`. El [JSON de evidencia](../evidence/login-v7/review.json) registra la revisión base y los archivos modificados presentes al ejecutar las comprobaciones. No incluye contraseñas ni tokens.
