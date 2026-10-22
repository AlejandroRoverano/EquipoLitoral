// catalogo/clase-prueba.js
// RF-15: Clase de prueba gratuita de un servicio (clase-prueba.html?id=...).
//
// - Visitante sin sesión: ve una invitación a registrarse o iniciar sesión.
// - Usuario con sesión: ve la clase sin adquirir el servicio ni pagar nada.
//   Si el enlace es de YouTube, el video se muestra en la página; si no,
//   se ofrece un botón para abrir el material en otra pestaña.
// - Las reglas de Firestore solo permiten leer la clase con sesión iniciada.

import { auth } from "../firebase-config.js";
import {
  obtenerServicio,
  obtenerClasePrueba,
  idVideoYoutube,
  esEnlaceValido,
  formatearPrecio
} from "../servicios-modelo.js";

const $ = (id) => document.getElementById(id);

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Muestra uno de los estados de la página y oculta los demás
function mostrar(id) {
  ["clase-cargando", "clase-invitacion", "clase-no-disponible", "clase-contenido"].forEach((estado) =>
    $(estado).classList.toggle("hidden", estado !== id)
  );
}

function noDisponible(titulo, texto, servicioId) {
  $("no-disponible-titulo").textContent = titulo;
  $("no-disponible-texto").textContent = texto;
  if (servicioId) {
    const enlace = $("no-disponible-enlace");
    enlace.href = `detalle.html?id=${encodeURIComponent(servicioId)}`;
    enlace.textContent = "Ver el servicio";
  }
  mostrar("clase-no-disponible");
}

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

const id = new URLSearchParams(window.location.search).get("id");

try {
  const servicio = await obtenerServicio(id);
  if (!servicio) {
    noDisponible("No encontramos este servicio", "Puede que el enlace sea incorrecto o que el servicio ya no exista.");
  } else {
    const urlDetalle = `detalle.html?id=${encodeURIComponent(servicio.id)}`;
    const migas = $("migas-servicio");
    migas.textContent = servicio.nombre;
    migas.href = urlDetalle;
    document.title = `Clase de prueba: ${servicio.nombre} | Equipo Litoral`;

    await auth.authStateReady();
    const user = auth.currentUser;

    if (!servicio.tieneClasePrueba) {
      noDisponible("Este servicio no tiene clase de prueba", "Podés ver la información completa del servicio en su detalle.", servicio.id);
    } else if (!user) {
      // Visitante: invitación a registrarse (la clase solo se ve con sesión iniciada)
      $("invitacion-texto").textContent =
        `Creá una cuenta gratuita o iniciá sesión para ver la clase de prueba de "${servicio.nombre}". No tenés que pagar nada.`;
      // Después de entrar, el login trae al usuario de vuelta a esta clase
      const volver = `?volver=${encodeURIComponent(window.location.href)}`;
      $("invitacion-registro").href += volver;
      $("invitacion-login").href += volver;
      mostrar("clase-invitacion");
    } else {
      const clase = await obtenerClasePrueba(servicio.id);
      if (!clase) {
        noDisponible("Este servicio no tiene clase de prueba", "Podés ver la información completa del servicio en su detalle.", servicio.id);
      } else {
        renderizar(servicio, clase, urlDetalle);
      }
    }
  }
} catch (error) {
  console.error("Error al cargar la clase de prueba:", error.code, error.message);
  noDisponible(
    "No pudimos cargar la clase de prueba",
    error.code === "permission-denied"
      ? "No tenés permisos para ver esta clase. Probá cerrar sesión y volver a entrar."
      : "Revisá tu conexión y recargá la página."
  );
}

/* ------------------------------------------------------------------ */
/* Presentación                                                        */
/* ------------------------------------------------------------------ */

function renderizar(servicio, clase, urlDetalle) {
  $("clase-titulo").textContent = clase.titulo;
  $("clase-servicio").textContent = `Del servicio "${servicio.nombre}"${servicio.prestador ? ` · ${servicio.prestador}` : ""}`;

  // Recurso: video de YouTube dentro de la página, o botón para abrir el material
  const recurso = $("clase-recurso");
  const idVideo = idVideoYoutube(clase.enlace);
  if (idVideo) {
    const marco = crear("div", "ratio ratio-16x9 rounded overflow-hidden shadow-sm");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${idVideo}`;
    iframe.title = `Video: ${clase.titulo}`;
    iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    marco.append(iframe);
    recurso.replaceChildren(marco);
  } else if (esEnlaceValido(clase.enlace)) {
    const caja = crear("div", "card-litoral p-4 d-flex flex-wrap align-items-center gap-3");
    const icono = crear("i", "bi bi-file-earmark-play display-6 text-success");
    icono.setAttribute("aria-hidden", "true");
    const texto = crear("div", "me-auto");
    texto.append(crear("p", "fw-semibold mb-0", "Material de la clase"), crear("p", "small text-secondary mb-0", "Se abre en una pestaña nueva."));
    const boton = crear("a", "btn btn-primary", "Abrir material");
    boton.href = clase.enlace;
    boton.target = "_blank";
    boton.rel = "noopener noreferrer";
    caja.append(icono, texto, boton);
    recurso.replaceChildren(caja);
  }

  const parrafos = (clase.descripcion || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  $("clase-descripcion").replaceChildren(
    ...parrafos.map((p, i) => crear("p", i === parrafos.length - 1 ? "mb-0" : "", p))
  );

  // Acceso para adquirir el servicio completo
  $("cta-adquirir").href = urlDetalle;
  if (servicio.activo) {
    $("cta-precio").textContent = `${formatearPrecio(servicio.precio, servicio.moneda)} / ${servicio.periodo}`;
  } else {
    $("cta-texto").textContent = "Este servicio ya no está disponible para nuevas adquisiciones.";
    $("cta-precio").classList.add("hidden");
    $("cta-adquirir").textContent = "Ver el servicio";
  }

  mostrar("clase-contenido");
}
