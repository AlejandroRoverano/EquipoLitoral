// catalogo/detalle.js
// RF-11: Detalle de un servicio, leído desde Firestore (detalle.html?id=...).
//
// Exporta "servicioListo": una promesa con los datos del servicio que usa el
// flujo de adquisición (adquisicion.js). Resuelve null si no existe.

import {
  obtenerServicio,
  obtenerServiciosActivos,
  CATEGORIAS,
  formatearPrecio,
  formatearFechaInicio
} from "../servicios-modelo.js";
import { auth } from "../firebase-config.js";
import { obtenerRol, ROLES } from "../acceso.js";
import { obtenerAdquisicion, ESTADOS_ADQUISICION } from "../adquisiciones-modelo.js";
import { obtenerMateriales, contarMateriales } from "../materiales-modelo.js";
import { crearModulo } from "../materiales-vista.js";
import { crearBloqueProgreso, iniciarProgreso } from "../progreso-vista.js";
import { iniciarResenas } from "./resenas-detalle.js";
import {
  obtenerPrueba,
  activarPrueba,
  pruebaVigente,
  vencimientoPrueba,
  tiempoRestante,
  formatearVencimiento
} from "../pruebas-modelo.js";

const $ = (id) => document.getElementById(id);

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function icono(clase) {
  const i = crear("i", `bi ${clase} text-success me-2`);
  i.setAttribute("aria-hidden", "true");
  return i;
}

function mostrarNoEncontrado(titulo, texto) {
  $("detalle-cargando").classList.add("hidden");
  if (titulo) $("no-encontrado-titulo").textContent = titulo;
  if (texto) $("no-encontrado-texto").textContent = texto;
  $("detalle-no-encontrado").classList.remove("hidden");
}

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

async function cargar() {
  const id = new URLSearchParams(window.location.search).get("id");

  let servicio = null;
  try {
    servicio = await obtenerServicio(id);
  } catch (error) {
    console.error("Error al cargar el servicio:", error.code, error.message);
    mostrarNoEncontrado("No pudimos cargar el servicio", "Revisá tu conexión y recargá la página.");
    return null;
  }

  if (!servicio) {
    mostrarNoEncontrado();
    return null;
  }

  renderizar(servicio);
  cargarRelacionados(servicio);
  cargarContenido(servicio);
  // RF-26: opiniones de los estudiantes
  const resenas = iniciarResenas(servicio);
  // Si lo adquiere desde esta misma página, se muestran el contenido y el formulario de reseña sin recargar
  document.addEventListener("servicio-adquirido", () => {
    cargarContenido(servicio);
    resenas.recargar();
  });

  // Datos que usa el flujo de adquisición (resumen y registro)
  return {
    ...servicio,
    duracion: [servicio.duracion, servicio.cargaHoraria].filter(Boolean).join(" · "),
    inicio: formatearFechaInicio(servicio.fechaInicio)
  };
}

export const servicioListo = cargar();

/* ------------------------------------------------------------------ */
/* Presentación                                                        */
/* ------------------------------------------------------------------ */

