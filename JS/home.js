import { db } from "./firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔥 Cargando inventario...");
    cargarInventario();
});

async function cargarInventario() {
    const tabla = document.getElementById("tablaInventario");

    if (!tabla) {
        console.error("❌ No existe tablaInventario en el HTML");
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "productos"));

        console.log("📦 Datos obtenidos:", querySnapshot.size);

        let total = 0;
        let stockBajo = 0;
        let alertasBajas = 0;
        let alertasCriticas = 0;

        tabla.innerHTML = "";

        if (querySnapshot.empty) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="7">No hay productos registrados</td>
                </tr>
            `;
            return;
        }

        querySnapshot.forEach(doc => {
            const p = doc.data();
            console.log("👉 Producto:", p);

            total++;

            if (p.cantidad <= 5) stockBajo++;
            if (p.cantidad <= 3) alertasBajas++;
            if (p.cantidad <= 1) alertasCriticas++;

            tabla.innerHTML += `
                <tr>
                    <td>${p.codigo}</td>
                    <td>${p.nombre}</td>
                    <td>${p.tipo}</td>
                    <td>${p.proveedor}</td>
                    <td>${p.cantidad}</td>
                    <td>${p.fechaVence}</td>
                    <td>${p.estado}</td>
                </tr>
            `;
        });

        // 🔥 TARJETAS
        document.getElementById("totalProductos").textContent = total;
        document.getElementById("stockBajo").textContent = stockBajo;
        document.getElementById("alertasBajas").textContent = alertasBajas;
        document.getElementById("alertasCriticas").textContent = alertasCriticas;

    } catch (error) {
        console.error("❌ ERROR FIREBASE:", error);
    }
}