// --- usuarios.js ---
// Usuario actual (ejemplo)
const usuarioActual = {
    nombre: "Laura Olmos",
    avatar: "../IMG/woman.png" 
};

// Función principal
function actualizarHeaderUsuario() {
    const nombreSpan = document.getElementById('nombreUsuario');
    const userInfoBtn = document.getElementById('userInfo');
    const dropdown = document.getElementById('userDropdown');

    if (!nombreSpan || !userInfoBtn || !dropdown) return;

    // Actualizar nombre
    nombreSpan.textContent = usuarioActual.nombre;

    // Actualizar avatar
    const avatar = userInfoBtn.querySelector('.user-icon');
    if (avatar) avatar.src = usuarioActual.avatar;

    // Mostrar dropdown al hacer clic en el usuario
    userInfoBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        dropdown.classList.toggle('active');
        const isActive = dropdown.classList.contains('active');
        userInfoBtn.setAttribute('aria-expanded', String(isActive));
    });

    // Cerrar dropdown si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!userInfoBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            userInfoBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Manejo de "Cerrar Sesión"
    const btnCerrarSesion = document.getElementById('btnCerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
            // Limpiar sesión o redirigir al login
            window.location.href = "../HTML/login.html"; 
        });
    }

    // Manejo de "Mi Perfil"
    const perfilLink = dropdown.querySelector('a[href="#"]:first-of-type');
    if (perfilLink) {
        perfilLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Redirigir a perfil
            window.location.href = "../HTML/perfil.html"; 
        });
    }

    // Manejo de "Configuraciones"
    const configLink = dropdown.querySelectorAll('a[href="#"]')[1];
    if (configLink) {
        configLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Redirigir a configuraciones
            window.location.href = "../HTML/configuraciones.html"; 
        });
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', actualizarHeaderUsuario);