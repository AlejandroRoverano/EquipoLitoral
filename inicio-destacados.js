// inicio-destacados.js
// RF-23: "Cursos destacados" de la página de inicio.
// Muestra hasta 3 servicios activos: primero los de la lista DESTACADOS (si existen)
// y, si faltan, completa con otros del catálogo.

import { obtenerServiciosActivos } from "./servicios-modelo.js";
import { crearTarjeta } from "./catalogo/tarjeta-servicio.js";
import { obtenerResumenCalificaciones } from "./resenas-modelo.js";

const DESTACADOS = ["desarrollo-web", "taller-robotica", "inteligencia-artificial"];
const CANTIDAD = 3;

const lista = document.getElementById("lista-destacados");
const seccion = lista.closest("section");

try {
  const [activos, calificaciones] = await Promise.all([
    obtenerServiciosActivos(),
    obtenerResumenCalificaciones().catch(() => null)
  ]);
  const servicios = activos.map((s) => ({ ...s, calificacion: calificaciones?.porServicio.get(s.id) || null }));
  const elegidos = [
    ...DESTACADOS.map((id) => servicios.find((s) => s.id === id)).filter(Boolean),
    ...servicios.filter((s) => !DESTACADOS.includes(s.id))
  ].slice(0, CANTIDAD);

  if (elegidos.length === 0) {
    seccion.classList.add("hidden");
  } else {
    lista.replaceChildren(...elegidos.map((s) => crearTarjeta(s, "col-md-6 col-lg-4")));
  }
} catch (error) {
  console.error("Error al cargar los cursos destacados:", error.code, error.message);
  seccion.classList.add("hidden");
}
