// servicios-gestor.js
// RF-11 / RD-04: Interfaz común para gestionar servicios (listado, alta, edición,
// baja y reactivación). La usan:
//   - admin/servicios.js        -> el administrador, con todos los servicios
//   - gestion/mis-servicios.js  -> el prestador, solo con los suyos
//
// La página debe tener los mismos IDs de elementos (tabla, buscador, formulario
// "form-servicio" con los campos srv-*, modales "modal-servicio" y "modal-estado").
// Los permisos reales los controlan las reglas de Firestore (firestore.rules).

import {
  CATEGORIAS,
  MODALIDADES,
  MONEDAS,
  PERIODOS,
  crearServicio,
  actualizarServicio,
  cambiarEstadoServicio,
  validarServicio,
  formatearPrecio,
  obtenerClasePrueba
} from "./servicios-modelo.js";
import { abrirEditorMateriales } from "./materiales-editor.js";

/**
 * Inicia la gestión de servicios en la página.
 * @param {object} opciones
 * @param {() => Promise<object[]>} opciones.obtenerServicios  Servicios a mostrar.
 * @param {string} opciones.uidUsuario   UID de quien gestiona (se guarda como creador).
 * @param {object[]} [opciones.prestadores]  Cuentas de prestadores {uid, nombre, email}.
 *        Si se pasa, el formulario muestra el selector "Prestador responsable" (administrador).
 * @param {string} [opciones.prestadorUidFijo]  Si se pasa, todos los servicios quedan a
 *        nombre de ese prestador y no se puede cambiar (vista del prestador).
 * @param {object} [opciones.valoresNuevo]  Valores iniciales del formulario de alta.
 * @returns {{ recargar: () => Promise<void> }}
 */
