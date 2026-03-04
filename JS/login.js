const formLogin = document.getElementById('formLogin');
const loginScreen = document.getElementById('loginScreen');
const mainSystem = document.querySelector('.app-layout');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

formLogin.addEventListener('submit', (e) => {
    e.preventDefault();

    const usuario = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;

    if (usuario === 'admin' && password === 'admin') {
        loginScreen.style.display = 'none';
        mainSystem.style.display = 'block';
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
});

btnCerrarSesion.addEventListener('click', () => {
    mainSystem.style.display = 'none';
    loginScreen.style.display = 'flex';
    formLogin.reset();
});