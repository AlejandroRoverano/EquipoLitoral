// catalogo/resenas-detalle.js
// RF-26: sección "Opiniones de estudiantes" del detalle de un curso.
// - Todos ven las opiniones y el promedio.
// - Solo un estudiante que adquirió el curso ve el formulario para opinar
//   (las reglas de Firestore lo vuelven a comprobar al guardar).

import { auth } from "../firebase-config.js";
import { obtenerRol, ROLES } from "../acceso.js";
import { usuarioTieneServicio, formatearFecha } from "../adquisiciones-modelo.js";
import {
  obtenerResenasDeServicio,
  obtenerMiResena,
  guardarResena,
  borrarResena,
  resumir,
  formatearPuntaje,
  PUNTAJE_MAXIMO
} from "../resenas-modelo.js";

const $ = (id) => document.getElementById(id);

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Estrellas de solo lectura (relleno proporcional, igual que en la portada)
export function crearEstrellas(puntaje, clases = "") {
  const caja = crear("span", `estrellas ${clases}`);
  caja.setAttribute("role", "img");
  caja.setAttribute("aria-label", `${formatearPuntaje(puntaje)} de ${PUNTAJE_MAXIMO} estrellas`);
  const base = crear("span", "estrellas-base");
  const relleno = crear("span", "estrellas-relleno");
  relleno.style.width = `${(puntaje / PUNTAJE_MAXIMO) * 100}%`;
  for (let i = 0; i < PUNTAJE_MAXIMO; i++) {
    base.append(crear("i", "bi bi-star-fill"));
    relleno.append(crear("i", "bi bi-star-fill"));
  }
  base.setAttribute("aria-hidden", "true");
  relleno.setAttribute("aria-hidden", "true");
  caja.append(base, relleno);
  return caja;
}

function mensaje(texto, tipo) {
  const caja = $("resena-msg");
  caja.textContent = texto;
  caja.className = `alert alert-${tipo} small mt-3 mb-0`;
}

function ocultarMensaje() {
  const caja = $("resena-msg");
  caja.textContent = "";
  caja.className = "hidden";
}

function crearTarjetaResena(r, esMia) {
  const tarjeta = crear("article", "card-litoral resena p-3");
  const cabecera = crear("div", "d-flex flex-wrap align-items-center gap-2 mb-1");
  cabecera.append(
    crearEstrellas(r.puntaje),
    crear("span", "fw-semibold", r.nombre || "Estudiante"),
    crear("span", "badge text-bg-light border text-success", "Compra verificada")
  );
  if (esMia) cabecera.append(crear("span", "badge text-bg-primary", "Tu opinión"));
  tarjeta.append(cabecera);
  if (r.comentario) tarjeta.append(crear("p", "mb-1", r.comentario));
  tarjeta.append(crear("p", "small text-secondary mb-0", r.fecha ? formatearFecha(r.fecha, false) : ""));
  return tarjeta;
}

export function iniciarResenas(servicio) {
  const form = $("form-resena");
  const comentario = $("resena-comentario");
  const btnGuardar = $("btn-resena-guardar");
  const btnBorrar = $("btn-resena-borrar");
  let usuario = null;

  async function cargarLista() {
    $("resenas-cargando").classList.remove("hidden");
    try {
      const resenas = await obtenerResenasDeServicio(servicio.id);
      const { promedio, cantidad } = resumir(resenas);
      const resumen = $("resenas-resumen");
      resumen.replaceChildren();
      if (cantidad > 0) {
        resumen.append(
          crear("span", "h4 fw-bold mb-0", formatearPuntaje(promedio)),
          crearEstrellas(promedio, "fs-5"),
          crear("span", "small text-secondary", `(${cantidad} ${cantidad === 1 ? "opinión" : "opiniones"})`)
        );
      }
      $("resenas-vacio").classList.toggle("hidden", cantidad > 0);
      $("lista-resenas").replaceChildren(...resenas.map((r) => crearTarjetaResena(r, usuario && r.uid === usuario.uid)));
    } catch (error) {
      console.error("No se pudieron cargar las opiniones:", error.code, error.message);
      $("resenas-vacio").textContent = "No pudimos cargar las opiniones.";
      $("resenas-vacio").classList.remove("hidden");
    } finally {
      $("resenas-cargando").classList.add("hidden");
    }
  }

  // Muestra el formulario solo a un estudiante que adquirió el curso
  async function prepararFormulario() {
    form.classList.add("hidden");
    await auth.authStateReady();
    usuario = auth.currentUser;
    if (!usuario) return;
    try {
      if ((await obtenerRol(usuario.uid)) !== ROLES.ESTUDIANTE) return;
      if (!(await usuarioTieneServicio(usuario.uid, servicio.id))) return;
      const mia = await obtenerMiResena(usuario.uid, servicio.id);
      form.reset();
      ocultarMensaje();
      if (mia) {
        const radio = form.querySelector(`input[name="puntaje"][value="${mia.puntaje}"]`);
        if (radio) radio.checked = true;
        comentario.value = mia.comentario || "";
      }
      $("resena-form-titulo").textContent = mia ? "Tu opinión sobre el curso" : "Contanos qué te pareció el curso";
      btnGuardar.textContent = mia ? "Actualizar opinión" : "Publicar opinión";
      btnBorrar.classList.toggle("hidden", !mia);
      form.classList.remove("hidden");
    } catch (error) {
      console.error("No se pudo preparar el formulario de opinión:", error.code, error.message);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensaje();
    const elegido = form.querySelector('input[name="puntaje"]:checked');
    if (!elegido) {
      mensaje("Elegí un puntaje de 1 a 5 estrellas.", "warning");
      return;
    }
    btnGuardar.disabled = true;
    try {
      await guardarResena({
        uid: usuario.uid,
        nombreCompleto: usuario.displayName || "",
        servicioId: servicio.id,
        puntaje: Number(elegido.value),
        comentario: comentario.value
      });
      await Promise.all([cargarLista(), prepararFormulario()]);
      mensaje("¡Gracias! Tu opinión ya está publicada.", "success");
    } catch (error) {
      console.error("No se pudo guardar la opinión:", error.code, error.message);
      mensaje(
        error.code === "permission-denied"
          ? "No pudimos guardar tu opinión: solo pueden opinar quienes adquirieron el curso."
          : "No pudimos guardar tu opinión. Revisá tu conexión e intentá de nuevo.",
        "danger"
      );
    } finally {
      btnGuardar.disabled = false;
    }
  });

  btnBorrar.addEventListener("click", async () => {
    btnBorrar.disabled = true;
    try {
      await borrarResena(usuario.uid, servicio.id);
      await Promise.all([cargarLista(), prepararFormulario()]);
      mensaje("Se borró tu opinión.", "info");
    } catch (error) {
      console.error("No se pudo borrar la opinión:", error.code, error.message);
      mensaje("No pudimos borrar tu opinión. Intentá de nuevo.", "danger");
    } finally {
      btnBorrar.disabled = false;
    }
  });

  async function recargar() {
    await prepararFormulario();
    await cargarLista();
  }
  recargar();
  return { recargar };
}