export function iniciarGestionServicios(opciones) {
  const $ = (id) => document.getElementById(id);

  const cargando = $("servicios-cargando");
  const vacio = $("servicios-vacio");
  const sinResultados = $("servicios-sin-resultados");
  const tablaWrap = $("servicios-tabla-wrap");
  const tabla = $("servicios-tabla");
  const mensaje = $("servicios-msg");
  const buscador = $("buscar-servicio");
  const filtroEstado = $("filtro-estado");

  const form = $("form-servicio");
  const formMsg = $("form-servicio-msg");
  const btnGuardar = $("btn-guardar-servicio");
  const selectPrestador = $("srv-prestador-uid"); // solo existe en la vista del administrador
  const modalServicio = new bootstrap.Modal($("modal-servicio"));
  const modalEstado = new bootstrap.Modal($("modal-estado"));

  const prestadores = opciones.prestadores || null;
  const nombresPrestadores = new Map((prestadores || []).map((p) => [p.uid, p]));

  let servicios = [];
  let editando = null;              // null = alta; objeto = servicio que se edita
  let servicioCambioEstado = null;  // servicio a dar de baja o reactivar

  /* ---------------- Inicio ---------------- */

  llenarSelects();
  buscador.addEventListener("input", renderizar);
  filtroEstado.addEventListener("change", renderizar);
  $("btn-nuevo-servicio").addEventListener("click", () => abrirFormulario(null));
  let aperturaFormulario = 0; // evita mezclar datos si se abren dos formularios seguidos
  form.addEventListener("submit", guardar);
  $("btn-confirmar-estado").addEventListener("click", confirmarCambioEstado);
  cargar();

  function llenarSelects() {
    const opcionesSelect = (select, pares) => {
      select.replaceChildren(...pares.map(([valor, texto]) => new Option(texto, valor)));
    };
    opcionesSelect($("srv-categoria"), Object.entries(CATEGORIAS));
    opcionesSelect($("srv-modalidad"), MODALIDADES.map((m) => [m, m]));
    opcionesSelect($("srv-moneda"), MONEDAS.map((m) => [m, m]));
    opcionesSelect($("srv-periodo"), PERIODOS.map((p) => [p, `por ${p}`]));
    if (selectPrestador && prestadores) {
      opcionesSelect(selectPrestador, [
        ["", "Sin asignar (solo lo gestiona el administrador)"],
        ...prestadores.map((p) => [p.uid, p.nombre ? `${p.nombre} (${p.email})` : p.email])
      ]);
    }
  }

  /* ---------------- Mensajes ---------------- */

  function mostrarMensaje(caja, texto, tipo) {
    caja.textContent = texto;
    caja.className = `alert alert-${tipo} mb-3`;
  }

  function ocultarMensaje(caja) {
    caja.textContent = "";
    caja.className = "hidden";
  }

  function traducirError(error) {
    return error.code === "permission-denied"
      ? "Firestore rechazó la operación: no tenés permisos para modificar este servicio."
      : "No se pudo completar la operación. Revisá tu conexión e intentá de nuevo.";
  }

  /* ---------------- Listado ---------------- */

  async function cargar() {
    cargando.classList.remove("hidden");
    try {
      servicios = await opciones.obtenerServicios();
      renderizar();
    } catch (error) {
      console.error("Error al cargar los servicios:", error.code, error.message);
      mostrarMensaje(mensaje, traducirError(error), "danger");
    } finally {
      cargando.classList.add("hidden");
    }
  }

  function renderizar() {
    vacio.classList.toggle("hidden", servicios.length > 0);
    if (servicios.length === 0) {
      tablaWrap.classList.add("hidden");
      sinResultados.classList.add("hidden");
      return;
    }

    const texto = buscador.value.trim().toLowerCase();
    const estado = filtroEstado.value;
    const visibles = servicios.filter((s) => {
      const coincideTexto =
        !texto || s.nombre.toLowerCase().includes(texto) || (s.prestador || "").toLowerCase().includes(texto);
      const coincideEstado = estado === "todos" || (estado === "activos" ? s.activo : !s.activo);
      return coincideTexto && coincideEstado;
    });

    tabla.replaceChildren(...visibles.map(crearFila));
    tablaWrap.classList.toggle("hidden", visibles.length === 0);
    sinResultados.classList.toggle("hidden", visibles.length > 0);
  }

  function crear(etiqueta, clases, texto) {
    const el = document.createElement(etiqueta);
    if (clases) el.className = clases;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function textoResponsable(s) {
    if (!prestadores) return s.prestador || "";
    if (!s.prestadorUid) return `${s.prestador || ""} · Sin cuenta asignada`;
    const cuenta = nombresPrestadores.get(s.prestadorUid);
    return `${s.prestador || ""} · Cuenta: ${cuenta ? cuenta.email : "prestador no encontrado"}`;
  }

  function crearFila(s) {
    const fila = crear("tr", s.activo ? "" : "table-secondary");

    const celdaNombre = crear("td");
    const nombre = crear("div", "fw-semibold", s.nombre);
    if (s.tieneClasePrueba) nombre.append(crear("span", "badge text-bg-info ms-2", "Clase de prueba"));
    // RF-16: todo servicio activo debería tener al menos el material del módulo inicial
    if (!s.tieneMateriales) nombre.append(crear("span", "badge text-bg-warning ms-2", "Sin materiales"));
    celdaNombre.append(nombre, crear("div", "small text-secondary", textoResponsable(s)));

    const celdaEstado = crear("td");
    celdaEstado.append(crear("span", `badge ${s.activo ? "text-bg-success" : "text-bg-secondary"}`, s.activo ? "Activo" : "Dado de baja"));

    const acciones = crear("td", "text-end text-nowrap");
    const ver = crear("a", "btn btn-sm btn-outline-secondary me-1");
    ver.href = new URL(`catalogo/detalle.html?id=${encodeURIComponent(s.id)}`, import.meta.url).href;
    ver.target = "_blank";
    ver.rel = "noopener";
    ver.title = "Ver en el catálogo";
    ver.setAttribute("aria-label", `Ver ${s.nombre} en el catálogo`);
    ver.append(crear("i", "bi bi-eye"));

    const editar = crear("button", "btn btn-sm btn-outline-primary me-1");
    editar.type = "button";
    editar.title = "Editar";
    editar.setAttribute("aria-label", `Editar ${s.nombre}`);
    editar.append(crear("i", "bi bi-pencil"));
    editar.addEventListener("click", () => abrirFormulario(s));

    const estado = crear("button", `btn btn-sm ${s.activo ? "btn-outline-danger" : "btn-outline-success"}`, s.activo ? "Dar de baja" : "Reactivar");
    estado.type = "button";
    estado.addEventListener("click", () => pedirCambioEstado(s));

    // RF-16: materiales de estudio del servicio
    const materiales = crear("button", "btn btn-sm btn-outline-primary me-1");
    materiales.type = "button";
    materiales.title = "Materiales";
    materiales.setAttribute("aria-label", `Materiales de ${s.nombre}`);
    materiales.append(crear("i", "bi bi-journal-text"));
    materiales.addEventListener("click", () =>
      abrirEditorMateriales(s, async (modulos) => {
        mostrarMensaje(
          mensaje,
          modulos.length
            ? `Se guardaron los materiales de "${s.nombre}" (${modulos.length} ${modulos.length === 1 ? "módulo" : "módulos"}).`
            : `Se quitaron todos los materiales de "${s.nombre}".`,
          "success"
        );
        await cargar();
      })
    );

    acciones.append(ver, editar, materiales, estado);

    fila.append(
      celdaNombre,
      crear("td", "", CATEGORIAS[s.categoria] || s.categoria || "-"),
      crear("td", "text-nowrap", `${formatearPrecio(s.precio, s.moneda)} / ${s.periodo || "-"}`),
      celdaEstado,
      acciones
    );
    return fila;
  }

  /* ---------------- Alta y edición ---------------- */

  async function abrirFormulario(servicio) {
    editando = servicio;
    ocultarMensaje(formMsg);
    form.reset();
    $("titulo-modal-servicio").textContent = servicio ? "Editar servicio" : "Nuevo servicio";
    btnGuardar.textContent = servicio ? "Guardar cambios" : "Crear servicio";

    const valores = servicio || opciones.valoresNuevo || {};
    $("srv-nombre").value = valores.nombre || "";
    $("srv-categoria").value = valores.categoria || "cursos";
    $("srv-modalidad").value = valores.modalidad || MODALIDADES[0];
    $("srv-descripcion-corta").value = valores.descripcionCorta || "";
    $("srv-descripcion").value = valores.descripcion || "";
    $("srv-objetivos").value = (valores.objetivos || []).join("\n");
    $("srv-requisitos").value = valores.requisitos || "";
    $("srv-certificado").checked = Boolean(valores.certificado);
    $("srv-prestador").value = valores.prestador || "";
    $("srv-institucion").value = valores.institucion || "";
    $("srv-prestador-detalle").value = valores.prestadorDetalle || "";
    $("srv-duracion").value = valores.duracion || "";
    $("srv-carga").value = valores.cargaHoraria || "";
    $("srv-cupo").value = valores.cupo ?? "";
    $("srv-inicio").value = valores.fechaInicio || "";
    $("srv-precio").value = valores.precio ?? "";
    $("srv-moneda").value = valores.moneda || MONEDAS[0];
    $("srv-periodo").value = valores.periodo || PERIODOS[0];
    if (selectPrestador) selectPrestador.value = valores.prestadorUid || "";
    btnGuardar.disabled = false;
    modalServicio.show();

    // RF-15: la clase de prueba se guarda aparte, así que se consulta al editar
    const camposClase = ["srv-clase-titulo", "srv-clase-descripcion", "srv-clase-enlace"].map($);
    camposClase.forEach((campo) => {
      campo.value = "";
      campo.disabled = false;
    });
    const apertura = ++aperturaFormulario;
    if (servicio?.tieneClasePrueba) {
      camposClase.forEach((campo) => (campo.disabled = true));
      btnGuardar.disabled = true;
      $("srv-clase-titulo").placeholder = "Cargando la clase de prueba...";
      try {
        const clase = await obtenerClasePrueba(servicio.id);
        if (apertura !== aperturaFormulario) return;
        if (clase) {
          $("srv-clase-titulo").value = clase.titulo || "";
          $("srv-clase-descripcion").value = clase.descripcion || "";
          $("srv-clase-enlace").value = clase.enlace || "";
        }
        camposClase.forEach((campo) => (campo.disabled = false));
        btnGuardar.disabled = false;
      } catch (error) {
        if (apertura !== aperturaFormulario) return;
        console.error("No se pudo cargar la clase de prueba:", error.code, error.message);
        // Guardar sin la clase cargada la borraría, así que se bloquea el guardado
        mostrarMensaje(formMsg, "No se pudo cargar la clase de prueba. Cerrá esta ventana y volvé a intentar.", "warning");
      } finally {
        if (apertura === aperturaFormulario) {
          $("srv-clase-titulo").placeholder = "Ej: Clase 1 - Tu primer circuito";
        }
      }
    }
  }

  function leerFormulario() {
    const cupo = $("srv-cupo").value.trim();
    const precio = $("srv-precio").value.trim();
    let prestadorUid = null;
    if (opciones.prestadorUidFijo) prestadorUid = opciones.prestadorUidFijo;
    else if (selectPrestador) prestadorUid = selectPrestador.value || null;
    else if (editando) prestadorUid = editando.prestadorUid || null;

    return {
      nombre: $("srv-nombre").value,
      categoria: $("srv-categoria").value,
      modalidad: $("srv-modalidad").value,
      descripcionCorta: $("srv-descripcion-corta").value,
      descripcion: $("srv-descripcion").value,
      objetivos: $("srv-objetivos").value.split("\n"),
      requisitos: $("srv-requisitos").value,
      certificado: $("srv-certificado").checked,
      prestador: $("srv-prestador").value,
      institucion: $("srv-institucion").value,
      prestadorDetalle: $("srv-prestador-detalle").value,
      duracion: $("srv-duracion").value,
      cargaHoraria: $("srv-carga").value,
      cupo: cupo === "" ? null : Number(cupo),
      fechaInicio: $("srv-inicio").value,
      precio: precio === "" ? NaN : Number(precio),
      moneda: $("srv-moneda").value,
      periodo: $("srv-periodo").value,
      prestadorUid,
      clasePrueba: {
        titulo: $("srv-clase-titulo").value,
        descripcion: $("srv-clase-descripcion").value,
        enlace: $("srv-clase-enlace").value
      }
    };
  }

  async function guardar(evento) {
    evento.preventDefault();
    ocultarMensaje(formMsg);

    const datos = leerFormulario();
    const errores = validarServicio(datos);
    if (errores.length > 0) {
      mostrarMensaje(formMsg, errores.join(" "), "danger");
      formMsg.scrollIntoView({ block: "nearest" });
      return;
    }

    const textoBoton = btnGuardar.textContent;
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {
      if (editando) {
        await actualizarServicio(editando.id, datos);
        mostrarMensaje(mensaje, `Se guardaron los cambios de "${datos.nombre.trim()}".`, "success");
      } else {
        await crearServicio(datos, opciones.uidUsuario);
        mostrarMensaje(mensaje, `Se creó el servicio "${datos.nombre.trim()}". Ya aparece en el catálogo.`, "success");
      }
      modalServicio.hide();
      await cargar();
    } catch (error) {
      console.error("Error al guardar el servicio:", error.code, error.message);
      mostrarMensaje(formMsg, traducirError(error), "danger");
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = textoBoton;
    }
  }

  /* ---------------- Baja y reactivación ---------------- */

  function pedirCambioEstado(servicio) {
    servicioCambioEstado = servicio;
    ocultarMensaje($("modal-estado-msg"));
    const darDeBaja = servicio.activo;
    $("titulo-modal-estado").textContent = darDeBaja ? "Dar de baja el servicio" : "Reactivar el servicio";
    $("texto-modal-estado").textContent = darDeBaja
      ? `"${servicio.nombre}" dejará de mostrarse en el catálogo y no se podrá adquirir. Las adquisiciones que ya existen se conservan. Podés reactivarlo cuando quieras.`
      : `"${servicio.nombre}" volverá a mostrarse en el catálogo y se podrá adquirir.`;
    const boton = $("btn-confirmar-estado");
    boton.textContent = darDeBaja ? "Dar de baja" : "Reactivar";
    boton.className = `btn ${darDeBaja ? "btn-danger" : "btn-success"}`;
    boton.disabled = false;
    modalEstado.show();
  }

  async function confirmarCambioEstado() {
    if (!servicioCambioEstado) return;
    const boton = $("btn-confirmar-estado");
    const nuevoEstado = !servicioCambioEstado.activo;
    boton.disabled = true;

    try {
      await cambiarEstadoServicio(servicioCambioEstado.id, nuevoEstado);
      modalEstado.hide();
      mostrarMensaje(
        mensaje,
        nuevoEstado
          ? `"${servicioCambioEstado.nombre}" se reactivó y vuelve a mostrarse en el catálogo.`
          : `"${servicioCambioEstado.nombre}" se dio de baja y ya no se muestra en el catálogo.`,
        "success"
      );
      await cargar();
    } catch (error) {
      console.error("Error al cambiar el estado del servicio:", error.code, error.message);
      mostrarMensaje($("modal-estado-msg"), traducirError(error), "danger");
      $("modal-estado-msg").classList.add("mt-3");
      boton.disabled = false;
    }
  }

  return { recargar: cargar, mostrarMensaje: (texto, tipo) => mostrarMensaje(mensaje, texto, tipo) };
}
