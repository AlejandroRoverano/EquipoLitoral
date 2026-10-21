// catalogo/catalogo.js
// RF-11: Catálogo de servicios leído desde Firestore, con filtro por categoría.
// Muestra solo los servicios activos (los dados de baja no aparecen).
// Reemplaza a filtros.js, que filtraba las tarjetas escritas a mano en el HTML.

import { obtenerServiciosActivos, CATEGORIAS } from "../servicios-modelo.js";

const lista = document.getElementById("lista-servicios");
const cargando = document.getElementById("catalogo-cargando");
const cajaError = document.getElementById("catalogo-error");
const vacio = document.getElementById("sin-resultados");
const radios = document.querySelectorAll('input[name="categoria"]');

let servicios = [];

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function crearTarjeta(s) {
  const col = crear("div", "col-md-6 col-xl-4");
  const tarjeta = crear("article", "card-litoral h-100 p-4 d-flex flex-column");

  const duracion = crear("p", "text-secondary small mt-auto mb-3");
  const icono = crear("i", "bi bi-clock me-1");
  icono.setAttribute("aria-hidden", "true");
  duracion.append(icono, s.duracion || "");

  const enlace = crear("a", "btn btn-outline-primary w-100", "Ver Detalles");
  enlace.href = `detalle.html?id=${encodeURIComponent(s.id)}`;
  enlace.setAttribute("aria-label", `Ver detalles de ${s.nombre}`);

  tarjeta.append(
    crear("span", "badge text-bg-primary align-self-start mb-2", CATEGORIAS[s.categoria] || s.categoria),
    crear("p", "small text-secondary mb-1", s.institucion || s.prestador || ""),
    crear("h3", "h5 fw-bold", s.nombre),
    duracion,
    enlace
  );
  col.append(tarjeta);
  return col;
}

function aplicarFiltro() {
  const seleccionada = document.querySelector('input[name="categoria"]:checked')?.value || "todas";
  const visibles = servicios.filter((s) => seleccionada === "todas" || s.categoria === seleccionada);
  lista.replaceChildren(...visibles.map(crearTarjeta));
  vacio.classList.toggle("hidden", visibles.length > 0);
}

radios.forEach((r) => r.addEventListener("change", aplicarFiltro));
document.getElementById("btn-limpiar").addEventListener("click", () => {
  document.getElementById("cat-todas").checked = true;
  aplicarFiltro();
});

try {
  servicios = await obtenerServiciosActivos();
  aplicarFiltro();
} catch (error) {
  console.error("Error al cargar el catálogo:", error.code, error.message);
  cajaError.classList.remove("hidden");
} finally {
  cargando.classList.add("hidden");
}
