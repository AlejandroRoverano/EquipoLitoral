// contenido-inicial.js
// Contenido de ejemplo de los cursos: una clase de prueba gratuita y las primeras unidades (módulos)
// de cada servicio. Se carga desde admin/cargar-contenido.html (solo administradores).
//
// - clasePrueba: la ve cualquier usuario con sesión, sin adquirir el servicio (RF-15).
// - modulos: las unidades de estudio; solo las ve quien adquirió el servicio, el prestador dueño
//   y el administrador (RF-16). Tipos de material: lectura, video, imagen y enlace.
// Todos los enlaces son recursos públicos y gratuitos. Pueden reemplazarse desde "Mis servicios".

export const CONTENIDO_INICIAL = {
  "taller-robotica": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿Qué es Arduino y cómo funciona?",
      descripcion:
        "Introducción a la plataforma Arduino: qué es, qué modelos de placa existen y cuáles son las características de la placa Arduino UNO, que usamos en el taller. No necesitás conocimientos previos ni materiales.",
      enlace: "https://www.youtube.com/watch?v=eBVvD85Ml2c"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Conociendo la placa",
        materiales: [
          { titulo: "Guía de inicio de Arduino", tipo: "lectura", enlace: "https://docs.arduino.cc/learn/starting-guide/getting-started-arduino/" },
          { titulo: "La placa Arduino UNO R3", tipo: "imagen", enlace: "https://upload.wikimedia.org/wikipedia/commons/3/38/Arduino_Uno_-_R3.jpg" },
          { titulo: "Simulador de circuitos Tinkercad", tipo: "enlace", enlace: "https://www.tinkercad.com/circuits" }
        ]
      },
      {
        titulo: "Unidad 2 · Tu primer programa",
        materiales: [
          { titulo: "Ejemplo Blink: hacer parpadear un LED", tipo: "lectura", enlace: "https://docs.arduino.cc/built-in-examples/basics/Blink/" },
          { titulo: "Referencia del lenguaje de Arduino", tipo: "lectura", enlace: "https://docs.arduino.cc/language-reference/" }
        ]
      }
    ]
  },

  "mentoria-software": {
    clasePrueba: {
      titulo: "Sesión introductoria (gratuita): control de versiones con Git",
      descripcion:
        "Qué es el control de versiones y por qué todo equipo de desarrollo lo usa. Es la base para trabajar con repositorios, ramas y pull requests.",
      enlace: "https://git-scm.com/book/es/v2"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Orientar tu carrera",
        materiales: [
          { titulo: "Mapas de ruta para desarrolladores", tipo: "lectura", enlace: "https://roadmap.sh/" },
          { titulo: "freeCodeCamp en español", tipo: "enlace", enlace: "https://www.freecodecamp.org/espanol/" }
        ]
      },
      {
        titulo: "Unidad 2 · Trabajo en equipo con Git y GitHub",
        materiales: [
          { titulo: "Pro Git (en español)", tipo: "lectura", enlace: "https://git-scm.com/book/es/v2" },
          { titulo: "Documentación de GitHub", tipo: "lectura", enlace: "https://docs.github.com/es" }
        ]
      }
    ]
  },

  "didactica-docentes": {
    clasePrueba: {
      titulo: "Clase introductoria (gratuita): ¿qué es la didáctica?",
      descripcion:
        "Primer acercamiento al concepto de didáctica, sus objetos de estudio y su relación con la planificación de las clases.",
      enlace: "https://es.wikipedia.org/wiki/Did%C3%A1ctica"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Planificar objetivos de aprendizaje",
        materiales: [
          { titulo: "Taxonomía de Bloom", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Taxonom%C3%ADa_de_Bloom" },
          { titulo: "Recursos educativos de Plan Ceibal", tipo: "enlace", enlace: "https://www.ceibal.edu.uy/" }
        ]
      },
      {
        titulo: "Unidad 2 · Recursos para el aula",
        materiales: [
          { titulo: "Educ.ar: recursos para docentes", tipo: "enlace", enlace: "https://www.educ.ar/" }
        ]
      }
    ]
  },

  "python-cientificos": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): primeros pasos en Python",
      descripcion:
        "Qué es Python, cómo se instala y cómo escribir el primer programa. Incluye un curso completo en español de freeCodeCamp para empezar desde cero.",
      enlace: "https://www.freecodecamp.org/espanol/news/aprende-a-programar-en-python-desde-cero-curso-completo-gratis/"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Fundamentos del lenguaje",
        materiales: [
          { titulo: "Tutorial oficial de Python (en español)", tipo: "lectura", enlace: "https://docs.python.org/es/3/tutorial/index.html" },
          { titulo: "Logo de Python", tipo: "imagen", enlace: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg" }
        ]
      },
      {
        titulo: "Unidad 2 · Cálculo y análisis de datos",
        materiales: [
          { titulo: "NumPy para principiantes", tipo: "lectura", enlace: "https://numpy.org/doc/stable/user/absolute_beginners.html" },
          { titulo: "pandas en 10 minutos", tipo: "lectura", enlace: "https://pandas.pydata.org/docs/user_guide/10min.html" }
        ]
      }
    ]
  },

  "impresion-3d": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿cómo funciona la impresión 3D?",
      descripcion:
        "Introducción a la fabricación aditiva: cómo se construye un objeto capa por capa y qué tecnologías de impresión existen.",
      enlace: "https://es.wikipedia.org/wiki/Impresi%C3%B3n_3D"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Diseñar el modelo",
        materiales: [
          { titulo: "Primeros pasos con Tinkercad", tipo: "lectura", enlace: "https://www.tinkercad.com/learn" },
          { titulo: "Tinkercad: diseño 3D en el navegador", tipo: "enlace", enlace: "https://www.tinkercad.com/" }
        ]
      },
      {
        titulo: "Unidad 2 · Preparar la impresión",
        materiales: [
          { titulo: "UltiMaker Cura (software de laminado)", tipo: "enlace", enlace: "https://ultimaker.com/software/ultimaker-cura/" }
        ]
      }
    ]
  }
};
