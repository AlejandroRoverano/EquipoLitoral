// catalogo/tarjeta-servicio.js
// RF-20 / RF-23: tarjeta de un servicio (imagen, categoría, modalidad, precio y botones).
// La usan el catálogo y los "cursos destacados" de la página de inicio.

import { CATEGORIAS, formatearPrecio } from "../servicios-modelo.js";
import { imagenDeServicio } from "./imagenes.js";
import { formatearPuntaje } from "../resenas-modelo.js";

// Dirección de la carpeta catalogo/, para que los enlaces funcionen desde cualquier página
const CARPETA_CATALOGO = new URL("./", import.meta.url);

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

function urlDetalle(s, extra = "") {
  return new URL(`detalle.html?id=${encodeURIComponent(s.id)}${extra}`, CARPETA_CATALOGO).href;
}

// clasesColumna: clases de Bootstrap de la columna que envuelve la tarjeta
export function crearTarjeta(s, clasesColumna = "col-md-6 col-xl-4") {
  const col = crear("div", clasesColumna);
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
  enlace.href = urlDetalle(s);
  enlace.setAttribute("aria-label", `Ver detalles de ${s.nombre}`);

  // RF-22: prueba gratis de un día. El detalle la activa (pide sesión si hace falta).
  const prueba = crear("a", "btn btn-outline-success w-100 mt-2");
  prueba.href = urlDetalle(s, "&prueba=activar");
  prueba.setAttribute("aria-label", `Probar gratis un día ${s.nombre}`);
  prueba.append(icono("bi-gift"), "Probar gratis 1 día");

  // RF-26: calificación de compradores reales (s.calificacion = { promedio, cantidad })
  const institucion = crear("p", "small text-secondary fw-medium mb-1 d-flex flex-wrap justify-content-between gap-2");
  institucion.append(crear("span", "", s.institucion || s.prestador || ""));
  if (s.calificacion?.cantidad > 0) {
    const puntaje = crear("span", "calificacion-tarjeta text-nowrap");
    puntaje.setAttribute("aria-label", `${formatearPuntaje(s.calificacion.promedio)} de 5 estrellas, ${s.calificacion.cantidad} opiniones`);
    const estrella = crear("i", "bi bi-star-fill me-1");
    estrella.setAttribute("aria-hidden", "true");
    puntaje.append(estrella, `${formatearPuntaje(s.calificacion.promedio)} (${s.calificacion.cantidad})`);
    institucion.append(puntaje);
  }

  cuerpo.append(
    institucion,
    titulo,
    crear("p", "tarjeta-servicio__descripcion text-secondary small mb-3", s.descripcionCorta || ""),
    pie,
    enlace
  );
  if (s.tieneMateriales) cuerpo.append(prueba);
  if (s.certificado) {
    const cert = crear("span", "badge text-bg-light border text-success align-self-start mb-2");
    cert.append(icono("bi-patch-check"), "Con certificado");
    cuerpo.insertBefore(cert, titulo);
  }

  tarjeta.append(contImagen, cuerpo);
  col.append(tarjeta);
  return col;
}
