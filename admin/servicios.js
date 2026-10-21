// admin/servicios.js
// RF-11: Gestión de servicios desde el panel administrativo.
//
// - Solo administradores (protegerPagina + reglas de Firestore).
// - Alta y edición con un formulario validado.
// - Baja lógica: el servicio deja de verse en el catálogo pero se conserva.
// - Si la colección está vacía, permite cargar los servicios que antes
//   estaban escritos a mano en el HTML del catálogo.

import { protegerPagina, ROLES } from "../acceso.js";
import {
  CATEGORIAS,
  MODALIDADES,
  MONEDAS,
  PERIODOS,
  obtenerTodosLosServicios,
  crearServicio,
  actualizarServicio,
  cambiarEstadoServicio,
  cargarServiciosIniciales,
  validarServicio,
  formatearPrecio
} from "../servicios-modelo.js";

const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });

/* ------------------------------------------------------------------ */
/* Elementos                                                           */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

const cargando = $("servicios-cargando");
const vacio = $("servicios-vacio");
const sinResultados = $("servicios-sin-resultados");
const tablaWrap = $("servicios-tabla-wrap");
const tabla = $("servicios-tabla");
const mensaje = $("servicios-msg");
const buscador = $("buscar-servicio");
const filtroEstado = $("filtro-estado");

const form = $("form-servicio");
const formMsg = $("form-servicio-msg");
const btnGuardar = $("btn-guardar-servicio");
const modalServicio = new bootstrap.Modal($("modal-servicio"));
const modalEstado = new bootstrap.Modal($("modal-estado"));

let servicios = [];
let editandoId = null;          // null = alta; texto = ID del servicio que se edita
let servicioCambioEstado = null; // servicio a dar de baja o reactivar

/* ------------------------------------------------------------------ */
/* Inicio                                                              */
/* ------------------------------------------------------------------ */

if (acceso) {
  $("admin-verificando").classList.add("hidden");
  $("admin-contenido").classList.remove("hidden");
  llenarSelects();
  cargarServicios();

  buscador.addEventListener("input", renderizar);
  filtroEstado.addEventListener("change", renderizar);
  $("btn-nuevo-servicio").addEventListener("click", () => abrirFormulario(null));
  $("btn-cargar-iniciales").addEventListener("click", cargarIniciales);
  form.addEventListener("submit", guardar);
  $("btn-confirmar-estado").addEventListener("click", confirmarCambioEstado);
}

function llenarSelects() {
  const opciones = (select, pares) => {
    select.replaceChildren(...pares.map(([valor, texto]) => new Option(texto, valor)));
  };
  opciones($("srv-categoria"), Object.entries(CATEGORIAS));
  opciones($("srv-modalidad"), MODALIDADES.map((m) => [m, m]));
  opciones($("srv-moneda"), MONEDAS.map((m) => [m, m]));
  opciones($("srv-periodo"), PERIODOS.map((p) => [p, `por ${p}`]));
}

/* ------------------------------------------------------------------ */
/* Mensajes                                                            */
/* ------------------------------------------------------------------ */

function mostrarMensaje(caja, texto, tipo) {
  caja.textContent = texto;
  caja.className = `alert alert-${tipo} mb-3`;
}

function ocultarMensaje(caja) {
  caja.textContent = "";
  caja.className = "hidden";
}

function traducirError(error) {
  return error.code === "permission-denied"
    ? "Firestore rechazó la operación: tu usuario no tiene rol de administrador en la base de datos."
    : "No se pudo completar la operación. Revisá tu conexión e intentá de nuevo.";
}

/* ------------------------------------------------------------------ */
/* Listado                                                             */
/* ------------------------------------------------------------------ */

async function cargarServicios() {
  cargando.classList.remove("hidden");
  try {
    servicios = await obtenerTodosLosServicios();
    renderizar();
  } catch (error) {
    console.error("Error al cargar los servicios:", error.code, error.message);
    mostrarMensaje(mensaje, traducirError(error), "danger");
  } finally {
    cargando.classList.add("hidden");
  }
}

