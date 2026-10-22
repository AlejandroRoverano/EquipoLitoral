// catalogo/imagenes.js
// RF-20: imagen de cada servicio del catálogo.
// Las ilustraciones están en img/catalogo/. Si un servicio tiene su propia imagen
// (campo "imagen" con una URL), se usa esa; si no, la de su ID; y si no hay,
// la de su categoría. Así los servicios nuevos que cargue el administrador
// también se ven con imagen.

const CARPETA = new URL("../img/catalogo/", import.meta.url);

const POR_SERVICIO = {
  "taller-robotica": "taller-robotica.svg",
  "mentoria-software": "mentoria-software.svg",
  "didactica-docentes": "didactica-docentes.svg",
  "python-cientificos": "python-cientificos.svg",
  "impresion-3d": "impresion-3d.svg",
  // RF-21: cursos nuevos
  "desarrollo-web": "desarrollo-web.svg",
  "ciberseguridad-basica": "ciberseguridad.svg",
  "robotica-principiantes": "robotica-principiantes.svg"
};

const POR_CATEGORIA = {
  robotica: "taller-robotica.svg",
  mentorias: "mentoria-software.svg",
  formacion: "didactica-docentes.svg",
  cursos: "cursos.svg"
};

export function imagenDeServicio(servicio) {
  if (servicio.imagen) return servicio.imagen;
  const archivo = POR_SERVICIO[servicio.id] || POR_CATEGORIA[servicio.categoria] || "cursos.svg";
  return new URL(archivo, CARPETA).href;
}
