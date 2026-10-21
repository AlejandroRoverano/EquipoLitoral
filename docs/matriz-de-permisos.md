# Matriz de permisos (RNF-10)

Este documento define qué puede hacer cada tipo de usuario en la plataforma Equipo Litoral y cómo se hace cumplir cada restricción.

## Roles

| Rol | Quién es | Cómo se obtiene |
|---|---|---|
| **Visitante** | Persona sin sesión iniciada. | No requiere cuenta. |
| **Estudiante** | Usuario que adquiere servicios educativos. | Se elige al registrarse. Es la opción por defecto. |
| **Prestador** | Usuario que ofrece servicios educativos. | Se elige al registrarse. |
| **Administrador** | Gestiona la plataforma. | **No se puede elegir al registrarse.** El primero se asigna a mano en la consola de Firebase (Firestore Database → `usuarios` → documento del usuario → campo `rol` = `administrador`). Después, un administrador puede asignar roles desde **Administración → Usuarios** (RF-12). |

El rol se guarda en el campo `rol` del documento `usuarios/{uid}` en Firestore.

## Funcionalidades por rol

✅ permitido · ❌ no permitido · ➡️ redirige al login

| Funcionalidad | Visitante | Estudiante | Prestador | Administrador |
|---|:---:|:---:|:---:|:---:|
| Ver inicio y catálogo | ✅ | ✅ | ✅ | ✅ |
| Ver el detalle de un servicio | ✅ | ✅ | ✅ | ✅ |
| Registrarse e iniciar sesión | ✅ | – | – | – |
| Adquirir un servicio (RF-09, RNF-09) | ❌ se le pide iniciar sesión | ✅ | ❌ aviso | ❌ aviso |
| Ver y editar su propio perfil (`gestion/detalle-gestion.html`) | ➡️ | ✅ | ✅ | ✅ |
| Ver su historial de adquisiciones (`gestion/historial.html`, RF-10) | ➡️ | ✅ | ❌ aviso | ❌ aviso |
| Ver las adquisiciones de otros usuarios | ❌ | ❌ | ❌ | ✅ en el panel de administración |
| Panel de administración (`admin/panel.html`, `admin/servicios.html`, `admin/usuarios.html`) | ➡️ | ❌ Acceso denegado | ❌ Acceso denegado | ✅ |
| Ver el enlace "Administración" en la barra de navegación | ❌ | ❌ | ❌ | ✅ |
| Crear, editar, dar de baja o reactivar servicios (RF-11) | ❌ | ❌ | ❌ | ✅ |
| Ver un servicio dado de baja en el catálogo | ❌ | ❌ | ❌ | ✅ solo en el panel |
| Ver el listado de usuarios: nombre, correo, rol, fecha de registro y cantidad de adquisiciones (RF-12) | ❌ | ❌ | ❌ | ✅ |
| Cambiar el rol de otro usuario (RF-12) | ❌ | ❌ | ❌ | ✅ |
| Cambiar su propio rol | ❌ | ❌ | ❌ | ❌ |

## Qué pasa al intentar acceder a algo que no corresponde

| Situación | Resultado |
|---|---|
| Visitante entra a una página protegida (panel, historial, administración). | Se lo redirige a `login/login.html`. |
| Visitante toca "Adquirir Servicio". | Aviso: "Para adquirir este servicio necesitás iniciar sesión", con botones para iniciar sesión o registrarse. |
| Prestador o administrador toca "Adquirir Servicio". | Aviso: solo las cuentas de estudiante pueden adquirir servicios. |
| Prestador o administrador entra a su historial. | Aviso: el historial está disponible solo para estudiantes. |
| Usuario sin rol de administrador entra a `admin/panel.html`. | Se reemplaza la página por **"Acceso denegado"**, con un botón para volver al inicio. |
| Alguien intenta leer o escribir datos sin permiso directamente contra Firestore, salteando la página. | Firestore rechaza la operación con `permission-denied`. |

## Permisos sobre los datos (Firestore)

Las reglas están en **`firestore.rules`**, en la raíz del repositorio. Son la protección real: se aplican en el servidor, aunque alguien modifique el JavaScript de la página.

| Colección | Leer | Crear | Editar | Borrar |
|---|---|---|---|---|
| `usuarios/{uid}` | El propio usuario o un administrador. | El propio usuario, solo con rol `estudiante` o `prestador`. | El propio usuario, **sin cambiar su rol**. Un administrador puede cambiar **solo el rol** de otro usuario, nunca el suyo. | Solo un administrador. |
| `servicios/{id}` | Todos, incluidos los visitantes. | Solo un administrador. | Solo un administrador. | Solo un administrador (en la práctica se usa la baja lógica, `activo: false`). |
| `adquisiciones/{uid}_{servicioId}` | El dueño (`uid == request.auth.uid`) o un administrador. | Solo un estudiante, a su propio nombre, de un servicio activo y con el precio del catálogo. | Solo un administrador. | Solo un administrador. |
| `pagos/{id}` | El dueño o un administrador. | Solo un estudiante, a su nombre y con `simulado: true`. | Nadie. | Nadie. |
| Cualquier otra colección | Nadie. | Nadie. | Nadie. | Nadie. |

> En las adquisiciones, el campo que identifica al usuario se llama **`uid`**. Es el equivalente al `userId` que menciona la issue RNF-10.

### Cómo publicar las reglas

Las reglas del archivo **no se aplican solas**. Alguien con acceso al proyecto de Firebase tiene que publicarlas de una de estas dos formas:

- **Con Firebase CLI**, desde la carpeta del proyecto:
  ```
  firebase deploy --only firestore:rules
  ```
- **Desde la consola:** en Firestore Database → Reglas, se reemplaza el contenido por el de `firestore.rules` y se toca **Publicar**.

Publicar reemplaza todas las reglas anteriores. Si en la consola hay reglas para otras colecciones que no figuran en `firestore.rules`, hay que agregarlas al archivo antes de publicar.

## Cómo se aplica en el código

| Pieza | Qué hace |
|---|---|
| `acceso.js` | `protegerPagina({ roles })`: sin sesión redirige al login, y sin el rol necesario muestra "Acceso denegado". Lo usan `admin/panel.js`, `admin/servicios.js` y `admin/usuarios.js`. |
| `session.js` | Muestra el enlace "Administración" en la barra de navegación solo a los administradores. |
| `catalogo/adquisicion.js` | Comprueba la sesión y el rol antes de abrir el flujo de compra. |
| `gestion/historial.js`, `gestion/gestion.js` | Redirigen al login si no hay sesión. |
| `firestore.rules` | Hace cumplir todos los permisos sobre los datos en el servidor. |

## Pendiente de definir con el equipo

- El panel de gestión le muestra al **prestador** un botón "Nuevo Servicio", pero según la RNF-10 solo el **administrador** puede crear servicios. Hay que decidir si el prestador también puede hacerlo. Si puede, hay que cambiar la regla de `servicios` en `firestore.rules`.
- Desde RF-11 el catálogo se lee desde la colección `servicios` de Firestore (ver [modelo de servicios](modelo-datos-servicios.md)).
