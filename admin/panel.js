// admin/panel.js
// RNF-10 / RF-14: Página principal del panel administrativo, solo para usuarios
// con rol "administrador".
//
// - Sin sesión: redirige al login.
// - Con sesión pero sin rol de administrador: muestra "Acceso denegado".
// - Administrador: ve los indicadores del estado general de la plataforma,
//   calculados con los datos reales de Firestore (ver indicadores-modelo.js).
//   Las reglas de Firestore solo permiten estas lecturas a administradores.
//
// Si una fuente de datos falla, solo se marcan sus indicadores: nunca se
// muestran valores inventados.

import { protegerPagina, ROLES } from "../acceso.js";
import {
  formatearFecha,
  formatearImporte,
  formatearMonto,
  nombreMedioPago,
  resumirAdquisiciones,
  ESTADOS_ADQUISICION,
  NOMBRES_ESTADOS_ADQUISICION
} from "../adquisiciones-modelo.js";
import {
  DIAS_RECIENTES,
  cargarFuentes,
  contarUsuariosPorRol,
  contarAdquisicionesRecientes,
  serviciosMasAdquiridos,
  porcentajePagosRechazados,
  adquisicionesPorMes
} from "../indicadores-modelo.js";

const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });

const $ = (id) => document.getElementById(id);

