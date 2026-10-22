// gestion/materiales.js
// RF-16: Materiales de un servicio adquirido (materiales.html?id=...).
//
// - Sin sesión: redirige al login (y vuelve acá después de entrar).
// - Pueden verlos: quien adquirió el servicio, su prestador y el administrador.
// - Cualquier otro usuario ve un aviso para adquirir el servicio.
// Las reglas de Firestore (firestore.rules) aplican el mismo control en el servidor.

import { protegerPagina, ROLES } from "../acceso.js";
import { obtenerServicio, idVideoYoutube, esEnlaceValido } from "../servicios-modelo.js";
import { obtenerAdquisicion, ESTADOS_ADQUISICION } from "../adquisiciones-modelo.js";
import { obtenerMateriales, contarMateriales, TIPOS_MATERIAL, ICONOS_MATERIAL } from "../materiales-modelo.js";

const $ = (id) => document.getElementById(id);

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function mostrar(id) {
  ["materiales-cargando", "materiales-aviso", "materiales-contenido"].forEach((e) =>
    $(e).classList.toggle("hidden", e !== id)
  );
}

function aviso(titulo, texto, { icono = "bi-lock", enlace = null, textoEnlace = null } = {}) {
  $("aviso-icono").className = `bi ${icono} display-5 text-secondary`;
  $("aviso-titulo").textContent = titulo;
  $("aviso-texto").textContent = texto;
  if (enlace) {
    $("aviso-enlace").href = enlace;
    $("aviso-enlace").textContent = textoEnlace;
  }
  mostrar("materiales-aviso");
}

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

const acceso = await protegerPagina();

if (acceso) {
  const { user, rol } = acceso;
  const id = new URLSearchParams(window.location.search).get("id");

  try {
    const servicio = await obtenerServicio(id);
    if (!servicio) {
      aviso("No encontramos este servicio", "Puede que el enlace sea incorrecto.", { icono: "bi-search" });
    } else {
      const urlDetalle = `../catalogo/detalle.html?id=${encodeURIComponent(servicio.id)}`;
      document.title = `Materiales: ${servicio.nombre} | Equipo Litoral`;

      // ¿Puede ver los materiales? (las reglas de Firestore lo vuelven a verificar)
      let puedeVer = rol === ROLES.ADMINISTRADOR || (rol === ROLES.PRESTADOR && servicio.prestadorUid === user.uid);
      if (!puedeVer) {
        const adquisicion = await obtenerAdquisicion(user.uid, servicio.id);
        puedeVer = adquisicion?.estado === ESTADOS_ADQUISICION.CONFIRMADA;
      }

      if (!puedeVer) {
        aviso(
          "Adquirí el servicio para acceder a los materiales",
          `Los materiales de "${servicio.nombre}" están disponibles para quienes adquirieron el servicio.`,
          { enlace: urlDetalle, textoEnlace: "Ver el servicio" }
        );
      } else {
        const modulos = await obtenerMateriales(servicio.id);
        renderizar(servicio, modulos, urlDetalle);
      }
    }
  } catch (error) {
    console.error("Error al cargar los materiales:", error.code, error.message);
    aviso(
      "No pudimos cargar los materiales",
      error.code === "permission-denied"
        ? "No tenés permisos para ver los materiales de este servicio."
        : "Revisá tu conexión y recargá la página.",
      { icono: "bi-exclamation-triangle" }
    );
  }
}

/* ------------------------------------------------------------------ */
/* Presentación                                                        */
/* ------------------------------------------------------------------ */

function renderizar(servicio, modulos, urlDetalle) {
  $("materiales-servicio").textContent = servicio.nombre;
  const total = contarMateriales(modulos);
  $("materiales-subtitulo").textContent = [
    servicio.prestador,
    modulos.length ? `${modulos.length} ${modulos.length === 1 ? "módulo" : "módulos"} · ${total} ${total === 1 ? "material" : "materiales"}` : ""
  ].filter(Boolean).join(" · ");
  $("materiales-detalle").href = urlDetalle;

  $("materiales-vacio").classList.toggle("hidden", modulos.length > 0);
  $("materiales-modulos").replaceChildren(...modulos.map(crearModulo));
  mostrar("materiales-contenido");
}

function crearModulo(modulo, i) {
  const idCuerpo = `modulo-${i}`;
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
  modulo.materiales.forEach((mat) => lista.append(crearMaterial(mat)));
  contenido.append(lista);
  cuerpo.append(contenido);

  item.append(encabezado, cuerpo);
  return item;
}

function crearMaterial(mat) {
  const li = crear("li", "list-group-item py-3");
  const fila = crear("div", "d-flex flex-wrap align-items-center gap-3");

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
