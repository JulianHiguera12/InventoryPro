// usuarios.js
import { obtenerUsuarioActual } from './firebase.js';

const AVATARES = {
    man: "../IMG/man.png",
    woman: "../IMG/woman.png",
    default: "../IMG/avatar-default.png"
};

async function actualizarPerfilUsuario() {
    const nombreSpan = document.getElementById('nombreUsuario');
    const userBtn = document.getElementById('userInfo');
    const dropdown = document.getElementById('userDropdown');
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');

    if (!nombreSpan || !userBtn || !dropdown) return;

    // Obtener usuario actual
    const usuario = await obtenerUsuarioActual();

    if (!usuario) {
        window.location.href = "../HTML/index.html"; // redirige si no hay sesión
        return;
    }

    // Actualizar nombre
    nombreSpan.textContent = usuario.nombre || "Usuario";

    // Actualizar avatar con fallback
    const avatar = userBtn.querySelector('.user-icon');
    if (avatar) {
        avatar.src = AVATARES[usuario.genero] || AVATARES.default;
        avatar.alt = usuario.nombre ? `Avatar de ${usuario.nombre}` : "Avatar de usuario";
    }

    // Manejo del dropdown
    const toggleDropdown = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
        userBtn.setAttribute('aria-expanded', dropdown.classList.contains('active'));
    };

    // Evitar duplicar listeners
    userBtn.removeEventListener('click', toggleDropdown);
    userBtn.addEventListener('click', toggleDropdown);

    // Cerrar dropdown al hacer click fuera
    const handleClickOutside = (e) => {
        if (!userBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            userBtn.setAttribute('aria-expanded', 'false');
        }
    };
    document.removeEventListener('click', handleClickOutside);
    document.addEventListener('click', handleClickOutside);

    // Cerrar sesión
    if (btnCerrarSesion) {
        const handleCerrarSesion = () => {
            sessionStorage.clear();
            window.location.href = "../HTML/index.html";
        };
        btnCerrarSesion.removeEventListener('click', handleCerrarSesion);
        btnCerrarSesion.addEventListener('click', handleCerrarSesion);
    }
}

// Ejecutar al cargar DOM
document.addEventListener('DOMContentLoaded', actualizarPerfilUsuario);