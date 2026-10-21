// admin/adquisiciones.js
// RF-13: Gestión de adquisiciones desde el panel administrativo.
//
// - Solo administradores (protegerPagina + reglas de Firestore, RNF-10).
// - Listado de todas las adquisiciones, de la más reciente a la más antigua.
// - Filtros por estado y por servicio; búsqueda por usuario (nombre o correo) o código de operación.
// - Detalle de cada adquisición junto con su pago simulado (colección "pagos").
// - Resumen: total de adquisiciones, estudiantes compradores e importe total por moneda.

import { protegerPagina, ROLES } from "../acceso.js";
import {
  obtenerTodasLasAdquisiciones,
  obtenerPago,
  resumirAdquisiciones,
  formatearFecha,
  formatearImporte,
  formatearMonto,
  nombreMedioPago,
  ESTADOS_ADQUISICION,
  ESTADOS_PAGO,
  NOMBRES_ESTADOS_ADQUISICION,
  NOMBRES_ESTADOS_PAGO
} from "../adquisiciones-modelo.js";

const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });

const $ = (id) => document.getElementById(id);

const cargando = $("adq-cargando");
const vacio = $("adq-vacio");
const sinResultados = $("adq-sin-resultados");
const tablaWrap = $("adq-tabla-wrap");
const tabla = $("adq-tabla");
const cajaError = $("adq-error");
const contador = $("adq-contador");
const buscador = $("buscar-adq");
const filtroEstado = $("filtro-estado");
const filtroServicio = $("filtro-servicio");

const modal = new bootstrap.Modal($("modal-adquisicion"));

let adquisiciones = [];
let consultaPago = 0; // evita mostrar el pago de otra adquisición si se abre otro detalle rápido

const COLORES_ESTADO_ADQUISICION = {
  [ESTADOS_ADQUISICION.CONFIRMADA]: "text-bg-success",
  [ESTADOS_ADQUISICION.CANCELADA]: "text-bg-secondary"
};

const COLORES_ESTADO_PAGO = {
  [ESTADOS_PAGO.APROBADO]: "text-bg-success",
  [ESTADOS_PAGO.RECHAZADO]: "text-bg-danger"
};

/* ------------------------------------------------------------------ */
/* Inicio                                                              */
/* ------------------------------------------------------------------ */

