// acceso.js
// RNF-10: Restricciones de acceso por autenticación y rol.
//
// Funciones comunes para proteger páginas. Uso típico en una página:
//
//   import { protegerPagina, ROLES } from "../acceso.js";
//   const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });
//   if (!acceso) return;            // sin sesión o sin permiso: ya se resolvió
//   // ... acceso.user y acceso.rol disponibles
//
// - Sin sesión iniciada  -> redirige al login.
// - Con sesión pero sin el rol necesario -> muestra "Acceso denegado".
//
// Importante: esto protege la INTERFAZ. La protección real de los datos la
// hacen las reglas de Firestore (firestore.rules), que se aplican en el servidor.
//
// Matriz de permisos completa: docs/matriz-de-permisos.md

import { auth, db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

export const ROLES = {
  ESTUDIANTE: "estudiante",
  PRESTADOR: "prestador",
  ADMINISTRADOR: "administrador"
};

// Rutas calculadas desde la raíz del sitio (funciona desde cualquier carpeta)
const URL_LOGIN = new URL("login/login.html", import.meta.url).href;
const URL_INICIO = new URL("index.html", import.meta.url).href;

// Devuelve el rol guardado en Firestore. Si no hay rol, se asume "estudiante",
// que es el rol con menos permisos administrativos.
export async function obtenerRol(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() && snap.data().rol ? snap.data().rol : ROLES.ESTUDIANTE;
}

// Espera a que Firebase termine de restaurar la sesión y devuelve el usuario (o null)
async function esperarUsuario() {
  await auth.authStateReady();
  return auth.currentUser;
}

// Protege la página actual.
//   roles: lista de roles permitidos. Si se omite, alcanza con tener sesión.
// Devuelve { user, rol } si el acceso está permitido, o null si no.
export async function protegerPagina({ roles = null } = {}) {
  const user = await esperarUsuario();

  if (!user) {
    // Después de iniciar sesión, el login vuelve a esta página
    window.location.href = `${URL_LOGIN}?volver=${encodeURIComponent(window.location.href)}`;
    return null;
  }

  let rol = ROLES.ESTUDIANTE;
  try {
    rol = await obtenerRol(user.uid);
  } catch (error) {
    console.error("No se pudo verificar el rol del usuario:", error.code, error.message);
    // Si no se puede verificar el rol, no se da acceso a secciones restringidas
    if (roles) {
      mostrarAccesoDenegado("No pudimos verificar tus permisos. Intentá de nuevo en un momento.");
      return null;
    }
  }

  if (roles && !roles.includes(rol)) {
    mostrarAccesoDenegado();
    return null;
  }

  return { user, rol };
}

// Reemplaza el contenido principal de la página por un aviso de acceso denegado
export function mostrarAccesoDenegado(
  mensaje = "No tenés permisos para ver esta sección. Si creés que es un error, contactá a un administrador."
) {
  const main = document.querySelector("main") || document.body;

  const caja = document.createElement("div");
  caja.className = "card-litoral p-5 text-center my-4";
  caja.setAttribute("role", "alert");

  const icono = document.createElement("i");
  icono.className = "bi bi-shield-lock display-5 text-danger";
  icono.setAttribute("aria-hidden", "true");

  const titulo = document.createElement("h1");
  titulo.className = "h4 fw-bold mt-3";
  titulo.textContent = "Acceso denegado";

  const texto = document.createElement("p");
  texto.className = "text-secondary";
  texto.textContent = mensaje;

  const volver = document.createElement("a");
  volver.className = "btn btn-primary";
  volver.href = URL_INICIO;
  volver.textContent = "Volver al inicio";

  caja.append(icono, titulo, texto, volver);
  main.replaceChildren(caja);
  document.title = "Acceso denegado | Equipo Litoral";
}
