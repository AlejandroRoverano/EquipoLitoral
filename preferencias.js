// preferencias.js
// RNF-11: Accesibilidad. Modo oscuro y tamaño de letra ajustable.
//
// Es un script común (no un módulo) y se carga en el <head> de todas las páginas,
// así el tema y el tamaño se aplican ANTES de dibujar la página (sin parpadeo).
// La preferencia se guarda en el navegador (localStorage) y vale para todo el sitio.
// Además agrega a la barra de navegación un botón con el menú de accesibilidad.

(function () {
  "use strict";

  var CLAVE = "equipo-litoral-preferencias";
  var TAMANOS = [
    { valor: 87.5, texto: "A-", nombre: "Chica" },
    { valor: 100, texto: "A", nombre: "Normal" },
    { valor: 112.5, texto: "A+", nombre: "Grande" },
    { valor: 125, texto: "A++", nombre: "Muy grande" }
  ];

  function leer() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE)) || {};
    } catch (e) {
      return {};
    }
  }

  function guardar(preferencias) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(preferencias));
    } catch (e) {
      // Sin almacenamiento (modo privado, etc.): se aplica igual, solo que no se recuerda
    }
  }

  var preferencias = leer();

  function tamanoValido(valor) {
    return TAMANOS.some(function (t) { return t.valor === valor; }) ? valor : 100;
  }

  function aplicar() {
    var html = document.documentElement;
    html.setAttribute("data-bs-theme", preferencias.tema === "oscuro" ? "dark" : "light");
    html.style.fontSize = tamanoValido(preferencias.tamano) + "%";
  }

  aplicar();

  /* ---------------- Menú en la barra de navegación ---------------- */

  function crear(etiqueta, clases, texto) {
    var el = document.createElement(etiqueta);
    if (clases) el.className = clases;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function crearMenu() {
    var contenedor = document.querySelector(".navbar .container");
    if (!contenedor || document.getElementById("menu-preferencias")) return;

    var menu = crear("div", "dropdown menu-preferencias ms-auto me-2 order-lg-last ms-lg-2 me-lg-0");
    menu.id = "menu-preferencias";

    var boton = crear("button", "btn btn-sm btn-outline-light");
    boton.type = "button";
    boton.setAttribute("data-bs-toggle", "dropdown");
    boton.setAttribute("data-bs-auto-close", "outside");
    boton.setAttribute("aria-expanded", "false");
    boton.setAttribute("aria-label", "Accesibilidad: modo oscuro y tamaño de letra");
    boton.title = "Accesibilidad";
    var icono = crear("i", "bi bi-universal-access");
    icono.setAttribute("aria-hidden", "true");
    boton.appendChild(icono);

    var panel = crear("div", "dropdown-menu dropdown-menu-end p-3 shadow");
    panel.style.minWidth = "16rem";
    panel.appendChild(crear("p", "fw-semibold small text-uppercase text-secondary mb-2", "Accesibilidad"));

    // Modo oscuro
    var interruptor = crear("div", "form-check form-switch mb-3");
    var casilla = crear("input", "form-check-input");
    casilla.type = "checkbox";
    casilla.id = "pref-modo-oscuro";
    casilla.setAttribute("role", "switch");
    casilla.checked = preferencias.tema === "oscuro";
    var etiqueta = crear("label", "form-check-label", "Modo oscuro");
    etiqueta.htmlFor = "pref-modo-oscuro";
    casilla.addEventListener("change", function () {
      preferencias.tema = casilla.checked ? "oscuro" : "claro";
      guardar(preferencias);
      aplicar();
    });
    interruptor.appendChild(casilla);
    interruptor.appendChild(etiqueta);
    panel.appendChild(interruptor);

    // Tamaño de letra
    panel.appendChild(crear("p", "small fw-semibold mb-2", "Tamaño de letra"));
    var grupo = crear("div", "btn-group w-100");
    grupo.setAttribute("role", "group");
    grupo.setAttribute("aria-label", "Tamaño de letra");
    var botones = [];
    TAMANOS.forEach(function (t) {
      var b = crear("button", "btn btn-sm btn-outline-primary", t.texto);
      b.type = "button";
      b.title = t.nombre;
      b.setAttribute("aria-label", "Letra " + t.nombre.toLowerCase());
      b.addEventListener("click", function () {
        preferencias.tamano = t.valor;
        guardar(preferencias);
        aplicar();
        marcar();
      });
      botones.push({ boton: b, valor: t.valor });
      grupo.appendChild(b);
    });
    function marcar() {
      var actual = tamanoValido(preferencias.tamano);
      botones.forEach(function (x) {
        var activo = x.valor === actual;
        x.boton.classList.toggle("active", activo);
        x.boton.setAttribute("aria-pressed", activo ? "true" : "false");
      });
    }
    marcar();
    panel.appendChild(grupo);

    menu.appendChild(boton);
    menu.appendChild(panel);

    // Va antes del botón de menú (hamburguesa), así se ve también en el celular
    var hamburguesa = contenedor.querySelector(".navbar-toggler");
    contenedor.insertBefore(menu, hamburguesa || null);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", crearMenu);
  else crearMenu();
})();
