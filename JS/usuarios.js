function actualizarHeaderUsuario() {
    const nombreSpan = document.getElementById('nombreUsuario');
    const userInfo = document.getElementById('userInfo');
    if(!nombreSpan || !userInfo) return;

    // Actualizar nombre
    nombreSpan.textContent = usuarioActual.nombre;

    // Actualizar avatar
    const avatar = userInfo.querySelector('.user-icon');
    if(avatar) avatar.src = usuarioActual.avatar;

    // Agregar icono de género (si no existe aún)
    if(!userInfo.querySelector('.role-icon')) {
        const genderIcon = document.createElement('img');
        genderIcon.classList.add('role-icon');
        genderIcon.alt = "Género";
        genderIcon.width = 20;
        genderIcon.height = 20;
        genderIcon.src = usuarioActual.gender === "female"
            ? "https://img.icons8.com/ios-filled/50/000000/user-female.png"
            : "https://img.icons8.com/ios-filled/50/000000/user-male.png";

        userInfo.insertBefore(genderIcon, avatar);
    }

    // --- DROPDOWN DEL USUARIO ---
    const userMenu = userInfo.closest('.user-menu');
    const dropdown = userMenu.querySelector('.user-dropdown');

    userInfo.addEventListener('click', (e) => {
        e.preventDefault(); // evitar cualquier acción por default
        const expanded = userInfo.getAttribute('aria-expanded') === 'true';
        userInfo.setAttribute('aria-expanded', !expanded);
        dropdown.hidden = expanded; // alterna visibilidad
    });
}

// Llamar al cargar la página
document.addEventListener('DOMContentLoaded', actualizarHeaderUsuario);