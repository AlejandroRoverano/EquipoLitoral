// admin/usuarios.js
// RF-12: Gestión de usuarios desde el panel administrativo.
//
// - Solo administradores (protegerPagina + reglas de Firestore).
// - Listado con nombre, correo, rol y fecha de registro; búsqueda y filtro por rol.
// - Ficha de cada usuario con su cantidad de adquisiciones y cambio de rol.
// - Un administrador no puede quitarse su propio rol de administrador.

import { protegerPagina, ROLES } from "../acceso.js";
import {
  NOMBRES_ROLES,
  obtenerTodosLosUsuarios,
  contarAdquisiciones,
  cambiarRol
} from "../usuarios-modelo.js";
import { formatearFecha } from "../adquisiciones-modelo.js";

const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });

const $ = (id) => document.getElementById(id);

const cargando = $("usuarios-cargando");
const sinResultados = $("usuarios-sin-resultados");
const tablaWrap = $("usuarios-tabla-wrap");
const tabla = $("usuarios-tabla");
const mensaje = $("usuarios-msg");
const contador = $("usuarios-contador");
const buscador = $("buscar-usuario");
const filtroRol = $("filtro-rol");

const modal = new bootstrap.Modal($("modal-usuario"));
const selectRol = $("ficha-nuevo-rol");
const btnGuardarRol = $("btn-guardar-rol");
const fichaMsg = $("ficha-msg");

let usuarios = [];
let seleccionado = null;
let consultaAdquisiciones = 0; // evita mostrar un conteo viejo si se abre otra ficha rápido

const COLORES_ROL = {
  [ROLES.ESTUDIANTE]: "text-bg-primary",
  [ROLES.PRESTADOR]: "text-bg-info",
  [ROLES.ADMINISTRADOR]: "text-bg-danger"
};

/* ------------------------------------------------------------------ */
/* Inicio                                                              */
/* ------------------------------------------------------------------ */

if (acceso) {
  $("admin-verificando").classList.add("hidden");
  $("admin-contenido").classList.remove("hidden");
  cargarUsuarios();

  buscador.addEventListener("input", renderizar);
  filtroRol.addEventListener("change", renderizar);
  selectRol.addEventListener("change", actualizarBotonGuardar);
  btnGuardarRol.addEventListener("click", guardarRol);
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function badgeRol(rol) {
  return crear("span", `badge ${COLORES_ROL[rol] || "text-bg-secondary"}`, NOMBRES_ROLES[rol] || rol);
}

function mostrarMensaje(caja, texto, tipo) {
  caja.textContent = texto;
  caja.className = `alert alert-${tipo} ${caja === fichaMsg ? "mt-3 mb-0" : "mb-3"}`;
}

function ocultarMensaje(caja) {
  caja.textContent = "";
  caja.className = "hidden";
}

function traducirError(error) {
  if (error.code === "propio-rol") return "No podés quitarte tu propio rol de administrador.";
  if (error.code === "permission-denied") {
    return "Firestore rechazó la operación: tu usuario no tiene permisos de administrador en la base de datos.";
  }
  return "No se pudo completar la operación. Revisá tu conexión e intentá de nuevo.";
}

/* ------------------------------------------------------------------ */
/* Listado                                                             */
/* ------------------------------------------------------------------ */

async function cargarUsuarios() {
  cargando.classList.remove("hidden");
  try {
    usuarios = await obtenerTodosLosUsuarios();
    renderizar();
  } catch (error) {
    console.error("Error al cargar los usuarios:", error.code, error.message);
    mostrarMensaje(mensaje, traducirError(error), "danger");
  } finally {
    cargando.classList.add("hidden");
  }
}

function renderizar() {
  const texto = buscador.value.trim().toLowerCase();
  const rol = filtroRol.value;
  const visibles = usuarios.filter((u) => {
    const coincideTexto =
      !texto || u.nombre.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto);
    return coincideTexto && (rol === "todos" || u.rol === rol);
  });

  contador.textContent = `${visibles.length} de ${usuarios.length} usuarios`;
  tabla.replaceChildren(...visibles.map(crearFila));
  tablaWrap.classList.toggle("hidden", visibles.length === 0);
  sinResultados.classList.toggle("hidden", visibles.length > 0 || usuarios.length === 0);
}

