// indicadores-modelo.js
// RF-14: Indicadores del estado general de la plataforma (panel administrativo).
//
// Todos los valores se calculan a partir de los datos reales de Firestore;
// no hay datos de ejemplo. Las funciones de cálculo son puras (reciben listas
// y devuelven resultados) para que se puedan probar con datos conocidos.
//
// Las lecturas están protegidas por las reglas de Firestore: solo un administrador
// puede listar usuarios, adquisiciones y pagos de otras personas.
//
// Documentación: docs/indicadores-panel.md

import { ROLES } from "./acceso.js";
import { obtenerTodosLosUsuarios } from "./usuarios-modelo.js";
import { obtenerServiciosActivos } from "./servicios-modelo.js";
import {
  obtenerTodasLasAdquisiciones,
  obtenerTodosLosPagos,
  resumirAdquisiciones,
  ESTADOS_ADQUISICION,
  ESTADOS_PAGO
} from "./adquisiciones-modelo.js";

export const DIAS_RECIENTES = 30;   // ventana de "adquisiciones recientes"
export const TOP_SERVICIOS = 5;     // cantidad de servicios en el ranking
export const MESES_GRAFICO = 12;    // meses máximos que muestra el gráfico

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Cálculos (funciones puras)                                          */
/* ------------------------------------------------------------------ */

// Usuarios registrados, separados por rol
export function contarUsuariosPorRol(usuarios) {
  const conteo = {
    [ROLES.ESTUDIANTE]: 0,
    [ROLES.PRESTADOR]: 0,
    [ROLES.ADMINISTRADOR]: 0
  };
  usuarios.forEach((u) => {
    if (u.rol in conteo) conteo[u.rol]++;
  });
  return { ...conteo, total: usuarios.length };
}

// Adquisiciones registradas en los últimos N días (incluye todos los estados).
// Una adquisición sin fecha (el servidor todavía no la confirmó) no se cuenta.
export function contarAdquisicionesRecientes(adquisiciones, dias = DIAS_RECIENTES, ahora = new Date()) {
  const desde = ahora.getTime() - dias * MS_POR_DIA;
  return adquisiciones.filter((a) => a.fecha instanceof Date && a.fecha.getTime() >= desde).length;
}

// Servicios más adquiridos. Cuentan las adquisiciones confirmadas (una cancelada
// ya no es una adquisición vigente). Empates: orden alfabético.
export function serviciosMasAdquiridos(adquisiciones, limite = TOP_SERVICIOS) {
  const porServicio = new Map();
  adquisiciones
    .filter((a) => a.estado === ESTADOS_ADQUISICION.CONFIRMADA && a.servicioId)
    .forEach((a) => {
      const actual = porServicio.get(a.servicioId) || { servicioId: a.servicioId, nombre: a.servicioNombre || a.servicioId, cantidad: 0 };
      actual.cantidad++;
      porServicio.set(a.servicioId, actual);
    });
  return [...porServicio.values()]
    .sort((x, y) => y.cantidad - x.cantidad || x.nombre.localeCompare(y.nombre, "es"))
    .slice(0, limite);
}

// Pagos rechazados sobre el total de intentos. porcentaje es null si no hay pagos
// (no se inventa un 0 % donde no hay información).
export function porcentajePagosRechazados(pagos) {
  const total = pagos.length;
  const rechazados = pagos.filter((p) => p.estado === ESTADOS_PAGO.RECHAZADO).length;
  return { total, rechazados, porcentaje: total ? (rechazados / total) * 100 : null };
}

// Adquisiciones por mes (todos los estados), de más antiguo a más reciente.
// Los meses sin adquisiciones aparecen con 0 para que el eje de tiempo sea continuo.
// Muestra como máximo los últimos "maxMeses" meses; vacío si no hay ninguna adquisición.
export function adquisicionesPorMes(adquisiciones, ahora = new Date(), maxMeses = MESES_GRAFICO) {
  const indices = adquisiciones
    .filter((a) => a.fecha instanceof Date)
    .map((a) => a.fecha.getFullYear() * 12 + a.fecha.getMonth());
  if (indices.length === 0) return [];

  const indiceAhora = ahora.getFullYear() * 12 + ahora.getMonth();
  const primero = indices.reduce((m, i) => Math.min(m, i), Infinity);
  const ultimo = indices.reduce((m, i) => Math.max(m, i), indiceAhora);
  const desde = Math.max(primero, ultimo - (maxMeses - 1));

  const meses = [];
  for (let i = desde; i <= ultimo; i++) {
    meses.push({ anio: Math.floor(i / 12), mes: i % 12, cantidad: 0 });
  }
  indices.forEach((i) => {
    if (i >= desde && i <= ultimo) meses[i - desde].cantidad++;
  });
  return meses;
}

/* ------------------------------------------------------------------ */
/* Carga desde Firestore                                               */
/* ------------------------------------------------------------------ */

// Lee las cuatro fuentes por separado: si una falla (por ejemplo, por permisos),
// los indicadores de las otras se siguen mostrando.
// Devuelve { usuarios, servicios, adquisiciones, pagos }, cada uno con
// { datos } si se pudo leer o { error } si no.
export async function cargarFuentes() {
  const fuentes = {
    usuarios: obtenerTodosLosUsuarios,
    servicios: obtenerServiciosActivos,
    adquisiciones: obtenerTodasLasAdquisiciones,
    pagos: obtenerTodosLosPagos
  };
  const nombres = Object.keys(fuentes);
  const resultados = await Promise.allSettled(nombres.map((n) => fuentes[n]()));

  const salida = {};
  nombres.forEach((nombre, i) => {
    const r = resultados[i];
    salida[nombre] = r.status === "fulfilled" ? { datos: r.value } : { error: r.reason };
  });
  return salida;
}

export { resumirAdquisiciones };
