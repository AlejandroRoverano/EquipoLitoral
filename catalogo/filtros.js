// catalogo/filtros.js
// Filtro por categoría del catálogo (se reemplaza por la consulta a Firestore cuando los servicios se lean de la base).

(function () {
  const radios = document.querySelectorAll('input[name="categoria"]');
  const items = document.querySelectorAll("[data-categoria]");
  const vacio = document.getElementById("sin-resultados");

  function aplicar() {
    const seleccionada = document.querySelector('input[name="categoria"]:checked').value;
    let visibles = 0;
    items.forEach((item) => {
      const coincide = seleccionada === "todas" || item.dataset.categoria === seleccionada;
      item.classList.toggle("hidden", !coincide);
      if (coincide) visibles++;
    });
    vacio.classList.toggle("hidden", visibles > 0);
  }

  radios.forEach((r) => r.addEventListener("change", aplicar));
  document.getElementById("btn-limpiar").addEventListener("click", () => {
    document.getElementById("cat-todas").checked = true;
    aplicar();
  });
  aplicar();
})();