if (acceso) {
  $("admin-verificando").classList.add("hidden");
  $("admin-contenido").classList.remove("hidden");
  cargarAdquisiciones();

  buscador.addEventListener("input", renderizar);
  filtroEstado.addEventListener("change", renderizar);
  filtroServicio.addEventListener("change", renderizar);
  $("btn-limpiar-filtros").addEventListener("click", limpiarFiltros);
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

// Todos los textos se asignan con textContent: los datos nunca se interpretan como HTML
function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Para comparar sin distinguir mayúsculas ni tildes ("Sebastián" == "sebastian")
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function badgeEstadoAdquisicion(estado) {
  return crear(
    "span",
    `badge ${COLORES_ESTADO_ADQUISICION[estado] || "text-bg-secondary"}`,
    NOMBRES_ESTADOS_ADQUISICION[estado] || estado || "-"
  );
}

function badgeEstadoPago(estado) {
  return crear(
    "span",
    `badge ${COLORES_ESTADO_PAGO[estado] || "text-bg-secondary"}`,
    NOMBRES_ESTADOS_PAGO[estado] || estado || "-"
  );
}

function mostrarError(error) {
  console.error("Error al cargar las adquisiciones:", error.code, error.message);
  cajaError.textContent =
    error.code === "permission-denied"
      ? "Firestore rechazó la consulta: tu usuario no tiene rol de administrador en la base de datos."
      : "No pudimos cargar las adquisiciones. Recargá la página para intentar de nuevo.";
  cajaError.classList.remove("hidden");
}

/* ------------------------------------------------------------------ */
/* Carga, resumen y filtros                                            */
/* ------------------------------------------------------------------ */

async function cargarAdquisiciones() {
  cargando.classList.remove("hidden");
  try {
    adquisiciones = await obtenerTodasLasAdquisiciones(); // ya vienen de la más reciente a la más antigua
    mostrarResumen();
    llenarFiltros();
    renderizar();
  } catch (error) {
    mostrarError(error);
  } finally {
    cargando.classList.add("hidden");
  }
}

// El resumen cuenta todas las adquisiciones, sin importar los filtros activos
function mostrarResumen() {
  const resumen = resumirAdquisiciones(adquisiciones);
  $("resumen-total").textContent = resumen.total;
  $("resumen-compradores").textContent = resumen.compradores;

  const monedas = Object.keys(resumen.importesPorMoneda).sort();
  const items = monedas.length
    ? monedas.map((m) => crear("li", "h4 fw-bold mb-0", formatearMonto(resumen.importesPorMoneda[m], m)))
    : [crear("li", "h3 fw-bold mb-0", "-")];
  $("resumen-importes").replaceChildren(...items);
}

// Las opciones de filtro salen de los datos: solo aparecen servicios y estados que existen
function llenarFiltros() {
  const estados = [...new Set(adquisiciones.map((a) => a.estado).filter(Boolean))];
  Object.keys(NOMBRES_ESTADOS_ADQUISICION).forEach((e) => {
    if (!estados.includes(e)) estados.push(e);
  });
  filtroEstado.append(
    ...estados.map((e) => new Option(NOMBRES_ESTADOS_ADQUISICION[e] || e, e))
  );

  const servicios = new Map();
  adquisiciones.forEach((a) => {
    if (a.servicioId) servicios.set(a.servicioId, a.servicioNombre || a.servicioId);
  });
  const ordenados = [...servicios].sort((x, y) => x[1].localeCompare(y[1], "es"));
  filtroServicio.append(...ordenados.map(([id, nombre]) => new Option(nombre, id)));
}

function limpiarFiltros() {
  buscador.value = "";
  filtroEstado.value = "todos";
  filtroServicio.value = "todos";
  renderizar();
}

function renderizar() {
  const texto = normalizar(buscador.value.trim());
  const estado = filtroEstado.value;
  const servicio = filtroServicio.value;

  const visibles = adquisiciones.filter((a) => {
    if (estado !== "todos" && a.estado !== estado) return false;
    if (servicio !== "todos" && a.servicioId !== servicio) return false;
    if (!texto) return true;
    return [a.usuarioNombre, a.usuarioEmail, a.codigoOperacion].some((campo) =>
      normalizar(campo).includes(texto)
    );
  });

  contador.textContent = adquisiciones.length
    ? `${visibles.length} de ${adquisiciones.length} adquisiciones`
    : "";
  tabla.replaceChildren(...visibles.map(crearFila));

  // Mensajes claros: no hay adquisiciones en absoluto, o ninguna coincide con los filtros
  vacio.classList.toggle("hidden", adquisiciones.length > 0);
  sinResultados.classList.toggle("hidden", adquisiciones.length === 0 || visibles.length > 0);
  tablaWrap.classList.toggle("hidden", visibles.length === 0);
}

/* ------------------------------------------------------------------ */
/* Listado                                                             */
/* ------------------------------------------------------------------ */

function celda(texto, clases = "") {
  return crear("td", clases, texto);
}

function crearFila(a) {
  const fila = crear("tr");

  const usuario = crear("td");
  usuario.append(
    crear("div", "fw-semibold", a.usuarioNombre || "-"),
    crear("div", "small text-secondary text-break", a.usuarioEmail || "")
  );

  const estado = crear("td");
  estado.append(badgeEstadoAdquisicion(a.estado));

  const acciones = crear("td", "text-end");
  const ver = crear("button", "btn btn-sm btn-outline-primary text-nowrap", "Ver detalle");
  ver.type = "button";
  ver.setAttribute("aria-label", `Ver detalle de la adquisición ${a.codigoOperacion || ""} de ${a.usuarioNombre || a.usuarioEmail || "usuario"}`.replace(/\s+/g, " "));
  ver.addEventListener("click", () => abrirDetalle(a));
  acciones.append(ver);

  fila.append(
    celda(formatearFecha(a.fecha), "text-nowrap"),
    usuario,
    celda(a.servicioNombre || "-"),
    celda(formatearImporte(a), "text-nowrap"),
    celda(nombreMedioPago(a.metodoPago)),
    celda(a.codigoOperacion || "-", "font-monospace small"),
    estado,
    acciones
  );
  return fila;
}

/* ------------------------------------------------------------------ */
/* Detalle: adquisición y pago simulado                                */
/* ------------------------------------------------------------------ */

// Llena una lista <dl> con pares [etiqueta, valor]; el valor puede ser texto o un nodo
function llenarDatos(dl, pares) {
  const nodos = [];
  pares.forEach(([etiqueta, valor]) => {
    const dd = crear("dd", "col-sm-7 mb-2 text-break");
    if (valor instanceof Node) dd.append(valor);
    else dd.textContent = valor || "-";
    nodos.push(crear("dt", "col-sm-5 text-secondary fw-normal", etiqueta), dd);
  });
  dl.replaceChildren(...nodos);
}

function abrirDetalle(a) {
  $("titulo-modal-adq").textContent = a.servicioNombre || "Detalle de la adquisición";

  llenarDatos($("det-adquisicion"), [
    ["Usuario", a.usuarioNombre],
    ["Correo", a.usuarioEmail],
    ["Servicio", a.servicioNombre],
    ["Prestador", a.prestador],
    ["Fecha", formatearFecha(a.fecha)],
    ["Importe", formatearImporte(a)],
    ["Medio de pago", nombreMedioPago(a.metodoPago)],
    ["Código de operación", crear("span", "font-monospace", a.codigoOperacion || "-")],
    ["Estado", badgeEstadoAdquisicion(a.estado)],
    ["ID de adquisición", crear("span", "font-monospace small", a.id)]
  ]);

  cargarPago(a);
  modal.show();
}

async function cargarPago(a) {
  const cargandoPago = $("det-pago-cargando");
  const mensajePago = $("det-pago-msg");
  const datosPago = $("det-pago");

  cargandoPago.classList.remove("hidden");
  mensajePago.className = "hidden";
  datosPago.classList.add("hidden");

  const consulta = ++consultaPago;
  const avisar = (texto, tipo) => {
    mensajePago.textContent = texto;
    mensajePago.className = `alert alert-${tipo} mb-0`;
  };

  try {
    const pago = await obtenerPago(a.pagoId);
    if (consulta !== consultaPago) return;

    if (!pago) {
      avisar("Esta adquisición no tiene un pago asociado en el sistema.", "warning");
      return;
    }

    llenarDatos(datosPago, [
      ["Estado del pago", badgeEstadoPago(pago.estado)],
      ["Monto", formatearMonto(pago.monto, pago.moneda)],
      ["Medio de pago", nombreMedioPago(pago.metodo)],
      ["Código de operación", crear("span", "font-monospace", pago.codigoOperacion || "-")],
      ["Fecha del pago", formatearFecha(pago.fecha)],
      ["Tipo", pago.simulado ? "Pago simulado" : "-"],
      ["ID del pago", crear("span", "font-monospace small", pago.id)]
    ]);
    datosPago.classList.remove("hidden");
  } catch (error) {
    if (consulta !== consultaPago) return;
    console.error("Error al cargar el pago:", error.code, error.message);
    avisar(
      error.code === "permission-denied"
        ? "Firestore rechazó la consulta del pago: tu usuario no tiene rol de administrador en la base de datos."
        : "No pudimos cargar el pago asociado. Cerrá el detalle y volvé a intentar.",
      "danger"
    );
  } finally {
    if (consulta === consultaPago) cargandoPago.classList.add("hidden");
  }
}
