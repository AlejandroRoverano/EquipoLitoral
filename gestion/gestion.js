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
import { obtenerServiciosDePrestador } from "../servicios-modelo.js";
import {
  obtenerAdquisicionesDeUsuario,
  formatearFecha,
  formatearImporte,
  ESTADOS_ADQUISICION
} from "../adquisiciones-modelo.js";

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
  cargarAdquisicionesPanel(user.uid, rol);
});

function aplicarVistaSegunRol(rol) {
  // RF-11: el administrador tiene acceso directo al panel de administración
  document.getElementById("link-panel-admin")?.classList.toggle("hidden", rol !== "administrador");
  // RD-04: el prestador gestiona sus servicios desde "Mis servicios"
  document.getElementById("link-mis-servicios")?.classList.toggle("hidden", rol !== "prestador");

  if (rol === "administrador") {
    badgeRol.textContent = "Administrador";
    panelSubtitulo.textContent = "Administración de la plataforma";
    btnNuevoServicio.classList.add("hidden");
  } else if (rol === "prestador") {
    badgeRol.textContent = "Prestador de Servicios";
    panelSubtitulo.textContent = "Gestión de tus servicios";
    tituloAdquisiciones.textContent = "Mis servicios";
    // RD-04: el prestador da de alta y gestiona sus servicios en mis-servicios.html
    btnNuevoServicio.classList.remove("hidden");
    const verTodo = document.getElementById("link-ver-todo");
    if (verTodo) verTodo.href = "mis-servicios.html";
  } else {
    badgeRol.textContent = "Estudiante";
    panelSubtitulo.textContent = "Tus cursos y mentorías";
    tituloAdquisiciones.textContent = "Mis Adquisiciones";
    // El estudiante no gestiona servicios propios
    btnNuevoServicio.classList.add("hidden");
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
  editarPerfilMsg.className = tipo === "error" ? "alert alert-danger py-2 mb-3" : "alert alert-success py-2 mb-3";
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

/* ------------------------------------------------------------------ */
/* RF-10: últimas adquisiciones en el panel                            */
/* ------------------------------------------------------------------ */
// Muestra las 3 adquisiciones más recientes del estudiante (leídas de Firestore).
// El historial completo está en historial.html.

const ADQUISICIONES_EN_PANEL = 3;

async function cargarAdquisicionesPanel(uid, rol) {
  const contenedor = document.getElementById("lista-adquisiciones-panel");
  const totalCursos = document.getElementById("total-cursos-activos");
  if (!contenedor) return;

  if (rol === "administrador") {
    contenedor.replaceChildren(
      crearElemento("p", "col-12 text-secondary mb-0", "Las adquisiciones de toda la plataforma están en el panel de administración.")
    );
    return;
  }

  if (rol === "prestador") {
    await cargarServiciosPanel(uid, contenedor, totalCursos);
    return;
  }

  try {
    const adquisiciones = await obtenerAdquisicionesDeUsuario(uid);
    if (totalCursos) totalCursos.textContent = adquisiciones.length;

    if (adquisiciones.length === 0) {
      const vacio = crearElemento("div", "col-12");
      const caja = crearElemento("div", "card-litoral p-4 text-center");
      const enlace = crearElemento("a", "", "Explorar el catálogo");
      enlace.href = "../catalogo/catalogo-general.html";
      caja.append(crearElemento("p", "text-secondary mb-2", "Todavía no adquiriste servicios."), enlace);
      vacio.append(caja);
      contenedor.replaceChildren(vacio);
      return;
    }

    contenedor.replaceChildren(
      ...adquisiciones.slice(0, ADQUISICIONES_EN_PANEL).map(crearTarjetaPanel)
    );
  } catch (error) {
    console.error("Error al cargar las adquisiciones:", error.code, error.message);
    contenedor.replaceChildren(
      crearElemento("p", "col-12 text-danger mb-0",
        "No pudimos cargar tus adquisiciones. Recargá la página para intentar de nuevo.")
    );
  }
}

// Crea un elemento con clases y texto (textContent: los datos nunca se interpretan como HTML)
function crearElemento(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function crearTarjetaPanel(a) {
  const col = crearElemento("div", "col-md-6 col-xl-4");
  const tarjeta = crearElemento("article", "card-litoral p-4 h-100 d-flex flex-column");
  const estado = crearElemento("span", "badge badge-accent align-self-start mb-2",
    a.estado === ESTADOS_ADQUISICION.CONFIRMADA ? "Confirmada" : a.estado);
  const enlace = crearElemento("a", "mt-auto", "Ver detalle del servicio");
  enlace.href = `../catalogo/detalle.html?id=${encodeURIComponent(a.servicioId)}`;

  tarjeta.append(
    estado,
    crearElemento("h3", "h6 fw-bold mb-1", a.servicioNombre),
    crearElemento("p", "small text-secondary mb-3", a.prestador || ""),
    crearElemento("p", "small mb-3", `Adquirido el ${formatearFecha(a.fecha, false)} · ${formatearImporte(a)}`),
    enlace
  );
  col.append(tarjeta);
  return col;
}

/* ------------------------------------------------------------------ */
/* RD-04: servicios del prestador en el panel                          */
/* ------------------------------------------------------------------ */
// Muestra los servicios del prestador (los 3 primeros) con acceso a "Mis servicios".

async function cargarServiciosPanel(uid, contenedor, totalActivos) {
  try {
    const servicios = await obtenerServiciosDePrestador(uid);
    const activos = servicios.filter((s) => s.activo).length;
    if (totalActivos) {
      totalActivos.textContent = activos;
      const etiqueta = totalActivos.nextElementSibling;
      if (etiqueta) etiqueta.textContent = "Servicios activos en el catálogo";
    }

    if (servicios.length === 0) {
      const vacio = crearElemento("div", "col-12");
      const caja = crearElemento("div", "card-litoral p-4 text-center");
      const enlace = crearElemento("a", "", "Crear mi primer servicio");
      enlace.href = "mis-servicios.html";
      caja.append(crearElemento("p", "text-secondary mb-2", "Todavía no tenés servicios publicados."), enlace);
      vacio.append(caja);
      contenedor.replaceChildren(vacio);
      return;
    }

    contenedor.replaceChildren(
      ...servicios.slice(0, ADQUISICIONES_EN_PANEL).map((s) => {
        const col = crearElemento("div", "col-md-6 col-xl-4");
        const tarjeta = crearElemento("article", "card-litoral p-4 h-100 d-flex flex-column");
        const enlace = crearElemento("a", "mt-auto", "Gestionar");
        enlace.href = "mis-servicios.html";
        tarjeta.append(
          crearElemento("span", `badge align-self-start mb-2 ${s.activo ? "text-bg-success" : "text-bg-secondary"}`, s.activo ? "Activo" : "Dado de baja"),
          crearElemento("h3", "h6 fw-bold", s.nombre),
          crearElemento("p", "small text-secondary mb-3", s.duracion || ""),
          enlace
        );
        col.append(tarjeta);
        return col;
      })
    );
  } catch (error) {
    console.error("Error al cargar los servicios del prestador:", error.code, error.message);
    contenedor.replaceChildren(
      crearElemento("p", "col-12 text-danger mb-0", "No pudimos cargar tus servicios. Recargá la página para intentar de nuevo.")
    );
  }
}
