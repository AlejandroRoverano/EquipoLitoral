// catalogo/adquisicion.js
// RF-09: Flujo de adquisición de un servicio educativo.
// RNF-09: Pago simulado sin datos reales de medios de pago.
// RD-08: El registro en Firestore se hace con el modelo de adquisiciones-modelo.js.
// RF-11: Los datos del servicio se leen desde Firestore (detalle.js).
//
// Pasos del flujo:
//   1) Selección del servicio: el usuario toca "Adquirir Servicio" en el detalle.
//   2) Comprobación de sesión: si no está autenticado, se le pide iniciar sesión.
//   3) Información previa: se muestra un resumen del servicio y del usuario.
//   4) Pago simulado: el usuario elige un medio de pago (sin ingresar datos) y paga.
//   5) Registro: el resultado del pago se guarda en "pagos" y, si se aprueba,
//      la adquisición se guarda en "adquisiciones" (ver adquisiciones-modelo.js).
//   6) Mensaje final: confirmación o información del error.
//
// IMPORTANTE (RNF-09): el pago es 100% simulado. No se solicitan ni se guardan
// números de tarjeta, cuentas bancarias ni ningún otro dato real de medios de pago.

import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  MEDIOS_DE_PAGO,
  generarCodigoOperacion,
  usuarioTieneServicio,
  registrarAdquisicion,
  registrarPagoRechazado
} from "../adquisiciones-modelo.js";
import { ROLES } from "../acceso.js";
import { servicioListo } from "./detalle.js";
import { registrarEstudianteEnEstadisticas } from "../estadisticas-modelo.js";

/* ------------------------------------------------------------------ */
/* Datos del servicio seleccionado                                     */
/* ------------------------------------------------------------------ */

// RF-11: el servicio se lee desde Firestore en detalle.js.
// "servicioListo" resuelve null si el servicio no existe.
const servicio = await servicioListo;

// Solo se puede adquirir un servicio que existe y está activo
const disponible = Boolean(servicio && servicio.activo);

// Tiempo que tarda el "procesamiento" del pago simulado
const DEMORA_PAGO_MS = 1500;

/* ------------------------------------------------------------------ */
/* Elementos de la página                                              */
/* ------------------------------------------------------------------ */

const btnAdquirir = document.getElementById("btn-adquirir");
const avisoAdquisicion = document.getElementById("aviso-adquisicion");

const modalEl = document.getElementById("modal-adquisicion");
const modal = new bootstrap.Modal(modalEl);
const modalResumen = document.getElementById("modal-resumen");
const modalMsg = document.getElementById("modal-adquisicion-msg");
const seccionPago = document.getElementById("seccion-pago");
const chkRechazo = document.getElementById("simular-rechazo");
const btnConfirmar = document.getElementById("btn-confirmar-adquisicion");
const btnCancelar = document.getElementById("btn-cancelar-adquisicion");
const btnVerAdquisiciones = document.getElementById("btn-ver-adquisiciones");

let usuarioActual = null;
let rolActual = "estudiante";
let procesando = false;

/* ------------------------------------------------------------------ */
/* Utilidades de UI                                                    */
/* ------------------------------------------------------------------ */

function formatearPrecio(valor, moneda) {
  return `$${valor.toLocaleString("es-UY")} ${moneda}`;
}

function textoBotonPagar() {
  return `Pagar ${formatearPrecio(servicio.precio, servicio.moneda)}`;
}

// Mensaje debajo del botón "Adquirir Servicio"
function mostrarAviso(html, tipo = "info") {
  avisoAdquisicion.innerHTML = html;
  avisoAdquisicion.className = `alert alert-${tipo} small mt-3 mb-0`;
}

function ocultarAviso() {
  avisoAdquisicion.innerHTML = "";
  avisoAdquisicion.className = "hidden";
}

// Mensaje dentro de la ventana de confirmación
function mostrarMensajeModal(texto, tipo = "danger") {
  modalMsg.textContent = texto;
  modalMsg.className = `alert alert-${tipo} mb-0 mt-3`;
}

function limpiarMensajeModal() {
  modalMsg.textContent = "";
  modalMsg.className = "hidden";
}