function crearFila(u) {
  const fila = crear("tr");
  const esYo = u.uid === acceso.user.uid;

  const celdaUsuario = crear("td");
  const nombre = crear("div", "fw-semibold", u.nombre || "(sin nombre)");
  if (esYo) nombre.append(crear("span", "badge text-bg-light ms-2", "Vos"));
  celdaUsuario.append(nombre, crear("div", "small text-secondary text-break", u.email));

  const celdaRol = crear("td");
  celdaRol.append(badgeRol(u.rol));

  const acciones = crear("td", "text-end");
  const ver = crear("button", "btn btn-sm btn-outline-primary", "Ver ficha");
  ver.type = "button";
  ver.setAttribute("aria-label", `Ver ficha de ${u.nombre || u.email}`);
  ver.addEventListener("click", () => abrirFicha(u));
  acciones.append(ver);

  fila.append(celdaUsuario, celdaRol, crear("td", "text-nowrap", formatearFecha(u.creadoEn, false)), acciones);
  return fila;
}

/* ------------------------------------------------------------------ */
/* Ficha del usuario                                                   */
/* ------------------------------------------------------------------ */

function abrirFicha(u) {
  seleccionado = u;
  const esYo = u.uid === acceso.user.uid;
  ocultarMensaje(fichaMsg);

  $("titulo-modal-usuario").textContent = u.nombre || "(sin nombre)";
  $("ficha-email").textContent = u.email;
  $("ficha-registro").textContent = formatearFecha(u.creadoEn);
  $("ficha-rol").replaceChildren(badgeRol(u.rol));

  // No se puede cambiar el propio rol (evita que la plataforma quede sin administradores)
  selectRol.value = u.rol;
  selectRol.disabled = esYo;
  $("ficha-ayuda-rol").textContent = esYo
    ? "No podés cambiar tu propio rol. Otro administrador puede hacerlo."
    : "El cambio se aplica la próxima vez que el usuario cargue una página.";
  actualizarBotonGuardar();

  // Cantidad de adquisiciones (se consulta al abrir la ficha)
  const celda = $("ficha-adquisiciones");
  celda.textContent = "Consultando...";
  const consulta = ++consultaAdquisiciones;
  contarAdquisiciones(u.uid)
    .then((cantidad) => {
      if (consulta !== consultaAdquisiciones) return;
      celda.textContent = cantidad === 1 ? "1 adquisición" : `${cantidad} adquisiciones`;
    })
    .catch((error) => {
      if (consulta !== consultaAdquisiciones) return;
      console.error("Error al contar adquisiciones:", error.code, error.message);
      celda.textContent = "No se pudo consultar";
    });

  modal.show();
}

function actualizarBotonGuardar() {
  btnGuardarRol.disabled = !seleccionado || selectRol.disabled || selectRol.value === seleccionado.rol;
}

async function guardarRol() {
  if (!seleccionado) return;
  const nuevoRol = selectRol.value;
  const nombre = seleccionado.nombre || seleccionado.email;
  ocultarMensaje(fichaMsg);
  btnGuardarRol.disabled = true;
  btnGuardarRol.textContent = "Guardando...";

  try {
    await cambiarRol(seleccionado.uid, nuevoRol, acceso.user.uid);
    seleccionado.rol = nuevoRol; // el mismo objeto está en la lista
    modal.hide();
    mostrarMensaje(mensaje, `${nombre} ahora tiene el rol ${NOMBRES_ROLES[nuevoRol]}.`, "success");
    renderizar();
  } catch (error) {
    console.error("Error al cambiar el rol:", error.code, error.message);
    mostrarMensaje(fichaMsg, traducirError(error), "danger");
    actualizarBotonGuardar();
  } finally {
    btnGuardarRol.textContent = "Guardar rol";
  }
}