function renderizar(s) {
  document.title = `${s.nombre} | Equipo Litoral`;
  $("migas-servicio").textContent = s.nombre;

  // Encabezado
  const badges = $("detalle-badges");
  badges.replaceChildren(crear("span", "badge text-bg-primary me-1", s.modalidad));
  if (CATEGORIAS[s.categoria]) badges.append(crear("span", "badge text-bg-secondary me-1", CATEGORIAS[s.categoria]));
  if (s.certificado) badges.append(crear("span", "badge badge-accent", "Certificado"));
  $("detalle-nombre").textContent = s.nombre;
  $("detalle-descripcion-corta").textContent = s.descripcionCorta || "";

  // Pestañas
  const parrafos = (s.descripcion || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  $("detalle-descripcion").replaceChildren(
    ...parrafos.map((p, i) => crear("p", i === parrafos.length - 1 ? "mb-0" : "", p))
  );

  const objetivos = s.objetivos || [];
  $("detalle-objetivos").replaceChildren(
    ...(objetivos.length ? objetivos.map((o) => crear("li", "", o)) : [crear("li", "text-secondary", "Sin objetivos cargados.")])
  );

  $("detalle-requisitos").textContent = s.requisitos || "No se requieren conocimientos previos.";
  $("detalle-prestador").textContent = s.prestador || "";
  $("detalle-institucion").textContent = s.institucion && s.institucion !== s.prestador ? s.institucion : "";
  $("detalle-prestador-detalle").textContent = s.prestadorDetalle || "";

  // Bloque de adquisición
  $("detalle-precio").textContent = formatearPrecio(s.precio, "").trim();
  $("detalle-periodo").textContent = `${s.moneda} / ${s.periodo}`;

  const datos = [];
  const duracion = [s.duracion, s.cargaHoraria].filter(Boolean).join(" · ");
  if (duracion) datos.push(["bi-clock", duracion]);
  if (s.cupo) datos.push(["bi-people", `Máximo ${s.cupo} estudiantes`]);
  datos.push(["bi-calendar-event", `Inicia: ${formatearFechaInicio(s.fechaInicio)}`]);
  $("detalle-datos").replaceChildren(
    ...datos.map(([clase, texto], i) => {
      const li = crear("li", i < datos.length - 1 ? "mb-2" : "");
      li.append(icono(clase), texto);
      return li;
    })
  );

  // RF-15: acceso a la clase de prueba gratuita (solo servicios activos que la tengan)
  if (s.tieneClasePrueba && s.activo) {
    const claseBtn = $("btn-clase-prueba");
    claseBtn.href = `clase-prueba.html?id=${encodeURIComponent(s.id)}`;
    claseBtn.classList.remove("hidden");
  }

  // Servicio dado de baja: se puede ver, pero no adquirir
  if (!s.activo) {
    const boton = $("btn-adquirir");
    boton.disabled = true;
    boton.textContent = "No disponible";
    const aviso = $("aviso-adquisicion");
    aviso.textContent = "Este servicio ya no está disponible para nuevas adquisiciones.";
    aviso.className = "alert alert-secondary small mt-3 mb-0";
  }

  $("detalle-cargando").classList.add("hidden");
  $("detalle-contenido").classList.remove("hidden");
}

/* ------------------------------------------------------------------ */
/* RF-21: contenido del curso · RF-22: prueba gratis de un día         */
/* ------------------------------------------------------------------ */

const ESTADOS_CONTENIDO = ["contenido-cargando", "contenido-bloqueado", "contenido-vacio", "contenido-modulos"];
const MENSAJE_PRUEBA_ROL = "La prueba gratis es para cuentas de estudiante.";

function mostrarContenido(id) {
  ESTADOS_CONTENIDO.forEach((e) => $(e).classList.toggle("hidden", e !== id));
}

function mostrarBloqueado(titulo, texto, textoAccion, enlace, conPrueba = false) {
  $("bloqueado-titulo").textContent = titulo;
  $("bloqueado-texto").textContent = texto;
  const accion = $("bloqueado-accion");
  accion.textContent = textoAccion;
  accion.href = enlace;
  accion.classList.toggle("hidden", !textoAccion);
  $("bloqueado-prueba").classList.toggle("hidden", !conPrueba);
  mostrarContenido("contenido-bloqueado");
}

// Mensaje debajo del botón de la prueba, en el bloque de adquisición
function mostrarEstadoPrueba(texto, tipo = "success") {
  const caja = $("estado-prueba");
  caja.className = `alert alert-${tipo} small mt-3 mb-0`;
  caja.textContent = texto;
}

// Qué puede hacer el usuario actual con este curso
async function obtenerAccesoCurso(user, servicio) {
  if (!user) return { rol: null, puedeVer: false, adquirido: false, prueba: null };
  const rol = await obtenerRol(user.uid);
  if (rol === ROLES.ADMINISTRADOR || (rol === ROLES.PRESTADOR && servicio.prestadorUid === user.uid)) {
    return { rol, puedeVer: true, adquirido: false, prueba: null };
  }
  const adquisicion = await obtenerAdquisicion(user.uid, servicio.id);
  const adquirido = adquisicion?.estado === ESTADOS_ADQUISICION.CONFIRMADA;
  const prueba = rol === ROLES.ESTUDIANTE ? await obtenerPrueba(user.uid, servicio.id) : null;
  return { rol, puedeVer: adquirido || pruebaVigente(prueba), adquirido, prueba };
}

let servicioActual = null;
let temporizadorPrueba = null;

async function cargarContenido(servicio) {
  servicioActual = servicio;
  clearTimeout(temporizadorPrueba);
  mostrarContenido("contenido-cargando");
  $("contenido-resumen").classList.add("hidden");
  $("contenido-progreso").replaceChildren();
  $("btn-prueba-dia").classList.add("hidden");
  $("estado-prueba").classList.add("hidden");

  await auth.authStateReady();
  const user = auth.currentUser;

  try {
    const acceso = await obtenerAccesoCurso(user, servicio);
    const { rol, puedeVer, adquirido, prueba } = acceso;

    // RF-22: la prueba se ofrece si nunca la usó, no compró el curso y el curso está activo
    // (sin sesión también se muestra: al tocarla se le pide iniciar sesión)
    const ofrecerPrueba = servicio.activo && servicio.tieneMateriales && !adquirido && !prueba && (!user || rol === ROLES.ESTUDIANTE);
    $("btn-prueba-dia").classList.toggle("hidden", !ofrecerPrueba);

    if (prueba && !adquirido) {
      if (pruebaVigente(prueba)) {
        mostrarEstadoPrueba(`Prueba gratis activa: te quedan ${tiempoRestante(prueba)} (vence el ${formatearVencimiento(prueba)}).`);
        // Cuando vence, se vuelve a bloquear el contenido sin recargar
        const restanteMs = vencimientoPrueba(prueba) - new Date();
        if (restanteMs < 2 ** 31) temporizadorPrueba = setTimeout(() => cargarContenido(servicio), restanteMs + 1000);
      } else {
        mostrarEstadoPrueba(`Tu prueba gratis terminó el ${formatearVencimiento(prueba)}.`, "secondary");
      }
    }

    if (!user) {
      const urlLogin = `../login/login.html?volver=${encodeURIComponent(window.location.href)}`;
      mostrarBloqueado(
        "Contenido exclusivo para estudiantes del curso",
        "Iniciá sesión y adquirí el servicio (o probalo gratis un día) para acceder a todas las unidades y materiales.",
        "Iniciar sesión",
        urlLogin,
        ofrecerPrueba
      );
      return;
    }

    if (!puedeVer) {
      let texto = "Adquirí el servicio para acceder a todas las unidades y materiales de estudio.";
      if (!servicio.activo) texto = "Este servicio ya no está disponible para nuevas adquisiciones.";
      else if (prueba) texto = "Tu prueba gratis de un día ya terminó. Adquirí el servicio para seguir accediendo a todas las unidades.";
      else if (ofrecerPrueba) texto = "Adquirí el servicio o probalo gratis durante un día para acceder a todas las unidades y materiales.";
      mostrarBloqueado(
        "Contenido exclusivo para estudiantes del curso",
        texto,
        servicio.activo ? "Adquirir el servicio" : "",
        "#bloque-adquisicion",
        ofrecerPrueba
      );
      return;
    }

    const modulos = await obtenerMateriales(servicio.id);
    if (modulos.length === 0) {
      mostrarContenido("contenido-vacio");
      return;
    }
    const total = contarMateriales(modulos);
    const resumen = $("contenido-resumen");
    resumen.textContent = `${modulos.length} ${modulos.length === 1 ? "unidad" : "unidades"} · ${total} ${total === 1 ? "material" : "materiales"}`;
    resumen.classList.remove("hidden");
    // RF-24: el estudiante (con el curso adquirido o la prueba gratis) marca lo que ya vio
    let progreso = null;
    if (user && rol === ROLES.ESTUDIANTE) {
      try {
        const ui = crearBloqueProgreso();
        progreso = await iniciarProgreso({ user, servicio, modulos, adquirido, ui });
        $("contenido-progreso").replaceChildren(ui.bloque);
      } catch (error) {
        console.error("No se pudo cargar el progreso:", error.code, error.message);
      }
    }
    $("contenido-modulos").replaceChildren(...modulos.map((m, i) => crearModulo(m, i, "contenido-unidad", progreso)));
    mostrarContenido("contenido-modulos");
  } catch (error) {
    console.error("Error al cargar el contenido del curso:", error.code, error.message);
    mostrarBloqueado(
      error.code === "permission-denied" ? "Contenido exclusivo para estudiantes del curso" : "No pudimos cargar el contenido",
      error.code === "permission-denied"
        ? "Adquirí el servicio para acceder a todas las unidades y materiales de estudio."
        : "Revisá tu conexión y recargá la página.",
      "",
      "#"
    );
  }
}

// RF-22: activa la prueba gratis de un día del curso actual
async function activarPruebaDia() {
  const servicio = servicioActual;
  if (!servicio) return;

  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    // Después de iniciar sesión vuelve acá y la prueba se activa sola
    const url = new URL(window.location.href);
    url.searchParams.set("prueba", "activar");
    window.location.href = `../login/login.html?volver=${encodeURIComponent(url.href)}`;
    return;
  }

  const botones = [$("btn-prueba-dia"), $("bloqueado-prueba")];
  botones.forEach((b) => { b.disabled = true; });
  try {
    const { rol, adquirido, prueba } = await obtenerAccesoCurso(user, servicio);
    if (rol !== ROLES.ESTUDIANTE) {
      mostrarEstadoPrueba(MENSAJE_PRUEBA_ROL, "warning");
    } else if (adquirido) {
      mostrarEstadoPrueba("Ya adquiriste este servicio: tenés acceso completo al contenido.", "info");
    } else if (prueba) {
      mostrarEstadoPrueba("Ya usaste la prueba gratis de este curso.", "secondary");
    } else if (!servicio.activo) {
      mostrarEstadoPrueba("Este servicio ya no está disponible.", "secondary");
    } else if (!servicio.tieneMateriales) {
      mostrarEstadoPrueba("Este curso todavía no tiene unidades cargadas, así que la prueba gratis no está disponible por ahora.", "info");
    } else {
      await activarPrueba(user.uid, servicio);
      await cargarContenido(servicio);
      $("seccion-contenido").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    $("btn-prueba-dia").classList.add("hidden");
    $("bloqueado-prueba").classList.add("hidden");
  } catch (error) {
    console.error("Error al activar la prueba gratis:", error.code, error.message);
    mostrarEstadoPrueba(
      error.code === "permission-denied"
        ? "No pudimos activar la prueba. Puede que ya la hayas usado para este curso."
        : "No pudimos activar la prueba. Revisá tu conexión e intentá de nuevo.",
      "danger"
    );
  } finally {
    botones.forEach((b) => { b.disabled = false; });
  }
}

$("btn-prueba-dia").addEventListener("click", activarPruebaDia);
$("bloqueado-prueba").addEventListener("click", activarPruebaDia);

// Si viene del botón "Probar gratis 1 día" del catálogo (?prueba=activar), se activa al cargar
async function activarDesdeEnlace() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("prueba") !== "activar") return;
  const servicio = await servicioListo;
  if (!servicio) return;
  // Se quita el parámetro para que recargar la página no lo repita
  params.delete("prueba");
  history.replaceState(null, "", `${window.location.pathname}?${params}`);
  activarPruebaDia();
}
activarDesdeEnlace();