function marcarComoAdquirido() {
  btnAdquirir.disabled = true;
  btnAdquirir.innerHTML = '<i class="bi bi-check-circle me-2" aria-hidden="true"></i>Servicio adquirido';
  mostrarAviso(
    'Ya adquiriste este servicio. Podés verlo en <a href="../gestion/historial.html" class="alert-link">Mis Adquisiciones</a>.',
    "success"
  );
}

// Habilita o bloquea los controles del pago mientras se procesa
function bloquearPago(estado) {
  procesando = estado;
  seccionPago.querySelectorAll("input").forEach((input) => (input.disabled = estado));
  btnConfirmar.disabled = estado;
  btnCancelar.disabled = estado;
  btnConfirmar.innerHTML = estado
    ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Procesando pago...'
    : textoBotonPagar();
}

// Traduce los errores de Firestore a mensajes para el usuario
function traducirError(codigo) {
  switch (codigo) {
    case "permission-denied":
      return "No tenés permisos para realizar esta adquisición. Contactá a un administrador.";
    case "unavailable":
      return "No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.";
    case "unauthenticated":
      return "Tu sesión expiró. Iniciá sesión nuevamente.";
    default:
      return "Ocurrió un error al registrar la adquisición. Intentá nuevamente.";
  }
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/* ------------------------------------------------------------------ */
/* Estado de la sesión                                                 */
/* ------------------------------------------------------------------ */

onAuthStateChanged(auth, async (user) => {
  usuarioActual = user;

  // Servicio inexistente o dado de baja: detalle.js ya mostró el aviso correspondiente
  if (!disponible) return;

  ocultarAviso();
  btnAdquirir.disabled = false;

  if (!user) return;

  try {
    // Rol del usuario (lo usa el control de acceso por roles)
    const snapUsuario = await getDoc(doc(db, "usuarios", user.uid));
    if (snapUsuario.exists() && snapUsuario.data().rol) {
      rolActual = snapUsuario.data().rol;
    }

    // ¿Ya adquirió este servicio?
    if (await usuarioTieneServicio(user.uid, servicio.id)) {
      marcarComoAdquirido();
    }
  } catch (error) {
    console.error("Error al consultar los datos del usuario:", error.code, error.message);
  }
});

/* ------------------------------------------------------------------ */
/* Pasos 1 y 2: selección del servicio y comprobación de la sesión     */
/* ------------------------------------------------------------------ */

btnAdquirir.addEventListener("click", () => {
  if (!disponible) return;
  ocultarAviso();

  // Sin sesión: no puede adquirir, se le invita a iniciar sesión
  if (!usuarioActual) {
    // Después de entrar, el login trae al usuario de vuelta a este servicio
    const volver = `?volver=${encodeURIComponent(window.location.href)}`;
    mostrarAviso(
      'Para adquirir este servicio necesitás iniciar sesión.' +
      '<div class="d-flex gap-2 mt-2">' +
      `<a href="../login/login.html${volver}" class="btn btn-primary btn-sm">Iniciar sesión</a>` +
      `<a href="../login/registro.html${volver}" class="btn btn-outline-primary btn-sm">Registrarse</a>` +
      '</div>',
      "warning"
    );
    return;
  }

  // RNF-10: solo los estudiantes adquieren servicios
  // (los prestadores los ofrecen y los administradores gestionan la plataforma)
  if (rolActual !== ROLES.ESTUDIANTE) {
    const tipoCuenta = rolActual === ROLES.ADMINISTRADOR ? "administrador" : "prestador de servicios";
    mostrarAviso(
      `Tu cuenta es de ${tipoCuenta}. Solo las cuentas de estudiante pueden adquirir servicios.`,
      "warning"
    );
    return;
  }

  abrirResumen();
});

/* ------------------------------------------------------------------ */
/* Paso 3: información necesaria antes de confirmar                    */
/* ------------------------------------------------------------------ */

function filaResumen(etiqueta, valor) {
  const dt = document.createElement("dt");
  dt.className = "col-5 text-secondary fw-normal";
  dt.textContent = etiqueta;
  const dd = document.createElement("dd");
  dd.className = "col-7 mb-2";
  dd.textContent = valor;
  return [dt, dd];
}

function abrirResumen() {
  limpiarMensajeModal();
  modalResumen.replaceChildren(
    ...filaResumen("Servicio", servicio.nombre),
    ...filaResumen("Prestador", servicio.prestador),
    ...filaResumen("Modalidad", servicio.modalidad),
    ...filaResumen("Duración", servicio.duracion),
    ...filaResumen("Inicio", servicio.inicio),
    ...filaResumen("Precio", `${formatearPrecio(servicio.precio, servicio.moneda)} / ${servicio.periodo}`),
    ...filaResumen("Usuario", usuarioActual.displayName || usuarioActual.email),
    ...filaResumen("Correo", usuarioActual.email)
  );

  // Estado inicial de la sección de pago
  seccionPago.classList.remove("hidden");
  document.getElementById("pago-tarjeta").checked = true;
  chkRechazo.checked = false;

  btnConfirmar.classList.remove("hidden");
  btnCancelar.textContent = "Cancelar";
  btnVerAdquisiciones.classList.add("hidden");
  bloquearPago(false);

  modal.show();
}

// No se puede cerrar la ventana mientras se procesa el pago
modalEl.addEventListener("hide.bs.modal", (e) => {
  if (procesando) e.preventDefault();
});

/* ------------------------------------------------------------------ */
/* Pasos 4, 5 y 6: pago simulado, registro en Firestore y mensaje      */
/* ------------------------------------------------------------------ */

btnConfirmar.addEventListener("click", async () => {
  limpiarMensajeModal();

  // Se vuelve a comprobar la sesión por si expiró con la ventana abierta
  const user = auth.currentUser;
  if (!user) {
    mostrarMensajeModal("Tu sesión expiró. Iniciá sesión nuevamente para continuar.", "warning");
    return;
  }

  const metodo = seccionPago.querySelector('input[name="medio-pago"]:checked').value;
  const aprobado = !chkRechazo.checked;

  bloquearPago(true);

  try {
    // Evita registrar (y cobrar) dos veces la misma adquisición
    if (await usuarioTieneServicio(user.uid, servicio.id)) {
      bloquearPago(false);
      mostrarMensajeModal("Ya habías adquirido este servicio anteriormente. No se realizó ningún cobro.", "info");
      terminarFlujo();
      return;
    }

    // Simula el tiempo de respuesta de una pasarela de pagos
    await esperar(DEMORA_PAGO_MS);

    const codigoOperacion = generarCodigoOperacion();
    const operacion = { usuario: user, servicio, metodo, codigoOperacion };

    if (!aprobado) {
      // Pago rechazado: se registra el intento, pero no la adquisición
      await registrarPagoRechazado(operacion);
      bloquearPago(false);
      btnConfirmar.textContent = "Reintentar pago";
      mostrarMensajeModal(
        `El pago simulado fue rechazado (operación ${codigoOperacion}). No se realizó ningún cobro. ` +
        "Podés elegir otro medio de pago e intentar de nuevo."
      );
      return;
    }

    // Pago aprobado: se guardan el pago y la adquisición juntos (todo o nada)
    await registrarAdquisicion(operacion);

    // RF-18: si es su primera adquisición, el estudiante suma 1 a las estadísticas públicas.
    // No se espera ni se bloquea la compra: si fallara, la adquisición igual quedó registrada.
    registrarEstudianteEnEstadisticas(user.uid, servicio.id).catch((error) =>
      console.error("No se pudieron actualizar las estadísticas públicas:", error.code, error.message)
    );

    bloquearPago(false);
    mostrarMensajeModal(
      `¡Pago aprobado! Adquiriste "${servicio.nombre}". ` +
      `Medio: ${MEDIOS_DE_PAGO[metodo]}. Código de operación: ${codigoOperacion}. ` +
      "Vas a encontrarlo en Mis Adquisiciones.",
      "success"
    );
    terminarFlujo();
  } catch (error) {
    console.error("Error al registrar el pago o la adquisición:", error.code, error.message);
    bloquearPago(false);
    btnConfirmar.textContent = "Reintentar pago";
    mostrarMensajeModal(traducirError(error.code) + " No se realizó ningún cobro.");
  }
});

// Deja la ventana en estado "terminado" y actualiza el botón de la página
function terminarFlujo() {
  seccionPago.classList.add("hidden");
  btnConfirmar.classList.add("hidden");
  btnCancelar.textContent = "Cerrar";
  btnVerAdquisiciones.classList.remove("hidden");
  marcarComoAdquirido();
  // RF-21: el detalle muestra el contenido del curso apenas se adquiere
  document.dispatchEvent(new CustomEvent("servicio-adquirido"));
}
