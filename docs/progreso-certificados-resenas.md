# Progreso, certificados, reseñas y accesibilidad

## Progreso por curso (RF-24)

- El estudiante que adquirió un curso (o tiene la prueba gratis vigente) marca cada material como **visto**
  desde la sección "Contenido del curso" del detalle o desde la página de materiales.
- Se guarda en `progreso/{uid}_{servicioId}` (`progreso-modelo.js`) y se muestra como barra de 0 a 100 %
  en el detalle, en la página de materiales y en "Mis Adquisiciones".
- Las reglas exigen que `completado` coincida con `vistos` y `total`.
- Limitación conocida: `total` lo calcula el navegador a partir de los módulos; las reglas no pueden contar
  los materiales del curso, así que no lo comprueban.

## Certificado verificable (RF-25)

- Cuando el curso da certificado y el progreso llega al 100 %, aparece **"Obtener mi certificado"**.
- Se crea `certificados/{codigo}` (lectura pública) con un código como `EL-7F3K-9QX2`, y el código queda
  guardado en el progreso: no se puede emitir un segundo certificado del mismo curso.
- `certificado.html?codigo=...` muestra el certificado y lo descarga como PDF (imprimir → "Guardar como PDF").
  Sin código, la misma página permite verificar cualquier certificado. El pie de página de todo el sitio
  tiene el enlace "Verificar certificado".
- Con la prueba gratis se puede completar el progreso, pero el certificado requiere haber adquirido el curso.

## Reseñas de compradores reales (RF-26)

- `resenas/{uid}_{servicioId}` (`resenas-modelo.js`): una opinión por estudiante y curso, editable y borrable.
- Solo puede escribir quien tiene una adquisición confirmada del curso (lo comprueban las reglas), por eso
  cada opinión muestra "Compra verificada". El nombre se publica abreviado ("Sebastián C.").
- El promedio se muestra en el detalle, en las tarjetas del catálogo y de los destacados, y en la
  calificación general de la portada (que antes era un valor fijo).

## Modo oscuro y tamaño de letra (RNF-11)

- `preferencias.js` se carga en el `<head>` de todas las páginas y aplica el tema y el tamaño antes de
  dibujar la página. Agrega a la barra un botón de accesibilidad (ícono de persona) con el interruptor
  de modo oscuro y cuatro tamaños de letra.
- La preferencia se guarda en el navegador (`localStorage`) y vale para todo el sitio.
- El modo oscuro usa `data-bs-theme="dark"` de Bootstrap 5.3 y los ajustes de `css/styles.css`.
