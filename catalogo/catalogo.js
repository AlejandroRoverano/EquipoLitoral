// catalogo/catalogo.js
// RF-11: Catálogo de servicios leído desde Firestore, con filtro por categoría.
// Muestra solo los servicios activos (los dados de baja no aparecen).
// Reemplaza a filtros.js, que filtraba las tarjetas escritas a mano en el HTML.
// RF-20: tarjetas con imagen, precio y modalidad, buscador por texto y contador de resultados.

import { obtenerServiciosActivos, CATEGORIAS } from "../servicios-modelo.js";
import { crearTarjeta } from "./tarjeta-servicio.js";
import { obtenerResumenCalificaciones } from "../resenas-modelo.js";

const lista = document.getElementById("lista-servicios");
const cargando = document.getElementById("catalogo-cargando");
const cajaError = document.getElementById("catalogo-error");
const vacio = document.getElementById("sin-resultados");
const contador = document.getElementById("contador-resultados");
const buscador = document.getElementById("buscador");
const radios = document.querySelectorAll('input[name="categoria"]');

let servicios = [];

// "Taller de Robótica" -> "taller de robotica" (para buscar sin importar tildes ni mayúsculas)
function normalizarTexto(texto) {
  return (texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function aplicarFiltro() {
  const seleccionada = document.querySelector('input[name="categoria"]:checked')?.value || "todas";
  const texto = normalizarTexto(buscador.value.trim());
  const visibles = servicios.filter((s) =>
    (seleccionada === "todas" || s.categoria === seleccionada) &&
    (!texto || normalizarTexto(`${s.nombre} ${s.institucion} ${s.prestador} ${s.descripcionCorta} ${CATEGORIAS[s.categoria] || ""}`).includes(texto))
  );
  lista.replaceChildren(...visibles.map((s) => crearTarjeta(s)));
  vacio.classList.toggle("hidden", visibles.length > 0);
  contador.textContent = visibles.length === 1 ? "1 servicio encontrado" : `${visibles.length} servicios encontrados`;
}

// RF-21: búsqueda que viene del buscador de la barra de navegación (?q=...)
const busquedaInicial = new URLSearchParams(window.location.search).get("q");
// RF-23: categoría elegida desde la página de inicio (?categoria=robotica)
const categoriaInicial = new URLSearchParams(window.location.search).get("categoria");
const radioInicial = categoriaInicial && document.querySelector(`input[name="categoria"][value="${CSS.escape(categoriaInicial)}"]`);
if (radioInicial) radioInicial.checked = true;

if (busquedaInicial) {
  buscador.value = busquedaInicial;
  const busquedaNav = document.getElementById("busqueda-global");
  if (busquedaNav) busquedaNav.value = busquedaInicial;
}

radios.forEach((r) => r.addEventListener("change", aplicarFiltro));
buscador.addEventListener("input", aplicarFiltro);
document.getElementById("btn-limpiar").addEventListener("click", () => {
  document.getElementById("cat-todas").checked = true;
  buscador.value = "";
  aplicarFiltro();
});

try {
  const [lista, calificaciones] = await Promise.all([
    obtenerServiciosActivos(),
    // RF-26: si las reseñas no cargan, el catálogo se muestra igual (sin estrellas)
    obtenerResumenCalificaciones().catch((error) => {
      console.error("No se pudieron leer las reseñas:", error.code, error.message);
      return null;
    })
  ]);
  servicios = lista.map((s) => ({ ...s, calificacion: calificaciones?.porServicio.get(s.id) || null }));
  aplicarFiltro();
} catch (error) {
  console.error("Error al cargar el catálogo:", error.code, error.message);
  cajaError.classList.remove("hidden");
} finally {
  cargando.classList.add("hidden");
}