function renderizar() {
  vacio.classList.toggle("hidden", servicios.length > 0);
  if (servicios.length === 0) {
    tablaWrap.classList.add("hidden");
    sinResultados.classList.add("hidden");
    return;
  }

  const texto = buscador.value.trim().toLowerCase();
  const estado = filtroEstado.value;
  const visibles = servicios.filter((s) => {
    const coincideTexto =
      !texto || s.nombre.toLowerCase().includes(texto) || (s.prestador || "").toLowerCase().includes(texto);
    const coincideEstado =
      estado === "todos" || (estado === "activos" ? s.activo : !s.activo);
    return coincideTexto && coincideEstado;
  });

  tabla.replaceChildren(...visibles.map(crearFila));
  tablaWrap.classList.toggle("hidden", visibles.length === 0);
  sinResultados.classList.toggle("hidden", visibles.length > 0);
}

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function crearFila(s) {
  const fila = crear("tr", s.activo ? "" : "table-secondary");

  const celdaNombre = crear("td");
  celdaNombre.append(crear("div", "fw-semibold", s.nombre), crear("div", "small text-secondary", s.prestador || ""));

  const celdaEstado = crear("td");
  celdaEstado.append(crear("span", `badge ${s.activo ? "text-bg-success" : "text-bg-secondary"}`, s.activo ? "Activo" : "Dado de baja"));

  const acciones = crear("td", "text-end text-nowrap");
  const ver = crear("a", "btn btn-sm btn-outline-secondary me-1");
  ver.href = `../catalogo/detalle.html?id=${encodeURIComponent(s.id)}`;
  ver.target = "_blank";
  ver.rel = "noopener";
  ver.title = "Ver en el catálogo";
  ver.setAttribute("aria-label", `Ver ${s.nombre} en el catálogo`);
  ver.append(crear("i", "bi bi-eye"));

  const editar = crear("button", "btn btn-sm btn-outline-primary me-1");
  editar.type = "button";
  editar.title = "Editar";
  editar.setAttribute("aria-label", `Editar ${s.nombre}`);
  editar.append(crear("i", "bi bi-pencil"));
  editar.addEventListener("click", () => abrirFormulario(s));

  const estado = crear("button", `btn btn-sm ${s.activo ? "btn-outline-danger" : "btn-outline-success"}`, s.activo ? "Dar de baja" : "Reactivar");
  estado.type = "button";
  estado.addEventListener("click", () => pedirCambioEstado(s));

  acciones.append(ver, editar, estado);

  fila.append(
    celdaNombre,
    crear("td", "", CATEGORIAS[s.categoria] || s.categoria || "-"),
    crear("td", "text-nowrap", `${formatearPrecio(s.precio, s.moneda)} / ${s.periodo || "-"}`),
    celdaEstado,
    acciones
  );
  return fila;
}

/* ------------------------------------------------------------------ */
/* Alta y edición                                                      */
/* ------------------------------------------------------------------ */

function abrirFormulario(servicio) {
  editandoId = servicio ? servicio.id : null;
  ocultarMensaje(formMsg);
  form.reset();
  $("titulo-modal-servicio").textContent = servicio ? "Editar servicio" : "Nuevo servicio";
  btnGuardar.textContent = servicio ? "Guardar cambios" : "Crear servicio";

  if (servicio) {
    $("srv-nombre").value = servicio.nombre || "";
    $("srv-categoria").value = servicio.categoria || "cursos";
    $("srv-modalidad").value = servicio.modalidad || MODALIDADES[0];
    $("srv-descripcion-corta").value = servicio.descripcionCorta || "";
    $("srv-descripcion").value = servicio.descripcion || "";
    $("srv-objetivos").value = (servicio.objetivos || []).join("\n");
    $("srv-requisitos").value = servicio.requisitos || "";
    $("srv-certificado").checked = Boolean(servicio.certificado);
    $("srv-prestador").value = servicio.prestador || "";
    $("srv-institucion").value = servicio.institucion || "";
    $("srv-prestador-detalle").value = servicio.prestadorDetalle || "";
    $("srv-duracion").value = servicio.duracion || "";
    $("srv-carga").value = servicio.cargaHoraria || "";
    $("srv-cupo").value = servicio.cupo ?? "";
    $("srv-inicio").value = servicio.fechaInicio || "";
    $("srv-precio").value = servicio.precio ?? "";
    $("srv-moneda").value = servicio.moneda || MONEDAS[0];
    $("srv-periodo").value = servicio.periodo || PERIODOS[0];
  }

  modalServicio.show();
}

