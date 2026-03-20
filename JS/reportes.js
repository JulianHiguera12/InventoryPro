// reportes.js — Generador de reportes PDF y Excel
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection, getDocs, getDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── CONFIG VENCIMIENTO (días) ─────────────────────────────────────────────────
let diasVencimientoConfig = 5;

// ── ESTADO ────────────────────────────────────────────────────────────────────
let datosActuales = [];   // filas generadas para exportar
let tipoActual    = '';   // 'inventario' | 'usuarios'

// ── REFERENCIAS DOM ───────────────────────────────────────────────────────────
const filtroTipo              = document.getElementById('filtroTipo');
const filtroEstadoProducto    = document.getElementById('filtroEstadoProducto');
const filtroTipoProducto      = document.getElementById('filtroTipoProducto');
const filtroVencimiento       = document.getElementById('filtroVencimiento');
const filtroActivoUsuario     = document.getElementById('filtroActivoUsuario');
const filtroRolUsuario        = document.getElementById('filtroRolUsuario');

const grupoEstadoProducto     = document.getElementById('grupoEstadoProducto');
const grupoTipoProducto       = document.getElementById('grupoTipoProducto');
const grupoVencimiento        = document.getElementById('grupoVencimiento');
const grupoActivoUsuario      = document.getElementById('grupoActivoUsuario');
const grupoRolUsuario         = document.getElementById('grupoRolUsuario');

const btnGenerar              = document.getElementById('btnGenerar');
const btnPDF                  = document.getElementById('btnPDF');
const btnExcel                = document.getElementById('btnExcel');
const tablaContenedor         = document.getElementById('tablaContenedor');
const resultadoTitulo         = document.getElementById('resultadoTitulo');
const resultadoInfo           = document.getElementById('resultadoInfo');

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg, tipo = 'success') {
    const t = document.getElementById('toastRep');
    t.textContent = msg;
    t.className = `toast-rep ${tipo} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ── SEMÁFORO VENCIMIENTO ──────────────────────────────────────────────────────
function getSemaforo(fechaVence) {
    if (!fechaVence) return { clase: 'sin-dato', texto: '⚪ Sin fecha' };
    const diff = Math.ceil((new Date(fechaVence) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff > diasVencimientoConfig) return { clase: 'seguro',   texto: '🟢 Vigente' };
    if (diff >= 0)                    return { clase: 'cercano',  texto: '🟡 Próximo' };
    return                                   { clase: 'vencido',  texto: '🔴 Vencido' };
}

// ── MOSTRAR / OCULTAR FILTROS SEGÚN TIPO ──────────────────────────────────────
filtroTipo.addEventListener('change', () => {
    const tipo = filtroTipo.value;

    // ocultar todos los filtros condicionales
    [grupoEstadoProducto, grupoTipoProducto, grupoVencimiento,
     grupoActivoUsuario,  grupoRolUsuario].forEach(g => g.classList.add('oculto'));

    if (tipo === 'inventario') {
        grupoEstadoProducto.classList.remove('oculto');
        grupoTipoProducto.classList.remove('oculto');
        grupoVencimiento.classList.remove('oculto');
    } else if (tipo === 'usuarios') {
        grupoActivoUsuario.classList.remove('oculto');
        grupoRolUsuario.classList.remove('oculto');
    }

    // limpiar tabla al cambiar tipo
    limpiarTabla();
});

// ── LIMPIAR TABLA ─────────────────────────────────────────────────────────────
function limpiarTabla() {
    tablaContenedor.innerHTML = `
        <div class="tabla-vacia">
            <span class="ico">📋</span>
            Selecciona un tipo de reporte y aplica los filtros para ver la vista previa.
        </div>`;
    resultadoTitulo.textContent = 'Vista previa del reporte';
    resultadoInfo.textContent = '';
    datosActuales = [];
    tipoActual = '';
    btnPDF.disabled   = true;
    btnExcel.disabled = true;
}

// ── GENERAR VISTA PREVIA ──────────────────────────────────────────────────────
btnGenerar.addEventListener('click', async () => {
    const tipo = filtroTipo.value;
    if (!tipo) { toast('Selecciona un tipo de reporte', 'error'); return; }

    tablaContenedor.innerHTML = `<div class="tabla-vacia"><span class="spinner"></span>Cargando datos...</div>`;
    btnPDF.disabled   = true;
    btnExcel.disabled = true;

    try {
        if (tipo === 'inventario') {
            await generarInventario();
        } else {
            await generarUsuarios();
        }
    } catch (err) {
        console.error(err);
        toast('Error al cargar datos de Firebase', 'error');
        tablaContenedor.innerHTML = `<div class="tabla-vacia"><span class="ico">⚠️</span>Error cargando datos.</div>`;
    }
});

// ── REPORTE INVENTARIO ────────────────────────────────────────────────────────
async function generarInventario() {
    const snapshot = await getDocs(collection(db, 'productos'));
    let lista = [];

    snapshot.forEach(d => lista.push({ id: d.id, ...d.data() }));

    // Leer config de días de vencimiento si existe
    try {
        const cfgSnap = await getDoc(doc(db, 'configuracion', 'parametros'));
        if (cfgSnap.exists() && cfgSnap.data().diasVencimiento) {
            diasVencimientoConfig = Number(cfgSnap.data().diasVencimiento);
        }
    } catch (_) {}

    // Aplicar filtros
    const fEstado     = filtroEstadoProducto.value;
    const fCategoria  = filtroTipoProducto.value;
    const fVencimiento= filtroVencimiento.value;

    if (fEstado)      lista = lista.filter(p => p.estado?.toLowerCase() === fEstado.toLowerCase());
    if (fCategoria)   lista = lista.filter(p => p.tipo?.toLowerCase()   === fCategoria.toLowerCase());
    if (fVencimiento) lista = lista.filter(p => getSemaforo(p.fechaVence).clase === fVencimiento);

    tipoActual    = 'inventario';
    datosActuales = lista;

    resultadoTitulo.textContent = '📦 Listado de Inventario';
    resultadoInfo.textContent   = ` — ${lista.length} producto(s)`;

    if (lista.length === 0) {
        tablaContenedor.innerHTML = `<div class="tabla-vacia"><span class="ico">📭</span>No hay productos con esos filtros.</div>`;
        return;
    }

    // Construir tabla
    let rows = '';
    lista.forEach(p => {
        const sem = getSemaforo(p.fechaVence);
        const estadoBadge = getBadgeProducto(p.estado);
        rows += `
        <tr>
            <td>${p.codigo  || '—'}</td>
            <td>${p.nombre  || '—'}</td>
            <td>${p.tipo    || '—'}</td>
            <td>${p.proveedor || '—'}</td>
            <td>${p.cantidad ?? '—'}</td>
            <td>${p.fechaVence || '—'}</td>
            <td><span class="sem-${sem.clase}">${sem.texto}</span></td>
            <td>${estadoBadge}</td>
        </tr>`;
    });

    tablaContenedor.innerHTML = `
        <table class="rep-table">
            <thead>
                <tr>
                    <th>Código</th><th>Nombre</th><th>Categoría</th><th>Proveedor</th>
                    <th>Cantidad</th><th>Vencimiento</th><th>Semáforo</th><th>Estado</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;

    btnPDF.disabled   = false;
    btnExcel.disabled = false;
    toast(`${lista.length} productos cargados`);
}

