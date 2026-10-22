// inicio.js
// RF-18: Estadísticas de la plataforma en la página de inicio.
// Los datos se leen de Firestore sin exponer información personal
// (ver estadisticas-modelo.js). Si una fuente falla, se muestra "–".

import { obtenerEstadisticasPublicas } from "./estadisticas-modelo.js";

const $ = (id) => document.getElementById(id);
const entero = (n) => n.toLocaleString("es-UY");

const { estudiantes, servicios, calificacion, calificacionMaxima } = await obtenerEstadisticasPublicas();

if (estudiantes !== null) $("estadistica-estudiantes").textContent = entero(estudiantes);
if (servicios !== null) $("estadistica-servicios").textContent = entero(servicios);

// "4,8" con coma decimal, y las estrellas rellenas en la misma proporción (96%)
const texto = calificacion.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
$("estadistica-calificacion").textContent = texto;
$("estadistica-relleno").style.width = `${(calificacion / calificacionMaxima) * 100}%`;
$("estadistica-estrellas").setAttribute("aria-label", `Calificación: ${texto} de ${calificacionMaxima} estrellas`);
