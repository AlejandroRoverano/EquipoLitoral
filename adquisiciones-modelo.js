// adquisiciones-modelo.js
// RD-08: Modelo de datos para el registro de adquisiciones en Firestore.
//
// Este módulo es el ÚNICO lugar donde se define cómo se guardan y se leen
// las adquisiciones y los pagos. Cualquier página que necesite registrar o
// mostrar adquisiciones (detalle del servicio, panel de gestión, etc.) debe
// usar estas funciones en lugar de escribir en Firestore directamente.
//
// Documentación completa del modelo: docs/modelo-datos-adquisiciones.md
//
// Colecciones:
//   adquisiciones/{uid}_{servicioId}  -> qué servicio adquirió cada usuario
//   pagos/{idAutomatico}              -> cada intento de pago simulado (aprobado o rechazado)

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ------------------------------------------------------------------ */
/* Constantes del modelo                                               */
/* ------------------------------------------------------------------ */

export const COLECCION_ADQUISICIONES = "adquisiciones";
export const COLECCION_PAGOS = "pagos";

// Estados posibles de una adquisición
export const ESTADOS_ADQUISICION = {
  CONFIRMADA: "confirmada", // pago aprobado, el usuario tiene acceso al servicio
  CANCELADA: "cancelada"    // reservado para una futura baja del servicio
};

// Estados posibles de un pago simulado
export const ESTADOS_PAGO = {
  APROBADO: "aprobado",
  RECHAZADO: "rechazado"
};

// Medios de pago de la simulación (RNF-09): solo el nombre, nunca datos reales.
// Las claves coinciden con el value de los radio buttons del detalle.
export const MEDIOS_DE_PAGO = {
  tarjeta: "Tarjeta de crédito o débito (simulada)",
  transferencia: "Transferencia bancaria (simulada)",
  billetera: "Billetera digital (simulada)"
};

/* ------------------------------------------------------------------ */
/* Identificadores                                                     */
/* ------------------------------------------------------------------ */

// El ID de la adquisición combina usuario y servicio. Así:
//  - la relación usuario-servicio queda identificada en el propio ID, y
//  - un usuario no puede adquirir dos veces el mismo servicio.
export function idAdquisicion(uid, servicioId) {
  return `${uid}_${servicioId}`;
}

// Código de operación ficticio del pago simulado (ej: SIM-7F3K9Q)
export function generarCodigoOperacion() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "SIM-";
  for (let i = 0; i < 6; i++) {
    codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return codigo;
}

/* ------------------------------------------------------------------ */
/* Construcción de documentos                                          */
/* ------------------------------------------------------------------ */
// usuario:  objeto User de Firebase Auth (uid, email, displayName)
// servicio: { id, nombre, prestador, precio, moneda, periodo }

// Documento de la colección "pagos"
export function crearDatosPago({ usuario, servicio, metodo, estado, codigoOperacion }) {
  return {
    uid: usuario.uid,
    usuarioEmail: usuario.email,
    servicioId: servicio.id,
    servicioNombre: servicio.nombre,
    monto: servicio.precio,
    moneda: servicio.moneda,
    metodo: metodo,
    simulado: true, // RNF-09: todos los pagos son simulados
    estado: estado,
    codigoOperacion: codigoOperacion,
    fecha: serverTimestamp()
  };
}

// Documento de la colección "adquisiciones"
export function crearDatosAdquisicion({ usuario, servicio, pagoId, metodo, codigoOperacion }) {
  return {
    // Usuario asociado
    uid: usuario.uid,
    usuarioNombre: usuario.displayName || "",
    usuarioEmail: usuario.email,
    // Servicio adquirido (se copian los datos para poder mostrarlos sin otra consulta)
    servicioId: servicio.id,
    servicioNombre: servicio.nombre,
    prestador: servicio.prestador,
    // Importe correspondiente
    precio: servicio.precio,
    moneda: servicio.moneda,
    periodo: servicio.periodo,
    // Estado de la adquisición
    estado: ESTADOS_ADQUISICION.CONFIRMADA,
    // Pago asociado (referencia al documento de "pagos")
    pagoId: pagoId,
    codigoOperacion: codigoOperacion,
    metodoPago: metodo,
    // Fecha de la operación (la pone el servidor de Firebase)
    fecha: serverTimestamp()
  };
}

