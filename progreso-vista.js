// progreso-vista.js
// RF-24 / RF-25: barra de progreso, materiales "vistos" y certificado de un curso.
// La usan el detalle del curso (catalogo/detalle.js) y la página de materiales
// (gestion/materiales.js), solo para estudiantes que adquirieron el curso o
// tienen la prueba gratis vigente.

import {
  obtenerProgreso,
  guardarProgreso,
  clavesDelCurso,
  calcularPorcentaje
} from "./progreso-modelo.js";
import { emitirCertificado, urlCertificado } from "./certificados-modelo.js";

function crear(etiqueta, clases, texto) {
  const el = document.createElement(etiqueta);
  if (clases) el.className = clases;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Crea el bloque visual del progreso (barra + texto + zona del certificado)
export function crearBloqueProgreso() {
  const bloque = crear("div", "card-litoral bloque-progreso p-3 mb-3");
  const cabecera = crear("div", "d-flex flex-wrap justify-content-between gap-2 small mb-2");
  const texto = crear("span", "text-secondary");
  cabecera.append(crear("span", "fw-semibold", "Tu progreso"), texto);
  const barraWrap = crear("div", "progress");
  barraWrap.setAttribute("role", "progressbar");
  barraWrap.setAttribute("aria-label", "Progreso del curso");
  barraWrap.setAttribute("aria-valuemin", "0");
  barraWrap.setAttribute("aria-valuemax", "100");
  const barra = crear("div", "progress-bar bg-success");
  barraWrap.append(barra);
  const certificado = crear("div", "mt-3 small");
  certificado.setAttribute("aria-live", "polite");
  bloque.append(cabecera, barraWrap, certificado);
  return { bloque, barra, barraWrap, texto, certificado };
}

/**
 * Carga el progreso del estudiante y devuelve las opciones para crearModulo().
 * @param {object} p
 * @param {object} p.user        Usuario de Firebase Auth.
 * @param {object} p.servicio    Servicio (id, nombre, prestador, certificado).
 * @param {object[]} p.modulos   Módulos del curso.
 * @param {boolean} p.adquirido  true si lo compró (con la prueba gratis no hay certificado).
 * @param {object} p.ui          Resultado de crearBloqueProgreso().
 */
export async function iniciarProgreso({ user, servicio, modulos, adquirido, ui }) {
  const validas = clavesDelCurso(modulos);
  const total = validas.size;
  const guardado = await obtenerProgreso(user.uid, servicio.id);
  const vistos = new Set((guardado?.vistos || []).filter((clave) => validas.has(clave)));
  let codigo = guardado?.certificadoCodigo || null;
  let cola = Promise.resolve();
  let errorGuardado = false;

  function pintar() {
    const porcentaje = calcularPorcentaje(vistos.size, total);
    ui.barra.style.width = `${porcentaje}%`;
    ui.barraWrap.setAttribute("aria-valuenow", String(porcentaje));
    ui.texto.textContent = `${porcentaje} % · ${vistos.size} de ${total} ${total === 1 ? "material visto" : "materiales vistos"}` +
      (errorGuardado ? " · no se pudo guardar, revisá tu conexión" : "");
    pintarCertificado(total > 0 && vistos.size >= total);
  }

  function pintarCertificado(completo) {
    const zona = ui.certificado;
    zona.replaceChildren();
    if (codigo) {
      const enlace = crear("a", "btn btn-sm btn-accent");
      enlace.href = urlCertificado(codigo);
      enlace.append(crear("i", "bi bi-award me-1"), "Ver mi certificado");
      zona.append(enlace);
      return;
    }
    if (!completo) {
      zona.textContent = servicio.certificado
        ? "Marcá todos los materiales como vistos para obtener tu certificado."
        : "Marcá cada material como visto a medida que avanzás.";
      zona.className = "mt-3 small text-secondary";
      return;
    }
    zona.className = "mt-3 small";
    if (!servicio.certificado) {
      zona.append(crear("span", "text-success fw-semibold", "¡Completaste el curso! Este curso no entrega certificado."));
    } else if (!adquirido) {
      zona.append(crear("span", "text-secondary", "¡Completaste el curso! Adquirilo para obtener tu certificado."));
    } else {
      const boton = crear("button", "btn btn-sm btn-accent");
      boton.type = "button";
      boton.append(crear("i", "bi bi-award me-1"), "Obtener mi certificado");
      boton.addEventListener("click", async () => {
        boton.disabled = true;
        try {
          await cola; // primero se termina de guardar el progreso
          codigo = await emitirCertificado({ uid: user.uid, nombre: user.displayName || user.email, servicio });
          pintarCertificado(true);
        } catch (error) {
          console.error("No se pudo emitir el certificado:", error.code, error.message);
          boton.disabled = false;
          zona.append(crear("p", "text-danger mt-2 mb-0", "No pudimos emitir el certificado. Intentá de nuevo en un momento."));
        }
      });
      zona.append(crear("span", "text-success fw-semibold me-2", "¡Completaste el curso!"), boton);
    }
  }

  // Se guarda en orden (cola), para que un clic rápido no pise al anterior
  function alMarcar(clave, marcado) {
    if (marcado) vistos.add(clave);
    else vistos.delete(clave);
    pintar();
    cola = cola
      .then(() => guardarProgreso(user.uid, servicio.id, vistos, total))
      .then(() => {
        if (errorGuardado) { errorGuardado = false; pintar(); }
      })
      .catch((error) => {
        console.error("No se pudo guardar el progreso:", error.code, error.message);
        errorGuardado = true;
        pintar();
      });
  }

  pintar();
  return { vistos, alMarcar };
}
