import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const formLogin = document.getElementById('formLogin');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('usuario').value.trim();
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('login-error');

        if (errorMsg) errorMsg.style.display = 'none';

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Verificar que el usuario esté activo en Firestore
            const snap = await getDoc(doc(db, 'usuarios', user.uid));

            if (snap.exists() && snap.data().activo === false) {
                await signOut(auth);
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                    errorMsg.textContent = "Tu cuenta está desactivada. Contacta al administrador.";
                }
                return;
            }

            // Guardar sesión
            sessionStorage.setItem('usuario', snap.exists()
                ? `${snap.data().primerNombre} ${snap.data().primerApellido}`
                : user.email);
            sessionStorage.setItem('uid', user.uid);
            sessionStorage.setItem('rol', snap.exists() ? snap.data().rol : 'auxiliar');

            window.location.href = "home.html";
            sessionStorage.removeItem('bienvenidaMostrada');

        } catch (error) {
            if (errorMsg) {
                errorMsg.style.display = 'block';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMsg.textContent = "Correo o contraseña incorrectos.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMsg.textContent = "El formato del correo no es válido.";
                } else if (error.code === 'auth/too-many-requests') {
                    errorMsg.textContent = "Demasiados intentos fallidos. Intenta más tarde.";
                } else {
                    errorMsg.textContent = "Error al iniciar sesión. Intenta de nuevo.";
                }
            }
        }
    });
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = "../HTML/index.html";
    });
}