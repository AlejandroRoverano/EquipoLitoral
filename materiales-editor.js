// materiales-editor.js
// RF-16: Ventana para cargar los materiales de un servicio, organizados en módulos.
// La usan el administrador (admin/servicios.html) y el prestador (gestion/mis-servicios.html)
// a través de servicios-gestor.js. La página debe incluir el modal "modal-materiales".

import {
  TIPOS_MATERIAL,
  MAX_MODULOS,
  MAX_MATERIALES_POR_MODULO,
  obtenerMateriales,
  guardarMateriales,
  normalizarModulos,
  validarModulos,
  contarMateriales
} from "./materiales-modelo.js";

const $ = (id) => document.getElementById(id);

let modal = null;
let servicioActual = null;
let alGuardar = null;
let apertura = 0;

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function mostrarMensaje(texto, tipo) {
  const caja = $("materiales-msg");
  caja.textContent = texto;
  caja.className = `alert alert-${tipo} mb-3`;
}

function ocultarMensaje() {
  const caja = $("materiales-msg");
  caja.textContent = "";
  caja.className = "hidden";
}

function iniciar() {
  if (modal) return;
  modal = new bootstrap.Modal($("modal-materiales"));
  $("btn-agregar-modulo").addEventListener("click", () => {
    agregarModulo({ titulo: "", materiales: [{ titulo: "", tipo: "lectura", enlace: "" }] });
    actualizarContadores();
    $("materiales-modulos").lastElementChild?.querySelector("input")?.focus();
  });
  $("btn-guardar-materiales").addEventListener("click", guardar);
  $("materiales-modulos").addEventListener("input", actualizarContadores);
}

/* ------------------------------------------------------------------ */
/* Apertura                                                            */
/* ------------------------------------------------------------------ */

/**
 * Abre el editor de materiales de un servicio.
 * @param {object} servicio  Servicio ({ id, nombre }).
 * @param {(modulos: object[]) => void} [onGuardado]  Se llama después de guardar.
 */
export async function abrirEditorMateriales(servicio, onGuardado) {
  iniciar();
  servicioActual = servicio;
  alGuardar = onGuardado || null;
  const esta = ++apertura;

  ocultarMensaje();
  $("titulo-modal-materiales").textContent = `Materiales: ${servicio.nombre}`;
  $("materiales-modulos").replaceChildren(crear("p", "text-secondary", "Cargando materiales..."));
  $("btn-guardar-materiales").disabled = true;
  $("btn-agregar-modulo").disabled = true;
  modal.show();

  try {
    const modulos = await obtenerMateriales(servicio.id);
    if (esta !== apertura) return;
    $("materiales-modulos").replaceChildren();
    if (modulos.length === 0) {
      // Punto de partida: el módulo inicial
      agregarModulo({ titulo: "Módulo 1 - Introducción", materiales: [{ titulo: "", tipo: "lectura", enlace: "" }] });
    } else {
      modulos.forEach(agregarModulo);
    }
    $("btn-guardar-materiales").disabled = false;
    $("btn-agregar-modulo").disabled = false;
    actualizarContadores();
  } catch (error) {
    if (esta !== apertura) return;
    console.error("No se pudieron cargar los materiales:", error.code, error.message);
    $("materiales-modulos").replaceChildren();
    mostrarMensaje(
      error.code === "permission-denied"
        ? "No tenés permisos para ver los materiales de este servicio."
        : "No se pudieron cargar los materiales. Cerrá esta ventana y volvé a intentar.",
      "danger"
    );
  }
}

/* ------------------------------------------------------------------ */
/* Construcción del formulario                                         */
/* ------------------------------------------------------------------ */

let contadorIds = 0;
const nuevoId = (prefijo) => `${prefijo}-${++contadorIds}`;

function botonIcono(icono, etiqueta, clases) {
  const boton = crear("button", `btn btn-sm ${clases}`);
  boton.type = "button";
  boton.title = etiqueta;
  boton.setAttribute("aria-label", etiqueta);
  const i = crear("i", `bi ${icono}`);
  i.setAttribute("aria-hidden", "true");
  boton.append(i);
  return boton;
}

function agregarModulo(modulo) {
  const tarjeta = crear("section", "card-litoral p-3 mb-3 modulo-material");

  const encabezado = crear("div", "d-flex align-items-end gap-2 mb-3");
  const grupo = crear("div", "flex-grow-1");
  const idTitulo = nuevoId("modulo-titulo");
  const etiqueta = crear("label", "form-label fw-semibold small mb-1 numero-modulo", "Módulo");
  etiqueta.htmlFor = idTitulo;
  const titulo = crear("input", "form-control campo-titulo-modulo");
  titulo.id = idTitulo;
  titulo.type = "text";
  titulo.maxLength = 100;
  titulo.placeholder = "Ej: Módulo 1 - Introducción";
  titulo.value = modulo.titulo || "";
  grupo.append(etiqueta, titulo);

  const subir = botonIcono("bi-arrow-up", "Subir módulo", "btn-outline-secondary");
  subir.addEventListener("click", () => {
    if (tarjeta.previousElementSibling) tarjeta.parentElement.insertBefore(tarjeta, tarjeta.previousElementSibling);
    actualizarContadores();
  });
  const quitar = botonIcono("bi-trash", "Quitar módulo", "btn-outline-danger");
  quitar.addEventListener("click", () => {
    tarjeta.remove();
    actualizarContadores();
  });
  encabezado.append(grupo, subir, quitar);

  const lista = crear("div", "lista-materiales d-flex flex-column gap-2");
  (modulo.materiales || []).forEach((mat) => lista.append(filaMaterial(mat)));

  const agregar = crear("button", "btn btn-sm btn-outline-primary mt-2 btn-agregar-material");
  agregar.type = "button";
  agregar.append(crear("i", "bi bi-plus-lg me-1"), "Agregar material");
  agregar.addEventListener("click", () => {
    if (lista.children.length >= MAX_MATERIALES_POR_MODULO) return;
    lista.append(filaMaterial({ titulo: "", tipo: "lectura", enlace: "" }));
    actualizarContadores();
    lista.lastElementChild.querySelector("input").focus();
  });

  tarjeta.append(encabezado, lista, agregar);
  $("materiales-modulos").append(tarjeta);
}

