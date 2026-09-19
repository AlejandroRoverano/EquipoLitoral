// js/perfil.js
import { auth, db } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let usuarioActualUID = null;

// Proteger ruta y cargar datos
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Si no hay sesión, redirigir a Login
        window.location.href = "../login/login.html";
        return;
    }

    usuarioActualUID = user.uid;
    await cargarPerfilFirestore(user.uid);
});

async function cargarPerfilFirestore(uid) {
    try {
        const docRef = doc(db, "usuarios", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // 1. Mostrar información básica
            const elNombre = document.getElementById("user-nombre-display");
            const elEmail = document.getElementById("user-email-display");
            const elRolBadge = document.getElementById("user-rol-badge");

            if (elNombre) elNombre.textContent = `${data.nombre} ${data.apellido}`.trim() || "Usuario";
            if (elEmail) elEmail.textContent = data.email;
            if (elRolBadge) elRolBadge.textContent = (data.rol || "estudiante").toUpperCase();

            // Cargar datos en los inputs del formulario si existe modal/form de edición
            if (document.getElementById("input-nombre")) document.getElementById("input-nombre").value = data.nombre || "";
            if (document.getElementById("input-apellido")) document.getElementById("input-apellido").value = data.apellido || "";
            if (document.getElementById("input-telefono")) document.getElementById("input-telefono").value = data.telefono || "";

            // 2. Adaptar interfaz según el ROL
            adaptarInterfazPorRol(data.rol);
        }
    } catch (error) {
        console.error("Error leyendo datos del usuario:", error);
    }
}

// Adaptación visual según el rol
function adaptarInterfazPorRol(rol) {
    const btnNuevoServicio = document.getElementById("btn-nuevo-servicio");
    const tituloPanel = document.getElementById("panel-titulo-rol");

    if (rol === "prestador" || rol === "admin") {
        // Funcionalidad avanzada para prestador/admin
        if (btnNuevoServicio) btnNuevoServicio.classList.remove("hidden");
        if (tituloPanel) tituloPanel.textContent = "Panel de Prestador Educativo";
    } else {
        // Vista restringida para estudiantes
        if (btnNuevoServicio) btnNuevoServicio.classList.add("hidden");
        if (tituloPanel) tituloPanel.textContent = "Panel de Estudiante";
    }
}

// GUARDAR CAMBIOS (Solo datos editables)
export async function guardarCambiosPerfil(event) {
    if (event) event.preventDefault();
    if (!usuarioActualUID) return;

    const nuevoNombre = document.getElementById("input-nombre").value;
    const nuevoApellido = document.getElementById("input-apellido").value;
    const nuevoTelefono = document.getElementById("input-telefono").value;

    try {
        const docRef = doc(db, "usuarios", usuarioActualUID);
        
        // NO se incluye el ROL en la actualización para evitar modificaciones indebidas
        await updateDoc(docRef, {
            nombre: nuevoNombre,
            apellido: nuevoApellido,
            telefono: nuevoTelefono
        });

        alert("Perfil actualizado correctamente");
        await cargarPerfilFirestore(usuarioActualUID);
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        alert("Ocurrió un error al guardar cambios.");
    }
}

// CERRAR SESIÓN
export function cerrarSesionUsuario() {
    signOut(auth).then(() => {
        window.location.href = "../home.html";
    });
}