// login/auth.js
// Conecta los formularios de registro e inicio de sesión con Firebase Authentication.

import { auth, db } from "../firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Correo o contraseña incorrectos.";
    case "auth/user-disabled":
      return "Esta cuenta fue deshabilitada. Contactá a un administrador.";
    case "auth/user-not-found":
      return "No encontramos ninguna cuenta con ese correo.";
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
        window.location.href = "../dashboard.html";
      }, 1500);
    } catch (error) {
      console.error("Error en el registro:", error.code, error.message);
      mostrarMensaje("registro-msg", traducirError(error.code));
      cargando(boton, false, textoBoton);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Inicio de sesión                                                    */
/* ------------------------------------------------------------------ */

const formLogin = document.getElementById("form-login");

if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensaje("login-msg");

    const boton = formLogin.querySelector('button[type="submit"]');
    const textoBoton = "Iniciar Sesión";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      mostrarMensaje("login-msg", "Completá correo y contraseña.");
      return;
    }

    cargando(boton, true, textoBoton);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      mostrarMensaje("login-msg", "Sesión iniciada. Redirigiendo...", "exito");
      setTimeout(() => {
        window.location.href = "../dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Error en el login:", error.code, error.message);
      mostrarMensaje("login-msg", traducirError(error.code));
      cargando(boton, false, textoBoton);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Recuperación de contraseña                                          */
/* ------------------------------------------------------------------ */

const linkForgotPassword = document.getElementById("link-forgot-password");
const forgotBox = document.getElementById("forgot-box");
const btnReset = document.getElementById("btn-reset");
const btnCancelReset = document.getElementById("btn-cancel-reset");

if (linkForgotPassword && forgotBox && formLogin) {
  linkForgotPassword.addEventListener("click", (e) => {
    e.preventDefault();
    limpiarMensaje("reset-msg");
    forgotBox.classList.remove("hidden");
    formLogin.classList.add("hidden");
    // Precarga el correo si el usuario ya lo había escrito en el login
    const emailLogin = document.getElementById("login-email").value.trim();
    if (emailLogin) {
      document.getElementById("reset-email").value = emailLogin;
    }
  });
}

if (btnCancelReset && forgotBox && formLogin) {
  btnCancelReset.addEventListener("click", () => {
    forgotBox.classList.add("hidden");
    formLogin.classList.remove("hidden");
    limpiarMensaje("reset-msg");
  });
}

if (btnReset) {
  btnReset.addEventListener("click", async () => {
    limpiarMensaje("reset-msg");

    const email = document.getElementById("reset-email").value.trim();
    if (!email) {
      mostrarMensaje("reset-msg", "Ingresá tu correo electrónico.");
      return;
    }

    btnReset.disabled = true;
    const textoOriginal = btnReset.textContent;
    btnReset.textContent = "Enviando...";

    try {
      await sendPasswordResetEmail(auth, email);
      mostrarMensaje(
        "reset-msg",
        "Listo, revisá tu correo (y la carpeta de spam) para restablecer tu contraseña.",
        "exito"
      );
    } catch (error) {
      console.error("Error al enviar recuperación:", error.code, error.message);
      mostrarMensaje("reset-msg", traducirError(error.code));
    } finally {
      btnReset.disabled = false;
      btnReset.textContent = textoOriginal;
    }
  });
}
