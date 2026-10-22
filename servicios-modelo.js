// servicios-modelo.js
// RF-11: Modelo de datos de los servicios educativos del catálogo.
//
// Único lugar donde se define cómo se guardan y se leen los servicios en Firestore.
// Lo usan el catálogo, el detalle del servicio y la gestión de servicios del panel
// administrativo. Documentación: docs/modelo-datos-servicios.md
//
// Colección: servicios/{servicioId}
//   - El ID es un "slug" legible generado a partir del nombre (ej: taller-robotica).
//   - RF-15: la clase de prueba gratuita se guarda aparte, en
//     servicios/{servicioId}/clasePrueba/contenido, porque solo la pueden leer
//     usuarios con sesión iniciada (el documento del servicio es público).
//     El servicio solo guarda "tieneClasePrueba" para mostrar u ocultar el botón.
//   - La baja es lógica: el campo "activo" pasa a false y el servicio deja de
//     mostrarse en el catálogo, pero se conserva (las adquisiciones lo referencian).
//   - RD-04: cada servicio puede tener un prestador dueño (campo "prestadorUid").
//     El administrador gestiona todos los servicios; un prestador solo crea
//     servicios a su nombre y modifica los suyos (firestore.rules).

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ------------------------------------------------------------------ */
/* Constantes del modelo                                               */
/* ------------------------------------------------------------------ */

export const COLECCION_SERVICIOS = "servicios";

// Las claves coinciden con los filtros del catálogo
export const CATEGORIAS = {
  cursos: "Cursos",
  mentorias: "Mentorías",
  robotica: "Robótica",
  formacion: "Formación"
};

export const MODALIDADES = ["Presencial", "Virtual", "Híbrida"];
export const MONEDAS = ["UYU", "USD"];
export const PERIODOS = ["mes", "curso", "sesión"];

// RF-15: ubicación de la clase de prueba de cada servicio
const SUBCOLECCION_CLASE = "clasePrueba";
const DOC_CLASE = "contenido";

