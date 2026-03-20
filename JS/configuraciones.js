// configuraciones.js
import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection, doc, getDoc, getDocs,
    setDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── REFERENCIAS DOM ──────────────────────────────────────────────────────────
const tableBody       = document.getElementById('users-table-body');
const filterTabs      = document.querySelectorAll('.filter-tab');
const btnNuevoUsuario = document.getElementById('btn-nuevo-usuario');
const modal           = document.getElementById('modal-cfg-usuario');
const modalTitulo     = document.getElementById('modal-cfg-titulo');
const modalClose      = document.getElementById('modal-cfg-close');
const btnCancelar     = document.getElementById('btn-cfg-cancelar');
const formUsuario     = document.getElementById('form-cfg-usuario');
const passwordFila    = document.getElementById('cfg-password-fila');
const btnGuardarParams = document.getElementById('btn-guardar-params');
const btnCerrarSesion  = document.getElementById('btnCerrarSesion');

let filtroActual  = 'todos';
let modoEdicion   = false;
let uidEditando   = null;
let todosUsuarios = [];

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, tipo = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast toast-${tipo} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── PROTECCIÓN DE RUTA ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    const uid     = sessionStorage.getItem('uid');
    const usuario = sessionStorage.getItem('usuario');

    if (!uid || !usuario) {
        window.location.href = '/HTML/login.html';
        return;
    }

    // Cargar nombre e imagen en header
    try {
        const snap = await getDoc(doc(db, 'usuarios', uid));
        if (snap.exists()) {
            const d = snap.data();
            const nombreSpan = document.getElementById('nombreUsuario');
            const fotoHeader = document.querySelector('.user-info .user-icon'); // Referencia a la imagen

            if (nombreSpan) nombreSpan.textContent = `${d.primerNombre} ${d.primerApellido}`;
            
            // Cargar imagen dinámica (si no tiene, usa mujer.png como el HTML original)
            if (fotoHeader) {
                fotoHeader.src = d.fotoUrl || (d.genero === "femenino" ? "../IMG/woman.png" : "../IMG/man.png");
            }
        }
    } catch (e) { console.error(e); }

    // Cargar parámetros guardados
    await cargarParametros();

    // Aplicar restricciones por rol  
    aplicarRestriccionesPorRol();


    // Cargar usuarios
    await cargarUsuarios();

        // ── APLICA RESTRICCIONES POR ROL ──
    function aplicarRestriccionesPorRol() {
        const rol = sessionStorage.getItem('rol');
        if (rol !== 'auxiliar') return;

        // Deshabilitar parámetros de inventario
        const umbral = document.getElementById('param-umbral-stock');
        const dias = document.getElementById('param-dias-vencimiento');
        if (umbral) umbral.disabled = true;
        if (dias) dias.disabled = true;

        // Ocultar botón Guardar Parámetros
        const btnGuardar = document.getElementById('btn-guardar-params');
        if (btnGuardar) btnGuardar.style.display = 'none';

        // Ocultar botón Nuevo Usuario
        const btnNuevo = document.getElementById('btn-nuevo-usuario');
        if (btnNuevo) btnNuevo.style.display = 'none';
    }

    // ── ACCORDION ──
    document.querySelectorAll('.config-card-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.dataset.target;
            const body = document.getElementById(targetId);
            header.classList.toggle('open');
            body.classList.toggle('open');
        });
    });

    // ── FILTROS ──
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filtroActual = tab.dataset.filter;
            renderTabla();
        });
    });

    // ── NUEVO USUARIO ──
    btnNuevoUsuario.addEventListener('click', () => abrirModal(false));
    modalClose.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);

    modal.addEventListener('click', e => {
        if (e.target === modal) cerrarModal();
    });

    // ── FORM SUBMIT ──
    formUsuario.addEventListener('submit', async e => {
        e.preventDefault();
        if (modoEdicion) await editarUsuario();
        else await crearUsuario();
    });

    // ── GUARDAR PARÁMETROS ──
    btnGuardarParams.addEventListener('click', guardarParametros);

    // ── CERRAR SESIÓN ──
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', async () => {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = '/HTML/index.html';
        });
    }

    // ── DROPDOWN USUARIO (Optimizado) ─────────────────────────────────────────────
    const gestionarDropdown = () => {
        const userInfoBtn = document.getElementById('userInfo');
        const dropdown = document.getElementById('userDropdown');

        if (!userInfoBtn || !dropdown) return;

        userInfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            // Si el clic no es dentro del botón ni dentro del menú, se cierra
            if (!userInfoBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    };

// Llama a la función dentro de tu DOMContentLoaded
gestionarDropdown();

// Llama a la función dentro de tu DOMContentLoaded
gestionarDropdown();
});

