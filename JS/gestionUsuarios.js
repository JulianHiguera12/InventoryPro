import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    deleteUser,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc, setDoc, updateDoc, deleteDoc,
    collection, getDocs, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ... (Aquí puedes tener tus otras funciones de Crear/Eliminar usuarios) ...

// --- LÓGICA DE SESIÓN Y HEADER ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const datos = userSnap.data();
            // Actualiza los textos e imágenes...
            const nombreHeader = document.getElementById('nombreUsuario');
            if (nombreHeader) nombreHeader.textContent = `${datos.primerNombre} ${datos.primerApellido}`;
            
            // Actualiza fotos de avatar
            document.querySelectorAll('.user-icon').forEach(img => {
                img.src = datos.fotoUrl || (datos.genero === "femenino" ? "../IMG/woman.png" : "../IMG/man.png");
            });
        }
    } else {
        window.location.href = "../index.html";
    }
});

// --- LÓGICA DEL DROPDOWN ---
document.getElementById('userInfo')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('active');
});

document.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.remove('active');
});


// ─── MOSTRAR INFO DEL ADMIN EN PANTALLA ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    const usuario = sessionStorage.getItem('usuario');
    const uid     = sessionStorage.getItem('uid');

    if (!usuario || !uid) {
        window.location.href = "/HTML/login.html";
        return;
    }

    // Cargar datos del admin desde Firestore
    try {
        const docSnap = await getDoc(doc(db, "usuarios", uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            const nombreCompleto = `${data.primerNombre} ${data.primerApellido}`;
            document.getElementById('adminNombre').textContent = nombreCompleto;
            document.getElementById('adminRol').textContent =
                data.rol === 'administrador' ? 'Administrador del Sistema' : 'Auxiliar';
            document.getElementById('adminCorreo').textContent = data.correo;

            // También actualizar header
            const nombreSpan = document.getElementById('nombreUsuario');
            if (nombreSpan) nombreSpan.textContent = nombreCompleto;
        }
    } catch (e) {
        console.error("Error cargando datos del admin:", e);
    }

    // ─── CREAR USUARIO ───────────────────────────────────────────────────────
    const formCrear = document.getElementById('form-usuario-nuevo');
    if (formCrear) {
        formCrear.addEventListener('submit', async (e) => {
            e.preventDefault();

            const primerNombre    = document.getElementById('usu-nuevo-primer-nombre').value.trim();
            const segundoNombre   = document.getElementById('usu-nuevo-segundo-nombre').value.trim();
            const primerApellido  = document.getElementById('usu-nuevo-primer-apellido').value.trim();
            const segundoApellido = document.getElementById('usu-nuevo-segundo-apellido').value.trim();
            const correo          = document.getElementById('usu-nuevo-correo').value.trim();
            const telefono        = document.getElementById('usu-nuevo-telefono').value.trim();
            const direccion       = document.getElementById('usu-nuevo-direccion').value.trim();
            const password        = document.getElementById('usu-nuevo-password').value;
            const rol             = document.getElementById('usu-nuevo-rol').value;
            const activo          = document.getElementById('usu-nuevo-estado').value === '1';

            try {
                // 1. Crear en Firebase Authentication
                const credencial = await createUserWithEmailAndPassword(auth, correo, password);
                const nuevoUid = credencial.user.uid;

                // 2. Guardar datos en Firestore
                await setDoc(doc(db, "usuarios", nuevoUid), {
                    primerNombre,
                    segundoNombre,
                    primerApellido,
                    segundoApellido,
                    correo,
                    telefono,
                    direccion,
                    rol,
                    activo,
                    creadoPor: uid,
                    creadoEn: new Date().toISOString()
                });

                alert(`Usuario ${primerNombre} ${primerApellido} creado correctamente.`);
                formCrear.reset();
                document.getElementById('modal-usuario-crear').classList.remove('active');

            } catch (error) {
                console.error("Error creando usuario:", error.code);
                if (error.code === 'auth/email-already-in-use') {
                    alert('Este correo ya está registrado.');
                } else if (error.code === 'auth/weak-password') {
                    alert('La contraseña debe tener al menos 6 caracteres.');
                } else {
                    alert('Error al crear usuario: ' + error.message);
                }
            }
        });
    }

    // ─── ACTUALIZAR USUARIO ──────────────────────────────────────────────────
    const formActualizar = document.getElementById('formActualizarUsuario');
    if (formActualizar) {

        // Rellenar fecha automáticamente
        const fechaInput = formActualizar.querySelector('.fecha-actual');
        if (fechaInput) fechaInput.value = new Date().toLocaleString('es-CO');

        formActualizar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idOCorreo = document.getElementById('usu-actualizar-id').value.trim();
            const datos = {};

            const campos = [
                ['primerNombre',    'usu-actualizar-primer-nombre'],
                ['segundoNombre',   'usu-actualizar-segundo-nombre'],
                ['primerApellido',  'usu-actualizar-primer-apellido'],
                ['segundoApellido', 'usu-actualizar-segundo-apellido'],
                ['correo',          'usu-actualizar-correo'],
                ['telefono',        'usu-actualizar-telefono'],
                ['direccion',       'usu-actualizar-direccion'],
            ];

            campos.forEach(([campo, id]) => {
                const val = document.getElementById(id).value.trim();
                if (val) datos[campo] = val;
            });

            const rol    = document.getElementById('usu-actualizar-rol').value;
            const activo = document.getElementById('usu-actualizar-activo').value;
            if (rol)    datos.rol    = rol;
            if (activo) datos.activo = activo === '1';

            datos.modificadoPor = uid;
            datos.modificadoEn  = new Date().toISOString();

            try {
                // Buscar usuario por correo en Firestore
                const snapshot = await getDocs(collection(db, "usuarios"));
                let docId = null;

                snapshot.forEach(d => {
                    if (d.data().correo === idOCorreo || d.id === idOCorreo) {
                        docId = d.id;
                    }
                });

                if (!docId) {
                    alert('Usuario no encontrado. Verifica el correo o ID.');
                    return;
                }

                await updateDoc(doc(db, "usuarios", docId), datos);
                alert('Usuario actualizado correctamente.');
                formActualizar.reset();
                document.getElementById('modalActualizar').classList.remove('active');

            } catch (error) {
                console.error("Error actualizando usuario:", error);
                alert('Error al actualizar: ' + error.message);
            }
        });
    }

    // ─── ELIMINAR USUARIO ────────────────────────────────────────────────────
    const formEliminar = document.getElementById('formEliminarUsuario');
    if (formEliminar) {

        const fechaEliminar = formEliminar.querySelector('.fecha-actual');
        if (fechaEliminar) fechaEliminar.value = new Date().toLocaleString('es-CO');

        formEliminar.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idOCorreo = document.getElementById('usu-eliminar-id').value.trim();
            const motivo    = document.getElementById('usu-eliminar-motivo').value.trim();

            const confirmado = confirm('¿Estás seguro de eliminar este usuario? Esta acción es irreversible.');
            if (!confirmado) return;

            try {
                const snapshot = await getDocs(collection(db, "usuarios"));
                let docId = null;

                snapshot.forEach(d => {
                    if (d.data().correo === idOCorreo || d.id === idOCorreo) {
                        docId = d.id;
                    }
                });

                if (!docId) {
                    alert('Usuario no encontrado.');
                    return;
                }

                // Eliminar de Firestore
                await deleteDoc(doc(db, "usuarios", docId));

                alert('Usuario eliminado de la base de datos correctamente.');
                formEliminar.reset();
                document.getElementById('modalEliminar').classList.remove('active');

            } catch (error) {
                console.error("Error eliminando usuario:", error);
                alert('Error al eliminar: ' + error.message);
            }
        });
    }

    // --- LÓGICA DE SESIÓN Y HEADER ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userRef = doc(db, "usuarios", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const datos = userSnap.data();
                // Actualiza los textos e imágenes...
                const nombreHeader = document.getElementById('nombreUsuario');
                if (nombreHeader) nombreHeader.textContent = `${datos.primerNombre} ${datos.primerApellido}`;
                
                // Actualiza fotos de avatar
                document.querySelectorAll('.user-icon').forEach(img => {
                    img.src = datos.fotoUrl || (datos.genero === "femenino" ? "../IMG/woman.png" : "../IMG/man.png");
                });
            }
        } else {
            window.location.href = "../index.html";
        }
    });

    // --- LÓGICA DEL DROPDOWN ---
    document.getElementById('userInfo')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('userDropdown')?.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        document.getElementById('userDropdown')?.classList.remove('active');
    });
});