if (acceso) {
  $("admin-verificando").classList.add("hidden");
  $("admin-contenido").classList.remove("hidden");
  cargarIndicadores();
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

const entero = (n) => n.toLocaleString("es-UY");

// Marca como "no disponibles" todos los bloques que dependen de una fuente que falló
function marcarError(fuente, error) {
  console.error(`Error al leer ${fuente}:`, error?.code, error?.message);
  document.querySelectorAll(`[data-fuente="${fuente}"]`).forEach((bloque) => {
    bloque.querySelector("[data-contenido]")?.classList.add("hidden");
    bloque.querySelector("[data-error]")?.classList.remove("hidden");
  });
  if (error?.code === "permission-denied") {
    const caja = $("admin-error");
    caja.textContent =
      "Firestore rechazó algunas consultas: tu usuario no tiene rol de administrador en la base de datos.";
    caja.classList.remove("hidden");
  }
}

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

async function cargarIndicadores() {
  const fuentes = await cargarFuentes();

  if (fuentes.usuarios.error) marcarError("usuarios", fuentes.usuarios.error);
  else mostrarUsuarios(fuentes.usuarios.datos);

  if (fuentes.servicios.error) marcarError("servicios", fuentes.servicios.error);
  else $("ind-servicios").textContent = entero(fuentes.servicios.datos.length);

  if (fuentes.adquisiciones.error) marcarError("adquisiciones", fuentes.adquisiciones.error);
  else mostrarAdquisiciones(fuentes.adquisiciones.datos);

  if (fuentes.pagos.error) marcarError("pagos", fuentes.pagos.error);
  else mostrarPagosRechazados(fuentes.pagos.datos);
}

/* ------------------------------------------------------------------ */
/* Indicadores                                                         */
/* ------------------------------------------------------------------ */

function mostrarUsuarios(usuarios) {
  const conteo = contarUsuariosPorRol(usuarios);
  $("ind-usuarios-total").textContent = entero(conteo.total);
  $("ind-usuarios-estudiante").textContent = entero(conteo[ROLES.ESTUDIANTE]);
  $("ind-usuarios-prestador").textContent = entero(conteo[ROLES.PRESTADOR]);
  $("ind-usuarios-administrador").textContent = entero(conteo[ROLES.ADMINISTRADOR]);
}

function mostrarPagosRechazados(pagos) {
  const { total, rechazados, porcentaje } = porcentajePagosRechazados(pagos);
  if (porcentaje === null) {
    $("ind-rechazados").textContent = "0";
    $("ind-rechazados-detalle").textContent = "Todavía no hay intentos de pago registrados.";
    return;
  }
  $("ind-rechazados").textContent =
    `${porcentaje.toLocaleString("es-UY", { maximumFractionDigits: 1 })} %`;
  $("ind-rechazados-detalle").textContent =
    `${entero(rechazados)} de ${entero(total)} ${total === 1 ? "intento" : "intentos"} de pago.`;
}

function mostrarAdquisiciones(adquisiciones) {
  const resumen = resumirAdquisiciones(adquisiciones);
  $("ind-adq-total").textContent = entero(resumen.total);
  $("ind-adq-30").textContent = entero(contarAdquisicionesRecientes(adquisiciones, DIAS_RECIENTES));

  // Importe confirmado, una línea por moneda
  const monedas = Object.keys(resumen.importesPorMoneda).sort();
  $("ind-importes").replaceChildren(
    ...(monedas.length
      ? monedas.map((m) => crear("li", "h2 fw-bold mb-0", formatearMonto(resumen.importesPorMoneda[m], m)))
      : [crear("li", "h2 fw-bold mb-0", "0")])
  );

  mostrarRanking(serviciosMasAdquiridos(adquisiciones));
  mostrarGrafico(adquisicionesPorMes(adquisiciones));
  mostrarUltimas(adquisiciones);
}

// Ranking: nombre, cantidad y una barra proporcional al servicio más adquirido
function mostrarRanking(ranking) {
  const lista = $("ind-top");
  $("ind-top-vacio").classList.toggle("hidden", ranking.length > 0);
  lista.classList.toggle("hidden", ranking.length === 0);

  const maximo = ranking.length ? ranking[0].cantidad : 0;
  lista.replaceChildren(
    ...ranking.map((s, i) => {
      const item = crear("li", "mb-3");
      const cabecera = crear("div", "d-flex justify-content-between gap-2 small mb-1");
      cabecera.append(
        crear("span", "fw-semibold text-break", `${i + 1}. ${s.nombre}`),
        crear("span", "text-nowrap text-secondary", s.cantidad === 1 ? "1 adquisición" : `${entero(s.cantidad)} adquisiciones`)
      );
      const barra = crear("div", "progress");
      barra.style.height = "8px";
      const relleno = crear("div", "progress-bar");
      relleno.style.width = `${(s.cantidad / maximo) * 100}%`;
      barra.append(relleno);
      item.append(cabecera, barra);
      return item;
    })
  );
}

// Gráfico de barras simple (HTML + CSS): una columna por mes, con el valor encima
function mostrarGrafico(meses) {
  const grafico = $("ind-grafico");
  $("ind-grafico-vacio").classList.toggle("hidden", meses.length > 0);
  grafico.classList.toggle("hidden", meses.length === 0);
  if (meses.length === 0) return;

  const nombres = meses.map((m) =>
    new Date(m.anio, m.mes, 1).toLocaleDateString("es-UY", { month: "short", year: "2-digit" }).replace(".", "")
  );
  const maximo = meses.reduce((mx, m) => Math.max(mx, m.cantidad), 0);

  grafico.setAttribute(
    "aria-label",
    "Adquisiciones por mes: " + meses.map((m, i) => `${nombres[i]}, ${m.cantidad}`).join("; ")
  );

  grafico.replaceChildren(
    ...meses.map((m, i) => {
      const columna = crear("div", "d-flex flex-column justify-content-end align-items-center flex-fill h-100");
      columna.style.minWidth = "0";
      columna.append(crear("span", "small fw-semibold", entero(m.cantidad)));

      const barra = crear("div", "w-100 rounded-top");
      barra.style.backgroundColor = m.cantidad ? "var(--el-navy-2, #002b5b)" : "#dee2e6";
      // Alto proporcional al máximo; un mes en 0 conserva una línea mínima visible
      barra.style.height = m.cantidad ? `${Math.max((m.cantidad / maximo) * 130, 4)}px` : "2px";
      barra.dataset.cantidad = m.cantidad;
      columna.append(barra, crear("span", "text-secondary text-nowrap", nombres[i]));
      columna.lastChild.style.fontSize = ".7rem";
      return columna;
    })
  );
}

/* ------------------------------------------------------------------ */
/* Últimas adquisiciones                                               */
/* ------------------------------------------------------------------ */

function mostrarUltimas(adquisiciones) {
  $("admin-vacio").classList.toggle("hidden", adquisiciones.length > 0);
  $("admin-tabla-wrap").classList.toggle("hidden", adquisiciones.length === 0);
  // El listado completo, con filtros y detalle, está en adquisiciones.html (RF-13)
  $("admin-tabla").replaceChildren(...adquisiciones.slice(0, 5).map(crearFila));
}

function celda(texto, clases = "") {
  return crear("td", clases, texto);
}

function crearFila(a) {
  const fila = crear("tr");

  const usuario = crear("td");
  usuario.append(
    crear("div", "fw-semibold", a.usuarioNombre || "-"),
    crear("div", "small text-secondary", a.usuarioEmail || "")
  );

  const estado = crear("td");
  const confirmada = a.estado === ESTADOS_ADQUISICION.CONFIRMADA;
  estado.append(
    crear(
      "span",
      `badge ${confirmada ? "text-bg-success" : "text-bg-secondary"}`,
      NOMBRES_ESTADOS_ADQUISICION[a.estado] || a.estado || "-"
    )
  );

  fila.append(
    celda(formatearFecha(a.fecha), "text-nowrap"),
    usuario,
    celda(a.servicioNombre || "-"),
    celda(formatearImporte(a), "text-nowrap"),
    celda(nombreMedioPago(a.metodoPago)),
    celda(a.codigoOperacion || "-", "font-monospace small"),
    estado
  );
  return fila;
}
