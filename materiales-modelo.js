// materiales-modelo.js
// RF-16: Materiales de estudio de cada servicio, organizados en módulos.
//
// Se guardan en servicios/{servicioId}/materiales/contenido:
//   { modulos: [ { titulo, materiales: [ { titulo, tipo, enlace } ] } ], actualizadoEn }
//
// - Los leen: quien adquirió el servicio, el prestador dueño y el administrador.
// - Los modifican: el prestador dueño y el administrador.
// - El servicio guarda "tieneMateriales" (público) para avisar cuáles faltan cargar.
// Las reglas de Firestore (firestore.rules) hacen cumplir los permisos.
// Documentación: docs/modelo-datos-servicios.md

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { COLECCION_SERVICIOS, esEnlaceValido } from "./servicios-modelo.js";

export const TIPOS_MATERIAL = {
  lectura: "Lectura",
  video: "Video",
  imagen: "Imagen",
  enlace: "Enlace"
};

// Íconos de Bootstrap Icons para cada tipo
export const ICONOS_MATERIAL = {
  lectura: "bi-file-earmark-text",
  video: "bi-play-btn",
  imagen: "bi-image",
  enlace: "bi-link-45deg"
};

// Límites para que el documento no crezca sin control
export const MAX_MODULOS = 30;
export const MAX_MATERIALES_POR_MODULO = 30;

function refMateriales(servicioId) {
  return doc(db, COLECCION_SERVICIOS, servicioId, "materiales", "contenido");
}

// Deja los módulos con los campos limpios y descarta materiales totalmente vacíos
export function normalizarModulos(modulos) {
  return (modulos || []).map((m) => ({
    titulo: (m.titulo || "").trim(),
    materiales: (m.materiales || [])
      .map((mat) => ({
        titulo: (mat.titulo || "").trim(),
        tipo: mat.tipo,
        enlace: (mat.enlace || "").trim()
      }))
      .filter((mat) => mat.titulo || mat.enlace)
  }));
}

// Lista de errores (vacía si todo está bien). Recibe módulos ya normalizados.
export function validarModulos(modulos) {
  const errores = [];
  if (modulos.length > MAX_MODULOS) errores.push(`Se pueden cargar hasta ${MAX_MODULOS} módulos.`);
  modulos.forEach((m, i) => {
    const nombre = `Módulo ${i + 1}`;
    if (m.titulo.length < 3) errores.push(`${nombre}: el título debe tener al menos 3 caracteres.`);
    if (m.materiales.length === 0) errores.push(`${nombre}: agregá al menos un material.`);
    if (m.materiales.length > MAX_MATERIALES_POR_MODULO) {
      errores.push(`${nombre}: se pueden cargar hasta ${MAX_MATERIALES_POR_MODULO} materiales.`);
    }
    m.materiales.forEach((mat, j) => {
      const material = `${nombre}, material ${j + 1}`;
      if (mat.titulo.length < 3) errores.push(`${material}: el título debe tener al menos 3 caracteres.`);
      if (!TIPOS_MATERIAL[mat.tipo]) errores.push(`${material}: elegí el tipo.`);
      if (!esEnlaceValido(mat.enlace)) errores.push(`${material}: el enlace tiene que empezar con https://.`);
    });
  });
  return errores;
}

export function contarMateriales(modulos) {
  return (modulos || []).reduce((total, m) => total + (m.materiales || []).length, 0);
}

// Módulos de un servicio (lista vacía si no tiene materiales).
// Solo funciona para quien tiene permiso de lectura (firestore.rules).
export async function obtenerMateriales(servicioId) {
  const snap = await getDoc(refMateriales(servicioId));
  return snap.exists() ? snap.data().modulos || [] : [];
}

// Guarda los módulos y actualiza "tieneMateriales" del servicio, en una sola operación.
// Si no queda ningún módulo, se borra el documento de materiales.
export async function guardarMateriales(servicioId, modulos) {
  const limpios = normalizarModulos(modulos);
  const errores = validarModulos(limpios);
  if (errores.length > 0) {
    throw Object.assign(new Error(errores.join(" ")), { code: "datos-invalidos", errores });
  }

  const lote = writeBatch(db);
  if (limpios.length > 0) {
    lote.set(refMateriales(servicioId), { modulos: limpios, actualizadoEn: serverTimestamp() });
  } else {
    lote.delete(refMateriales(servicioId));
  }
  lote.update(doc(db, COLECCION_SERVICIOS, servicioId), {
    tieneMateriales: limpios.length > 0,
    actualizadoEn: serverTimestamp()
  });
  await lote.commit();
  return limpios;
}
