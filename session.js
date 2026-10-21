// session.js
// Detecta si hay un usuario autenticado y adapta la interfaz en consecuencia.
// Se importa desde cualquier página que tenga los elementos:
//   #nav-guest      -> botones "Login" / "Register" (se ocultan si hay sesión)
//   #nav-user       -> bloque con nombre + botón de logout (oculto si NO hay sesión)
//   #nav-user-name  -> (opcional) donde se muestra el nombre/email del usuario
//   #btn-logout     -> botón que cierra la sesión
// Además, si el usuario es administrador, agrega el enlace "Administración"
// a la barra de navegación (RF-11).

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

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
    mostrarEnlaceAdmin(user.uid);
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
      // Se calcula desde la ubicación de este archivo (la raíz del sitio), así funciona
      // en GitHub Pages (/EquipoLitoral/) y desde cualquier carpeta.
      window.location.href = new URL("index.html", import.meta.url).href;
    } catch (error) {
      console.error("Error al cerrar sesión:", error.code, error.message);
      btnLogout.disabled = false;
    }
  });
}

// RF-11: enlace al panel de administración, solo visible para administradores.
// (Solo cambia la interfaz: el panel y los datos están protegidos por acceso.js
// y por las reglas de Firestore.)
const URL_PANEL_ADMIN = new URL("admin/panel.html", import.meta.url).href;

async function mostrarEnlaceAdmin(uid) {
  const menu = document.querySelector(".navbar-nav");
  if (!menu) return;
  // Las páginas del panel ya tienen el enlace en su menú
  if ([...menu.querySelectorAll("a")].some((a) => a.href === URL_PANEL_ADMIN)) return;

  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    if (!snap.exists() || snap.data().rol !== "administrador") return;
  } catch (error) {
    console.error("No se pudo verificar el rol para el menú:", error.code, error.message);
    return;
  }

  const item = document.createElement("li");
  item.className = "nav-item";
  const enlace = document.createElement("a");
  enlace.className = "nav-link";
  enlace.href = URL_PANEL_ADMIN;
  const icono = document.createElement("i");
  icono.className = "bi bi-shield-lock me-1";
  icono.setAttribute("aria-hidden", "true");
  enlace.append(icono, "Administración");
  item.append(enlace);
  menu.append(item);
}
