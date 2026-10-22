# Estadísticas públicas de la portada (RF-18)

La página de inicio muestra, antes del pie de página, tres datos de la plataforma:

| Dato | De dónde sale | ¿Se actualiza solo? |
|---|---|---|
| **Estudiantes que realizaron nuestros servicios** | El documento público `estadisticas/general` (campo `estudiantesConCursos`). `ESTUDIANTES_BASE` está en `0`: solo se muestra el dato real. | ✅ Sube en 1 con la **primera** adquisición de cada estudiante. |
| **Servicios ofrecidos en el catálogo** | Cantidad de servicios activos de la colección `servicios`, que ya es pública. | ✅ Siempre refleja el catálogo actual. |
| **Calificación de los estudiantes** | Promedio real de todas las reseñas (`resenas`, RF-26). Si no hay reseñas se muestra "–". | ✅ Cambia con cada reseña de un comprador. |

El código está en `estadisticas-modelo.js` (datos) e `inicio.js` (sección de la portada).

> **Solo datos reales:** la portada ya no usa números fijos. El total de estudiantes sale de Firestore y la calificación es el promedio de las reseñas de quienes adquirieron cursos.

## El problema: mostrar un total sin exponer datos

Por la RNF-10, un visitante **no puede leer las adquisiciones** de nadie. Por eso el número de estudiantes no se puede calcular en el navegador del visitante. La solución es guardar **solo el total** en un documento público:

```
estadisticas/general
  estudiantesConCursos: 12          ← único dato público, sin nombres ni correos
  actualizadoEn: timestamp

estudiantesConCompras/{uid}         ← marca privada: "este estudiante ya fue contado"
  servicioId: "taller-robotica"
  creadoEn: timestamp
```

## Cómo se actualiza

1. Un estudiante completa una adquisición (RF-09).
2. Después de confirmarse, `registrarEstudianteEnEstadisticas()` revisa si el estudiante ya tiene su **marca**.
3. Si no la tiene (es su primera compra), en un mismo lote crea la marca y suma 1 a `estudiantesConCursos`.
4. Si ya la tenía, no hace nada: un estudiante cuenta una sola vez aunque adquiera varios servicios.

Este paso no bloquea la compra. Si fallara, la adquisición igual queda registrada y el administrador puede recalcular.

## Seguridad (firestore.rules)

| Colección | Leer | Crear o modificar |
|---|---|---|
| `estadisticas/{id}` | Todos (es público). | El administrador. Un estudiante solo puede **sumar exactamente 1**, una única vez (cuando crea su marca en el mismo lote) y solo con su propia cuenta. |
| `estudiantesConCompras/{uid}` | El propio estudiante o el administrador. | El propio estudiante, solo si existe una adquisición suya de ese servicio, o el administrador. |

Así nadie puede inflar el número: sumar más de 1, sumar dos veces o sumar sin haber comprado es rechazado por Firestore.

## Recalcular (administradores)

En el panel de administración (Inicio) está la tarjeta **"Estadísticas públicas de la portada"**, con el botón **"Recalcular estadísticas"**. Cuenta los estudiantes distintos con al menos una adquisición confirmada, crea las marcas que falten y guarda el total.

Hay que usarlo **una vez después de publicar esta función**, para contar a los estudiantes que compraron antes de que existiera.
