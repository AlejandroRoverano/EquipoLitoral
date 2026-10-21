// usuarios-modelo.js
// RF-12: Lectura y gestión de usuarios para el panel administrativo.
//
// Solo expone los datos necesarios para administrar la plataforma:
// nombre, correo, rol y fecha de registro. Las contraseñas las maneja
// Firebase Authentication y nunca se guardan en Firestore.
//
// Las reglas de Firestore (firestore.rules) garantizan que:
//  - solo un administrador puede listar los usuarios;
//  - un administrador solo puede cambiar el campo "rol" de otro usuario;
//  - nadie puede quitarse a sí mismo el rol de administrador.

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { ROLES } from "./acceso.js";
import { obtenerAdquisicionesDeUsuario } from "./adquisiciones-modelo.js";

export const COLECCION_USUARIOS = "usuarios";

// Nombres para mostrar de cada rol
export const NOMBRES_ROLES = {
  [ROLES.ESTUDIANTE]: "Estudiante",
  [ROLES.PRESTADOR]: "Prestador",
  [ROLES.ADMINISTRADOR]: "Administrador"
};

// Solo los campos necesarios para la administración (no se expone nada más)
function convertir(snap) {
  const d = snap.data();
  return {
    uid: snap.id,
    nombre: d.nombre || "",
    email: d.email || "",
    rol: NOMBRES_ROLES[d.rol] ? d.rol : ROLES.ESTUDIANTE,
    creadoEn: d.creadoEn?.toDate ? d.creadoEn.toDate() : null
  };
}

// Todos los usuarios registrados, ordenados por nombre (solo administradores)
export async function obtenerTodosLosUsuarios() {
  const resultado = await getDocs(collection(db, COLECCION_USUARIOS));
  return resultado.docs
    .map(convertir)
    .sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email, "es"));
}

// Cantidad de adquisiciones asociadas a la cuenta de un usuario
export async function contarAdquisiciones(uid) {
  const adquisiciones = await obtenerAdquisicionesDeUsuario(uid);
  return adquisiciones.length;
}

// Cambia el rol de un usuario. No permite que un administrador se quite su propio rol.
export async function cambiarRol(uid, nuevoRol, uidAdmin) {
  if (!NOMBRES_ROLES[nuevoRol]) {
    throw Object.assign(new Error("Rol inválido"), { code: "rol-invalido" });
  }
  if (uid === uidAdmin && nuevoRol !== ROLES.ADMINISTRADOR) {
    throw Object.assign(new Error("No podés quitarte tu propio rol"), { code: "propio-rol" });
  }
  await updateDoc(doc(db, COLECCION_USUARIOS, uid), {
    rol: nuevoRol,
    rolActualizadoPor: uidAdmin,
    rolActualizadoEn: serverTimestamp()
  });
}
