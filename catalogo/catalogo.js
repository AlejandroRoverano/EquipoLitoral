// catalogo/catalogo.js
// RF-11: Catálogo de servicios leído desde Firestore, con filtro por categoría.
// Muestra solo los servicios activos (los dados de baja no aparecen).
// Reemplaza a filtros.js, que filtraba las tarjetas escritas a mano en el HTML.
// RF-20: tarjetas con imagen, precio y modalidad, buscador por texto y contador de resultados.

import { obtenerServiciosActivos, CATEGORIAS, formatearPrecio } from "../servicios-modelo.js";
import { imagenDeServicio } from "./imagenes.js";

const lista = document.getElementById("lista-servicios");
const cargando = document.getElementById("catalogo-cargando");
const cajaError = document.getElementById("catalogo-error");
const vacio = document.getElementById("sin-resultados");
const contador = document.getElementById("contador-resultados");
const buscador = document.getElementById("buscador");
const radios = document.querySelectorAll('input[name="categoria"]');

let servicios = [];

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function icono(clase) {
  const i = crear("i", `bi ${clase} me-1`);
  i.setAttribute("aria-hidden", "true");
  return i;
}

// "Taller de Robótica" -> "taller de robotica" (para buscar sin importar tildes ni mayúsculas)
function normalizarTexto(texto) {
  return (texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function crearTarjeta(s) {
  const col = crear("div", "col-md-6 col-xl-4");
  const tarjeta = crear("article", "tarjeta-servicio");

  // Imagen con la categoría y la modalidad encima
  const contImagen = crear("div", "tarjeta-servicio__imagen");
  const img = crear("img");
  img.src = imagenDeServicio(s);
  img.alt = "";
  img.loading = "lazy";
  contImagen.append(img, crear("span", "tarjeta-servicio__categoria", CATEGORIAS[s.categoria] || s.categoria));
  if (s.modalidad) {
    const modalidad = crear("span", "tarjeta-servicio__modalidad");
    modalidad.append(icono(s.modalidad === "Virtual" ? "bi-wifi" : "bi-geo-alt"), s.modalidad);
    contImagen.append(modalidad);
  }

  const cuerpo = crear("div", "tarjeta-servicio__cuerpo");
  const titulo = crear("h3", "h5 fw-bold mb-2", s.nombre);
  const pie = crear("div", "tarjeta-servicio__pie");
  const duracion = crear("span", "text-secondary small");
  duracion.append(icono("bi-clock"), s.duracion || "");
  const precio = crear("span", "tarjeta-servicio__precio", formatearPrecio(s.precio, s.moneda));
  if (s.periodo && typeof s.precio === "number") precio.append(crear("small", "", ` / ${s.periodo}`));
  pie.append(duracion, precio);

  const enlace = crear("a", "btn btn-primary w-100", "Ver detalles");
  enlace.href = `detalle.html?id=${encodeURIComponent(s.id)}`;
  enlace.setAttribute("aria-label", `Ver detalles de ${s.nombre}`);

  cuerpo.append(
    crear("p", "small text-secondary fw-medium mb-1", s.institucion || s.prestador || ""),
    titulo,
    crear("p", "tarjeta-servicio__descripcion text-secondary small mb-3", s.descripcionCorta || ""),
    pie,
    enlace
  );
  if (s.certificado) {
    const cert = crear("span", "badge text-bg-light border text-success align-self-start mb-2");
    cert.append(icono("bi-patch-check"), "Con certificado");
    cuerpo.insertBefore(cert, titulo);
  }

  tarjeta.append(contImagen, cuerpo);
  col.append(tarjeta);
  return col;
}

function aplicarFiltro() {
  const seleccionada = document.querySelector('input[name="categoria"]:checked')?.value || "todas";
  const texto = normalizarTexto(buscador.value.trim());
  const visibles = servicios.filter((s) =>
    (seleccionada === "todas" || s.categoria === seleccionada) &&
    (!texto || normalizarTexto(`${s.nombre} ${s.institucion} ${s.prestador}`).includes(texto))
  );
  lista.replaceChildren(...visibles.map(crearTarjeta));
  vacio.classList.toggle("hidden", visibles.length > 0);
  contador.textContent = visibles.length === 1 ? "1 servicio encontrado" : `${visibles.length} servicios encontrados`;
}

radios.forEach((r) => r.addEventListener("change", aplicarFiltro));
buscador.addEventListener("input", aplicarFiltro);
document.getElementById("btn-limpiar").addEventListener("click", () => {
  document.getElementById("cat-todas").checked = true;
  buscador.value = "";
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
