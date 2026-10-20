// catalogo/adquisicion.js
// RF-09: Flujo de adquisición de un servicio educativo.
// RNF-09: Pago simulado sin datos reales de medios de pago.
//
// Pasos del flujo:
//   1) Selección del servicio: el usuario toca "Adquirir Servicio" en el detalle.
//   2) Comprobación de sesión: si no está autenticado, se le pide iniciar sesión.
//   3) Información previa: se muestra un resumen del servicio y del usuario.
//   4) Pago simulado: el usuario elige un medio de pago (sin ingresar datos) y paga.
//   5) Registro: el resultado del pago se guarda en "pagos" y, si se aprueba,
//      la adquisición se guarda en "adquisiciones".
//   6) Mensaje final: confirmación o información del error.
//
// IMPORTANTE (RNF-09): el pago es 100% simulado. No se solicitan ni se guardan
// números de tarjeta, cuentas bancarias ni ningún otro dato real de medios de pago.

import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ------------------------------------------------------------------ */
/* Datos del servicio seleccionado                                     */
/* ------------------------------------------------------------------ */

// Los datos se toman del bloque de adquisición del detalle (atributos data-*).
// El id se toma de la URL (detalle.html?id=...) y, si no viene, del propio bloque.
// Cuando los servicios se lean desde Firestore, solo hay que cambiar esta función.
function obtenerServicio() {
  const bloque = document.getElementById("bloque-adquisicion");
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get("id") || bloque.dataset.servicioId,
    nombre: bloque.dataset.servicioNombre,
    prestador: bloque.dataset.servicioPrestador,
    modalidad: bloque.dataset.servicioModalidad,
    duracion: bloque.dataset.servicioDuracion,
    inicio: bloque.dataset.servicioInicio,
    precio: Number(bloque.dataset.servicioPrecio),
    moneda: bloque.dataset.servicioMoneda,
    periodo: bloque.dataset.servicioPeriodo
  };
}

const servicio = obtenerServicio();

// Medios de pago de la simulación (solo el nombre, nunca datos reales).
// Las claves coinciden con el value de los radio buttons del detalle.
const MEDIOS_DE_PAGO = {
  tarjeta: "Tarjeta de crédito o débito (simulada)",
  transferencia: "Transferencia bancaria (simulada)",
  billetera: "Billetera digital (simulada)"
};

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
    'Ya adquiriste este servicio. Podés verlo en <a href="../gestion/detalle-gestion.html" class="alert-link">Mis Adquisiciones</a>.',
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

// El ID del documento combina usuario y servicio: así un usuario
// no puede adquirir dos veces el mismo servicio.
function idAdquisicion(uid) {
  return `${uid}_${servicio.id}`;
}

// Código de operación ficticio para identificar el pago simulado (ej: SIM-7F3K9Q)
function generarCodigoOperacion() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "SIM-";
  for (let i = 0; i < 6; i++) {
    codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return codigo;
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/* ------------------------------------------------------------------ */
/* Estado de la sesión                                                 */
/* ------------------------------------------------------------------ */

onAuthStateChanged(auth, async (user) => {
  usuarioActual = user;
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
    const snapAdq = await getDoc(doc(db, "adquisiciones", idAdquisicion(user.uid)));
    if (snapAdq.exists()) {
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
  ocultarAviso();

  // Sin sesión: no puede adquirir, se le invita a iniciar sesión
  if (!usuarioActual) {
    mostrarAviso(
      'Para adquirir este servicio necesitás iniciar sesión.' +
      '<div class="d-flex gap-2 mt-2">' +
      '<a href="../login/login.html" class="btn btn-primary btn-sm">Iniciar sesión</a>' +
      '<a href="../login/registro.html" class="btn btn-outline-primary btn-sm">Registrarse</a>' +
      '</div>',
      "warning"
    );
    return;
  }

  // Solo los estudiantes adquieren servicios; los prestadores los ofrecen
  if (rolActual === "prestador") {
    mostrarAviso(
      "Tu cuenta es de prestador de servicios. Solo las cuentas de estudiante pueden adquirir servicios.",
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
    const refAdquisicion = doc(db, "adquisiciones", idAdquisicion(user.uid));

    // Evita registrar (y cobrar) dos veces la misma adquisición
    const existente = await getDoc(refAdquisicion);
    if (existente.exists()) {
      bloquearPago(false);
      mostrarMensajeModal("Ya habías adquirido este servicio anteriormente. No se realizó ningún cobro.", "info");
      terminarFlujo();
      return;
    }

    // Simula el tiempo de respuesta de una pasarela de pagos
    await esperar(DEMORA_PAGO_MS);

    const codigoOperacion = generarCodigoOperacion();

    // Datos del pago: solo información de la operación, NUNCA datos del medio de pago
    const datosPago = {
      uid: user.uid,
      usuarioEmail: user.email,
      servicioId: servicio.id,
      servicioNombre: servicio.nombre,
      monto: servicio.precio,
      moneda: servicio.moneda,
      metodo: metodo,
      simulado: true,
      estado: aprobado ? "aprobado" : "rechazado",
      codigoOperacion: codigoOperacion,
      fecha: serverTimestamp()
    };

    if (!aprobado) {
      // Pago rechazado: se registra el intento, pero no la adquisición
      await addDoc(collection(db, "pagos"), datosPago);
      bloquearPago(false);
      btnConfirmar.textContent = "Reintentar pago";
      mostrarMensajeModal(
        `El pago simulado fue rechazado (operación ${codigoOperacion}). No se realizó ningún cobro. ` +
        "Podés elegir otro medio de pago e intentar de nuevo."
      );
      return;
    }

    // Pago aprobado: se guardan el pago y la adquisición juntos (todo o nada)
    const refPago = doc(collection(db, "pagos"));
    const lote = writeBatch(db);
    lote.set(refPago, datosPago);
    lote.set(refAdquisicion, {
      uid: user.uid,
      usuarioNombre: user.displayName || "",
      usuarioEmail: user.email,
      servicioId: servicio.id,
      servicioNombre: servicio.nombre,
      prestador: servicio.prestador,
      precio: servicio.precio,
      moneda: servicio.moneda,
      periodo: servicio.periodo,
      estado: "confirmada",
      pagoId: refPago.id,
      codigoOperacion: codigoOperacion,
      metodoPago: metodo,
      fecha: serverTimestamp()
    });
    await lote.commit();

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
}