function getBadgeProducto(estado) {
    if (!estado) return '—';
    const e = estado.toLowerCase();
    if (e === 'disponible') return `<span class="badge badge-disponible">Disponible</span>`;
    if (e === 'agotado')    return `<span class="badge badge-agotado">Agotado</span>`;
    if (e === 'vencido')    return `<span class="badge badge-vencido">Vencido</span>`;
    return `<span class="badge">${estado}</span>`;
}

// ── REPORTE USUARIOS ──────────────────────────────────────────────────────────
async function generarUsuarios() {
    const snapshot = await getDocs(collection(db, 'usuarios'));
    let lista = [];

    snapshot.forEach(d => lista.push({ id: d.id, ...d.data() }));

    // Aplicar filtros
    const fActivo = filtroActivoUsuario.value;
    const fRol    = filtroRolUsuario.value;

    if (fActivo === 'activo')   lista = lista.filter(u => u.activo === true);
    if (fActivo === 'inactivo') lista = lista.filter(u => u.activo === false);
    if (fRol)                   lista = lista.filter(u => u.rol?.toLowerCase() === fRol.toLowerCase());

    tipoActual    = 'usuarios';
    datosActuales = lista;

    resultadoTitulo.textContent = '👥 Listado de Usuarios';
    resultadoInfo.textContent   = ` — ${lista.length} usuario(s)`;

    if (lista.length === 0) {
        tablaContenedor.innerHTML = `<div class="tabla-vacia"><span class="ico">👤</span>No hay usuarios con esos filtros.</div>`;
        return;
    }

    let rows = '';
    lista.forEach(u => {
        const nombre   = `${u.primerNombre || ''} ${u.primerApellido || ''}`.trim() || '—';
        const correo   = u.correo   || '—';
        const telefono = u.telefono || '—';
        const rol      = u.rol      || '—';
        const estadoBadge = u.activo
            ? `<span class="badge badge-activo">Activo</span>`
            : `<span class="badge badge-inactivo">Inactivo</span>`;
        const creado = u.creadoEn ? u.creadoEn.substring(0, 10) : '—';

        rows += `
        <tr>
            <td>${nombre}</td>
            <td>${correo}</td>
            <td>${telefono}</td>
            <td>${rol}</td>
            <td>${estadoBadge}</td>
            <td>${creado}</td>
        </tr>`;
    });

    tablaContenedor.innerHTML = `
        <table class="rep-table">
            <thead>
                <tr>
                    <th>Nombre</th><th>Correo</th><th>Teléfono</th>
                    <th>Rol</th><th>Estado</th><th>Fecha creación</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;

    btnPDF.disabled   = false;
    btnExcel.disabled = false;
    toast(`${lista.length} usuarios cargados`);
}

// ── EXPORTAR PDF ──────────────────────────────────────────────────────────────
btnPDF.addEventListener('click', () => {
    if (!datosActuales.length) return;

    const { jsPDF } = window.jspdf;
    const doc2 = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const fecha = new Date().toLocaleDateString('es-CO');
    const titulo = tipoActual === 'inventario' ? 'Reporte de Inventario' : 'Reporte de Usuarios';

    // Cabecera
    doc2.setFontSize(16);
    doc2.setTextColor(52, 80, 107);
    doc2.text('InventoryPro', 14, 15);
    doc2.setFontSize(11);
    doc2.setTextColor(100);
    doc2.text(titulo, 14, 22);
    doc2.text(`Generado: ${fecha}`, doc2.internal.pageSize.width - 14, 22, { align: 'right' });
    doc2.text(`Total registros: ${datosActuales.length}`, doc2.internal.pageSize.width - 14, 28, { align: 'right' });

    // Tabla
    if (tipoActual === 'inventario') {
        const head = [['Código','Nombre','Categoría','Proveedor','Cantidad','Vencimiento','Semáforo','Estado']];
        const body = datosActuales.map(p => [
            p.codigo || '—', p.nombre || '—', p.tipo || '—', p.proveedor || '—',
            p.cantidad ?? '—', p.fechaVence || '—',
            getSemaforo(p.fechaVence).texto.replace(/🟢|🟡|🔴|⚪/g,'').trim(),
            p.estado || '—'
        ]);
        doc2.autoTable({ head, body, startY: 32, styles: { fontSize: 8, halign: 'center' },
            headStyles: { fillColor: [74,144,226], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240,245,255] } });
    } else {
        const head = [['Nombre','Correo','Teléfono','Rol','Estado','Fecha creación']];
        const body = datosActuales.map(u => [
            `${u.primerNombre||''} ${u.primerApellido||''}`.trim(),
            u.correo||'—', u.telefono||'—', u.rol||'—',
            u.activo ? 'Activo' : 'Inactivo',
            u.creadoEn ? u.creadoEn.substring(0,10) : '—'
        ]);
        doc2.autoTable({ head, body, startY: 32, styles: { fontSize: 9, halign: 'center' },
            headStyles: { fillColor: [74,144,226], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240,245,255] } });
    }

    const nombreArchivo = `${tipoActual}_${fecha.replace(/\//g,'-')}.pdf`;
    doc2.save(nombreArchivo);
    toast(`PDF descargado: ${nombreArchivo}`);
});

// ── EXPORTAR EXCEL ────────────────────────────────────────────────────────────
btnExcel.addEventListener('click', () => {
    if (!datosActuales.length) return;

    let filas = [];

    if (tipoActual === 'inventario') {
        filas = datosActuales.map(p => ({
            'Código':       p.codigo     || '',
            'Nombre':       p.nombre     || '',
            'Categoría':    p.tipo       || '',
            'Proveedor':    p.proveedor  || '',
            'Cantidad':     p.cantidad   ?? '',
            'F. Elaboración': p.fechaElab  || '',
            'F. Compra':    p.fechaCompra || '',
            'F. Venta':     p.fechaVenta  || '',
            'Vencimiento':  p.fechaVence  || '',
            'Semáforo':     getSemaforo(p.fechaVence).texto.replace(/🟢|🟡|🔴|⚪/g,'').trim(),
            'Estado':       p.estado     || ''
        }));
    } else {
        filas = datosActuales.map(u => ({
            'Primer Nombre':   u.primerNombre   || '',
            'Segundo Nombre':  u.segundoNombre  || '',
            'Primer Apellido': u.primerApellido || '',
            'Segundo Apellido':u.segundoApellido|| '',
            'Correo':          u.correo         || '',
            'Teléfono':        u.telefono       || '',
            'Dirección':       u.direccion      || '',
            'Rol':             u.rol            || '',
            'Estado':          u.activo ? 'Activo' : 'Inactivo',
            'Fecha creación':  u.creadoEn ? u.creadoEn.substring(0,10) : ''
        }));
    }

    const ws   = XLSX.utils.json_to_sheet(filas);
    const wb   = XLSX.utils.book_new();
    const hoja = tipoActual === 'inventario' ? 'Inventario' : 'Usuarios';
    XLSX.utils.book_append_sheet(wb, ws, hoja);

    const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g,'-');
    const nombreArchivo = `${tipoActual}_${fecha}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
    toast(`Excel descargado: ${nombreArchivo}`);
});

// ── AUTENTICACIÓN Y HEADER ────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../HTML/index.html';
        return;
    }
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