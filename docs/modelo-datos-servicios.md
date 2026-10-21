# Modelo de datos: servicios del catálogo (RF-11)

Los servicios educativos se guardan en la colección **`servicios`** de Firestore. Los lee el catálogo, el detalle del servicio y el flujo de adquisición. Solo un administrador los gestiona, desde el panel de administración (`admin/servicios.html`).

El código que implementa este modelo está en **`servicios-modelo.js`**, en la raíz del proyecto.

## Colección `servicios`

ID del documento: un identificador legible que se genera a partir del nombre, por ejemplo `taller-robotica`. Si ya existe otro servicio con el mismo ID, se le agrega un número: `taller-robotica-2`. El ID no cambia aunque después se edite el nombre, así los enlaces y las adquisiciones siguen funcionando.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `nombre` | string | ✅ | Nombre del servicio. |
| `categoria` | string | ✅ | `cursos`, `mentorias`, `robotica` o `formacion`. Coincide con los filtros del catálogo. |
| `modalidad` | string | ✅ | `Presencial`, `Virtual` o `Híbrida`. |
| `institucion` | string | | Institución que ofrece el servicio. Se muestra en la tarjeta del catálogo. |
| `prestador` | string | ✅ | Persona o equipo que dicta el servicio. |
| `prestadorDetalle` | string | | Presentación del prestador (pestaña "Prestador" del detalle). |
| `descripcionCorta` | string | ✅ | Resumen que se muestra debajo del título. |
| `descripcion` | string | ✅ | Descripción completa. Los párrafos se separan con una línea en blanco. |
| `objetivos` | array de string | | Objetivos de aprendizaje, uno por elemento. |
| `requisitos` | string | | Requisitos previos. |
| `duracion` | string | ✅ | Por ejemplo, `12 semanas`. |
| `cargaHoraria` | string | | Por ejemplo, `4 hs por semana`. |
| `cupo` | number o null | | Cantidad máxima de estudiantes. `null` significa sin límite. |
| `fechaInicio` | string | | Fecha con formato `AAAA-MM-DD`. Vacío significa "A confirmar". |
| `precio` | number | ✅ | Importe, mayor o igual a 0. |
| `moneda` | string | ✅ | `UYU` o `USD`. |
| `periodo` | string | ✅ | `mes`, `curso` o `sesión`. |
| `certificado` | boolean | | Si el servicio otorga certificado. |
| `activo` | boolean | ✅ | `true`: se ve en el catálogo y se puede adquirir. `false`: dado de baja. |
| `creadoPor` | string | ✅ | UID del administrador que lo creó. |
| `creadoEn` | timestamp | ✅ | Fecha de creación (servidor). |
| `actualizadoEn` | timestamp | ✅ | Fecha de la última modificación (servidor). |

## Baja lógica

Dar de baja un servicio **no lo borra**: cambia `activo` a `false`.

- Deja de aparecer en el catálogo y en "Servicios relacionados".
- Su página de detalle se puede seguir abriendo, por ejemplo desde el historial de un estudiante, pero muestra "No disponible" y no se puede adquirir.
- Las adquisiciones que ya existen no se modifican.
- El administrador lo puede reactivar en cualquier momento.

## Relación con las adquisiciones

Cada adquisición guarda el `servicioId` y una copia del nombre, el prestador y el precio del momento de la compra (ver [modelo de adquisiciones](modelo-datos-adquisiciones.md)). Las reglas de Firestore verifican al crear una adquisición que:

- el servicio exista y esté activo;
- el precio y la moneda coincidan con los del servicio en Firestore. Así nadie puede modificar el precio desde el navegador.

## Servicios iniciales

Antes de RF-11, el catálogo tenía cinco servicios escritos a mano en el HTML. Cuando la colección está vacía, el panel de administración muestra el botón **"Cargar servicios iniciales"**, que los crea en Firestore con los mismos IDs:

`taller-robotica`, `mentoria-software`, `didactica-docentes`, `python-cientificos` e `impresion-3d`.

Algunos de esos datos (precios de la mentoría y de didáctica, descripciones y prestadores de los servicios que no tenían página de detalle) son **de ejemplo** y conviene revisarlos desde el panel.

## Funciones disponibles en `servicios-modelo.js`

| Función | Para qué sirve |
|---|---|
| `obtenerServicio(id)` | Devuelve un servicio, o `null` si no existe. |
| `obtenerServiciosActivos()` | Servicios visibles en el catálogo, ordenados por nombre. |
| `obtenerTodosLosServicios()` | Todos los servicios, activos y dados de baja (panel administrativo). |
| `crearServicio(datos, uidAdmin)` | Crea un servicio y devuelve su ID. |
| `actualizarServicio(id, datos)` | Edita un servicio. |
| `cambiarEstadoServicio(id, activo)` | Da de baja (`false`) o reactiva (`true`). |
| `cargarServiciosIniciales(uidAdmin)` | Crea los cinco servicios iniciales que falten. |
| `validarServicio(datos)` | Devuelve la lista de errores del formulario (vacía si está bien). |
