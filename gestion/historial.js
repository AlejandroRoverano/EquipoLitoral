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
    acciones.append(materiales);
    tarjeta.append(encabezado, datos, acciones);
  } else {
    tarjeta.append(encabezado, datos);
  }
  return tarjeta;
}
