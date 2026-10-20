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
| `catalogo/` | Catálogo de servicios, detalle y flujo de adquisición. |
| `login/` | Registro, inicio de sesión y recuperación de contraseña. |
| `gestion/` | Panel del usuario e historial de adquisiciones. |
| `admin/` | Panel de administración (solo administradores). |
| `firebase-config.js` | Configuración de Firebase. |
| `session.js` | Muestra u oculta los botones de sesión en la barra de navegación. |
| `acceso.js` | Protección de páginas por sesión y rol. |
| `adquisiciones-modelo.js` | Lectura y escritura de adquisiciones y pagos en Firestore. |
| `firestore.rules` | Reglas de seguridad de Firestore. |
| `docs/` | Documentación del proyecto. |

## Documentación

- [Matriz de permisos y restricciones de acceso](docs/matriz-de-permisos.md) (RNF-10)
- [Modelo de datos de adquisiciones](docs/modelo-datos-adquisiciones.md) (RD-08)

## Cómo trabajar en el repositorio

1. Crear una rama desde `dev` con el formato `feature/<código>-<descripción>`, por ejemplo `feature/rf-09-flujo-de-adquisicion`.
2. Hacer commits en esa rama.
3. Subir la rama y abrir un Pull Request hacia `dev`.
4. `dev` se pasa a `main` cuando el equipo lo decide.
