// estadisticas-modelo.js
// RF-18: Estadísticas públicas de la plataforma (sección de la página de inicio).
//
// Problema: los visitantes no pueden leer las adquisiciones (RNF-10), pero la
// portada tiene que mostrar cuántos estudiantes realizaron servicios.
// Solución: un documento público con SOLO el número total, sin datos personales:
//
//   estadisticas/general           -> { estudiantesConCursos, actualizadoEn }   (lectura pública)
//   estudiantesConCompras/{uid}    -> { servicioId, creadoEn }                  (marca privada)
//
// Cuando un estudiante completa su PRIMERA adquisición se crea su marca y el total
// sube en 1. Las reglas de Firestore solo permiten sumar de a 1, una vez por
// estudiante y si la adquisición existe; así nadie puede inflar el número.
// El administrador puede recalcular el total desde el panel (por ejemplo, para
// contar a quienes compraron antes de que existiera esta función).
//
// Documentación: docs/estadisticas-publicas.md

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  writeBatch,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { obtenerServiciosActivos } from "./servicios-modelo.js";
import { obtenerTodasLasAdquisiciones, ESTADOS_ADQUISICION } from "./adquisiciones-modelo.js";

export const COLECCION_ESTADISTICAS = "estadisticas";
export const DOC_ESTADISTICAS = "general";
export const COLECCION_MARCAS = "estudiantesConCompras";

// Calificación general de la plataforma (RF-18: 4,8 sobre 5).
// Es un valor fijo definido por el equipo. Cuando exista el sistema de
// valoraciones (RF-19), se reemplaza por el promedio real de las reseñas.
export const CALIFICACION_GENERAL = 4.8;
export const CALIFICACION_MAXIMA = 5;

// Cantidad base de estudiantes que muestra la portada, definida por el equipo.
// No sale de Firestore: se SUMA al conteo real (estudiantesConCursos), así el
// número sigue creciendo con cada estudiante nuevo. Para mostrar solo el dato
// real, poner 0.
export const ESTUDIANTES_BASE = 3467;

const refEstadisticas = () => doc(db, COLECCION_ESTADISTICAS, DOC_ESTADISTICAS);
const refMarca = (uid) => doc(db, COLECCION_MARCAS, uid);

/* ------------------------------------------------------------------ */
/* Lectura pública (portada)                                           */
/* ------------------------------------------------------------------ */

// Devuelve { estudiantes, servicios, calificacion, calificacionMaxima }.
// "estudiantes" es ESTUDIANTES_BASE más el conteo real (si no se pudo leer, solo la base).
// Si falla el conteo de servicios, su valor queda en null.
export async function obtenerEstadisticasPublicas() {
  const [estudiantes, servicios] = await Promise.all([
    getDoc(refEstadisticas())
      .then((snap) => (snap.exists() ? snap.data().estudiantesConCursos || 0 : 0))
      .catch((error) => {
        console.error("No se pudo leer estadisticas/general:", error.code, error.message);
        return null;
      }),
    obtenerServiciosActivos()
      .then((lista) => lista.length)
      .catch((error) => {
        console.error("No se pudieron contar los servicios:", error.code, error.message);
        return null;
      })
  ]);
  return {
    estudiantes: ESTUDIANTES_BASE + (estudiantes ?? 0),
    servicios,
    calificacion: CALIFICACION_GENERAL,
    calificacionMaxima: CALIFICACION_MAXIMA
  };
}

/* ------------------------------------------------------------------ */
/* Actualización al adquirir                                           */
/* ------------------------------------------------------------------ */

// Se llama después de una adquisición confirmada. Si es la primera del estudiante,
// crea su marca y suma 1 al total. Si ya tenía marca, no hace nada.
// Devuelve true si sumó al total.
export async function registrarEstudianteEnEstadisticas(uid, servicioId) {
  const marca = await getDoc(refMarca(uid));
  if (marca.exists()) return false;

  const lote = writeBatch(db);
  lote.set(refMarca(uid), { servicioId, creadoEn: serverTimestamp() });
  lote.set(
    refEstadisticas(),
    { estudiantesConCursos: increment(1), actualizadoEn: serverTimestamp() },
    { merge: true }
  );
  await lote.commit();
  return true;
}

/* ------------------------------------------------------------------ */
/* Recalcular (solo administradores)                                   */
/* ------------------------------------------------------------------ */

// Firestore admite hasta 500 operaciones por lote
const OPERACIONES_POR_LOTE = 400;

// Recalcula el total a partir de todas las adquisiciones confirmadas y crea las
// marcas que falten. Devuelve la cantidad de estudiantes contados.
export async function recalcularEstadisticas(uidAdmin) {
  const adquisiciones = await obtenerTodasLasAdquisiciones();

  // Un estudiante cuenta una sola vez, aunque tenga varias adquisiciones
  const primeraPorEstudiante = new Map();
  adquisiciones
    .filter((a) => a.estado === ESTADOS_ADQUISICION.CONFIRMADA && a.uid && a.servicioId)
    .forEach((a) => {
      if (!primeraPorEstudiante.has(a.uid)) primeraPorEstudiante.set(a.uid, a.servicioId);
    });

  const entradas = [...primeraPorEstudiante.entries()];
  for (let i = 0; i < entradas.length; i += OPERACIONES_POR_LOTE) {
    const lote = writeBatch(db);
    entradas.slice(i, i + OPERACIONES_POR_LOTE).forEach(([uid, servicioId]) => {
      lote.set(refMarca(uid), { servicioId, creadoEn: serverTimestamp() });
    });
    await lote.commit();
  }

  const lote = writeBatch(db);
  lote.set(refEstadisticas(), {
    estudiantesConCursos: entradas.length,
    actualizadoEn: serverTimestamp(),
    recalculadoPor: uidAdmin
  });
  await lote.commit();
  return entradas.length;
}

// Lee el documento público con su fecha (para mostrarlo en el panel)
export async function obtenerDocumentoEstadisticas() {
  const snap = await getDoc(refEstadisticas());
  if (!snap.exists()) return null;
  const datos = snap.data();
  return {
    estudiantesConCursos: datos.estudiantesConCursos || 0,
    actualizadoEn: datos.actualizadoEn?.toDate ? datos.actualizadoEn.toDate() : null
  };
}