function refClasePrueba(servicioId) {
  return doc(db, COLECCION_SERVICIOS, servicioId, SUBCOLECCION_CLASE, DOC_CLASE);
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

// "Taller de Robótica Educativa" -> "taller-de-robotica-educativa"
export function generarIdServicio(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// "$4.500 UYU"
export function formatearPrecio(precio, moneda) {
  if (typeof precio !== "number") return "-";
  return `$${precio.toLocaleString("es-UY")} ${moneda || ""}`.trim();
}

// "2027-03-15" -> "15 de marzo de 2027"
export function formatearFechaInicio(fechaISO) {
  if (!fechaISO) return "A confirmar";
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (Number.isNaN(fecha.getTime())) return "A confirmar";
  return fecha.toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
}

// RF-15: true si el texto es un enlace web seguro (https://...)
export function esEnlaceValido(texto) {
  try {
    return new URL(texto).protocol === "https:";
  } catch {
    return false;
  }
}

// RF-15: ID de un video de YouTube a partir de su enlace, o null si no es de YouTube.
// Acepta youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/... y youtube.com/shorts/...
export function idVideoYoutube(enlace) {
  try {
    const url = new URL(enlace);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    let id = null;
    if (host === "youtu.be") id = url.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] || null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// RF-15: deja la clase de prueba con sus campos limpios, o null si está vacía
function normalizarClase(clase) {
  if (!clase) return null;
  const limpia = {
    titulo: (clase.titulo || "").trim(),
    descripcion: (clase.descripcion || "").trim(),
    enlace: (clase.enlace || "").trim()
  };
  return limpia.titulo || limpia.descripcion || limpia.enlace ? limpia : null;
}

// Devuelve una lista de errores (vacía si los datos son válidos)
export function validarServicio(datos) {
  const errores = [];
  if (!datos.nombre || datos.nombre.trim().length < 3) errores.push("El nombre debe tener al menos 3 caracteres.");
  if (!CATEGORIAS[datos.categoria]) errores.push("Elegí una categoría.");
  if (!MODALIDADES.includes(datos.modalidad)) errores.push("Elegí una modalidad.");
  if (!datos.prestador || !datos.prestador.trim()) errores.push("Indicá el prestador del servicio.");
  if (!datos.descripcionCorta || !datos.descripcionCorta.trim()) errores.push("Escribí una descripción corta.");
  if (!datos.descripcion || !datos.descripcion.trim()) errores.push("Escribí la descripción del servicio.");
  if (!datos.duracion || !datos.duracion.trim()) errores.push("Indicá la duración.");
  if (typeof datos.precio !== "number" || Number.isNaN(datos.precio) || datos.precio < 0) {
    errores.push("El precio debe ser un número mayor o igual a 0.");
  }
  if (!MONEDAS.includes(datos.moneda)) errores.push("Elegí una moneda.");
  if (!PERIODOS.includes(datos.periodo)) errores.push("Elegí el período del precio.");
  if (datos.cupo !== null && (!Number.isInteger(datos.cupo) || datos.cupo < 1)) {
    errores.push("El cupo debe ser un número entero mayor a 0, o quedar vacío.");
  }
  // RF-15: la clase de prueba es opcional, pero si se carga tiene que estar completa
  const clase = normalizarClase(datos.clasePrueba);
  if (clase) {
    if (clase.titulo.length < 3) errores.push("La clase de prueba necesita un título de al menos 3 caracteres.");
    if (!clase.descripcion) errores.push("Escribí una descripción para la clase de prueba.");
    if (!esEnlaceValido(clase.enlace)) errores.push("El enlace de la clase de prueba tiene que ser una dirección web que empiece con https://.");
  }
  return errores;
}

// Deja solo los campos del modelo, con el tipo correcto
function normalizar(datos) {
  return {
    nombre: datos.nombre.trim(),
    categoria: datos.categoria,
    modalidad: datos.modalidad,
    institucion: (datos.institucion || "").trim(),
    prestador: datos.prestador.trim(),
    prestadorDetalle: (datos.prestadorDetalle || "").trim(),
    descripcionCorta: datos.descripcionCorta.trim(),
    descripcion: datos.descripcion.trim(),
    objetivos: (datos.objetivos || []).map((o) => o.trim()).filter(Boolean),
    requisitos: (datos.requisitos || "").trim(),
    duracion: datos.duracion.trim(),
    cargaHoraria: (datos.cargaHoraria || "").trim(),
    cupo: datos.cupo ?? null,
    fechaInicio: datos.fechaInicio || "",
    precio: datos.precio,
    moneda: datos.moneda,
    periodo: datos.periodo,
    certificado: Boolean(datos.certificado),
    // RD-04: cuenta del prestador dueño del servicio (null = sin asignar)
    prestadorUid: datos.prestadorUid || null,
    // RF-15: indica si el servicio tiene clase de prueba (el contenido va aparte)
    tieneClasePrueba: Boolean(normalizarClase(datos.clasePrueba))
  };
}

function convertir(snap) {
  return { id: snap.id, ...snap.data() };
}

const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es");

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

// Un servicio por su ID, o null si no existe
export async function obtenerServicio(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, COLECCION_SERVICIOS, id));
  return snap.exists() ? convertir(snap) : null;
}

// Servicios visibles en el catálogo (activos), ordenados por nombre
export async function obtenerServiciosActivos() {
  const consulta = query(collection(db, COLECCION_SERVICIOS), where("activo", "==", true));
  const resultado = await getDocs(consulta);
  return resultado.docs.map(convertir).sort(porNombre);
}

// RD-04: servicios de un prestador (activos e inactivos), ordenados por nombre
export async function obtenerServiciosDePrestador(uid) {
  const consulta = query(collection(db, COLECCION_SERVICIOS), where("prestadorUid", "==", uid));
  const resultado = await getDocs(consulta);
  return resultado.docs.map(convertir).sort(porNombre);
}

// RF-15: clase de prueba de un servicio ({ titulo, descripcion, enlace }), o null.
// Requiere sesión iniciada (firestore.rules).
export async function obtenerClasePrueba(servicioId) {
  const snap = await getDoc(refClasePrueba(servicioId));
  return snap.exists() ? snap.data() : null;
}

// Todos los servicios, activos e inactivos (panel administrativo)
export async function obtenerTodosLosServicios() {
  const resultado = await getDocs(collection(db, COLECCION_SERVICIOS));
  return resultado.docs.map(convertir).sort(porNombre);
}

/* ------------------------------------------------------------------ */
/* Escritura (administradores, o el prestador dueño: firestore.rules)  */
/* ------------------------------------------------------------------ */

// Crea un servicio y devuelve su ID. Si el ID ya existe, agrega un número (-2, -3...).
// uidCreador: quien lo crea (administrador o prestador).
export async function crearServicio(datos, uidCreador) {
  const base = generarIdServicio(datos.nombre) || "servicio";
  let id = base;
  for (let n = 2; await obtenerServicio(id); n++) {
    id = `${base}-${n}`;
  }
  // El servicio y su clase de prueba se guardan juntos (todo o nada)
  const lote = writeBatch(db);
  lote.set(doc(db, COLECCION_SERVICIOS, id), {
    ...normalizar(datos),
    activo: true,
    creadoPor: uidCreador,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  });
  guardarClaseEnLote(lote, id, datos.clasePrueba);
  await lote.commit();
  return id;
}

// RF-15: agrega al lote el guardado (o el borrado, si quedó vacía) de la clase de prueba
function guardarClaseEnLote(lote, servicioId, clasePrueba) {
  const clase = normalizarClase(clasePrueba);
  if (clase) lote.set(refClasePrueba(servicioId), { ...clase, actualizadoEn: serverTimestamp() });
  else lote.delete(refClasePrueba(servicioId));
}

// Edita los datos de un servicio existente (el ID no cambia) y su clase de prueba
export async function actualizarServicio(id, datos) {
  const lote = writeBatch(db);
  lote.update(doc(db, COLECCION_SERVICIOS, id), {
    ...normalizar(datos),
    actualizadoEn: serverTimestamp()
  });
  guardarClaseEnLote(lote, id, datos.clasePrueba);
  await lote.commit();
}

// Baja lógica (activo = false) o reactivación (activo = true)
export async function cambiarEstadoServicio(id, activo) {
  await updateDoc(doc(db, COLECCION_SERVICIOS, id), {
    activo: activo,
    actualizadoEn: serverTimestamp()
  });
}

/* ------------------------------------------------------------------ */
/* Servicios iniciales                                                 */
/* ------------------------------------------------------------------ */
// Los servicios que antes estaban escritos a mano en el HTML del catálogo.
// El administrador puede cargarlos una vez desde el panel para no empezar de cero.
// Los IDs se mantienen para que sigan funcionando los enlaces y las adquisiciones existentes.

export const SERVICIOS_INICIALES = [
  {
    id: "taller-robotica",
    nombre: "Taller de Robótica Educativa",
    categoria: "robotica",
    modalidad: "Presencial",
    institucion: "Fundación Sadosky",
    prestador: "Ing. Martín Silva",
    prestadorDetalle: "Ingeniero Mecatrónico y docente principal. Con más de 10 años de experiencia en la industria de la automatización y 5 años dedicados a la docencia. Especializado en hacer accesibles conceptos complejos de ingeniería para estudiantes de todos los niveles.",
    descripcionCorta: "Aprende los fundamentos de la electrónica, mecánica y programación construyendo tus propios robots desde cero.",
    descripcion: "El Taller de Robótica Educativa está diseñado para introducir a los participantes en el mundo de la automatización y la programación física. A través de un enfoque \"hands-on\" (aprender haciendo), los estudiantes ensamblarán y programarán diferentes tipos de robots utilizando placas de desarrollo estándar de la industria.\n\nDurante el curso se proveerán todos los materiales necesarios, incluyendo el kit de robótica que el estudiante podrá llevarse al finalizar el programa. Las clases combinan teoría fundamental con sesiones prácticas de resolución de problemas reales.",
    objetivos: [
      "Comprender los principios básicos de la electrónica y los circuitos.",
      "Programar microcontroladores usando C++ y lenguajes de bloques.",
      "Diseñar algoritmos para la toma de decisiones autónomas del robot.",
      "Integrar sensores (ultrasonido, infrarrojo) y actuadores (motores, servos)."
    ],
    requisitos: "Notebook propia (Windows, Mac o Linux) para la programación. No se requiere experiencia previa en programación o electrónica.",
    duracion: "12 semanas",
    cargaHoraria: "4 hs por semana",
    cupo: 15,
    fechaInicio: "2027-03-15",
    precio: 4500,
    moneda: "UYU",
    periodo: "mes",
    certificado: true
  },
  {
    id: "mentoria-software",
    nombre: "Mentoría en Desarrollo de Software",
    categoria: "mentorias",
    modalidad: "Virtual",
    institucion: "Equipo Litoral Core",
    prestador: "Equipo Litoral Core",
    prestadorDetalle: "Equipo de desarrolladores con experiencia en proyectos web y acompañamiento de estudiantes.",
    descripcionCorta: "Sesiones individuales para resolver dudas, revisar código y planificar tu crecimiento como desarrollador.",
    descripcion: "La mentoría ofrece encuentros individuales (1:1) con un mentor que acompaña tu proceso de aprendizaje en desarrollo de software.\n\nEn cada sesión se trabaja sobre tus proyectos reales: revisión de código, buenas prácticas, organización del trabajo y próximos pasos.",
    objetivos: [
      "Resolver dudas concretas sobre tus proyectos.",
      "Incorporar buenas prácticas de programación y control de versiones.",
      "Definir un plan de aprendizaje personalizado."
    ],
    requisitos: "Conocimientos básicos de programación y un proyecto en curso para trabajar en las sesiones.",
    duracion: "Sesiones 1:1",
    cargaHoraria: "1 h por sesión",
    cupo: null,
    fechaInicio: "",
    precio: 1800,
    moneda: "UYU",
    periodo: "sesión",
    certificado: false
  },
  {
    id: "didactica-docentes",
    nombre: "Didáctica General para Docentes",
    categoria: "formacion",
    modalidad: "Híbrida",
    institucion: "Instituto Superior",
    prestador: "Instituto Superior",
    prestadorDetalle: "Institución dedicada a la formación y actualización de docentes.",
    descripcionCorta: "Formación intensiva en planificación, estrategias de enseñanza y evaluación para docentes.",
    descripcion: "Programa intensivo orientado a docentes en ejercicio o en formación que buscan fortalecer su práctica en el aula.\n\nSe abordan la planificación de clases, las estrategias de enseñanza y los instrumentos de evaluación, con actividades aplicadas a la realidad de cada participante.",
    objetivos: [
      "Planificar clases y unidades didácticas con objetivos claros.",
      "Aplicar estrategias de enseñanza activas.",
      "Diseñar instrumentos de evaluación coherentes con los objetivos."
    ],
    requisitos: "Estar ejerciendo la docencia o cursando una carrera docente.",
    duracion: "Intensivo de 3 meses",
    cargaHoraria: "",
    cupo: 30,
    fechaInicio: "",
    precio: 3800,
    moneda: "UYU",
    periodo: "mes",
    certificado: true
  },
  {
    id: "python-cientificos",
    nombre: "Introducción a Python para Científicos",
    categoria: "cursos",
    modalidad: "Virtual",
    institucion: "Equipo Litoral",
    prestador: "Equipo Litoral",
    prestadorDetalle: "",
    descripcionCorta: "Aprende Python desde cero para analizar datos y automatizar tareas científicas.",
    descripcion: "Curso introductorio de Python orientado a estudiantes y profesionales de áreas científicas.\n\nSe trabajan los fundamentos del lenguaje y su uso para el análisis de datos y la automatización de tareas.",
    objetivos: [
      "Dominar la sintaxis básica de Python.",
      "Analizar datos con bibliotecas de uso científico.",
      "Automatizar tareas repetitivas."
    ],
    requisitos: "Computadora con acceso a internet. No se requiere experiencia previa en programación.",
    duracion: "8 semanas",
    cargaHoraria: "",
    cupo: null,
    fechaInicio: "",
    precio: 3200,
    moneda: "UYU",
    periodo: "mes",
    certificado: false
  },
  {
    id: "impresion-3d",
    nombre: "Diseño e Impresión 3D Básica",
    categoria: "cursos",
    modalidad: "Presencial",
    institucion: "Equipo Litoral",
    prestador: "Equipo Litoral",
    prestadorDetalle: "",
    descripcionCorta: "Diseña tus propias piezas y llévalas a la impresora 3D.",
    descripcion: "Curso práctico de introducción al modelado y la impresión 3D.\n\nLos participantes diseñan piezas simples en software de modelado y aprenden a preparar e imprimir sus modelos.",
    objetivos: [
      "Modelar piezas simples en 3D.",
      "Preparar modelos para la impresión.",
      "Operar una impresora 3D de forma segura."
    ],
    requisitos: "No se requieren conocimientos previos.",
    duracion: "4 semanas",
    cargaHoraria: "",
    cupo: 12,
    fechaInicio: "",
    precio: 2500,
    moneda: "UYU",
    periodo: "mes",
    certificado: false
  }
];

// Carga los servicios iniciales que todavía no existan. Devuelve cuántos se crearon.
export async function cargarServiciosIniciales(uidAdmin) {
  const lote = writeBatch(db);
  let creados = 0;
  for (const { id, ...datos } of SERVICIOS_INICIALES) {
    if (await obtenerServicio(id)) continue;
    lote.set(doc(db, COLECCION_SERVICIOS, id), {
      ...normalizar(datos),
      activo: true,
      creadoPor: uidAdmin,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp()
    });
    creados++;
  }
  if (creados > 0) await lote.commit();
  return creados;
}
