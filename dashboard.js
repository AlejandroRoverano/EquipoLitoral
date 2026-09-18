// dashboard.js
// Página de destino después de iniciar sesión o registrarse.
// 1) Si no hay usuario autenticado, redirige al login.
// 2) Si lo hay, busca su rol en Firestore y muestra el panel correspondiente.
// 3) Maneja el botón de cerrar sesión.

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const panelCargando = document.getElementById("panel-cargando");
const panelEstudiante = document.getElementById("panel-estudiante");
const panelPrestador = document.getElementById("panel-prestador");
const navUserName = document.getElementById("nav-user-name");
const btnLogout = document.getElementById("btn-logout");

function mostrarPanel(rol, nombre) {
  panelCargando.classList.add("hidden");

  if (rol === "prestador") {
    panelPrestador.classList.remove("hidden");
    panelEstudiante.classList.add("hidden");
    document.getElementById("nombre-prestador").textContent = nombre;
  } else {
    // Por defecto, si el rol no está definido o es cualquier otra cosa,
    // se muestra el panel de estudiante.
    panelEstudiante.classList.remove("hidden");
    panelPrestador.classList.add("hidden");
    document.getElementById("nombre-estudiante").textContent = nombre;
  }
}

onAuthStateChanged(auth, async (user) => {
  // Ruta protegida: si no hay sesión, no se puede ver este panel.
  if (!user) {
    window.location.href = "login/login.html";
    return;
  }

  const nombre = user.displayName || user.email;
  navUserName.textContent = nombre;

  try {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const rol = snap.exists() ? snap.data().rol : "estudiante";
    mostrarPanel(rol, nombre);
  } catch (error) {
    console.error("Error al obtener el perfil del usuario:", error);
    // Si falla la consulta a Firestore, igual mostramos algo por defecto
    // en vez de dejar al usuario con la pantalla de "Cargando...".
    mostrarPanel("estudiante", nombre);
  }
});

btnLogout.addEventListener("click", async () => {
  btnLogout.disabled = true;
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error.code, error.message);
    btnLogout.disabled = false;
  }
});
