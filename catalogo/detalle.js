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
        const tarjeta = crear("article", "card-litoral p-4 h-100");
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
