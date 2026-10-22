// gestion/historial.js
// RF-10: Historial de adquisiciones del usuario.
//
// - Página protegida: sin sesión, redirige al login.
// - Lee las adquisiciones desde Firestore con el modelo de RD-08.
// - Cada usuario ve solo las suyas (se consultan por su uid y las reglas
//   de Firestore lo garantizan del lado del servidor).
// - Como los datos están en Firestore, el historial sigue disponible
//   al cerrar sesión y volver a ingresar.

import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  obtenerAdquisicionesDeUsuario,
  formatearImporte,
  formatearFecha,
  nombreMedioPago,
  ESTADOS_ADQUISICION
} from "../adquisiciones-modelo.js";
import { obtenerProgreso, calcularPorcentaje } from "../progreso-modelo.js";
import { urlCertificado } from "../certificados-modelo.js";

const cargando = document.getElementById("historial-cargando");
const vacio = document.getElementById("historial-vacio");
const avisoPrestador = document.getElementById("historial-prestador");
const cajaError = document.getElementById("historial-error");
const lista = document.getElementById("lista-historial");
const resumen = document.getElementById("resumen-historial");

// Evita que el auth-guard compita con la redirección del cierre de sesión (session.js)
let cerrandoSesion = false;
document.getElementById("btn-logout")?.addEventListener("click", () => {
  cerrandoSesion = true;
});

onAuthStateChanged(auth, async (user) => {
  // --- Auth-guard: sin sesión no hay historial que mostrar ---
  if (!user) {
    if (!cerrandoSesion) window.location.href = "../login/login.html";
    return;
  }

  try {
    // RNF-10: el historial es de los estudiantes (los únicos que adquieren servicios)
    const snapUsuario = await getDoc(doc(db, "usuarios", user.uid));
    const rol = snapUsuario.exists() && snapUsuario.data().rol ? snapUsuario.data().rol : "estudiante";
    if (rol !== "estudiante") {
      mostrarSolo(avisoPrestador);
      return;
    }

    const adquisiciones = await obtenerAdquisicionesDeUsuario(user.uid);

    if (adquisiciones.length === 0) {
      mostrarSolo(vacio);
      return;
    }

    mostrarSolo(null);
    mostrarResumen(adquisiciones);
    lista.replaceChildren(...adquisiciones.map(crearTarjeta));
    adquisiciones.forEach((a) => mostrarProgreso(user.uid, a));
  } catch (error) {
    console.error("Error al cargar el historial:", error.code, error.message);
    cajaError.textContent =
      error.code === "permission-denied"
        ? "No tenés permisos para ver estas adquisiciones. Contactá a un administrador."
        : "No pudimos cargar tus adquisiciones. Revisá tu conexión y recargá la página.";
    mostrarSolo(cajaError);
  }
});

/* ------------------------------------------------------------------ */
/* Presentación                                                        */
/* ------------------------------------------------------------------ */

// Muestra uno de los estados (vacío, error, aviso) y oculta los demás
function mostrarSolo(elemento) {
  [cargando, vacio, avisoPrestador, cajaError].forEach((el) =>
    el.classList.toggle("hidden", el !== elemento)
  );
}

function mostrarResumen(adquisiciones) {
  document.getElementById("total-adquisiciones").textContent = adquisiciones.length;
  document.getElementById("ultima-adquisicion").textContent = formatearFecha(adquisiciones[0].fecha, false);
  resumen.classList.remove("hidden");
}

// Crea un elemento con clases y texto (el texto se pone con textContent,
// así los datos guardados nunca se interpretan como HTML)
function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function dato(etiqueta, valor) {
  const col = crear("div", "col-6 col-md-3");
  col.append(crear("p", "small text-secondary mb-0", etiqueta), crear("p", "fw-semibold mb-0", valor));
  return col;
}

function crearTarjeta(a) {
  const tarjeta = crear("article", "card-litoral p-4");

  // Encabezado: nombre del servicio + estado
  const encabezado = crear("div", "d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3");
  const titulo = crear("div");
  const enlace = crear("a", "text-decoration-none", a.servicioNombre);
  enlace.href = `../catalogo/detalle.html?id=${encodeURIComponent(a.servicioId)}`;
  const h2 = crear("h2", "h5 fw-bold mb-1");
  h2.append(enlace);
  titulo.append(h2, crear("p", "small text-secondary mb-0", a.prestador ? `Prestador: ${a.prestador}` : ""));

  const confirmada = a.estado === ESTADOS_ADQUISICION.CONFIRMADA;
  const estado = crear(
    "span",
    `badge ${confirmada ? "text-bg-success" : "text-bg-secondary"}`,
    confirmada ? "Confirmada" : (a.estado || "Sin estado")
  );
  encabezado.append(titulo, estado);

  // Datos de la operación
  const datos = crear("div", "row g-3");
  datos.append(
    dato("Fecha", formatearFecha(a.fecha)),
    dato("Importe", formatearImporte(a)),
    dato("Medio de pago", nombreMedioPago(a.metodoPago)),
    dato("Código de operación", a.codigoOperacion || "-")
  );

  // RF-16: acceso a los materiales del servicio adquirido
  if (confirmada) {
    const acciones = crear("div", "mt-3 pt-3 border-top");
    const materiales = crear("a", "btn btn-sm btn-primary");
    materiales.href = `materiales.html?id=${encodeURIComponent(a.servicioId)}`;
    const icono = crear("i", "bi bi-journal-text me-1");
    icono.setAttribute("aria-hidden", "true");
    materiales.append(icono, "Ver materiales");
    // RF-24: progreso del curso (se completa con mostrarProgreso)
    const progreso = crear("div", "progreso-historial mb-3 hidden");
    progreso.id = `progreso-${a.id}`;
    acciones.append(progreso, materiales);
    tarjeta.append(encabezado, datos, acciones);
  } else {
    tarjeta.append(encabezado, datos);
  }
  return tarjeta;
}

// RF-24 / RF-25: barra de progreso y acceso al certificado, si ya lo obtuvo
async function mostrarProgreso(uid, a) {
  const caja = document.getElementById(`progreso-${a.id}`);
  if (!caja) return;
  try {
    const progreso = await obtenerProgreso(uid, a.servicioId);
    if (!progreso || !progreso.total) return;
    const porcentaje = calcularPorcentaje((progreso.vistos || []).length, progreso.total);
    const cabecera = crear("div", "d-flex justify-content-between small mb-1");
    cabecera.append(crear("span", "fw-semibold", "Progreso"), crear("span", "text-secondary", `${porcentaje} %`));
    const barra = crear("div", "progress");
    barra.setAttribute("role", "progressbar");
    barra.setAttribute("aria-label", `Progreso en ${a.servicioNombre}`);
    barra.setAttribute("aria-valuenow", String(porcentaje));
    barra.setAttribute("aria-valuemin", "0");
    barra.setAttribute("aria-valuemax", "100");
    barra.style.height = "8px";
    const relleno = crear("div", "progress-bar bg-success");
    relleno.style.width = `${porcentaje}%`;
    barra.append(relleno);
    caja.append(cabecera, barra);
    if (progreso.certificadoCodigo) {
      const enlace = crear("a", "small d-inline-block mt-2");
      enlace.href = urlCertificado(progreso.certificadoCodigo);
      enlace.textContent = "Ver mi certificado";
      caja.append(enlace);
    }
    caja.classList.remove("hidden");
  } catch (error) {
    console.error("No se pudo leer el progreso:", error.code, error.message);
  }
}
