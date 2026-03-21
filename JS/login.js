import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── RECUPERAR CONTRASEÑA ──────────────────────────────────────────────────────
const linkRecuperar     = document.getElementById('link-recuperar');
const modalRecuperar    = document.getElementById('modal-recuperar');
const btnEnviar         = document.getElementById('btn-enviar-recuperar');
const btnCancelar       = document.getElementById('btn-cancelar-recuperar');
const inputRecuperar    = document.getElementById('recuperar-email');
const msgRecuperar      = document.getElementById('recuperar-msg');
const formLogin = document.getElementById('formLogin');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('usuario').value.trim();
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

function abrirModal() {
    modalRecuperar.style.display = 'flex';
    inputRecuperar.value = '';
    msgRecuperar.style.display = 'none';
}

function cerrarModal() {
    modalRecuperar.style.display = 'none';
}

function mostrarMensaje(texto, exito = true) {
    msgRecuperar.textContent = texto;
    msgRecuperar.style.background = exito ? '#dcfce7' : '#fee2e2';
    msgRecuperar.style.color      = exito ? '#166534' : '#991b1b';
    msgRecuperar.style.display    = 'block';
}

if (linkRecuperar) {
    linkRecuperar.addEventListener('click', (e) => {
        e.preventDefault();
        abrirModal();
    });
}

if (btnCancelar) {
    btnCancelar.addEventListener('click', cerrarModal);
}

// Cerrar al hacer clic fuera del modal
if (modalRecuperar) {
    modalRecuperar.addEventListener('click', (e) => {
        if (e.target === modalRecuperar) cerrarModal();
    });
}

if (btnEnviar) {
    btnEnviar.addEventListener('click', async () => {
        const email = inputRecuperar.value.trim();

        if (!email) {
            mostrarMensaje('Ingresa tu correo electrónico.', false);
            return;
        }

        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';

        try {
            await sendPasswordResetEmail(auth, email);
            mostrarMensaje('✅ Correo enviado. Revisa tu bandeja de entrada.');
            inputRecuperar.value = '';
            setTimeout(cerrarModal, 3000);
        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                mostrarMensaje('No existe una cuenta con ese correo.', false);
            } else {
                mostrarMensaje('Error al enviar el correo. Intenta de nuevo.', false);
            }
        } finally {
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Enviar enlace';
        }
    });
}