const formLogin = document.getElementById('formLogin');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();

        const usuario = document.getElementById('usuario').value;
        const password = document.getElementById('password').value;

        if (usuario === 'admin' && password === 'admin') {

            // Guardar sesión
            sessionStorage.setItem('usuario', usuario);
            sessionStorage.setItem('rol', 'admin');

            // Redirigir al sistema
            window.location.href = "home.html";

        } else {

            const errorMsg = document.getElementById('login-error');
            if (errorMsg) {
                errorMsg.style.display = 'block';
                errorMsg.textContent = "Usuario o contraseña incorrectos";
            }

        }
    });
}

/* Cerrar sesión */
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = "login.html";
    });
}