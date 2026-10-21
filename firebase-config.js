// Importaciones del SDK de Firebase (v12.18.0, modo modular por CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Configuración del proyecto
const firebaseConfig = {
  apiKey: "AIzaSyDI49W1l_2NpQDsVW1v2GMU3ZZ-N7_NKjI",
  authDomain: "equipo-litoral.firebaseapp.com",
  projectId: "equipo-litoral",
  storageBucket: "equipo-litoral.firebasestorage.app",
  messagingSenderId: "855014440184",
  appId: "1:855014440184:web:a5919e1cb73cadc0bfcf0d"
};

// Inicialización
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Español como idioma de los mails/mensajes de Firebase Auth
auth.languageCode = "es";

export { app, auth, db };
