// admin/panel.js
// RNF-10: Sección administrativa, solo para usuarios con rol "administrador".
//
// - Sin sesión: redirige al login.
// - Con sesión pero sin rol de administrador: muestra "Acceso denegado".
// - Administrador: ve el resumen y las últimas adquisiciones de la plataforma.
//   (Las reglas de Firestore solo permiten esta lectura a administradores.)
//   La gestión completa está en adquisiciones.html (RF-13).

import { protegerPagina, ROLES } from "../acceso.js";
import {
  obtenerTodasLasAdquisiciones,
  formatearFecha,
  formatearImporte,
  nombreMedioPago,
  ESTADOS_ADQUISICION
} from "../adquisiciones-modelo.js";

const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });

if (acceso) {
  document.getElementById("admin-verificando").classList.add("hidden");
  document.getElementById("admin-contenido").classList.remove("hidden");
  cargarAdquisiciones();
}

async function cargarAdquisiciones() {
  const tabla = document.getElementById("admin-tabla");
  try {
    const adquisiciones = await obtenerTodasLasAdquisiciones();

    document.getElementById("admin-total").textContent = adquisiciones.length;
    document.getElementById("admin-compradores").textContent =
      new Set(adquisiciones.map((a) => a.uid)).size;

    if (adquisiciones.length === 0) {
      document.getElementById("admin-vacio").classList.remove("hidden");
      return;
    }

    // El listado completo, con filtros y detalle, está en admin/adquisiciones.html (RF-13)
    tabla.replaceChildren(...adquisiciones.slice(0, 5).map(crearFila));
  } catch (error) {
    console.error("Error al cargar las adquisiciones:", error.code, error.message);
    const caja = document.getElementById("admin-error");
    caja.textContent =
      error.code === "permission-denied"
        ? "Firestore rechazó la consulta: tu usuario no tiene rol de administrador en la base de datos."
        : "No pudimos cargar las adquisiciones. Recargá la página para intentar de nuevo.";
    caja.classList.remove("hidden");
  }
}

// Celda con texto (textContent: los datos nunca se interpretan como HTML)
function celda(texto, clases = "") {
  const td = document.createElement("td");
  if (clases) td.className = clases;
  td.textContent = texto;
  return td;
}

function crearFila(a) {
  const fila = document.createElement("tr");

  const usuario = document.createElement("td");
  const nombre = document.createElement("div");
  nombre.className = "fw-semibold";
  nombre.textContent = a.usuarioNombre || "-";
  const email = document.createElement("div");
  email.className = "small text-secondary";
  email.textContent = a.usuarioEmail || "";
  usuario.append(nombre, email);

  const estado = document.createElement("td");
  const badge = document.createElement("span");
  const confirmada = a.estado === ESTADOS_ADQUISICION.CONFIRMADA;
  badge.className = `badge ${confirmada ? "text-bg-success" : "text-bg-secondary"}`;
  badge.textContent = confirmada ? "Confirmada" : (a.estado || "-");
  estado.append(badge);

  fila.append(
    celda(formatearFecha(a.fecha), "text-nowrap"),
    usuario,
    celda(a.servicioNombre),
    celda(formatearImporte(a), "text-nowrap"),
    celda(nombreMedioPago(a.metodoPago)),
    celda(a.codigoOperacion || "-", "font-monospace small"),
    estado
  );
  return fila;
}
