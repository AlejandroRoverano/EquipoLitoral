// materiales-vista.js
// RF-16 / RF-21: cómo se muestran los módulos y materiales de un curso.
// Lo usan la página de materiales (gestion/materiales.js) y la sección
// "Contenido del curso" del detalle (catalogo/detalle.js).
// Solo arma la interfaz: quién puede leer los materiales lo controlan
// las reglas de Firestore (firestore.rules).

import { idVideoYoutube, esEnlaceValido } from "./servicios-modelo.js";
import { TIPOS_MATERIAL, ICONOS_MATERIAL } from "./materiales-modelo.js";

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Un módulo como ítem de acordeón. "prefijo" evita ids repetidos si hay más de un acordeón.
// RF-24: si se pasa "progreso" ({ vistos: Set, alMarcar(clave, marcado) }), cada material
// tiene una casilla para marcarlo como visto.
export function crearModulo(modulo, i, prefijo = "modulo", progreso = null) {
  const idCuerpo = `${prefijo}-${i}`;
  const item = crear("div", "accordion-item");

  const encabezado = crear("h2", "accordion-header");
  const boton = crear("button", `accordion-button fw-semibold${i === 0 ? "" : " collapsed"}`);
  boton.type = "button";
  boton.setAttribute("data-bs-toggle", "collapse");
  boton.setAttribute("data-bs-target", `#${idCuerpo}`);
  boton.setAttribute("aria-expanded", i === 0 ? "true" : "false");
  boton.setAttribute("aria-controls", idCuerpo);
  boton.append(
    crear("span", "me-2", modulo.titulo),
    crear("span", "badge text-bg-light ms-auto me-2", `${modulo.materiales.length} ${modulo.materiales.length === 1 ? "material" : "materiales"}`)
  );
  encabezado.append(boton);

  const cuerpo = crear("div", `accordion-collapse collapse${i === 0 ? " show" : ""}`);
  cuerpo.id = idCuerpo;
  const contenido = crear("div", "accordion-body p-0");
  const lista = crear("ul", "list-group list-group-flush");
  modulo.materiales.forEach((mat, j) => lista.append(crearMaterial(mat, `${i}-${j}`, progreso)));
  contenido.append(lista);
  cuerpo.append(contenido);

  item.append(encabezado, cuerpo);
  return item;
}

export function crearMaterial(mat, clave = null, progreso = null) {
  const li = crear("li", "list-group-item py-3");
  const fila = crear("div", "d-flex flex-wrap align-items-center gap-3");

  // RF-24: casilla "visto"
  if (progreso && clave) {
    const casilla = crear("input", "form-check-input casilla-visto mt-0 flex-shrink-0");
    casilla.type = "checkbox";
    casilla.checked = progreso.vistos.has(clave);
    casilla.title = "Marcar como visto";
    casilla.setAttribute("aria-label", `Marcar "${mat.titulo}" como visto`);
    li.classList.toggle("material-visto", casilla.checked);
    casilla.addEventListener("change", () => {
      li.classList.toggle("material-visto", casilla.checked);
      progreso.alMarcar(clave, casilla.checked);
    });
    fila.append(casilla);
  }

  const icono = crear("i", `bi ${ICONOS_MATERIAL[mat.tipo] || "bi-link-45deg"} fs-4 text-success`);
  icono.setAttribute("aria-hidden", "true");
  const texto = crear("div", "me-auto");
  texto.append(crear("p", "fw-semibold mb-0", mat.titulo), crear("p", "small text-secondary mb-0", TIPOS_MATERIAL[mat.tipo] || "Enlace"));

  // Solo se abren enlaces https:// (nunca "javascript:" u otros esquemas)
  let abrir;
  if (esEnlaceValido(mat.enlace)) {
    abrir = crear("a", "btn btn-sm btn-outline-primary", "Abrir");
    abrir.href = mat.enlace;
    abrir.target = "_blank";
    abrir.rel = "noopener noreferrer";
    abrir.setAttribute("aria-label", `Abrir ${mat.titulo} en una pestaña nueva`);
  } else {
    abrir = crear("span", "small text-danger", "Enlace no válido");
  }

  fila.append(icono, texto, abrir);
  li.append(fila);

  // Los videos de YouTube se ven dentro de la página
  const idVideo = mat.tipo === "video" ? idVideoYoutube(mat.enlace) : null;
  if (idVideo) {
    const marco = crear("div", "ratio ratio-16x9 rounded overflow-hidden mt-3");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${idVideo}`;
    iframe.title = `Video: ${mat.titulo}`;
    iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    marco.append(iframe);
    li.append(marco);
  }

  // Las imágenes también se ven dentro de la página (solo enlaces https://)
  if (mat.tipo === "imagen" && esEnlaceValido(mat.enlace)) {
    const imagen = document.createElement("img");
    imagen.src = mat.enlace;
    imagen.alt = mat.titulo;
    imagen.loading = "lazy";
    imagen.referrerPolicy = "no-referrer";
    imagen.className = "img-fluid rounded border mt-3";
    imagen.style.maxHeight = "360px";
    imagen.addEventListener("error", () => {
      imagen.replaceWith(crear("p", "small text-danger mt-3 mb-0", "No se pudo cargar la imagen."));
    });
    li.append(imagen);
  }
  return li;
}
