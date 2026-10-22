# Contenido de los cursos: clase gratuita y unidades

Cada curso (servicio) tiene dos tipos de contenido, que ya estaban previstos en el modelo de datos
(RF-15 y RF-16) y que se cargan con `admin/cargar-contenido.html`.

| Contenido | Dónde se guarda | Quién lo ve |
|---|---|---|
| **Clase de prueba gratuita** (RF-15) | `servicios/{id}/clasePrueba/contenido` | Cualquier usuario con sesión, sin adquirir el curso |
| **Unidades de estudio** (RF-16) | `servicios/{id}/materiales/contenido` | Quien adquirió el curso, el prestador dueño y el administrador |

## Flujo del estudiante

1. En el detalle del curso ve el botón de la **clase de prueba**. Si no tiene sesión, se le invita a registrarse.
2. Si quiere seguir, usa **Adquirir servicio** (pago simulado).
3. Desde el mismo detalle (sección **Contenido del curso**, RF-21) o desde **Mis adquisiciones** accede a las **unidades** del curso.
   Quien no adquirió el curso ve esa sección bloqueada; el administrador y el prestador dueño la ven completa. Sin adquirir, las reglas de Firestore
   rechazan la lectura (`adquirio(servicioId)` en `firestore.rules`), aunque alguien conozca la dirección.

## Tipos de material de una unidad

`lectura`, `video`, `imagen` y `enlace`. Los videos de YouTube se ven dentro de la página y las imágenes
también; el resto se abre en una pestaña nueva. Solo se aceptan enlaces `https://`.

## Cómo agregar más unidades

El prestador dueño (o el administrador) edita los materiales desde **Mis servicios**; no hace falta tocar el código.
`contenido-inicial.js` solo contiene el contenido de ejemplo de los catorce cursos iniciales: los cinco originales, los tres
agregados en RF-21 (Desarrollo Web desde Cero, Introducción a la Ciberseguridad y Robótica para Principiantes con micro:bit)
y los seis de RF-23 (Inteligencia Artificial para Todos, Mentoría para Proyectos Finales, Tecnología Educativa en el Aula,
Creá tu Videojuego con Scratch, Taller de Domótica con Arduino y Pensamiento Computacional para Docentes).

## Cómo cargar los cursos nuevos en un catálogo que ya tiene servicios

Entrar con un administrador a `admin/cargar-contenido.html` y tocar **Cargar contenido**. Primero se crean los cursos de
`SERVICIOS_INICIALES` que todavía no existan y después se carga su clase de prueba y sus unidades. Lo que ya existe no se modifica
(salvo que se marque "Sobrescribir").
