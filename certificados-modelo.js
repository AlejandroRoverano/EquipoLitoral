// certificados-modelo.js
// RF-25: Certificados verificables de los cursos completados.
//
// Colección: certificados/{codigo}   (lectura pública, para que cualquiera pueda verificarlo)
//   { codigo, uid, nombre, servicioId, servicioNombre, prestador, emitidoEn }
//   - Se emite cuando el estudiante adquirió el curso, el curso da certificado y
//     su progreso está completo (las reglas de Firestore lo comprueban).
//   - Un certificado por estudiante y curso: el código queda guardado en su progreso
//     y las reglas no dejan emitir otro.
//   - El código (ej: EL-7F3K-9QX2) se verifica en certificado.html.

import { db } from "./firebase-config.js";
import { doc, getDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { refProgreso } from "./progreso-modelo.js";

export const COLECCION_CERTIFICADOS = "certificados";
const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I para evitar confusiones
export const FORMATO_CODIGO = /^EL-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function generarCodigo() {
  const valores = crypto.getRandomValues(new Uint32Array(8));
  const letras = [...valores].map((v) => CARACTERES[v % CARACTERES.length]).join("");
  return `EL-${letras.slice(0, 4)}-${letras.slice(4)}`;
}

export function normalizarCodigo(texto) {
  return (texto || "").trim().toUpperCase().replace(/\s+/g, "");
}

// Dirección pública del certificado (para compartirla o verificarlo)
export function urlCertificado(codigo) {
  return new URL(`certificado.html?codigo=${encodeURIComponent(codigo)}`, import.meta.url).href;
}

// Emite el certificado y guarda su código en el progreso, en una sola operación
export async function emitirCertificado({ uid, nombre, servicio }) {
  const codigo = generarCodigo();
  const lote = writeBatch(db);
  lote.set(doc(db, COLECCION_CERTIFICADOS, codigo), {
    codigo,
    uid,
    nombre: (nombre || "").trim().slice(0, 100),
    servicioId: servicio.id,
    servicioNombre: servicio.nombre,
    prestador: servicio.prestador || "",
    emitidoEn: serverTimestamp()
  });
  lote.set(refProgreso(uid, servicio.id), { certificadoCodigo: codigo }, { merge: true });
  await lote.commit();
  return codigo;
}

export async function obtenerCertificado(codigo) {
  const limpio = normalizarCodigo(codigo);
  if (!FORMATO_CODIGO.test(limpio)) return null;
  const snap = await getDoc(doc(db, COLECCION_CERTIFICADOS, limpio));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { ...d, emitidoEn: d.emitidoEn?.toDate ? d.emitidoEn.toDate() : null };
}
