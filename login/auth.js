// login/auth.js
// Conecta el formulario de registro con Firebase Authentication.
// (El login se resuelve en otro ticket/branch aparte.)

import { auth, db } from "../firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ------------------------------------------------------------------ */
/* Utilidades de UI                                                    */
/* ------------------------------------------------------------------ */

// Muestra un mensaje dentro del <div id="..."> correspondiente al formulario
function mostrarMensaje(id, texto, tipo = "error") {
  const caja = document.getElementById(id);
  if (!caja) return;
  caja.textContent = texto;
  caja.classList.remove("hidden");
  if (tipo === "error") {
    caja.className =
      "block mb-4 px-4 py-3 rounded-lg font-body-sm text-body-sm bg-error-container text-on-error-container";
  } else {
    caja.className =
      "block mb-4 px-4 py-3 rounded-lg font-body-sm text-body-sm bg-secondary-container text-on-secondary-fixed";
  }
}

function limpiarMensaje(id) {
  const caja = document.getElementById(id);
  if (caja) {
    caja.textContent = "";
    caja.className = "hidden";
  }
}

// Bloquea el botón mientras se procesa, para evitar envíos dobles
function cargando(boton, estado, textoOriginal) {
  if (!boton) return;
  boton.disabled = estado;
  boton.classList.toggle("opacity-60", estado);
  boton.classList.toggle("cursor-not-allowed", estado);
  boton.textContent = estado ? "Procesando..." : textoOriginal;
}

// Traduce los códigos de error de Firebase a mensajes para el usuario
function traducirError(codigo) {
  switch (codigo) {
    case "auth/email-already-in-use":
      return "Ese correo ya está registrado. Probá iniciar sesión.";
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido.";
    case "auth/weak-password":
      return "La contraseña es demasiado débil (mínimo 6 caracteres).";
    case "auth/missing-password":
      return "Ingresá una contraseña.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.";
    case "auth/network-request-failed":
      return "Error de conexión. Revisá tu acceso a internet.";
    case "auth/operation-not-allowed":
      return "El registro con correo y contraseña no está habilitado en Firebase.";
    default:
      return "Ocurrió un error inesperado. Intentá nuevamente.";
  }
}

/* ------------------------------------------------------------------ */
/* Registro de usuarios                                                */
/* ------------------------------------------------------------------ */

const formRegistro = document.getElementById("form-registro");

if (formRegistro) {
  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje("registro-msg");

    const boton = formRegistro.querySelector('button[type="submit"]');
    const textoBoton = "Crear Cuenta";

    const nombre = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const rol =
      formRegistro.querySelector('input[name="role"]:checked')?.value ||
      "estudiante";

    // Validaciones del lado del cliente
    if (nombre.length < 3) {
      mostrarMensaje("registro-msg", "Ingresá tu nombre completo.");
      return;
    }
    if (password.length < 8) {
      mostrarMensaje(
        "registro-msg",
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    cargando(boton, true, textoBoton);

    try {
      // 1) Crear el usuario en Firebase Authentication
      const credenciales = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = credenciales.user;

      // 2) Guardar el nombre en el perfil de Auth
      await updateProfile(user, { displayName: nombre });

      // 3) Guardar los datos extra (nombre y rol) en Firestore.
      //    El ID del documento es el UID del usuario.
      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        nombre: nombre,
        email: email,
        rol: rol,
        creadoEn: serverTimestamp()
      });

      mostrarMensaje(
        "registro-msg",
        "¡Cuenta creada con éxito! Redirigiendo...",
        "exito"
      );

      setTimeout(() => {
        window.location.href = "../home.html";
      }, 1500);
    } catch (error) {
      console.error("Error en el registro:", error.code, error.message);
      mostrarMensaje("registro-msg", traducirError(error.code));
      cargando(boton, false, textoBoton);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Inicio de sesión: fuera de alcance de este ticket.                  */
/* Se resuelve en otra branch/issue aparte.                            */
/* ------------------------------------------------------------------ */
