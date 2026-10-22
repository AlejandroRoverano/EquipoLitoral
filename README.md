# Equipo Litoral

Plataforma web de servicios educativos (cursos, talleres y mentorías). Proyecto académico del Taller Integrador.

**Equipo:** Alejandro, Ronny, Emanuel y Sebastián.

## Tecnologías

- HTML, CSS y JavaScript (módulos ES)
- Bootstrap 5
- Firebase: Authentication, Firestore y Hosting

## Estructura

| Carpeta o archivo | Contenido |
|---|---|
| `index.html` | Página de inicio. |
| `catalogo/` | Catálogo de servicios, detalle, clase de prueba gratuita y flujo de adquisición. |
| `login/` | Registro, inicio de sesión y recuperación de contraseña. |
| `gestion/` | Panel del usuario, historial de adquisiciones, materiales de los servicios adquiridos y "Mis servicios" del prestador. |
| `admin/` | Panel de administración (solo administradores): inicio, gestión de servicios, de usuarios y de adquisiciones. |
| `firebase-config.js` | Configuración de Firebase. |
| `session.js` | Muestra u oculta los botones de sesión en la barra de navegación. |
| `acceso.js` | Protección de páginas por sesión y rol. |
| `adquisiciones-modelo.js` | Lectura y escritura de adquisiciones y pagos en Firestore. |
| `servicios-modelo.js` | Lectura y escritura de los servicios del catálogo en Firestore. |
| `materiales-modelo.js` | Lectura y escritura de los materiales de cada servicio (RF-16). |
| `materiales-editor.js` | Ventana para cargar los materiales por módulos (RF-16). |
| `servicios-gestor.js` | Interfaz común para gestionar servicios (panel administrativo y Mis servicios). |
| `usuarios-modelo.js` | Listado de usuarios y cambio de rol para el panel administrativo. |
| `indicadores-modelo.js` | Cálculo de los indicadores del estado general de la plataforma (RF-14). |
| `firestore.rules` | Reglas de seguridad de Firestore. |
| `docs/` | Documentación del proyecto. |

## Documentación

- [Matriz de permisos y restricciones de acceso](docs/matriz-de-permisos.md) (RNF-10)
- [Modelo de datos de adquisiciones](docs/modelo-datos-adquisiciones.md) (RD-08)
- [Modelo de datos de servicios](docs/modelo-datos-servicios.md) (RF-11, RD-04, RF-15, RF-16)
- [Indicadores del panel administrativo](docs/indicadores-panel.md) (RF-14)

## Primeros pasos con Firestore

1. Publicar las reglas: `firebase deploy --only firestore:rules` (ver la [matriz de permisos](docs/matriz-de-permisos.md)).
2. Asignar el rol `administrador` al **primer** usuario desde la consola de Firebase. Los siguientes se pueden asignar desde **Administración → Usuarios**.
3. Con ese usuario, entrar a **Administración → Servicios** y tocar **"Cargar servicios iniciales"** para que el catálogo tenga contenido.
4. Asignar a cada servicio su **prestador responsable** (editar el servicio → selector "Prestador responsable"), para que ese prestador lo pueda gestionar desde **Mis servicios**.

## Cómo trabajar en el repositorio

1. Crear una rama desde `dev` con el formato `feature/<código>-<descripción>`, por ejemplo `feature/rf-09-flujo-de-adquisicion`.
2. Hacer commits en esa rama.
3. Subir la rama y abrir un Pull Request hacia `dev`.
4. `dev` se pasa a `main` cuando el equipo lo decide.
