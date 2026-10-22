# Modelo de datos: servicios del catálogo (RF-11, RD-04, RF-15, RF-16)

Los servicios educativos se guardan en la colección **`servicios`** de Firestore. Los lee el catálogo, el detalle del servicio y el flujo de adquisición. Los gestionan el administrador, desde el panel de administración (`admin/servicios.html`), y cada prestador, solo los suyos, desde **Mis servicios** (`gestion/mis-servicios.html`).

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
| `prestadorUid` | string o null | | **RD-04:** UID de la cuenta del prestador dueño. Solo esa cuenta (y el administrador) puede modificar el servicio. `null` = sin asignar: solo lo gestiona el administrador. |
| `tieneMateriales` | boolean | | **RF-16:** `true` si el servicio tiene materiales cargados. En el panel, los servicios sin materiales muestran la etiqueta "Sin materiales". |
| `tieneClasePrueba` | boolean | | **RF-15:** `true` si el servicio tiene clase de prueba gratuita. Se usa para mostrar u ocultar el botón en el detalle. El contenido de la clase se guarda aparte (ver abajo). |
| `activo` | boolean | ✅ | `true`: se ve en el catálogo y se puede adquirir. `false`: dado de baja. |
| `creadoPor` | string | ✅ | UID de quien lo creó (administrador o prestador). No se puede modificar. |
| `creadoEn` | timestamp | ✅ | Fecha de creación (servidor). |
| `actualizadoEn` | timestamp | ✅ | Fecha de la última modificación (servidor). |

## Quién gestiona cada servicio (RD-04)

| Acción | Administrador | Prestador dueño (`prestadorUid` = su uid) | Otro prestador |
|---|:---:|:---:|:---:|
| Crear un servicio | ✅ | ✅ queda a su nombre | ✅ queda a su nombre |
| Editar los datos | ✅ | ✅ | ❌ |
| Dar de baja o reactivar | ✅ | ✅ | ❌ |
| Cambiar el prestador responsable | ✅ | ❌ | ❌ |
| Borrar el documento | ✅ | ❌ | ❌ |

Las reglas de Firestore (`firestore.rules`) hacen cumplir esta tabla en el servidor. Los servicios cargados con "Cargar servicios iniciales" empiezan **sin dueño**: el administrador les asigna un prestador desde el selector **"Prestador responsable"** del formulario.

La interfaz de gestión (tabla, formulario, baja y reactivación) es la misma para los dos roles y está en `servicios-gestor.js`.

## Clase de prueba gratuita (RF-15)

Cada servicio puede tener una clase de prueba gratuita. Su contenido se guarda en un **documento aparte**:

`servicios/{servicioId}/clasePrueba/contenido`

| Campo | Tipo | Descripción |
|---|---|---|
| `titulo` | string | Título de la clase, por ejemplo "Clase 1 - Tu primer circuito". |
| `descripcion` | string | Qué se ve en la clase. Los párrafos se separan con una línea en blanco. |
| `enlace` | string | Enlace `https://` al video o material. Si es de YouTube, el video se muestra dentro de la página. |
| `actualizadoEn` | timestamp | Fecha de la última modificación (servidor). |

**¿Por qué va aparte?** El documento del servicio es público, para que los visitantes vean el catálogo. La issue pide que para ver la clase haya que **iniciar sesión**. Si el contenido estuviera dentro del servicio, cualquiera podría leerlo sin registrarse. En un documento separado, las reglas de Firestore permiten leerlo **solo con sesión iniciada**.

| Acción | Visitante | Usuario con sesión | Prestador dueño | Administrador |
|---|:---:|:---:|:---:|:---:|
| Ver el botón "Clase de prueba gratuita" | ✅ | ✅ | ✅ | ✅ |
| Ver la clase | ❌ invitación a registrarse | ✅ sin adquirir ni pagar | ✅ | ✅ |
| Cargar, editar o quitar la clase | ❌ | ❌ | ✅ | ✅ |

La clase se carga desde el formulario del servicio (sección "Clase de prueba gratuita"), en el panel de administración o en **Mis servicios**. Se guarda en el mismo lote que el servicio: se guardan los dos o ninguno. Si se vacían los tres campos, la clase se borra y el botón deja de mostrarse.

## Materiales de estudio (RF-16)

Los materiales de cada servicio se organizan en **módulos** y se guardan en:

`servicios/{servicioId}/materiales/contenido`

```json
{
  "modulos": [
    {
      "titulo": "Módulo 1 - Introducción",
      "materiales": [
        { "titulo": "Guía de bienvenida", "tipo": "lectura", "enlace": "https://drive.google.com/..." },
        { "titulo": "Clase grabada", "tipo": "video", "enlace": "https://www.youtube.com/watch?v=..." }
      ]
    }
  ],
  "actualizadoEn": "timestamp del servidor"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `modulos[].titulo` | string | Título del módulo (mínimo 3 caracteres). |
| `modulos[].materiales[].titulo` | string | Título del material (mínimo 3 caracteres). |
| `modulos[].materiales[].tipo` | string | `lectura`, `video` o `enlace`. |
| `modulos[].materiales[].enlace` | string | Enlace `https://`. Los videos de YouTube se ven dentro de la página. |

Límites: hasta 30 módulos y 30 materiales por módulo. Cada módulo necesita al menos un material.

| Acción | Visitante | Usuario que adquirió el servicio | Otro usuario | Prestador dueño | Administrador |
|---|:---:|:---:|:---:|:---:|:---:|
| Ver los materiales (`gestion/materiales.html`) | ➡️ login | ✅ | ❌ aviso para adquirirlo | ✅ | ✅ |
| Cargar, editar o quitar materiales | ❌ | ❌ | ❌ | ✅ | ✅ |

- El estudiante entra a los materiales desde **Mis Adquisiciones** (botón "Ver materiales") o desde las tarjetas de **Mi Panel**.
- El prestador y el administrador los cargan con el botón **Materiales** de la tabla de servicios (Mis servicios o el panel de administración).
- Los materiales y el campo `tieneMateriales` del servicio se guardan en el mismo lote.
- La página solo abre enlaces que empiezan con `https://`, como protección adicional.

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
| `obtenerServiciosDePrestador(uid)` | Servicios de un prestador, activos y dados de baja (Mis servicios). |
| `obtenerClasePrueba(servicioId)` | Clase de prueba de un servicio, o `null`. Requiere sesión iniciada. |
| `idVideoYoutube(enlace)` | ID del video si el enlace es de YouTube, o `null`. |

Las funciones de los materiales están en **`materiales-modelo.js`**: `obtenerMateriales(servicioId)`, `guardarMateriales(servicioId, modulos)`, `validarModulos(modulos)` y `contarMateriales(modulos)`. El editor está en `materiales-editor.js`.
| `crearServicio(datos, uidCreador)` | Crea un servicio y devuelve su ID. |
| `actualizarServicio(id, datos)` | Edita un servicio. |
| `cambiarEstadoServicio(id, activo)` | Da de baja (`false`) o reactiva (`true`). |
| `cargarServiciosIniciales(uidAdmin)` | Crea los cinco servicios iniciales que falten. |
| `validarServicio(datos)` | Devuelve la lista de errores del formulario (vacía si está bien). |
