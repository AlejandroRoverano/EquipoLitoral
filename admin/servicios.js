// admin/servicios.js
// RF-11: Gestión de servicios desde el panel administrativo.
// RD-04: El administrador asigna a cada servicio su prestador responsable.
//
// - Solo administradores (protegerPagina + reglas de Firestore).
// - El administrador ve y gestiona TODOS los servicios.
// - Si la colección está vacía, permite cargar los servicios que antes
//   estaban escritos a mano en el HTML del catálogo.
// La interfaz de listado, alta, edición y baja está en servicios-gestor.js.

import { protegerPagina, ROLES } from "../acceso.js";
import { obtenerTodosLosServicios, cargarServiciosIniciales } from "../servicios-modelo.js";
import { obtenerTodosLosUsuarios } from "../usuarios-modelo.js";
import { iniciarGestionServicios } from "../servicios-gestor.js";

const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });

if (acceso) {
  document.getElementById("admin-verificando").classList.add("hidden");
  document.getElementById("admin-contenido").classList.remove("hidden");

  // Cuentas con rol prestador, para el selector "Prestador responsable"
  let prestadores = [];
  try {
    prestadores = (await obtenerTodosLosUsuarios()).filter((u) => u.rol === ROLES.PRESTADOR);
  } catch (error) {
    console.error("No se pudieron cargar los prestadores:", error.code, error.message);
  }

  const gestion = iniciarGestionServicios({
    obtenerServicios: obtenerTodosLosServicios,
    uidUsuario: acceso.user.uid,
    prestadores
  });

  // Servicios iniciales (solo el administrador, cuando la colección está vacía)
  const boton = document.getElementById("btn-cargar-iniciales");
  boton.addEventListener("click", async () => {
    boton.disabled = true;
    boton.textContent = "Cargando...";
    try {
      const creados = await cargarServiciosIniciales(acceso.user.uid);
      gestion.mostrarMensaje(`Se cargaron ${creados} servicios. Revisá sus datos y asigná su prestador responsable.`, "success");
      await gestion.recargar();
    } catch (error) {
      console.error("Error al cargar los servicios iniciales:", error.code, error.message);
      gestion.mostrarMensaje(
        error.code === "permission-denied"
          ? "Firestore rechazó la operación: tu usuario no tiene rol de administrador en la base de datos."
          : "No se pudo completar la operación. Revisá tu conexión e intentá de nuevo.",
        "danger"
      );
    } finally {
      boton.disabled = false;
      boton.textContent = "Cargar servicios iniciales";
    }
  });
}
