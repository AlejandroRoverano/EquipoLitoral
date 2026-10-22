// gestion/materiales.js
// RF-16: Materiales de un servicio adquirido (materiales.html?id=...).
//
// - Sin sesión: redirige al login (y vuelve acá después de entrar).
// - Pueden verlos: quien adquirió el servicio, su prestador y el administrador.
// - Cualquier otro usuario ve un aviso para adquirir el servicio.
// Las reglas de Firestore (firestore.rules) aplican el mismo control en el servidor.

import { protegerPagina, ROLES } from "../acceso.js";
import { obtenerServicio } from "../servicios-modelo.js";
import { obtenerAdquisicion, ESTADOS_ADQUISICION } from "../adquisiciones-modelo.js";
import { obtenerMateriales, contarMateriales } from "../materiales-modelo.js";
import { crearModulo } from "../materiales-vista.js";
import { crearBloqueProgreso, iniciarProgreso } from "../progreso-vista.js";

const $ = (id) => document.getElementById(id);

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function mostrar(id) {
  ["materiales-cargando", "materiales-aviso", "materiales-contenido"].forEach((e) =>
    $(e).classList.toggle("hidden", e !== id)
  );
}

function aviso(titulo, texto, { icono = "bi-lock", enlace = null, textoEnlace = null } = {}) {
  $("aviso-icono").className = `bi ${icono} display-5 text-secondary`;
  $("aviso-titulo").textContent = titulo;
  $("aviso-texto").textContent = texto;
  if (enlace) {
    $("aviso-enlace").href = enlace;
    $("aviso-enlace").textContent = textoEnlace;
  }
  mostrar("materiales-aviso");
}

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

const acceso = await protegerPagina();

if (acceso) {
  const { user, rol } = acceso;
  const id = new URLSearchParams(window.location.search).get("id");

  try {
    const servicio = await obtenerServicio(id);
    if (!servicio) {
      aviso("No encontramos este servicio", "Puede que el enlace sea incorrecto.", { icono: "bi-search" });
    } else {
      const urlDetalle = `../catalogo/detalle.html?id=${encodeURIComponent(servicio.id)}`;
      document.title = `Materiales: ${servicio.nombre} | Equipo Litoral`;

      // ¿Puede ver los materiales? (las reglas de Firestore lo vuelven a verificar)
      let puedeVer = rol === ROLES.ADMINISTRADOR || (rol === ROLES.PRESTADOR && servicio.prestadorUid === user.uid);
      if (!puedeVer) {
        const adquisicion = await obtenerAdquisicion(user.uid, servicio.id);
        puedeVer = adquisicion?.estado === ESTADOS_ADQUISICION.CONFIRMADA;
      }

      if (!puedeVer) {
        aviso(
          "Adquirí el servicio para acceder a los materiales",
          `Los materiales de "${servicio.nombre}" están disponibles para quienes adquirieron el servicio.`,
          { enlace: urlDetalle, textoEnlace: "Ver el servicio" }
        );
      } else {
        const modulos = await obtenerMateriales(servicio.id);
        // RF-24: el estudiante marca los materiales vistos y ve su progreso
        let progreso = null;
        let bloque = null;
        if (rol === ROLES.ESTUDIANTE && modulos.length > 0) {
          try {
            const ui = crearBloqueProgreso();
            progreso = await iniciarProgreso({ user, servicio, modulos, adquirido: true, ui });
            bloque = ui.bloque;
          } catch (error) {
            console.error("No se pudo cargar el progreso:", error.code, error.message);
          }
        }
        renderizar(servicio, modulos, urlDetalle, progreso, bloque);
      }
    }
  } catch (error) {
    console.error("Error al cargar los materiales:", error.code, error.message);
    aviso(
      "No pudimos cargar los materiales",
      error.code === "permission-denied"
        ? "No tenés permisos para ver los materiales de este servicio."
        : "Revisá tu conexión y recargá la página.",
      { icono: "bi-exclamation-triangle" }
    );
  }
}

/* ------------------------------------------------------------------ */
/* Presentación                                                        */
/* ------------------------------------------------------------------ */

function renderizar(servicio, modulos, urlDetalle, progreso = null, bloqueProgreso = null) {
  $("materiales-servicio").textContent = servicio.nombre;
  const total = contarMateriales(modulos);
  $("materiales-subtitulo").textContent = [
    servicio.prestador,
    modulos.length ? `${modulos.length} ${modulos.length === 1 ? "módulo" : "módulos"} · ${total} ${total === 1 ? "material" : "materiales"}` : ""
  ].filter(Boolean).join(" · ");
  $("materiales-detalle").href = urlDetalle;

  $("materiales-vacio").classList.toggle("hidden", modulos.length > 0);
  if (bloqueProgreso) $("materiales-modulos").before(bloqueProgreso);
  $("materiales-modulos").replaceChildren(...modulos.map((m, i) => crearModulo(m, i, "modulo", progreso)));
  mostrar("materiales-contenido");
}