// Hasta 2 servicios activos, priorizando los de la misma categoría
async function cargarRelacionados(actual) {
  try {
    const otros = (await obtenerServiciosActivos()).filter((s) => s.id !== actual.id);
    const relacionados = [
      ...otros.filter((s) => s.categoria === actual.categoria),
      ...otros.filter((s) => s.categoria !== actual.categoria)
    ].slice(0, 2);
    if (relacionados.length === 0) return;

    $("lista-relacionados").replaceChildren(
      ...relacionados.map((s) => {
        const col = crear("div", "col-md-6");
        const tarjeta = crear("article", "card-litoral p-4 h-100 position-relative");
        const enlace = crear("a", "stretched-link text-decoration-none", s.nombre);
        enlace.href = `detalle.html?id=${encodeURIComponent(s.id)}`;
        const titulo = crear("h3", "h6 fw-bold");
        titulo.append(enlace);
        tarjeta.append(
          crear("span", "badge text-bg-secondary mb-2", CATEGORIAS[s.categoria] || ""),
          titulo,
          crear("p", "small text-secondary mb-0", `${s.duracion} · ${formatearPrecio(s.precio, s.moneda)}`)
        );
        col.append(tarjeta);
        return col;
      })
    );
    $("seccion-relacionados").classList.remove("hidden");
  } catch (error) {
    console.error("Error al cargar servicios relacionados:", error.code, error.message);
  }
}
