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
  },

  // RF-21: contenido de los cursos nuevos
  "desarrollo-web": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿cómo funciona la web?",
      descripcion:
        "Qué pasa cuando abrimos una página, qué hacen HTML, CSS y JavaScript y qué herramientas vamos a usar en el curso. No necesitás instalar nada.",
      enlace: "https://developer.mozilla.org/es/docs/Learn_web_development"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Estructura con HTML",
        materiales: [
          { titulo: "Guía de HTML de MDN", tipo: "lectura", enlace: "https://developer.mozilla.org/es/docs/Web/HTML" },
          { titulo: "Validador de HTML del W3C", tipo: "enlace", enlace: "https://validator.w3.org/" }
        ]
      },
      {
        titulo: "Unidad 2 · Estilos con CSS",
        materiales: [
          { titulo: "Guía de CSS de MDN", tipo: "lectura", enlace: "https://developer.mozilla.org/es/docs/Web/CSS" },
          { titulo: "Flexbox Froggy: aprendé Flexbox jugando", tipo: "enlace", enlace: "https://flexboxfroggy.com/#es" }
        ]
      },
      {
        titulo: "Unidad 3 · Interactividad con JavaScript",
        materiales: [
          { titulo: "El Tutorial de JavaScript Moderno", tipo: "lectura", enlace: "https://es.javascript.info/" },
          { titulo: "Guía de JavaScript de MDN", tipo: "lectura", enlace: "https://developer.mozilla.org/es/docs/Web/JavaScript" }
        ]
      }
    ]
  },

  "ciberseguridad-basica": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿qué es la seguridad informática?",
      descripcion:
        "Conceptos básicos de la seguridad de la información: confidencialidad, integridad y disponibilidad, y los riesgos más comunes al usar internet.",
      enlace: "https://es.wikipedia.org/wiki/Seguridad_inform%C3%A1tica"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Contraseñas y cuentas seguras",
        materiales: [
          { titulo: "Autenticación de múltiples factores", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Autenticaci%C3%B3n_de_m%C3%BAltiples_factores" },
          { titulo: "Have I Been Pwned: ¿se filtró tu correo?", tipo: "enlace", enlace: "https://haveibeenpwned.com/" }
        ]
      },
      {
        titulo: "Unidad 2 · Reconocer el phishing",
        materiales: [
          { titulo: "Qué es el phishing", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Phishing" },
          { titulo: "Test de phishing de Google (Jigsaw)", tipo: "enlace", enlace: "https://phishingquiz.withgoogle.com/" }
        ]
      },
      {
        titulo: "Unidad 3 · Privacidad y buenos hábitos",
        materiales: [
          { titulo: "INCIBE: ciberseguridad para la ciudadanía", tipo: "enlace", enlace: "https://www.incibe.es/ciudadania" }
        ]
      }
    ]
  },

  "robotica-principiantes": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿qué es la micro:bit?",
      descripcion:
        "Conocé la placa micro:bit: sus luces, botones y sensores, y todo lo que se puede crear con ella. No necesitás tener la placa para esta clase.",
      enlace: "https://microbit.org/es-es/get-started/what-is-the-microbit/"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Programar con bloques",
        materiales: [
          { titulo: "Editor MakeCode para micro:bit", tipo: "enlace", enlace: "https://makecode.microbit.org/" },
          { titulo: "¿Qué es la micro:bit?", tipo: "lectura", enlace: "https://microbit.org/es-es/get-started/what-is-the-microbit/" }
        ]
      },
      {
        titulo: "Unidad 2 · Proyectos paso a paso",
        materiales: [
          { titulo: "Proyectos \"Make it: code it\"", tipo: "lectura", enlace: "https://microbit.org/es-es/projects/make-it-code-it/" }
        ]
      }
    ]
  },

  // RF-23: contenido de los cursos nuevos
  "inteligencia-artificial": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿qué es la inteligencia artificial?",
      descripcion:
        "Qué entendemos por inteligencia artificial, cuáles son sus tipos y dónde la usamos todos los días sin darnos cuenta.",
      enlace: "https://es.wikipedia.org/wiki/Inteligencia_artificial"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Fundamentos de la IA",
        materiales: [
          { titulo: "Elements of AI: curso gratuito en español", tipo: "enlace", enlace: "https://www.elementsofai.com/es/" },
          { titulo: "Qué es el aprendizaje automático", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Aprendizaje_autom%C3%A1tico" }
        ]
      },
      {
        titulo: "Unidad 2 · Entrenar tu primer modelo",
        materiales: [
          { titulo: "Teachable Machine: entrená un modelo sin programar", tipo: "enlace", enlace: "https://teachablemachine.withgoogle.com/" }
        ]
      },
      {
        titulo: "Unidad 3 · Ética y uso responsable",
        materiales: [
          { titulo: "Recomendación de la UNESCO sobre la ética de la IA", tipo: "lectura", enlace: "https://www.unesco.org/es/artificial-intelligence/recommendation-ethics" }
        ]
      }
    ]
  },

  "mentoria-proyectos": {
    clasePrueba: {
      titulo: "Sesión introductoria (gratuita): organizar un proyecto con Scrum",
      descripcion:
        "Qué es Scrum, cómo se divide un proyecto en etapas cortas y qué roles y reuniones propone para trabajar en equipo.",
      enlace: "https://es.wikipedia.org/wiki/Scrum_(desarrollo_de_software)"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Planificar y organizar el trabajo",
        materiales: [
          { titulo: "Planificación y seguimiento con GitHub Projects", tipo: "lectura", enlace: "https://docs.github.com/es/issues/planning-and-tracking-with-projects" },
          { titulo: "Scrum (desarrollo de software)", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Scrum_(desarrollo_de_software)" }
        ]
      },
      {
        titulo: "Unidad 2 · Documentar el proyecto",
        materiales: [
          { titulo: "Guía de Markdown para el README", tipo: "lectura", enlace: "https://www.markdownguide.org/" },
          { titulo: "diagrams.net: diagramas gratuitos", tipo: "enlace", enlace: "https://app.diagrams.net/" }
        ]
      }
    ]
  },

  "tecnologia-educativa": {
    clasePrueba: {
      titulo: "Clase introductoria (gratuita): ¿qué es la tecnología educativa?",
      descripcion:
        "Primer acercamiento a la tecnología educativa: qué estudia, cómo evolucionó y qué aporta a la enseñanza.",
      enlace: "https://es.wikipedia.org/wiki/Tecnolog%C3%ADa_educativa"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Materiales interactivos",
        materiales: [
          { titulo: "Genially: presentaciones y actividades interactivas", tipo: "enlace", enlace: "https://genially.com/es/" },
          { titulo: "Recursos educativos de Plan Ceibal", tipo: "enlace", enlace: "https://www.ceibal.edu.uy/" }
        ]
      },
      {
        titulo: "Unidad 2 · Recursos abiertos y licencias",
        materiales: [
          { titulo: "Recursos educativos abiertos", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Recursos_educativos_abiertos" },
          { titulo: "Licencias Creative Commons", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Licencias_Creative_Commons" }
        ]
      }
    ]
  },

  "videojuegos-scratch": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿qué es Scratch?",
      descripcion:
        "Conocé Scratch, el lenguaje de programación por bloques con el que vamos a crear videojuegos, y mirá qué se puede hacer con él.",
      enlace: "https://es.wikipedia.org/wiki/Scratch_(lenguaje_de_programaci%C3%B3n)"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Primeros pasos en Scratch",
        materiales: [
          { titulo: "Scratch: crear un proyecto", tipo: "enlace", enlace: "https://scratch.mit.edu/" },
          { titulo: "Ideas y tutoriales de Scratch", tipo: "lectura", enlace: "https://scratch.mit.edu/ideas" }
        ]
      },
      {
        titulo: "Unidad 2 · Diseñar un videojuego",
        materiales: [
          { titulo: "Qué es el diseño de videojuegos", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Dise%C3%B1o_de_videojuegos" }
        ]
      }
    ]
  },

  "domotica-arduino": {
    clasePrueba: {
      titulo: "Clase 1 (gratuita): ¿qué es la domótica?",
      descripcion:
        "Qué es una casa inteligente, qué tareas se pueden automatizar y qué componentes vamos a usar en el taller.",
      enlace: "https://es.wikipedia.org/wiki/Dom%C3%B3tica"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Sensores",
        materiales: [
          { titulo: "Qué es un sensor y qué tipos existen", tipo: "lectura", enlace: "https://es.wikipedia.org/wiki/Sensor" },
          { titulo: "Guía de inicio de Arduino", tipo: "lectura", enlace: "https://docs.arduino.cc/learn/starting-guide/getting-started-arduino/" }
        ]
      },
      {
        titulo: "Unidad 2 · Simular la casa inteligente",
        materiales: [
          { titulo: "Simulador de circuitos Tinkercad", tipo: "enlace", enlace: "https://www.tinkercad.com/circuits" },
          { titulo: "Referencia del lenguaje de Arduino", tipo: "lectura", enlace: "https://docs.arduino.cc/language-reference/" }
        ]
      }
    ]
  },

  "pensamiento-computacional": {
    clasePrueba: {
      titulo: "Clase introductoria (gratuita): ¿qué es el pensamiento computacional?",
      descripcion:
        "Los cuatro pilares del pensamiento computacional y por qué es una habilidad útil en cualquier asignatura.",
      enlace: "https://es.wikipedia.org/wiki/Pensamiento_computacional"
    },
    modulos: [
      {
        titulo: "Unidad 1 · Actividades desenchufadas",
        materiales: [
          { titulo: "CS Unplugged: informática sin computadora", tipo: "enlace", enlace: "https://www.csunplugged.org/es/" }
        ]
      },
      {
        titulo: "Unidad 2 · Programación por bloques en el aula",
        materiales: [
          { titulo: "Scratch: crear un proyecto", tipo: "enlace", enlace: "https://scratch.mit.edu/" },
          { titulo: "Recursos educativos de Plan Ceibal", tipo: "enlace", enlace: "https://www.ceibal.edu.uy/" }
        ]
      }
    ]
  }
};