// ── CARGAR USUARIOS DESDE FIRESTORE ──────────────────────────────────────────
async function cargarUsuarios() {
    try {
        const snapshot = await getDocs(collection(db, 'usuarios'));
        todosUsuarios = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
        renderTabla();
    } catch (e) {
        console.error('Error cargando usuarios:', e);
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-table-msg">Error al cargar usuarios.</td></tr>';
    }
}

// ── RENDER TABLA ─────────────────────────────────────────────────────────────
function renderTabla() {
    const usuarios = todosUsuarios.filter(u => {
        if (filtroActual === 'activo')   return u.activo === true;
        if (filtroActual === 'inactivo') return u.activo === false;
        return true;
    });

    if (usuarios.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-table-msg">No hay usuarios en esta categoría.</td></tr>';
        return;
    }

    tableBody.innerHTML = usuarios.map(u => {
        const nombre = `${u.primerNombre || ''} ${u.segundoNombre || ''} ${u.primerApellido || ''} ${u.segundoApellido || ''}`.trim();
        const rolBadge = u.rol === 'administrador'
            ? `<span class="badge-rol badge-admin">Administrador</span>`
            : `<span class="badge-rol badge-auxiliar">Auxiliar</span>`;
        const estadoBadge = u.activo
            ? `<span class="badge-estado-activo">Activo</span>`
            : `<span class="badge-estado-inactivo">Inactivo</span>`;

        return `
            <tr>
                <td>${nombre}</td>
                <td>${u.correo || '-'}</td>
                <td>${rolBadge}</td>
                <td>${estadoBadge}</td>
                <td>
                    <div class="table-actions">
                        ${sessionStorage.getItem('rol') !== 'auxiliar' ? `
                            <button class="btn-edit-user" data-uid="${u.uid}">✏️ Editar</button>
                         ` : ''}                   
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Eventos de editar y eliminar
    tableBody.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => abrirModal(true, btn.dataset.uid));
    });

    // tableBody.querySelectorAll('.btn-delete-user').forEach(btn => {
    //     btn.addEventListener('click', () => eliminarUsuario(btn.dataset.uid));
    // });
}

// ── ABRIR MODAL ───────────────────────────────────────────────────────────────
function abrirModal(esEdicion, uid = null) {
    modoEdicion = esEdicion;
    uidEditando = uid;
    formUsuario.reset();

    if (esEdicion) {
        modalTitulo.textContent = 'Editar Usuario';
        passwordFila.style.display = 'none'; // No cambiar contraseña al editar
        document.getElementById('cfg-password').required = false;

        const usuario = todosUsuarios.find(u => u.uid === uid);
        if (usuario) {
            document.getElementById('cfg-usuario-uid').value     = usuario.uid;
            document.getElementById('cfg-primer-nombre').value   = usuario.primerNombre  || '';
            document.getElementById('cfg-segundo-nombre').value  = usuario.segundoNombre || '';
            document.getElementById('cfg-primer-apellido').value = usuario.primerApellido || '';
            document.getElementById('cfg-segundo-apellido').value= usuario.segundoApellido || '';
            document.getElementById('cfg-correo').value          = usuario.correo || '';
            document.getElementById('cfg-telefono').value        = usuario.telefono || '';
            document.getElementById('cfg-rol').value             = usuario.rol || '';
            document.getElementById('cfg-estado').value          = String(usuario.activo ?? true);
        }
    } else {
        modalTitulo.textContent = 'Nuevo Usuario';
        passwordFila.style.display = 'flex';
        document.getElementById('cfg-password').required = true;
    }

    modal.classList.add('active');
}

function cerrarModal() {
    modal.classList.remove('active');
    formUsuario.reset();
    modoEdicion = false;
    uidEditando = null;
}

// ── CREAR USUARIO ─────────────────────────────────────────────────────────────
async function crearUsuario() {
    const correo   = document.getElementById('cfg-correo').value.trim();
    const password = document.getElementById('cfg-password').value;
    const datos    = getDatosFormulario();

    try {
        const cred      = await createUserWithEmailAndPassword(auth, correo, password);
        const nuevoUid  = cred.user.uid;

        await setDoc(doc(db, 'usuarios', nuevoUid), {
            ...datos,
            creadoPor: sessionStorage.getItem('uid'),
            creadoEn:  new Date().toISOString()
        });

        cerrarModal();
        await cargarUsuarios();
        showToast(`Usuario ${datos.primerNombre} creado correctamente.`);
    } catch (e) {
        console.error(e);
        if (e.code === 'auth/email-already-in-use') showToast('Este correo ya está registrado.', 'error');
        else if (e.code === 'auth/weak-password')   showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
        else showToast('Error al crear usuario.', 'error');
    }
}

// ── EDITAR USUARIO ────────────────────────────────────────────────────────────
async function editarUsuario() {
    const datos = getDatosFormulario();
    datos.modificadoPor = sessionStorage.getItem('uid');
    datos.modificadoEn  = new Date().toISOString();

    try {
        await updateDoc(doc(db, 'usuarios', uidEditando), datos);
        cerrarModal();
        await cargarUsuarios();
        showToast('Usuario actualizado correctamente.');
    } catch (e) {
        console.error(e);
        showToast('Error al actualizar usuario.', 'error');
    }
}

// ── ELIMINAR USUARIO ──────────────────────────────────────────────────────────
async function eliminarUsuario(uid) {
    const usuario = todosUsuarios.find(u => u.uid === uid);
    const nombre  = usuario ? `${usuario.primerNombre} ${usuario.primerApellido}` : 'este usuario';

    if (!confirm(`¿Estás seguro de desactivar a ${nombre}?`)) return;

    try {
        await updateDoc(doc(db, 'usuarios', uid), {
            activo: false,
            desactivadoPor: sessionStorage.getItem('uid'),
            desactivadoEn:  new Date().toISOString()
        });
        await cargarUsuarios();
        showToast(`Usuario ${nombre} desactivado.`);
    } catch (e) {
        console.error(e);
        showToast('Error al desactivar usuario.', 'error');
    }
}

// ── LEER DATOS DEL FORMULARIO ─────────────────────────────────────────────────
function getDatosFormulario() {
    return {
        primerNombre:    document.getElementById('cfg-primer-nombre').value.trim(),
        segundoNombre:   document.getElementById('cfg-segundo-nombre').value.trim(),
        primerApellido:  document.getElementById('cfg-primer-apellido').value.trim(),
        segundoApellido: document.getElementById('cfg-segundo-apellido').value.trim(),
        correo:          document.getElementById('cfg-correo').value.trim(),
        telefono:        document.getElementById('cfg-telefono').value.trim(),
        rol:             document.getElementById('cfg-rol').value,
        activo:          document.getElementById('cfg-estado').value === 'true'
    };
}

// ── PARÁMETROS DE INVENTARIO ──────────────────────────────────────────────────
async function cargarParametros() {
    try {
        const snap = await getDoc(doc(db, 'configuracion', 'parametros'));
        if (snap.exists()) {
            const data = snap.data();
            if (data.umbralStock)       document.getElementById('param-umbral-stock').value      = data.umbralStock;
            if (data.diasVencimiento)   document.getElementById('param-dias-vencimiento').value  = data.diasVencimiento;
        }
    } catch (e) {
        console.error('Error cargando parámetros:', e);
    }
}

async function guardarParametros() {
    const umbral      = document.getElementById('param-umbral-stock').value;
    const diasVence   = document.getElementById('param-dias-vencimiento').value;

    if (!umbral || !diasVence) {
        showToast('Completa ambos parámetros.', 'error');
        return;
    }

    try {
        await setDoc(doc(db, 'configuracion', 'parametros'), {
            umbralStock:      Number(umbral),
            diasVencimiento:  Number(diasVence),
            actualizadoPor:   sessionStorage.getItem('uid'),
            actualizadoEn:    new Date().toISOString()
        });
        showToast('Parámetros guardados correctamente.');
    } catch (e) {
        console.error('Error guardando parámetros:', e);
        showToast('Error al guardar parámetros.', 'error');
    }
}
