// gestion/mis-servicios.js
// RD-04: Un prestador gestiona solo los servicios que le pertenecen.
//
// - Solo prestadores: sin sesión redirige al login; otro rol ve "Acceso denegado".
// - Lista únicamente los servicios con prestadorUid == su uid.
// - Puede crear servicios (quedan a su nombre), editarlos, darlos de baja y reactivarlos.
// - No puede pasarle un servicio a otro prestador ni borrarlo.
// Las reglas de Firestore (firestore.rules) hacen cumplir todo esto en el servidor.

import { protegerPagina, ROLES } from "../acceso.js";
import { obtenerServiciosDePrestador } from "../servicios-modelo.js";
import { iniciarGestionServicios } from "../servicios-gestor.js";

const acceso = await protegerPagina({ roles: [ROLES.PRESTADOR] });

if (acceso) {
  const { user } = acceso;
  document.getElementById("servicios-verificando").classList.add("hidden");
  document.getElementById("servicios-contenido").classList.remove("hidden");

  iniciarGestionServicios({
    obtenerServicios: () => obtenerServiciosDePrestador(user.uid),
    uidUsuario: user.uid,
    prestadorUidFijo: user.uid,
    valoresNuevo: { prestador: user.displayName || "" }
  });
}
