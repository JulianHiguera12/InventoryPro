// home.js — Inventario general con tabla completa, semáforo y modal ver
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection, getDocs, getDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
 
// ── CONFIG ────────────────────────────────────────────────────────────────────
let diasVencimientoConfig = 5;
let umbralStockConfig     = 5;
const ITEMS_POR_PAGINA    = 10;
 
// ── ESTADO ────────────────────────────────────────────────────────────────────
let productosCache = [];
let paginaActual   = 1;
 
// ── SEMÁFORO VENCIMIENTO ──────────────────────────────────────────────────────
function getSemaforoVence(fechaVence) {
    if (!fechaVence) return { icono: '⚪', clase: 'sin-dato' };
    const diff = Math.ceil((new Date(fechaVence) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff > diasVencimientoConfig) return { icono: '🟢', clase: 'sem-verde' };
    if (diff >= 0)                    return { icono: '🟡', clase: 'sem-amarillo' };
    return                                   { icono: '🔴', clase: 'sem-rojo' };
}
 
// ── SEMÁFORO STOCK ────────────────────────────────────────────────────────────
function getSemaforoStock(cantidad) {
    const c = Number(cantidad);
    if (isNaN(c)) return { icono: '⚪' };
    if (c <= umbralStockConfig) return { icono: '🔴' };
    if (c <= umbralStockConfig * 2) return { icono: '🟡' };
    return { icono: '🟢' };
}
 
// ── FORMATEAR FECHA ───────────────────────────────────────────────────────────
function fmtFecha(f) {
    if (!f) return '-';
    // Si ya tiene formato dd/mm/yyyy devuelve igual
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) return f;
    // yyyy-mm-dd → dd/mm/yyyy
    const [y, m, d] = f.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return f;
}
 
// ── RENDERIZAR TABLA ──────────────────────────────────────────────────────────
function renderTabla() {
    const tabla = document.getElementById('tablaInventario');
    if (!tabla) return;
 
    const inicio  = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const pagina  = productosCache.slice(inicio, inicio + ITEMS_POR_PAGINA);
 
    if (productosCache.length === 0) {
        tabla.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:20px;color:#aaa;">No hay productos registrados</td></tr>`;
        renderPaginacion();
        return;
    }
 
    tabla.innerHTML = pagina.map(p => {
        const sv = getSemaforoVence(p.fechaVence);
        const ss = getSemaforoStock(p.cantidad);
        return `
        <tr>
            <td>${p.codigo  || '-'}</td>
            <td>${p.nombre  || '-'}</td>
            <td>${fmtFecha(p.fechaElab)}</td>
            <td><span class="${sv.clase}">${fmtFecha(p.fechaVence)} ${sv.icono}</span></td>
            <td>${p.tipo    || '-'}</td>
            <td>${fmtFecha(p.fechaCompra)}</td>
            <td>${p.proveedor || '-'}</td>
            <td>${fmtFecha(p.fechaVenta)}</td>
            <td style="font-weight:700;">${p.cantidad ?? '-'} ${ss.icono}</td>
            <td>
                <button class="btn-ver-home" data-id="${p.id}" title="Ver producto">👁️</button>
            </td>
        </tr>`;
    }).join('');
 
    // Eventos botones ver
    tabla.querySelectorAll('.btn-ver-home').forEach(btn => {
        btn.addEventListener('click', () => abrirModalVer(btn.dataset.id));
    });
 
    renderPaginacion();
}
 
// ── PAGINACIÓN ────────────────────────────────────────────────────────────────
function renderPaginacion() {
    const contenedor = document.getElementById('paginacion');
    const info       = document.getElementById('pagInfo');
    if (!contenedor) return;
 
    const totalPags = Math.ceil(productosCache.length / ITEMS_POR_PAGINA);
    contenedor.innerHTML = '';
 
    if (totalPags <= 1) { if (info) info.textContent = ''; return; }
 
    // Anterior
    const btnAnt = document.createElement('button');
    btnAnt.className = 'pag-btn';
    btnAnt.textContent = '← Anterior';
    btnAnt.disabled = paginaActual === 1;
    btnAnt.addEventListener('click', () => { paginaActual--; renderTabla(); });
    contenedor.appendChild(btnAnt);
 
    // Números
    for (let i = 1; i <= totalPags; i++) {
        const btn = document.createElement('button');
        btn.className = 'pag-btn' + (i === paginaActual ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => { paginaActual = i; renderTabla(); });
        contenedor.appendChild(btn);
    }
 
    // Siguiente
    const btnSig = document.createElement('button');
    btnSig.className = 'pag-btn';
    btnSig.textContent = 'Siguiente →';
    btnSig.disabled = paginaActual === totalPags;
    btnSig.addEventListener('click', () => { paginaActual++; renderTabla(); });
    contenedor.appendChild(btnSig);
 
    if (info) info.textContent = `Página ${paginaActual} de ${totalPags} (${productosCache.length} productos)`;
}
 
