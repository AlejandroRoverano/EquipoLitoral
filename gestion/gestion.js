// gestion/gestion.js
// Protege esta página (requiere sesión activa) y adapta el contenido
// según el rol del usuario: prestador (dicta el curso) o estudiante
// (está inscripto en el curso).

import { auth, db } from "../firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
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

/* ------------------------------------------------------------------ */
/* RF-06: consultar y editar la información del perfil                 */
/* ------------------------------------------------------------------ */

const perfilView = document.getElementById("perfil-view");
const perfilEdit = document.getElementById("perfil-edit");
const btnEditarPerfil = document.getElementById("btn-editar-perfil");
const btnGuardarPerfil = document.getElementById("btn-guardar-perfil");
const btnCancelarEditar = document.getElementById("btn-cancelar-editar");
const inputNombreEditar = document.getElementById("input-nombre-editar");
const editarPerfilMsg = document.getElementById("editar-perfil-msg");

function mostrarMensajeEdicion(texto, tipo = "error") {
  if (!editarPerfilMsg) return;
  editarPerfilMsg.textContent = texto;
  editarPerfilMsg.classList.remove("hidden");
  editarPerfilMsg.className =
    tipo === "error"
      ? "mb-3 px-3 py-2 rounded-lg font-body-sm text-body-sm bg-error-container text-on-error-container"
      : "mb-3 px-3 py-2 rounded-lg font-body-sm text-body-sm bg-secondary-container text-on-secondary-fixed";
}

if (btnEditarPerfil) {
  btnEditarPerfil.addEventListener("click", () => {
    // Precarga el input con el nombre actual
    inputNombreEditar.value = nombreUsuario.textContent.trim();
    editarPerfilMsg.classList.add("hidden");
    perfilView.classList.add("hidden");
    perfilEdit.classList.remove("hidden");
    inputNombreEditar.focus();
  });
}

if (btnCancelarEditar) {
  btnCancelarEditar.addEventListener("click", () => {
    perfilEdit.classList.add("hidden");
    perfilView.classList.remove("hidden");
  });
}

if (btnGuardarPerfil) {
  btnGuardarPerfil.addEventListener("click", async () => {
    const nuevoNombre = inputNombreEditar.value.trim();

    if (nuevoNombre.length < 3) {
      mostrarMensajeEdicion("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    const user = auth.currentUser;
    if (!user) return; // por las dudas; no debería pasar acá

    btnGuardarPerfil.disabled = true;
    const textoOriginal = btnGuardarPerfil.textContent;
    btnGuardarPerfil.textContent = "Guardando...";

    try {
      // 1) Actualiza el nombre en Firebase Authentication
      await updateProfile(user, { displayName: nuevoNombre });

      // 2) Actualiza el mismo dato en el documento de Firestore,
      //    para que quede consistente en los dos lugares.
      await updateDoc(doc(db, "usuarios", user.uid), {
        nombre: nuevoNombre
      });

      // 3) Refleja el cambio en toda la interfaz sin recargar la página
      nombreUsuario.textContent = nuevoNombre;
      navUserName.textContent = nuevoNombre;

      perfilEdit.classList.add("hidden");
      perfilView.classList.remove("hidden");
    } catch (error) {
      console.error("Error al actualizar el perfil:", error.code, error.message);
      mostrarMensajeEdicion("No se pudo guardar. Probá de nuevo en un momento.");
    } finally {
      btnGuardarPerfil.disabled = false;
      btnGuardarPerfil.textContent = textoOriginal;
    }
  });
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
