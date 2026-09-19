// gestion/gestion.js
// Protege esta página (requiere sesión activa) y adapta el contenido
// según el rol del usuario: prestador (dicta el curso) o estudiante
// (está inscripto en el curso).

import { auth, db } from "../firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const navUser = document.getElementById("nav-user");
const navUserName = document.getElementById("nav-user-name");
const btnLogout = document.getElementById("btn-logout");
const btnNuevoServicio = document.getElementById("btn-nuevo-servicio");
const badgeRol = document.getElementById("badge-rol");
const nombreUsuario = document.getElementById("nombre-usuario");
const emailUsuario = document.getElementById("email-usuario");
const tituloAdquisiciones = document.getElementById("titulo-adquisiciones");
const panelSubtitulo = document.getElementById("panel-subtitulo");

onAuthStateChanged(auth, async (user) => {
  // --- Auth-guard: sin sesión, no hay acceso a esta página ---
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  const nombre = user.displayName || user.email;
  navUserName.textContent = nombre;
  navUser.classList.remove("hidden");
  nombreUsuario.textContent = nombre;
  emailUsuario.textContent = user.email;

  // --- Traer el rol desde Firestore y adaptar la interfaz ---
  let rol = "estudiante"; // valor por defecto si algo falla
  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists() && snap.data().rol) {
      rol = snap.data().rol;
    }
  } catch (error) {
    console.error("Error al obtener el rol del usuario:", error);
  }

  aplicarVistaSegunRol(rol);
});

function aplicarVistaSegunRol(rol) {
  if (rol === "prestador") {
    badgeRol.textContent = "Prestador de Servicios";
    panelSubtitulo.textContent = "Gestión de tus servicios";
    tituloAdquisiciones.textContent = "Cursos que Dictás";
    // Solo el prestador puede dar de alta nuevos servicios
    btnNuevoServicio.classList.remove("hidden");
    btnNuevoServicio.classList.add("flex");
  } else {
    badgeRol.textContent = "Estudiante";
    panelSubtitulo.textContent = "Tus cursos y mentorías";
    tituloAdquisiciones.textContent = "Mis Adquisiciones";
    // El estudiante no gestiona servicios propios
    btnNuevoServicio.classList.add("hidden");
    btnNuevoServicio.classList.remove("flex");
  }
}

btnLogout.addEventListener("click", async () => {
  btnLogout.disabled = true;
  try {
    await signOut(auth);
    // No redirigimos acá manualmente: el onAuthStateChanged de arriba
    // ya detecta que no hay usuario y hace el redirect a login.html solo.
    // Si hacemos las dos cosas a la vez, las redirecciones compiten
    // entre sí y la página se queda colgada.
  } catch (error) {
    console.error("Error al cerrar sesión:", error.code, error.message);
    btnLogout.disabled = false;
  }
});
