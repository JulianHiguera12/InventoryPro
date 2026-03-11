import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const formLogin = document.getElementById('formLogin');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = document.getElementById('usuario').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('login-error');

        const email = usuario + "@inventorypro.com";

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            sessionStorage.setItem('usuario', usuario);
            sessionStorage.setItem('uid', user.uid);

            window.location.href = "home.html";

        } catch (error) {
            if (errorMsg) {
                errorMsg.style.display = 'block';
                errorMsg.textContent = "Usuario o contraseña incorrectos";
            }
        }
    });
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = "login.html";
    });
}