// ── ACTUALIZAR TARJETAS ───────────────────────────────────────────────────────
function actualizarTarjetas() {
    let total = productosCache.length;
    let stockBajo    = 0;
    let alertasBajas = 0;
    let alertasCriticas = 0;
 
    productosCache.forEach(p => {
        const c = Number(p.cantidad);
        if (c <= umbralStockConfig)     stockBajo++;
        if (c <= 3)                     alertasBajas++;
        if (c <= 1)                     alertasCriticas++;
    });
 
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('totalProductos', total);
    set('stockBajo',      stockBajo);
    set('alertasBajas',   alertasBajas);
    set('alertasCriticas',alertasCriticas);
}
 
// ── CARGAR INVENTARIO ─────────────────────────────────────────────────────────
async function cargarInventario() {
    // Intentar cargar config de vencimiento
    try {
        const cfgSnap = await getDoc(doc(db, 'configuracion', 'parametros'));
        if (cfgSnap.exists()) {
            const d = cfgSnap.data();
            if (d.diasVencimiento) diasVencimientoConfig = Number(d.diasVencimiento);
            if (d.umbralStock)     umbralStockConfig     = Number(d.umbralStock);
        }
    } catch (_) {}
 
    const tabla = document.getElementById('tablaInventario');
    if (tabla) tabla.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:20px;color:#aaa;">Cargando...</td></tr>`;
 
    try {
        const snapshot = await getDocs(collection(db, 'productos'));
        productosCache = [];
        snapshot.forEach(d => productosCache.push({ id: d.id, ...d.data() }));
 
        paginaActual = 1;
        actualizarTarjetas();
        renderTabla();
 
    } catch (error) {
        console.error('❌ ERROR FIREBASE:', error);
        if (tabla) tabla.innerHTML = `<tr><td colspan="10" style="text-align:center;color:red;padding:20px;">Error al cargar datos</td></tr>`;
    }
}
 
// ── MODAL VER ─────────────────────────────────────────────────────────────────
async function abrirModalVer(id) {
    const modal = document.getElementById('modalVerHome');
    if (!modal) return;
 
    // Buscar en caché primero
    let p = productosCache.find(x => x.id === id);
 
    // Si no está en caché, consultar Firestore
    if (!p) {
        try {
            const snap = await getDoc(doc(db, 'productos', id));
            if (!snap.exists()) return;
            p = { id: snap.id, ...snap.data() };
        } catch (_) { return; }
    }
 
    const set = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.value = val || '';
    };
 
    set('hview-codigo',             p.codigo);
    set('hview-nombre',             p.nombre);
    set('hview-lote',               p.lote);
    set('hview-tipo',               p.tipo);
    set('hview-cantidad',           p.cantidad ?? '');
    set('hview-estado',             p.estado);
    set('hview-fecha-elab',         fmtFecha(p.fechaElab));
    set('hview-fecha-vence',        fmtFecha(p.fechaVence));
    set('hview-fecha-compra',       fmtFecha(p.fechaCompra));
    set('hview-fecha-venta',        fmtFecha(p.fechaVenta));
    set('hview-proveedor',          p.proveedor);
    set('hview-ubicacion',          p.ubicacion);
    set('hview-tipo-almacenamiento',p.tipoAlmacenamiento);
 
    const obs = document.getElementById('hview-observaciones');
    if (obs) obs.value = p.observaciones || '';
 
    modal.classList.add('active');
}
 
function cerrarModalVer() {
    const modal = document.getElementById('modalVerHome');
    if (modal) modal.classList.remove('active');
}
 
// ── AUTENTICACIÓN Y HEADER ────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = '../HTML/index.html'; return; }
 
    try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        if (snap.exists()) {
            const d = snap.data();
            const nombreSpan = document.getElementById('nombreUsuario');
            if (nombreSpan) nombreSpan.textContent = `${d.primerNombre} ${d.primerApellido}`;
            document.querySelectorAll('.user-icon').forEach(img => {
                img.src = d.fotoUrl || (d.genero === 'femenino' ? '../IMG/woman.png' : '../IMG/man.png');
            });
        }
    } catch (_) {}
 
    // Cargar inventario tras autenticación
    cargarInventario();
});
 
// ── EVENTOS DOM ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
 
 
    // Cerrar modal ver
    document.getElementById('cerrarModalVer')?.addEventListener('click',  cerrarModalVer);
    document.getElementById('cerrarModalVer2')?.addEventListener('click', cerrarModalVer);
    document.getElementById('modalVerHome')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) cerrarModalVer();
    });
 
    // Dropdown usuario
    document.getElementById('userInfo')?.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('userDropdown')?.classList.toggle('active');
    });
    document.addEventListener('click', () => {
        document.getElementById('userDropdown')?.classList.remove('active');
    });
 
    // Cerrar sesión
    document.getElementById('btnCerrarSesion')?.addEventListener('click', async () => {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = '../HTML/index.html';
    });
});