function filaMaterial(mat) {
  const fila = crear("div", "row g-2 align-items-center fila-material");

  const colTitulo = crear("div", "col-md-4");
  const titulo = crear("input", "form-control form-control-sm campo-titulo");
  titulo.type = "text";
  titulo.maxLength = 120;
  titulo.placeholder = "Título del material";
  titulo.setAttribute("aria-label", "Título del material");
  titulo.value = mat.titulo || "";
  colTitulo.append(titulo);

  const colTipo = crear("div", "col-md-2 col-5");
  const tipo = crear("select", "form-select form-select-sm campo-tipo");
  tipo.setAttribute("aria-label", "Tipo de material");
  Object.entries(TIPOS_MATERIAL).forEach(([valor, texto]) => tipo.append(new Option(texto, valor)));
  tipo.value = TIPOS_MATERIAL[mat.tipo] ? mat.tipo : "lectura";
  colTipo.append(tipo);

  const colEnlace = crear("div", "col-md-5 col-7");
  const enlace = crear("input", "form-control form-control-sm campo-enlace");
  enlace.type = "url";
  enlace.placeholder = "https://...";
  enlace.setAttribute("aria-label", "Enlace del material");
  enlace.value = mat.enlace || "";
  colEnlace.append(enlace);

  const colQuitar = crear("div", "col-md-1 text-end");
  const quitar = botonIcono("bi-x-lg", "Quitar material", "btn-outline-danger");
  quitar.addEventListener("click", () => {
    fila.remove();
    actualizarContadores();
  });
  colQuitar.append(quitar);

  fila.append(colTitulo, colTipo, colEnlace, colQuitar);
  return fila;
}

// Numera los módulos y muestra el resumen
function actualizarContadores() {
  const tarjetas = [...$("materiales-modulos").querySelectorAll(".modulo-material")];
  tarjetas.forEach((t, i) => {
    t.querySelector(".numero-modulo").textContent = `Título del módulo ${i + 1}`;
    t.querySelector("button[title='Subir módulo']").disabled = i === 0;
    t.querySelector(".btn-agregar-material").disabled =
      t.querySelectorAll(".fila-material").length >= MAX_MATERIALES_POR_MODULO;
  });
  $("btn-agregar-modulo").disabled = tarjetas.length >= MAX_MODULOS;
  const total = contarMateriales(leerModulos());
  $("materiales-resumen").textContent =
    `${tarjetas.length} ${tarjetas.length === 1 ? "módulo" : "módulos"} · ${total} ${total === 1 ? "material" : "materiales"}`;
}

function leerModulos() {
  return [...$("materiales-modulos").querySelectorAll(".modulo-material")].map((t) => ({
    titulo: t.querySelector(".campo-titulo-modulo").value,
    materiales: [...t.querySelectorAll(".fila-material")].map((f) => ({
      titulo: f.querySelector(".campo-titulo").value,
      tipo: f.querySelector(".campo-tipo").value,
      enlace: f.querySelector(".campo-enlace").value
    }))
  }));
}

/* ------------------------------------------------------------------ */
/* Guardado                                                            */
/* ------------------------------------------------------------------ */

async function guardar() {
  ocultarMensaje();
  const modulos = normalizarModulos(leerModulos());
  const errores = validarModulos(modulos);
  if (errores.length > 0) {
    mostrarMensaje(errores.slice(0, 5).join(" ") + (errores.length > 5 ? " ..." : ""), "danger");
    $("materiales-msg").scrollIntoView({ block: "nearest" });
    return;
  }

  const boton = $("btn-guardar-materiales");
  boton.disabled = true;
  boton.textContent = "Guardando...";
  try {
    const guardados = await guardarMateriales(servicioActual.id, modulos);
    modal.hide();
    if (alGuardar) alGuardar(guardados);
  } catch (error) {
    console.error("Error al guardar los materiales:", error.code, error.message);
    mostrarMensaje(
      error.code === "permission-denied"
        ? "Firestore rechazó la operación: no tenés permisos para modificar los materiales de este servicio."
        : "No se pudieron guardar los materiales. Revisá tu conexión e intentá de nuevo.",
      "danger"
    );
  } finally {
    boton.disabled = false;
    boton.textContent = "Guardar materiales";
  }
}
