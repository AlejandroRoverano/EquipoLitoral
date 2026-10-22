// pruebas-modelo.js
// RF-22: Prueba gratis de un día. Un estudiante puede activarla una sola vez por curso
// y durante 24 horas ve todo el contenido del curso (las unidades del RF-16).
//
// Colección: pruebas/{uid}_{servicioId}
//   { uid, servicioId, servicioNombre, inicio }
//   - "inicio" es la hora del servidor (serverTimestamp), así nadie puede adelantarla.
//   - El ID combina usuario y curso: como el documento no se puede volver a crear
//     ni modificar, cada estudiante tiene una sola prueba por curso.
//   - Las reglas de Firestore (firestore.rules) dejan leer los materiales mientras
//     no pasaron 24 horas desde "inicio".

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

export const COLECCION_PRUEBAS = "pruebas";
export const HORAS_PRUEBA = 24;
const DURACION_MS = HORAS_PRUEBA * 60 * 60 * 1000;

export function idPrueba(uid, servicioId) {
  return `${uid}_${servicioId}`;
}

// La prueba del usuario para ese curso, o null si nunca la activó
export async function obtenerPrueba(uid, servicioId) {
  const snap = await getDoc(doc(db, COLECCION_PRUEBAS, idPrueba(uid, servicioId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Fecha en la que vence la prueba (null si no tiene inicio)
export function vencimientoPrueba(prueba) {
  const inicio = prueba?.inicio?.toDate?.();
  return inicio ? new Date(inicio.getTime() + DURACION_MS) : null;
}

export function pruebaVigente(prueba, ahora = new Date()) {
  const vence = vencimientoPrueba(prueba);
  return Boolean(vence && ahora < vence);
}

// "23 h 15 min", "40 min"
export function tiempoRestante(prueba, ahora = new Date()) {
  const vence = vencimientoPrueba(prueba);
  if (!vence) return "";
  const minutos = Math.max(0, Math.ceil((vence - ahora) / 60000));
  const horas = Math.floor(minutos / 60);
  return horas > 0 ? `${horas} h ${minutos % 60} min` : `${minutos} min`;
}

// "23 de octubre, 19:32"
export function formatearVencimiento(prueba) {
  const vence = vencimientoPrueba(prueba);
  if (!vence) return "";
  return vence.toLocaleString("es-UY", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// Activa la prueba y devuelve el documento guardado (con la hora real del servidor).
// Si ya la había usado, Firestore rechaza la operación (permission-denied).
export async function activarPrueba(uid, servicio) {
  await setDoc(doc(db, COLECCION_PRUEBAS, idPrueba(uid, servicio.id)), {
    uid,
    servicioId: servicio.id,
    servicioNombre: servicio.nombre,
    inicio: serverTimestamp()
  });
  return obtenerPrueba(uid, servicio.id);
}
