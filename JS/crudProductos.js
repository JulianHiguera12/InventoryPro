// CRUD COMPLETO - GESTIÓN DE PRODUCTOS
document.addEventListener("DOMContentLoaded", () => {

    // VARIABLES DOM
    const btnCreate = document.getElementById('prod-btn-create');
    const modalCreate = document.getElementById('prod-modal-create');
    const formCreate = document.getElementById('prod-form-create');
    const tableBody = document.getElementById('prod-table-body');

    const btnEdit = document.getElementById('prod-btn-edit');
    const modalEdit = document.getElementById('prod-modal-edit');
    const formEdit = document.getElementById('prod-form-edit');

    // CLASES Y GESTIÓN DE PRODUCTOS
    class Producto {
        constructor(codigo, nombre, fechaElab, fechaVence, tipo, fechaCompra, proveedor, fechaVenta) {
            this.codigo = codigo.trim();
            this.nombre = nombre.trim();
            this.fechaElab = fechaElab;
            this.fechaVence = fechaVence;
            this.tipo = tipo.trim();
            this.fechaCompra = fechaCompra;
            this.proveedor = proveedor.trim();
            this.fechaVenta = fechaVenta || '';
        }
    }

    class ProductManager {
        constructor() {
            this.productos = JSON.parse(localStorage.getItem('productos')) || [];
        }

        crear(producto) {
            if (this.productos.some(p => p.codigo === producto.codigo)) {
                alert('El código ya existe. Use otro código.');
                return false;
            }
            this.productos.push(producto);
            this.guardarLocal();
            return true;
        }

        editar(codigoOriginal, datosActualizados) {
            const producto = this.productos.find(p => p.codigo === codigoOriginal);
            if(!producto) return false;

            Object.assign(producto, datosActualizados);
            this.guardarLocal();
            return true;
        }

        obtener(codigo) {
            return this.productos.find(p => p.codigo === codigo);
        }

        guardarLocal() {
            localStorage.setItem('productos', JSON.stringify(this.productos));
        }
    }

    const productManager = new ProductManager();

    // FUNCIONES AUXILIARES
    function sumarDias(fecha, dias) {
        const date = new Date(fecha);
        date.setDate(date.getDate() + dias);
        return date.toISOString().split('T')[0];
    }

    // RENDER TABLA PRINCIPAL CON SEMÁFORO DE VENCIMIENTO
    function renderTabla() {
        tableBody.innerHTML = '';
        productManager.productos.forEach(p => {
            const tr = document.createElement('tr');

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
    }

    renderTabla();

    // CREAR PRODUCTO
    btnCreate.addEventListener('click', () => {
        modalCreate.classList.add('active');
    });

    formCreate.addEventListener('submit', e => {
        e.preventDefault();

        const tipo = document.getElementById('prod-input-tipo').value.trim();
        const fechaElab = document.getElementById('prod-input-fecha-elab').value;
        let fechaVence = document.getElementById('prod-input-fecha-vence').value;

        // Ajuste automático fecha de vencimiento según tipo de producto
        switch(tipo.toLowerCase()) {
            case 'lácteo': case 'lacteo': fechaVence = sumarDias(fechaElab, 7); break;
            case 'carne': case 'embutido': fechaVence = sumarDias(fechaElab, 3); break;
            case 'panadería': case 'pan': fechaVence = sumarDias(fechaElab, 5); break;
            case 'bebida': fechaVence = sumarDias(fechaElab, 15); break;
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

        if(productManager.crear(nuevoProducto)) {
            formCreate.reset();
            modalCreate.classList.remove('active');
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

        modalEdit.classList.add('active');
    }

    formEdit.addEventListener('submit', e => {
        e.preventDefault();

        const codigoOriginal = document.getElementById('prod-edit-code').dataset.original;
        const datosActualizados = {
            codigo: document.getElementById('prod-edit-code').value.trim(),
            nombre: document.getElementById('prod-edit-name').value.trim(),
            fechaElab: document.getElementById('prod-edit-fecha-elab').value,
            fechaVence: document.getElementById('prod-edit-fecha-vence').value,
            tipo: document.getElementById('prod-edit-tipo').value.trim(),
            fechaCompra: document.getElementById('prod-edit-fecha-compra').value,
            proveedor: document.getElementById('prod-edit-proveedor').value.trim(),
            fechaVenta: document.getElementById('prod-edit-fecha-venta').value
        };

        if(productManager.editar(codigoOriginal, datosActualizados)) {
            formEdit.reset();
            modalEdit.classList.remove('active');
            renderTabla();
        } else {
            alert('Error al actualizar producto');
        }
    });

});