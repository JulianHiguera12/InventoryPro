// productManager.js
//lógica de datos y reglas de negocio.
export class Producto {
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

export class ProductManager {
    constructor() {
        this.productos = JSON.parse(localStorage.getItem('productos')) || [];
    }

    crear(producto) {
        if (this.productos.some(p => p.codigo === producto.codigo)) {
            return false;
        }
        this.productos.push(producto);
        this.guardarLocal();
        return true;
    }

    editar(codigoOriginal, datosActualizados) {
        const producto = this.productos.find(p => p.codigo === codigoOriginal);
        if (!producto) return false;
        Object.assign(producto, datosActualizados);
        this.guardarLocal();
        return true;
    }

    obtener(codigo) {
        return this.productos.find(p => p.codigo === codigo);
    }

    eliminar(codigo) {
        const index = this.productos.findIndex(p => p.codigo === codigo);
        if (index === -1) return false;
        this.productos.splice(index, 1);
        this.guardarLocal();
        return true;
    }

    listar() {
        return [...this.productos];
    }

    guardarLocal() {
        localStorage.setItem('productos', JSON.stringify(this.productos));
    }
}

// Función auxiliar para calcular fecha de vencimiento automática
export function calcularFechaVencimiento(tipo, fechaElab) {
    const diasTipo = {
        'lácteo': 7, 'lacteo': 7,
        'carne': 3, 'embutido': 3,
        'panadería': 5, 'pan': 5,
        'bebida': 15
    };
    const dias = diasTipo[tipo.toLowerCase()] || 0;
    const date = new Date(fechaElab);
    date.setDate(date.getDate() + dias);
    return date.toISOString().split('T')[0];
}