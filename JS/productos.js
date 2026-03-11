// GESTIÓN DE PRODUCTOS - CRUD COMPLETO
document.addEventListener("DOMContentLoaded", () => {

    const userRole = 'admin'; // Cambiar según usuario autenticado

    // REFERENCIAS AL DOM
    const btnCreate = document.getElementById('prod-btn-create');
    const tableBody = document.getElementById('prod-table-body');

    const modalCreate = document.getElementById('prod-modal-create');
    const modalEdit   = document.getElementById('prod-modal-edit');
    const modalView   = document.getElementById('prod-modal-view');
    const modalSearch = document.getElementById('prod-modal-search');

    const formCreate = document.getElementById('prod-form-create');
    const formEdit   = document.getElementById('prod-form-edit');

    const inputSearch = document.getElementById('prod-search');
    const paginationContainer = document.getElementById('prod-pagination');

    const ITEMS_PER_PAGE = 5;

    // CLASE PRODUCTO
    class Producto {
        constructor(codigo, nombre, fechaElab, fechaVence, tipo, fechaCompra, proveedor, fechaVenta) {
            this.codigo = codigo.trim();
            this.nombre = nombre.trim();
            this.fechaElab = fechaElab;
            this.fechaVence = fechaVence;
            this.tipo = tipo.trim();
            this.fechaCompra = fechaCompra;
            this.proveedor = proveedor.trim();
            this.fechaVenta = fechaVenta;
        }
    }

    // CLASE PRODUCT MANAGER
    class ProductManager {
        constructor() {
            this.productos = this.cargarLocal() || [];
            this.paginaActual = 1;
        }

        crear(producto) {
            if(this.productos.some(p => p.codigo === producto.codigo)) {
                alert('El código ya existe. Use otro código.');
                return false;
            }
            this.productos.push(producto);
            this.guardarLocal();
            return true;
        }

        obtener(codigo) {
            return this.productos.find(p => p.codigo === codigo);
        }

        guardarLocal() {
            localStorage.setItem('productos', JSON.stringify(this.productos));
        }

        cargarLocal() {
            return JSON.parse(localStorage.getItem('productos')) || [];
        }
    }

    const productManager = new ProductManager();

    // FUNCIONES DE MODAL
    const openModal = modal => modal.classList.add('active');
    const closeModal = modal => modal.classList.remove('active');

    document.querySelectorAll('.product-modal-close, .product-btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById(btn.dataset.prodModal);
            closeModal(modal);
        });
    });

    document.querySelectorAll('.product-modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if(e.target === modal) closeModal(modal);
        });
    });

    // HELPER: SUMAR DÍAS
    function sumarDias(fecha, dias) {
        const date = new Date(fecha);
        date.setDate(date.getDate() + dias);
        return date.toISOString().split('T')[0];
    }

    // RENDER TABLA
    const renderTabla = () => {
        tableBody.innerHTML = '';

        productManager.productos.forEach(p => {
            const tr = document.createElement('tr');

            // Tipo semáforo basado en fecha de vencimiento
            const hoy = new Date();
            const fechaVence = new Date(p.fechaVence);
            const diffDias = Math.ceil((fechaVence - hoy) / (1000*60*60*24));
            let semaforo = '';
            if(diffDias > 5) semaforo = '🟢';
            else if(diffDias >= 2) semaforo = '🟡';
            else semaforo = '🔴';

            tr.innerHTML = `
                <td>${p.codigo}</td>
                <td>${p.nombre}</td>
                <td>${p.fechaElab}</td>
                <td>${p.fechaVence}</td>
                <td>${p.tipo}</td>
                <td>${p.fechaCompra}</td>
                <td>${p.proveedor}</td>
                <td>${p.fechaVenta || '-'}</td>
                <td>${semaforo}</td>
            `;

            tableBody.appendChild(tr);
        });
    };

    renderTabla();

    // CREAR PRODUCTO
    btnCreate.addEventListener('click', () => openModal(modalCreate));

    formCreate.addEventListener('submit', e => {
        e.preventDefault();

        const tipo = document.getElementById('prod-input-tipo').value.trim();
        const fechaElab = document.getElementById('prod-input-fecha-elab').value;
        let fechaVence = document.getElementById('prod-input-fecha-vence').value;

        // Ajustar fecha de vencimiento automática según tipo
        switch(tipo.toLowerCase()) {
            case 'lácteo':
            case 'lacteo':
                fechaVence = sumarDias(fechaElab, 7);
                break;
            case 'carne':
            case 'embutido':
                fechaVence = sumarDias(fechaElab, 3);
                break;
            case 'panadería':
            case 'pan':
                fechaVence = sumarDias(fechaElab, 5);
                break;
            case 'bebida':
                fechaVence = sumarDias(fechaElab, 15);
                break;
        }

        const nuevoProducto = new Producto(
            document.getElementById('prod-input-code').value,
            document.getElementById('prod-input-name').value,
            fechaElab,
            fechaVence,
            tipo,
            document.getElementById('prod-input-fecha-compra').value,
            document.getElementById('prod-input-proveedor').value,
            document.getElementById('prod-input-fecha-venta').value
        );

        const creado = productManager.crear(nuevoProducto);

        if(creado) {
            formCreate.reset();
            closeModal(modalCreate);
            renderTabla();
        }
    });

    // EDITAR PRODUCTO
    function abrirEditar(codigo) {
        const producto = productManager.obtener(codigo);
        if(!producto) return alert('Producto no encontrado');

        document.getElementById('prod-edit-code').value = producto.codigo;
        document.getElementById('prod-edit-code').dataset.original = producto.codigo;
        document.getElementById('prod-edit-name').value = producto.nombre;
        document.getElementById('prod-edit-fecha-elab').value = producto.fechaElab;
        document.getElementById('prod-edit-fecha-vence').value = producto.fechaVence;
        document.getElementById('prod-edit-tipo').value = producto.tipo;
        document.getElementById('prod-edit-fecha-compra').value = producto.fechaCompra;
        document.getElementById('prod-edit-proveedor').value = producto.proveedor;
        document.getElementById('prod-edit-fecha-venta').value = producto.fechaVenta;

        openModal(modalEdit);
    }

    document.getElementById('prod-edit-tipo').addEventListener('input', e => {
        const tipo = e.target.value.trim().toLowerCase();
        const fechaElab = document.getElementById('prod-edit-fecha-elab').value;
        if(!fechaElab) return;

        let fechaVence;

        switch(tipo) {
            case 'lácteo':
            case 'lacteo':
                fechaVence = sumarDias(fechaElab, 7);
                break;
            case 'carne':
            case 'embutido':
                fechaVence = sumarDias(fechaElab, 3);
                break;
            case 'panadería':
            case 'pan':
                fechaVence = sumarDias(fechaElab, 5);
                break;
            case 'bebida':
                fechaVence = sumarDias(fechaElab, 15);
                break;
            default:
                fechaVence = document.getElementById('prod-edit-fecha-vence').value;
        }

        document.getElementById('prod-edit-fecha-vence').value = fechaVence;
    });

    formEdit.addEventListener('submit', e => {
        e.preventDefault();

        const inputCode = document.getElementById('prod-edit-code');
        const codigoOriginal = inputCode.dataset.original.trim();
        const nuevoCodigo = inputCode.value.trim();

        const producto = productManager.obtener(codigoOriginal);
        if(!producto) return alert('Producto no encontrado');

        // Actualizar datos
        producto.codigo = nuevoCodigo;
        producto.nombre = document.getElementById('prod-edit-name').value.trim();
        producto.fechaElab = document.getElementById('prod-edit-fecha-elab').value;
        producto.fechaVence = document.getElementById('prod-edit-fecha-vence').value;
        producto.tipo = document.getElementById('prod-edit-tipo').value.trim();
        producto.fechaCompra = document.getElementById('prod-edit-fecha-compra').value;
        producto.proveedor = document.getElementById('prod-edit-proveedor').value.trim();
        producto.fechaVenta = document.getElementById('prod-edit-fecha-venta').value;

        productManager.guardarLocal();
        formEdit.reset();
        closeModal(modalEdit);

        renderTabla();
    });

});