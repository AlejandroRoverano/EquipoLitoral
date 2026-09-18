// session.js
// Detecta si hay un usuario autenticado y adapta la interfaz en consecuencia.
// Se importa desde cualquier página que tenga los elementos:
//   #nav-guest      -> botones "Login" / "Register" (se ocultan si hay sesión)
//   #nav-user       -> bloque con nombre + botón de logout (oculto si NO hay sesión)
//   #nav-user-name  -> (opcional) donde se muestra el nombre/email del usuario
//   #btn-logout     -> botón que cierra la sesión

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const navGuest = document.getElementById("nav-guest");
const navUser = document.getElementById("nav-user");
const navUserName = document.getElementById("nav-user-name");
const btnLogout = document.getElementById("btn-logout");

// Detecta el estado de la sesión en tiempo real.
// Se ejecuta automáticamente al cargar la página y cada vez que cambia
// (login, logout, o expiración de la sesión en otra pestaña).
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Hay una sesión activa
    navGuest?.classList.add("hidden");
    navUser?.classList.remove("hidden");
    if (navUserName) {
      navUserName.textContent = user.displayName || user.email;
    }
  } else {
    // No hay ningún usuario autenticado
    navGuest?.classList.remove("hidden");
    navUser?.classList.add("hidden");
  }
});

// Cierre de sesión
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    btnLogout.disabled = true;
    try {
      await signOut(auth);
      // onAuthStateChanged ya actualiza la interfaz solo,
      // pero además volvemos a la portada.
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error al cerrar sesión:", error.code, error.message);
      btnLogout.disabled = false;
    }
  });
}