/* ------------------------------------------------------------------ */
/* Escritura                                                           */
/* ------------------------------------------------------------------ */

// Registra un pago rechazado. No se crea ninguna adquisición.
export async function registrarPagoRechazado({ usuario, servicio, metodo, codigoOperacion }) {
  const datos = crearDatosPago({
    usuario, servicio, metodo, codigoOperacion,
    estado: ESTADOS_PAGO.RECHAZADO
  });
  const ref = await addDoc(collection(db, COLECCION_PAGOS), datos);
  return ref.id;
}

// Registra un pago aprobado y su adquisición en una sola operación:
// se guardan los dos o ninguno (writeBatch).
export async function registrarAdquisicion({ usuario, servicio, metodo, codigoOperacion }) {
  const refPago = doc(collection(db, COLECCION_PAGOS));
  const refAdquisicion = doc(db, COLECCION_ADQUISICIONES, idAdquisicion(usuario.uid, servicio.id));

  const lote = writeBatch(db);
  lote.set(refPago, crearDatosPago({
    usuario, servicio, metodo, codigoOperacion,
    estado: ESTADOS_PAGO.APROBADO
  }));
  lote.set(refAdquisicion, crearDatosAdquisicion({
    usuario, servicio, metodo, codigoOperacion,
    pagoId: refPago.id
  }));
  await lote.commit();

  return { adquisicionId: refAdquisicion.id, pagoId: refPago.id };
}

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

// Convierte un documento de Firestore en un objeto listo para mostrar.
// La fecha pasa de Timestamp de Firestore a Date de JavaScript.
function convertirAdquisicion(snap) {
  const datos = snap.data();
  return {
    id: snap.id,
    ...datos,
    fecha: datos.fecha?.toDate ? datos.fecha.toDate() : null
  };
}

// Devuelve la adquisición de un servicio por un usuario, o null si no existe
export async function obtenerAdquisicion(uid, servicioId) {
  const snap = await getDoc(doc(db, COLECCION_ADQUISICIONES, idAdquisicion(uid, servicioId)));
  return snap.exists() ? convertirAdquisicion(snap) : null;
}

// true si el usuario ya adquirió el servicio
export async function usuarioTieneServicio(uid, servicioId) {
  const adquisicion = await obtenerAdquisicion(uid, servicioId);
  return adquisicion !== null && adquisicion.estado === ESTADOS_ADQUISICION.CONFIRMADA;
}

// Devuelve todas las adquisiciones de un usuario, de la más reciente a la más antigua.
// Pensado para la sección "Mis Adquisiciones" del panel de gestión.
// (Se ordena en el navegador para no necesitar un índice compuesto en Firestore.)
export async function obtenerAdquisicionesDeUsuario(uid) {
  const consulta = query(
    collection(db, COLECCION_ADQUISICIONES),
    where("uid", "==", uid)
  );
  const resultado = await getDocs(consulta);
  return resultado.docs
    .map(convertirAdquisicion)
    .sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));
}

/* ------------------------------------------------------------------ */
/* Presentación (RF-10)                                                */
/* ------------------------------------------------------------------ */
// Funciones para mostrar los datos de forma clara en cualquier pantalla.

// "$4.500 UYU / mes"
export function formatearImporte(adquisicion) {
  if (typeof adquisicion.precio !== "number") return "-";
  const importe = `$${adquisicion.precio.toLocaleString("es-UY")} ${adquisicion.moneda || ""}`.trim();
  return adquisicion.periodo ? `${importe} / ${adquisicion.periodo}` : importe;
}

// "20/10/2026, 02:15" (o solo "20/10/2026" si conHora es false)
export function formatearFecha(fecha, conHora = true) {
  if (!(fecha instanceof Date)) return "-";
  const opciones = conHora
    ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" };
  return fecha.toLocaleString("es-UY", opciones);
}

// "Tarjeta de crédito o débito (simulada)"
export function nombreMedioPago(metodo) {
  return MEDIOS_DE_PAGO[metodo] || "-";
}
