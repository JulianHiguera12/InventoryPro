import { obtenerUsuarioActual } from './firebase.js';

// Rutas de los avatares
const AVATAR_HOMBRE = "../assets/img/man.png";
const AVATAR_MUJER = "../assets/img/woman.png";

async function actualizarHeaderUsuario() {
    const nombreSpan = document.getElementById('nombreUsuario');
    const userInfoBtn = document.getElementById('userInfo');
    const dropdown = document.getElementById('userDropdown');

    if (!nombreSpan || !userInfoBtn || !dropdown) return;

    // 🔥 Esperar datos de Firebase
    const usuarioActual = await obtenerUsuarioActual();

    // 🔴 Validación clave
    if (!usuarioActual) {
        console.warn("No se pudo obtener el usuario");
        window.location.href = "../HTML/index.html";
        return;
    }

    // ✅ Nombre
    nombreSpan.textContent = usuarioActual.nombre || "Usuario";

    // ✅ Avatar
    const avatar = userInfoBtn.querySelector('.user-icon');

    if (avatar) {
        if (usuarioActual.genero === "man") {
            avatar.src = AVATAR_HOMBRE;
        } else if (usuarioActual.genero === "woman") {
            avatar.src = AVATAR_MUJER;
        } else {
            avatar.src = "../assets/img/avatar-default.png";
        }
    }

    // --- Dropdown (igual que tenías) ---
    userInfoBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        dropdown.classList.toggle('active');
        const isActive = dropdown.classList.contains('active');
        userInfoBtn.setAttribute('aria-expanded', String(isActive));
    });

    document.addEventListener('click', (e) => {
        if (!userInfoBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            userInfoBtn.setAttribute('aria-expanded', 'false');
        }
    });

    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            window.location.href = "../HTML/index.html"; 
        });
    }
}