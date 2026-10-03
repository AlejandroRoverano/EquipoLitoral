// js/auth.js
import { auth, db } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// REGISTRO DE USUARIOS
export async function registrarUsuario(email, password, nombreCompleto, rol) {
    try {
        // 1. Crear credencial en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Separar nombre y apellido para guardar
        const partesNombre = nombreCompleto.trim().split(" ");
        const nombre = partesNombre[0] || "";
        const apellido = partesNombre.slice(1).join(" ") || "";

        // 2. Guardar perfil completo en Firestore vinculando con el UID
        await setDoc(doc(db, "usuarios", user.uid), {
            nombre: nombre,
            apellido: apellido,
            email: email,
            telefono: "", // Campo editable inicial
            rol: rol,     // "estudiante" o "prestador" (elegido en el registro)
            fechaCreacion: new Date()
        });

        alert("¡Cuenta creada exitosamente!");
        window.location.href = "../gestion/detalle-gestion.html";
    } catch (error) {
        console.error("Error al registrar:", error);
        alert("Error al crear cuenta: " + error.message);
    }
}

// INICIO DE SESIÓN
export async function iniciarSesion(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "../gestion/detalle-gestion.html";
    } catch (error) {
        console.error("Error de login:", error);
        alert("Credenciales incorrectas: " + error.message);
    }
}