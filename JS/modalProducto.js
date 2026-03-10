// ===============================
// MODALES PRODUCTOS - CREAR, EDITAR, VER, BUSCAR
// ===============================

document.addEventListener('DOMContentLoaded', () => {

    // ======== MODALES ========
    const modalCreate = document.getElementById('prod-modal-create');
    const modalEdit = document.getElementById('prod-modal-edit');
    const modalView = document.getElementById('prod-modal-view');
    const modalSearch = document.getElementById('prod-modal-search');

    const inputSearch = document.getElementById('prod-search');
    const formSearch = document.getElementById('prod-form-search');
    const searchResults = document.getElementById('prod-search-results');

    // ======== FUNCIONES DE ABRIR Y CERRAR MODALES ========
    function openModal(modal) {
        modal.classList.add('active');
    }

    function closeModal(modal) {
        modal.classList.remove('active');
    }

    // Cerrar modal con X o botón cancelar
    document.querySelectorAll('.product-modal-close, .product-btn-cancel, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.prodModal;
            if(modalId){
                const modal = document.getElementById(modalId);
                closeModal(modal);
            }
        });
    });

    // Cerrar modal al hacer clic fuera del contenido
    document.querySelectorAll('.product-modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if(e.target === modal) closeModal(modal);
        });
    });

    // ======== FUNCIONES DE VER Y EDITAR ========
    window.verProducto = function(codigo) {
        const producto = productManager.obtener(codigo);
        if(!producto) return alert('Producto no encontrado');

        document.getElementById('view-codigo').value = producto.codigo;
        document.getElementById('view-nombre').value = producto.nombre;
        document.getElementById('view-lote').value = producto.lote || '';
        document.getElementById('view-tipo').value = producto.tipo;
        document.getElementById('view-fecha-elab').value = producto.fechaElab;
        document.getElementById('view-fecha-vence').value = producto.fechaVence;
        document.getElementById('view-fecha-compra').value = producto.fechaCompra;
        document.getElementById('view-fecha-venta').value = producto.fechaVenta || '';
        document.getElementById('view-proveedor').value = producto.proveedor;
        document.getElementById('view-ubicacion').value = producto.ubicacion || '';
        document.getElementById('view-tipo-almacenamiento').value = producto.tipoAlmacenamiento || '';
        document.getElementById('view-estado').value = producto.estado || '';
        document.getElementById('view-observaciones').value = producto.observaciones || '';
        document.getElementById('view-usuario').value = producto.usuario || '';
        document.getElementById('view-fecha-registro').value = producto.fechaRegistro || '';
        document.getElementById('view-fecha-modificacion').value = producto.fechaModificacion || '';

        openModal(modalView);
    };

    window.editarProducto = function(codigo) {
        const producto = productManager.obtener(codigo);
        if(!producto) return alert('Producto no encontrado');

        document.getElementById('prod-edit-code').value = producto.codigo;
        document.getElementById('prod-edit-code').dataset.original = producto.codigo;
        document.getElementById('prod-edit-name').value = producto.nombre;
        document.getElementById('prod-edit-lote').value = producto.lote || '';
        document.getElementById('prod-edit-tipo').value = producto.tipo;
        document.getElementById('prod-edit-fecha-elab').value = producto.fechaElab;
        document.getElementById('prod-edit-fecha-vence').value = producto.fechaVence;
        document.getElementById('prod-edit-fecha-compra').value = producto.fechaCompra;
        document.getElementById('prod-edit-fecha-venta').value = producto.fechaVenta || '';
        document.getElementById('prod-edit-proveedor').value = producto.proveedor;
        document.getElementById('prod-edit-ubicacion').value = producto.ubicacion || '';
        document.getElementById('prod-edit-tipo-almacenamiento').value = producto.tipoAlmacenamiento || '';
        document.getElementById('prod-edit-estado').value = producto.estado || '';
        document.getElementById('prod-edit-observaciones').value = producto.observaciones || '';
        document.getElementById('prod-edit-usuario').value = producto.usuario || '';
        document.getElementById('prod-edit-fecha-registro').value = producto.fechaRegistro || '';
        document.getElementById('prod-edit-fecha-modificacion').value = producto.fechaModificacion || '';

        openModal(modalEdit);
    };

    // ======== BÚSQUEDA DE PRODUCTOS ========
    function renderSearchResults(results) {
        searchResults.innerHTML = '';
        if(results.length === 0){
            searchResults.innerHTML = '<tr><td colspan="6" style="text-align:center; font-style:italic; color:#888;">No se encontraron productos</td></tr>';
            return;
        }

        results.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.codigo}</td>
                <td>${p.nombre}</td>
                <td>${p.proveedor}</td>
                <td>${p.fechaVence}</td>
                <td>${p.estado || '-'}</td>
                <td style="display:flex; gap:5px;">
                    <button class="btn-update" type="button" onclick="verProducto('${p.codigo}')">Ver</button>
                    <button class="btn-submit" type="button" onclick="editarProducto('${p.codigo}')">Editar</button>
                </td>
            `;
            searchResults.appendChild(row);
        });
    }

    inputSearch.addEventListener('input', () => {
        const term = inputSearch.value.toLowerCase();
        const results = productManager.productos.filter(p =>
            (p.codigo && p.codigo.toLowerCase().includes(term)) ||
            (p.nombre && p.nombre.toLowerCase().includes(term)) ||
            (p.proveedor && p.proveedor.toLowerCase().includes(term))
        );
        renderSearchResults(results);
    });

    formSearch.addEventListener('submit', e => {
        e.preventDefault(); // evitar recargar página
        const term = inputSearch.value.toLowerCase();
        const results = productManager.productos.filter(p =>
            (p.codigo && p.codigo.toLowerCase().includes(term)) ||
            (p.nombre && p.nombre.toLowerCase().includes(term)) ||
            (p.proveedor && p.proveedor.toLowerCase().includes(term))
        );
        renderSearchResults(results);
    });

    // Abrir modal de búsqueda
    const btnSearch = document.getElementById('prod-btn-search');
    btnSearch.addEventListener('click', () => {
        openModal(modalSearch);
        inputSearch.value = '';
        searchResults.innerHTML = '<tr><td colspan="6" style="text-align:center;">Ingrese un término de búsqueda</td></tr>';
    });

});