function leerFormulario() {
  const cupo = $("srv-cupo").value.trim();
  const precio = $("srv-precio").value.trim();
  return {
    nombre: $("srv-nombre").value,
    categoria: $("srv-categoria").value,
    modalidad: $("srv-modalidad").value,
    descripcionCorta: $("srv-descripcion-corta").value,
    descripcion: $("srv-descripcion").value,
    objetivos: $("srv-objetivos").value.split("\n"),
    requisitos: $("srv-requisitos").value,
    certificado: $("srv-certificado").checked,
    prestador: $("srv-prestador").value,
    institucion: $("srv-institucion").value,
    prestadorDetalle: $("srv-prestador-detalle").value,
    duracion: $("srv-duracion").value,
    cargaHoraria: $("srv-carga").value,
    cupo: cupo === "" ? null : Number(cupo),
    fechaInicio: $("srv-inicio").value,
    precio: precio === "" ? NaN : Number(precio),
    moneda: $("srv-moneda").value,
    periodo: $("srv-periodo").value
  };
}

async function guardar(evento) {
  evento.preventDefault();
  ocultarMensaje(formMsg);

  const datos = leerFormulario();
  const errores = validarServicio(datos);
  if (errores.length > 0) {
    mostrarMensaje(formMsg, errores.join(" "), "danger");
    formMsg.scrollIntoView({ block: "nearest" });
    return;
  }

  const textoBoton = btnGuardar.textContent;
  btnGuardar.disabled = true;
  btnGuardar.textContent = "Guardando...";

  try {
    if (editandoId) {
      await actualizarServicio(editandoId, datos);
      mostrarMensaje(mensaje, `Se guardaron los cambios de "${datos.nombre.trim()}".`, "success");
    } else {
      await crearServicio(datos, acceso.user.uid);
      mostrarMensaje(mensaje, `Se creó el servicio "${datos.nombre.trim()}". Ya aparece en el catálogo.`, "success");
    }
    modalServicio.hide();
    await cargarServicios();
  } catch (error) {
    console.error("Error al guardar el servicio:", error.code, error.message);
    mostrarMensaje(formMsg, traducirError(error), "danger");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = textoBoton;
  }
}

/* ------------------------------------------------------------------ */
/* Baja y reactivación                                                 */
/* ------------------------------------------------------------------ */

function pedirCambioEstado(servicio) {
  servicioCambioEstado = servicio;
  ocultarMensaje($("modal-estado-msg"));
  const darDeBaja = servicio.activo;
  $("titulo-modal-estado").textContent = darDeBaja ? "Dar de baja el servicio" : "Reactivar el servicio";
  $("texto-modal-estado").textContent = darDeBaja
    ? `"${servicio.nombre}" dejará de mostrarse en el catálogo y no se podrá adquirir. Las adquisiciones que ya existen se conservan. Podés reactivarlo cuando quieras.`
    : `"${servicio.nombre}" volverá a mostrarse en el catálogo y se podrá adquirir.`;
  const boton = $("btn-confirmar-estado");
  boton.textContent = darDeBaja ? "Dar de baja" : "Reactivar";
  boton.className = `btn ${darDeBaja ? "btn-danger" : "btn-success"}`;
  boton.disabled = false;
  modalEstado.show();
}

async function confirmarCambioEstado() {
  if (!servicioCambioEstado) return;
  const boton = $("btn-confirmar-estado");
  const nuevoEstado = !servicioCambioEstado.activo;
  boton.disabled = true;

  try {
    await cambiarEstadoServicio(servicioCambioEstado.id, nuevoEstado);
    modalEstado.hide();
    mostrarMensaje(
      mensaje,
      nuevoEstado
        ? `"${servicioCambioEstado.nombre}" se reactivó y vuelve a mostrarse en el catálogo.`
        : `"${servicioCambioEstado.nombre}" se dio de baja y ya no se muestra en el catálogo.`,
      "success"
    );
    await cargarServicios();
  } catch (error) {
    console.error("Error al cambiar el estado del servicio:", error.code, error.message);
    mostrarMensaje($("modal-estado-msg"), traducirError(error), "danger");
    $("modal-estado-msg").classList.add("mt-3");
    boton.disabled = false;
  }
}

/* ------------------------------------------------------------------ */
/* Servicios iniciales                                                 */
/* ------------------------------------------------------------------ */

async function cargarIniciales() {
  const boton = $("btn-cargar-iniciales");
  boton.disabled = true;
  boton.textContent = "Cargando...";
  try {
    const creados = await cargarServiciosIniciales(acceso.user.uid);
    mostrarMensaje(mensaje, `Se cargaron ${creados} servicios. Revisá sus datos y editá lo que haga falta.`, "success");
    await cargarServicios();
  } catch (error) {
    console.error("Error al cargar los servicios iniciales:", error.code, error.message);
    mostrarMensaje(mensaje, traducirError(error), "danger");
  } finally {
    boton.disabled = false;
    boton.textContent = "Cargar servicios iniciales";
  }
}
