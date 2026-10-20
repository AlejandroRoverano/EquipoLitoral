// login/tabs.js
// Alterna entre "Iniciar sesión" y "Crear cuenta". login.html abre la primera pestaña
// y registro.html abre la segunda (según data-inicio del <body>).

(function () {
  const paneles = { login: "login-form", registro: "register-form" };
  const tabs = { login: document.getElementById("tab-login"), registro: document.getElementById("tab-register") };

  function mostrar(nombre) {
    Object.keys(paneles).forEach((k) => {
      const activa = k === nombre;
      document.getElementById(paneles[k]).classList.toggle("hidden", !activa);
      tabs[k].classList.toggle("active", activa);
      tabs[k].setAttribute("aria-selected", activa);
    });
  }

  tabs.login.addEventListener("click", () => mostrar("login"));
  tabs.registro.addEventListener("click", () => mostrar("registro"));
  mostrar(document.body.dataset.inicio === "registro" ? "registro" : "login");
})();
