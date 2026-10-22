// progreso-modelo.js
// RF-24: Progreso de cada estudiante en un curso.
//
// Colección: progreso/{uid}_{servicioId}
//   { uid, servicioId, vistos, total, completado, actualizadoEn, certificadoCodigo? }
//   - vistos: claves de los materiales marcados como vistos ("móduloÍndice-materialÍndice").
//   - total: cantidad de materiales del curso cuando se guardó.
//   - completado: true cuando vio todos los materiales (lo exigen las reglas).
//   - certificadoCodigo: código del certificado emitido (RF-25), si lo tiene.
// Lo puede guardar quien adquirió el curso o tiene la prueba gratis vigente (firestore.rules).

import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

export const COLECCION_PROGRESO = "progreso";
export const MAX_VISTOS = 900; // 30 módulos x 30 materiales

export const idProgreso = (uid, servicioId) => `${uid}_${servicioId}`;
export const refProgreso = (uid, servicioId) => doc(db, COLECCION_PROGRESO, idProgreso(uid, servicioId));

// Clave estable de un material dentro del curso
export const claveMaterial = (indiceModulo, indiceMaterial) => `${indiceModulo}-${indiceMaterial}`;

// Todas las claves válidas de los módulos actuales
export function clavesDelCurso(modulos) {
  const claves = new Set();
  (modulos || []).forEach((m, i) => (m.materiales || []).forEach((_, j) => claves.add(claveMaterial(i, j))));
  return claves;
}

export function calcularPorcentaje(vistos, total) {
  return total > 0 ? Math.round((Math.min(vistos, total) / total) * 100) : 0;
}

export async function obtenerProgreso(uid, servicioId) {
  const snap = await getDoc(refProgreso(uid, servicioId));
  return snap.exists() ? snap.data() : null;
}

// Guarda los materiales vistos. Con merge se conserva el código del certificado.
export async function guardarProgreso(uid, servicioId, vistos, total) {
  const lista = [...vistos].slice(0, MAX_VISTOS);
  await setDoc(
    refProgreso(uid, servicioId),
    {
      uid,
      servicioId,
      vistos: lista,
      total,
      completado: total > 0 && lista.length >= total,
      actualizadoEn: serverTimestamp()
    },
    { merge: true }
  );
}
