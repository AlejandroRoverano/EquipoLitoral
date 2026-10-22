// admin/cargar-contenido.js
// Carga la clase de prueba gratuita (RF-15) y las unidades de estudio (RF-16) de cada curso
// a partir de contenido-inicial.js. Solo administradores (protegerPagina + reglas de Firestore).

import { protegerPagina, ROLES } from "../acceso.js";
import { db } from "../firebase-config.js";
import { doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { obtenerServicio, obtenerClasePrueba, cargarServiciosIniciales, COLECCION_SERVICIOS } from "../servicios-modelo.js";
import { guardarMateriales, obtenerMateriales } from "../materiales-modelo.js";
import { CONTENIDO_INICIAL } from "../contenido-inicial.js";

const acceso = await protegerPagina({ roles: [ROLES.ADMINISTRADOR] });

if (acceso) {
  document.getElementById("admin-verificando").classList.add("hidden");
  document.getElementById("admin-contenido").classList.remove("hidden");

  const boton = document.getElementById("btn-cargar");
  const registro = document.getElementById("registro");
  const log = (texto) => { registro.textContent += "\n" + texto; };

  boton.addEventListener("click", async () => {
    boton.disabled = true;
    registro.textContent = "Cargando contenido...";
    const sobrescribir = document.getElementById("chk-sobrescribir").checked;
    let cargados = 0;

    // RF-21: primero se crean los cursos del catálogo inicial que todavía no existan
    // (por ejemplo, los cursos nuevos). Los que ya existen no se modifican.
    try {
      const creados = await cargarServiciosIniciales(acceso.user.uid);
      log(creados > 0 ? `- ${creados} curso(s) nuevo(s) agregado(s) al catálogo` : "- No hay cursos nuevos para agregar al catálogo");
    } catch (error) {
      console.error(error);
      log(`- ERROR al agregar cursos nuevos: ${error.code || ""} ${error.message}`);
    }

    for (const [id, contenido] of Object.entries(CONTENIDO_INICIAL)) {
      try {
        const servicio = await obtenerServicio(id);
        if (!servicio) { log(`- ${id}: se omite (el servicio no existe en el catálogo)`); continue; }

        const hayClase = await obtenerClasePrueba(id);
        const hayMateriales = (await obtenerMateriales(id)).length > 0;

        if (!hayClase || sobrescribir) {
          await setDoc(doc(db, COLECCION_SERVICIOS, id, "clasePrueba", "contenido"), {
            ...contenido.clasePrueba,
            actualizadoEn: serverTimestamp()
          });
          // Así el detalle muestra el botón de la clase de prueba (RF-15)
          await updateDoc(doc(db, COLECCION_SERVICIOS, id), { tieneClasePrueba: true, actualizadoEn: serverTimestamp() });
          log(`- ${servicio.nombre}: clase de prueba cargada`);
        } else {
          // Corrige servicios cargados antes: la clase existía pero el botón no aparecía
          if (!servicio.tieneClasePrueba) {
            await updateDoc(doc(db, COLECCION_SERVICIOS, id), { tieneClasePrueba: true, actualizadoEn: serverTimestamp() });
            log(`- ${servicio.nombre}: ya tenía clase de prueba (se activó el botón en el detalle)`);
          } else {
            log(`- ${servicio.nombre}: ya tiene clase de prueba (no se modifica)`);
          }
        }

        if (!hayMateriales || sobrescribir) {
          await guardarMateriales(id, contenido.modulos);
          log(`- ${servicio.nombre}: ${contenido.modulos.length} unidades cargadas`);
        } else {
          log(`- ${servicio.nombre}: ya tiene unidades (no se modifican)`);
        }
        cargados++;
      } catch (error) {
        console.error(error);
        log(`- ${id}: ERROR ${error.code || ""} ${error.message}`);
      }
    }
    log(`\nListo: ${cargados} servicio(s) procesado(s).`);
    boton.disabled = false;
  });
}
