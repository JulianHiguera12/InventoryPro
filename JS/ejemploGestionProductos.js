// Archivo: gestionProductos.js
document.addEventListener("DOMContentLoaded", () => {

    // Datos simulados
    let productos = [
        { codigo: "P001", nombre: "Producto A", categoria: "Cat1", precio: 10.0, stock: 5, estado: "activo" },
        { codigo: "P002", nombre: "Producto B", categoria: "Cat2", precio: 20.0, stock: 2, estado: "inactivo" }
    ];

    // Usuario actual: cambiar rol a "admin" o "auxiliar"
    const usuarioActual = { nombre: "Laura Olmos", rol: "auxiliar" };

    // Referencias DOM
    const tablaBody = document.getElementById("prod-table-body");
    const modalEditar = document.getElementById("prod-modal-edit");
    const formEditar = document.getElementById("prod-form-edit");

    const btnEditarGeneral = document.getElementById("prod-btn-edit");

    // Funciones generales

    // Función para abrir modal
    const openModal = (modal) => modal.classList.add("active");

    // Función para cerrar modal
    const closeModal = (modal) => modal.classList.remove("active");

    // Renderiza la tabla con productos
    const renderTabla = () => {
        tablaBody.innerHTML = ""; // limpiar tabla

        productos.forEach((prod, index) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${prod.codigo}</td>
                <td>${prod.nombre}</td>
                <td>${prod.categoria}</td>
                <td>$${prod.precio.toFixed(2)}</td>
                <td>${prod.stock}</td>
                <td class="estado-${prod.estado}">${prod.estado}</td>
                <td>
                    ${usuarioActual.rol === "admin" 
                        ? `<button class="product-btn product-btn-edit-row" data-index="${index}">✏️ Editar</button>` 
                        : `<span title="Solo administradores pueden editar">🔒</span>`}
                </td>
            `;

            tablaBody.appendChild(tr);
        });

        actualizarEventosEditar();
    };

    // Actualiza las métricas de productos
    const actualizarMetricas = () => {
        document.getElementById("prod-total-count").textContent = productos.length;
        document.getElementById("prod-active-count").textContent = productos.filter(p => p.estado === "activo").length;
        document.getElementById("prod-inactive-count").textContent = productos.filter(p => p.estado === "inactivo").length;
    };

    // Editar producto    
    let productoSeleccionadoIndex = null;

    const actualizarEventosEditar = () => {
        const btnsEditarFila = document.querySelectorAll(".product-btn-edit-row");
        btnsEditarFila.forEach(btn => {
            btn.addEventListener("click", () => {
                // Solo admins pueden abrir modal de edición
                if (usuarioActual.rol !== "admin") return alert("No tienes permisos para editar.");

                productoSeleccionadoIndex = parseInt(btn.dataset.index);

                // Llenar modal con los datos del producto
                const prod = productos[productoSeleccionadoIndex];
                document.getElementById("prod-edit-code").value = prod.codigo;
                document.getElementById("prod-edit-price").value = prod.precio;
                document.getElementById("prod-edit-stock").value = prod.stock;
                document.getElementById("prod-edit-status").value = prod.estado;

                openModal(modalEditar);
            });
        });
    };

    // Cancelar edición
    const btnCancelarEditar = modalEditar.querySelector(".product-btn-cancel");
    btnCancelarEditar.addEventListener("click", () => {
        closeModal(modalEditar);
        formEditar.reset();
    });

    // Guardar cambios del producto
    formEditar.addEventListener("submit", (e) => {
        e.preventDefault();
        if (productoSeleccionadoIndex === null) return;

        // Actualizar producto
        const prod = productos[productoSeleccionadoIndex];
        prod.precio = parseFloat(document.getElementById("prod-edit-price").value);
        prod.stock = parseInt(document.getElementById("prod-edit-stock").value);
        prod.estado = document.getElementById("prod-edit-status").value;

        renderTabla();
        actualizarMetricas();
        closeModal(modalEditar);
        formEditar.reset();
    });

    // Control de rol para botón general de editar
    if (usuarioActual.rol !== "admin") {
        if (btnEditarGeneral) btnEditarGeneral.style.display = "none";
    }

    // Inicialización
    renderTabla();
    actualizarMetricas();
});