// modalesUsuarios.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Script de modales cargado');

    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal no encontrado: ${modalId}`);
            return;
        }
        modal.classList.add('active');
        console.log(`Modal abierto: ${modalId}`);
    };

    const closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            console.log(`Modal cerrado: ${modalId}`);
        }
    };

    // Botones principales
    const btnCrear     = document.getElementById('btnCrear');
    const btnActualizar = document.getElementById('btnActualizar');
    const btnEliminar   = document.getElementById('btnEliminar');

    if (btnCrear) {
        btnCrear.addEventListener('click', () => openModal('modal-usuario-crear'));
    } else {
        console.error('Botón #btnCrear no encontrado');
    }

    if (btnActualizar) {
        btnActualizar.addEventListener('click', () => openModal('modalActualizar'));
    }

    if (btnEliminar) {
        btnEliminar.addEventListener('click', () => openModal('modalEliminar'));
    }

    // Cerrar con X o Cancelar
    document.querySelectorAll('.close-btn, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.dataset.modal;
            if (modalId) closeModal(modalId);
        });
    });

    // Cerrar clic fuera
    document.querySelectorAll('.modal, .modal-usuario').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Cerrar con tecla ESC
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active, .modal-usuario.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
});