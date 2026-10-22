// resenas-modelo.js
// RF-26: Reseñas de los cursos, escritas solo por quienes los adquirieron.
//
// Colección: resenas/{uid}_{servicioId}
//   { uid, servicioId, nombre, puntaje, comentario, fecha }
//   - Una reseña por estudiante y curso (el ID combina los dos); se puede editar o borrar.
//   - "nombre" es el nombre público ("Sebastián C."), nunca el correo.
//   - Las reglas de Firestore solo dejan escribir a un estudiante con una adquisición
//     confirmada del curso, así las calificaciones son de compradores reales.
//   - La lectura es pública: cualquiera puede ver las opiniones.

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

export const COLECCION_RESENAS = "resenas";
export const PUNTAJE_MAXIMO = 5;
export const MAX_COMENTARIO = 600;

const ref = (uid, servicioId) => doc(db, COLECCION_RESENAS, `${uid}_${servicioId}`);

function convertir(snap) {
  const d = snap.data();
  return { id: snap.id, ...d, fecha: d.fecha?.toDate ? d.fecha.toDate() : null };
}

// "Sebastián Camacho" -> "Sebastián C." (para no mostrar el nombre completo)
export function nombrePublico(nombreCompleto) {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Estudiante";
  const nombre = partes[0].slice(0, 40);
  return partes.length > 1 ? `${nombre} ${partes[partes.length - 1][0].toUpperCase()}.` : nombre;
}

// Reseñas de un curso, de la más reciente a la más antigua
export async function obtenerResenasDeServicio(servicioId) {
  const consulta = query(collection(db, COLECCION_RESENAS), where("servicioId", "==", servicioId));
  const resultado = await getDocs(consulta);
  return resultado.docs.map(convertir).sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));
}

export async function obtenerMiResena(uid, servicioId) {
  const snap = await getDoc(ref(uid, servicioId));
  return snap.exists() ? convertir(snap) : null;
}

export async function guardarResena({ uid, nombreCompleto, servicioId, puntaje, comentario }) {
  await setDoc(ref(uid, servicioId), {
    uid,
    servicioId,
    nombre: nombrePublico(nombreCompleto),
    puntaje,
    comentario: (comentario || "").trim().slice(0, MAX_COMENTARIO),
    fecha: serverTimestamp()
  });
}

export async function borrarResena(uid, servicioId) {
  await deleteDoc(ref(uid, servicioId));
}

// Promedio y cantidad de un conjunto de reseñas ({ promedio: null } si no hay)
export function resumir(resenas) {
  const cantidad = resenas.length;
  const suma = resenas.reduce((total, r) => total + (r.puntaje || 0), 0);
  return { cantidad, promedio: cantidad ? suma / cantidad : null };
}

// Resumen de TODA la plataforma: { general, porServicio: Map(servicioId -> resumen) }.
// Lo usan el catálogo, los destacados y las estadísticas de la portada.
export async function obtenerResumenCalificaciones() {
  const resultado = await getDocs(collection(db, COLECCION_RESENAS));
  const todas = resultado.docs.map((d) => d.data());
  const agrupadas = new Map();
  todas.forEach((r) => {
    if (!agrupadas.has(r.servicioId)) agrupadas.set(r.servicioId, []);
    agrupadas.get(r.servicioId).push(r);
  });
  const porServicio = new Map([...agrupadas].map(([id, lista]) => [id, resumir(lista)]));
  return { general: resumir(todas), porServicio };
}

// "4,5" con coma decimal
export function formatearPuntaje(valor) {
  return valor.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
