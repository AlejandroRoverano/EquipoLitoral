  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDI49W1l_2NpQDsVW1v2GMU3ZZ-N7_NKjI",
    authDomain: "equipo-litoral.firebaseapp.com",
    projectId: "equipo-litoral",
    storageBucket: "equipo-litoral.firebasestorage.app",
    messagingSenderId: "855014440184",
    appId: "1:855014440184:web:a5919e1cb73cadc0bfcf0d"
  };

   // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  
// Exporta los servicios inicializados para usarlos en otros archivos
export { app };