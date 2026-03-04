// productos.js
let productos = [];

const formProducto = document.getElementById('formProducto');

if(formProducto){
    formProducto.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const cantidad = parseInt(document.getElementById('cantidad').value);
        const precio = parseFloat(document.getElementById('precio').value);
        const categoria = document.getElementById('categoria').value;

        const producto = { nombre, cantidad, precio, categoria };
        productos.push(producto);

        alert(`Producto ${nombre} agregado!`);
        formProducto.reset();
    });
}