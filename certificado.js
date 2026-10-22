// certificado.js
// RF-25: página pública para ver, descargar (imprimir a PDF) y verificar certificados.
//   certificado.html?codigo=EL-XXXX-XXXX  -> muestra el certificado si existe
//   certificado.html                      -> formulario para ingresar un código

import { obtenerCertificado, normalizarCodigo, FORMATO_CODIGO, urlCertificado } from "./certificados-modelo.js";

const $ = (id) => document.getElementById(id);
const codigo = normalizarCodigo(new URLSearchParams(window.location.search).get("codigo"));

$("form-verificar").addEventListener("submit", (e) => {
  e.preventDefault();
  const ingresado = normalizarCodigo($("codigo-certificado").value);
  window.location.href = `certificado.html?codigo=${encodeURIComponent(ingresado)}`;
});

function noEncontrado(texto) {
  if (texto) $("cert-no-encontrado-texto").textContent = texto;
  $("cert-no-encontrado").classList.remove("hidden");
}

if (codigo) {
  $("codigo-certificado").value = codigo;
  if (!FORMATO_CODIGO.test(codigo)) {
    noEncontrado("El código no tiene el formato correcto. Debería verse así: EL-XXXX-XXXX.");
  } else {
    $("cert-cargando").classList.remove("hidden");
    try {
      const cert = await obtenerCertificado(codigo);
      if (!cert) {
        noEncontrado();
      } else {
        $("cert-nombre").textContent = cert.nombre;
        $("cert-curso").textContent = cert.servicioNombre;
        $("cert-prestador").textContent = cert.prestador ? `dictado por ${cert.prestador}` : "";
        $("cert-fecha").textContent = cert.emitidoEn
          ? cert.emitidoEn.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" })
          : "-";
        $("cert-codigo").textContent = cert.codigo;
        $("cert-url").textContent = new URL("certificado.html", import.meta.url).href.replace(/^https?:\/\//, "");
        document.title = `Certificado de ${cert.nombre} | Equipo Litoral`;
        $("cert-buscador").classList.add("hidden");
        $("cert-resultado").classList.remove("hidden");
      }
    } catch (error) {
      console.error("No se pudo verificar el certificado:", error.code, error.message);
      noEncontrado("No pudimos verificar el certificado. Revisá tu conexión y recargá la página.");
    } finally {
      $("cert-cargando").classList.add("hidden");
    }
  }
}

$("btn-imprimir").addEventListener("click", () => window.print());

$("btn-copiar").addEventListener("click", async () => {
  const boton = $("btn-copiar");
  try {
    await navigator.clipboard.writeText(urlCertificado(codigo));
    boton.textContent = "¡Enlace copiado!";
  } catch {
    boton.textContent = "No se pudo copiar";
  }
  setTimeout(() => {
    boton.replaceChildren();
    const icono = document.createElement("i");
    icono.className = "bi bi-link-45deg me-1";
    icono.setAttribute("aria-hidden", "true");
    boton.append(icono, "Copiar enlace");
  }, 2000);
});
