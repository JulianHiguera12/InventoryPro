// crudProductos.js — CRUD completo con Firebase Firestore
import { auth, db } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection, doc, getDoc, getDocs,
    addDoc, updateDoc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── COLECCIÓN ────────────────────────────────────────────────────────────────
const productosRef = collection(db, 'productos');

// ── CONFIG ───────────────────────────────────────────────────────────────────
let diasVencimientoConfig = 5;
let umbralStockConfig     = 5;

// ── ESTADO DE TABLA ───────────────────────────────────────────────────────────
let productosCache   = [];
let filtroTipo       = '';
let filtroEstado     = '';
let filtroSemaforo   = '';
let ordenColumna     = null;
let ordenAsc         = true;
let paginaActual     = 1;
const ITEMS_POR_PAGI = 10;

// ── REFERENCIAS DOM ──────────────────────────────────────────────────────────
const tableBody   = document.getElementById('prod-table-body');
const btnCreate   = document.getElementById('prod-btn-create');
const btnSearch   = document.getElementById('prod-btn-search');
const modalCreate = document.getElementById('prod-modal-create');
const modalEdit   = document.getElementById('prod-modal-edit');
const modalView   = document.getElementById('prod-modal-view');
const modalSearch = document.getElementById('prod-modal-search');
const formCreate  = document.getElementById('prod-form-create');
const formEdit    = document.getElementById('prod-form-edit');
const inputSearch = document.getElementById('prod-search');

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, tipo = 'success') {
    let toast = document.getElementById('toast-prod');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-prod';
        toast.style.cssText = `
            position:fixed; bottom:28px; right:28px; padding:14px 24px;
            border-radius:10px; font-size:.95rem; font-weight:600; color:white;
            opacity:0; transform:translateY(20px); transition:all .3s ease;
            z-index:9999; pointer-events:none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = tipo === 'success' ? '#28a745' : '#dc3545';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }, 3000);
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
const openModal  = m => m.classList.add('active');
const closeModal = m => m.classList.remove('active');

document.querySelectorAll('.product-modal-close, .product-btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
        const m = document.getElementById(btn.dataset.prodModal);
        if (m) closeModal(m);
    });
});

document.querySelectorAll('.product-modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m); });
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
function sumarDias(fecha, dias) {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
}

function fechaHoraLocal() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
}

// ── SEMÁFORO VENCIMIENTO ──────────────────────────────────────────────────────
function getSemaforoVence(fechaVence) {
    const diff = Math.ceil((new Date(fechaVence) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff > diasVencimientoConfig)               return { icono: '🟢', clase: 'seguro'  };
    if (diff >= 2 && diff <= diasVencimientoConfig) return { icono: '🟡', clase: 'cercano' };
    return { icono: '🔴', clase: 'vencido' };
}

// ── SEMÁFORO STOCK ────────────────────────────────────────────────────────────
function getSemaforoStock(cantidad) {
    if (cantidad === undefined || cantidad === null || cantidad === '') return { icono: '⚪', clase: 'sin-dato' };
    return Number(cantidad) <= umbralStockConfig
        ? { icono: '🔴', clase: 'bajo-stock' }
        : { icono: '🟢', clase: 'stock-ok'   };
}

// ── MÉTRICAS ──────────────────────────────────────────────────────────────────
function actualizarMetricas(productos) {
    let verde = 0, amarillo = 0, rojo = 0;
    productos.forEach(p => {
        const s = getSemaforoVence(p.fechaVence);
        if (s.clase === 'seguro')  verde++;
        if (s.clase === 'cercano') amarillo++;
        if (s.clase === 'vencido') rojo++;
    });
    document.getElementById('semaforo-verde').textContent    = verde;
    document.getElementById('semaforo-amarillo').textContent = amarillo;
    document.getElementById('semaforo-rojo').textContent     = rojo;
    const totalEl = document.getElementById('semaforo-total');
    if (totalEl) totalEl.textContent = productos.length;
}

// ── FILTROS ───────────────────────────────────────────────────────────────────
function getProductosFiltrados() {
    let lista = [...productosCache];
    if (filtroTipo)     lista = lista.filter(p => p.tipo?.toLowerCase().includes(filtroTipo.toLowerCase()));
    if (filtroEstado)   lista = lista.filter(p => p.estado === filtroEstado);
    if (filtroSemaforo) lista = lista.filter(p => getSemaforoVence(p.fechaVence).clase === filtroSemaforo);

    if (ordenColumna) {
        lista.sort((a, b) => {
            let valA = a[ordenColumna] ?? '';
            let valB = b[ordenColumna] ?? '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return ordenAsc ? -1 :  1;
            if (valA > valB) return ordenAsc ?  1 : -1;
            return 0;
        });
    }
    return lista;
}

// ── PAGINACIÓN ────────────────────────────────────────────────────────────────
function renderPaginacion(total) {
    let container = document.getElementById('prod-pagination');
    if (!container) {
        container = document.createElement('div');
        container.id = 'prod-pagination';
        container.style.cssText = 'display:flex;gap:8px;justify-content:center;align-items:center;margin-top:12px;flex-wrap:wrap;';
        document.querySelector('.product-table-section').appendChild(container);
    }

    const totalPaginas = Math.ceil(total / ITEMS_POR_PAGI);
    container.innerHTML = '';
    if (totalPaginas <= 1) return;

    const btnPrev = document.createElement('button');
    btnPrev.textContent = '← Anterior';
    btnPrev.className   = 'pag-btn';
    btnPrev.disabled    = paginaActual === 1;
    btnPrev.addEventListener('click', () => { paginaActual--; renderTabla(); });
    container.appendChild(btnPrev);

    for (let i = 1; i <= totalPaginas; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className   = `pag-btn${i === paginaActual ? ' pag-btn-active' : ''}`;
        btn.addEventListener('click', () => { paginaActual = i; renderTabla(); });
        container.appendChild(btn);
    }

    const btnNext = document.createElement('button');
    btnNext.textContent = 'Siguiente →';
    btnNext.className   = 'pag-btn';
    btnNext.disabled    = paginaActual === totalPaginas;
    btnNext.addEventListener('click', () => { paginaActual++; renderTabla(); });
    container.appendChild(btnNext);

    const info = document.createElement('span');
    info.style.cssText = 'font-size:.85rem;color:#888;margin-left:8px;';
    info.textContent   = `Página ${paginaActual} de ${totalPaginas} (${total} productos)`;
    container.appendChild(info);
}

// ── RENDER TABLA ──────────────────────────────────────────────────────────────
function renderTabla() {
    tableBody.innerHTML = '';
    const filtrados = getProductosFiltrados();
    const inicio    = (paginaActual - 1) * ITEMS_POR_PAGI;
    const pagina    = filtrados.slice(inicio, inicio + ITEMS_POR_PAGI);

    if (filtrados.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#aaa;padding:20px;">
            No hay productos que coincidan con los filtros.</td></tr>`;
        renderPaginacion(0);
        return;
    }

    pagina.forEach(p => {
        const sv = getSemaforoVence(p.fechaVence);
        const ss = getSemaforoStock(p.cantidad);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.codigo}</td>
            <td>${p.nombre}</td>
            <td>${p.fechaElab}</td>
            <td>${p.fechaVence} ${sv.icono}</td>
            <td>${p.tipo}</td>
            <td>${p.fechaCompra}</td>
            <td>${p.proveedor}</td>
            <td>${p.fechaVenta || '-'}</td>
            <td style="text-align:center;font-weight:700;">${p.cantidad ?? '-'} ${ss.icono}</td>
            <td>
                <button class="btn-ver-prod"    data-id="${p.id}" title="Ver">👁️</button>
                <button class="btn-editar-prod" data-id="${p.id}" title="Editar">✏️</button>
                <button class="btn-borrar-prod" data-id="${p.id}" title="Eliminar">🗑️</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    tableBody.querySelectorAll('.btn-ver-prod').forEach(btn =>
        btn.addEventListener('click', () => abrirVer(btn.dataset.id)));
    tableBody.querySelectorAll('.btn-editar-prod').forEach(btn =>
        btn.addEventListener('click', () => abrirEditar(btn.dataset.id)));
    tableBody.querySelectorAll('.btn-borrar-prod').forEach(btn =>
        btn.addEventListener('click', () => eliminarProducto(btn.dataset.id)));

    renderPaginacion(filtrados.length);
}

// ── ORDENAR COLUMNAS ──────────────────────────────────────────────────────────
function inicializarOrdenColumnas() {
    document.querySelectorAll('#prod-table th[data-col]').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            ordenAsc = ordenColumna === col ? !ordenAsc : true;
            ordenColumna = col;
            document.querySelectorAll('#prod-table th .sort-icon').forEach(i => i.textContent = '');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.textContent = ordenAsc ? ' ▲' : ' ▼';
            paginaActual = 1;
            renderTabla();
        });
    });
}

// ── FILTROS UI ────────────────────────────────────────────────────────────────
function inicializarFiltros() {
    const contenedor = document.getElementById('prod-actions');
    if (!contenedor) return;

    contenedor.insertAdjacentHTML('afterend', `
        <div id="prod-filtros" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px;padding:0 4px;">
            <select id="filtro-tipo" class="prod-filtro-select">
                <option value="">Todos los tipos</option>
                <option value="Lácteo">Lácteo</option>
                <option value="Carne">Carne</option>
                <option value="Embutido">Embutido</option>
                <option value="Panadería">Panadería</option>
                <option value="Bebida">Bebida</option>
                <option value="Cereal">Cereal</option>
                <option value="Aceite">Aceite</option>
            </select>
            <select id="filtro-estado" class="prod-filtro-select">
                <option value="">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="vendido">Vendido</option>
                <option value="devuelto">Devuelto</option>
                <option value="inspeccion">En inspección</option>
            </select>
            <select id="filtro-semaforo" class="prod-filtro-select">
                <option value="">Todos los vencimientos</option>
                <option value="seguro">🟢 Seguro</option>
                <option value="cercano">🟡 Cercano</option>
                <option value="vencido">🔴 Vencido</option>
            </select>
            <button id="btn-limpiar-filtros" class="product-btn" style="background:#6c757d;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;">
                🗑 Limpiar filtros
            </button>
        </div>
    `);

    document.getElementById('filtro-tipo').addEventListener('change', e => {
        filtroTipo = e.target.value; paginaActual = 1; renderTabla();
    });
    document.getElementById('filtro-estado').addEventListener('change', e => {
        filtroEstado = e.target.value; paginaActual = 1; renderTabla();
    });
    document.getElementById('filtro-semaforo').addEventListener('change', e => {
        filtroSemaforo = e.target.value; paginaActual = 1; renderTabla();
    });
    document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
        filtroTipo = ''; filtroEstado = ''; filtroSemaforo = '';
        document.getElementById('filtro-tipo').value     = '';
        document.getElementById('filtro-estado').value   = '';
        document.getElementById('filtro-semaforo').value = '';
        paginaActual = 1;
        renderTabla();
    });
}

// ── CARGAR PRODUCTOS ──────────────────────────────────────────────────────────
async function cargarProductos() {
    try {
        const snapCfg = await getDoc(doc(db, 'configuracion', 'parametros'));
        if (snapCfg.exists()) {
            diasVencimientoConfig = snapCfg.data().diasVencimiento || 5;
            umbralStockConfig     = snapCfg.data().umbralStock     || 5;
        }
        const snap = await getDocs(productosRef);
        productosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderTabla();
        actualizarMetricas(productosCache);
    } catch (e) {
        console.error('Error cargando productos:', e);
        showToast('Error al cargar productos.', 'error');
    }
}

// ── LEER CAMPOS FORM CREAR ────────────────────────────────────────────────────
function getDatosFormCrear() {
    const tipo      = document.getElementById('prod-input-tipo').value.trim();
    const fechaElab = document.getElementById('prod-input-fecha-elab').value;
    let fechaVence  = document.getElementById('prod-input-fecha-vence').value;

    switch (tipo.toLowerCase()) {
        case 'lácteo': case 'lacteo':   fechaVence = sumarDias(fechaElab, 7);  break;
        case 'carne':  case 'embutido': fechaVence = sumarDias(fechaElab, 3);  break;
        case 'panadería': case 'pan':   fechaVence = sumarDias(fechaElab, 5);  break;
        case 'bebida':                  fechaVence = sumarDias(fechaElab, 15); break;
    }

    return {
        codigo:             document.getElementById('prod-input-code').value.trim(),
        nombre:             document.getElementById('prod-input-name').value.trim(),
        lote:               document.getElementById('prod-input-lote').value.trim(),
        tipo,
        cantidad:           Number(document.getElementById('prod-input-cantidad').value) || 0,
        fechaElab,
        fechaVence,
        fechaCompra:        document.getElementById('prod-input-fecha-compra').value,
        fechaVenta:         document.getElementById('prod-input-fecha-venta').value || '',
        proveedor:          document.getElementById('prod-input-proveedor').value.trim(),
        ubicacion:          document.getElementById('prod-input-ubicacion').value.trim(),
        tipoAlmacenamiento: document.getElementById('prod-input-tipo-almacenamiento').value,
        estado:             document.getElementById('prod-input-estado').value,
        observaciones:      document.getElementById('prod-input-observaciones').value.trim(),
        usuarioRegistra:    sessionStorage.getItem('usuario') || 'admin',
        fechaRegistro:      fechaHoraLocal(),
        fechaModificacion:  fechaHoraLocal()
    };
}

// ── CREAR PRODUCTO ────────────────────────────────────────────────────────────
btnCreate.addEventListener('click', () => {
    document.getElementById('prod-input-fecha-registro').value     = fechaHoraLocal();
    document.getElementById('prod-input-fecha-modificacion').value = fechaHoraLocal();
    document.getElementById('prod-input-usuario').value            = sessionStorage.getItem('usuario') || 'admin';
    openModal(modalCreate);
});

formCreate.addEventListener('submit', async e => {
    e.preventDefault();
    const datos = getDatosFormCrear();
    const q     = query(productosRef, where('codigo', '==', datos.codigo));
    const snap  = await getDocs(q);
    if (!snap.empty) { showToast('El código ya existe. Use otro código.', 'error'); return; }
    try {
        await addDoc(productosRef, datos);
        formCreate.reset();
        closeModal(modalCreate);
        await cargarProductos();
        showToast('Producto creado correctamente.');
    } catch (err) {
        console.error(err);
        showToast('Error al crear producto.', 'error');
    }
});

// ── VER PRODUCTO ──────────────────────────────────────────────────────────────
async function abrirVer(id) {
    const snap = await getDoc(doc(db, 'productos', id));
    if (!snap.exists()) return showToast('Producto no encontrado.', 'error');
    const p = snap.data();

    document.getElementById('view-codigo').value              = p.codigo;
    document.getElementById('view-nombre').value              = p.nombre;
    document.getElementById('view-lote').value                = p.lote || '';
    document.getElementById('view-tipo').value                = p.tipo;
    document.getElementById('view-fecha-elab').value          = p.fechaElab;
    document.getElementById('view-fecha-vence').value         = p.fechaVence;
    document.getElementById('view-fecha-compra').value        = p.fechaCompra;
    document.getElementById('view-fecha-venta').value         = p.fechaVenta || '';
    document.getElementById('view-proveedor').value           = p.proveedor;
    document.getElementById('view-ubicacion').value           = p.ubicacion || '';
    document.getElementById('view-tipo-almacenamiento').value = p.tipoAlmacenamiento || '';
    document.getElementById('view-estado').value              = p.estado || '';
    document.getElementById('view-observaciones').value       = p.observaciones || '';
    document.getElementById('view-usuario').value             = p.usuarioRegistra || '';
    document.getElementById('view-fecha-registro').value      = p.fechaRegistro || '';
    document.getElementById('view-fecha-modificacion').value  = p.fechaModificacion || '';
    const viewCantidad = document.getElementById('view-cantidad');
    if (viewCantidad) viewCantidad.value = p.cantidad ?? '';
    openModal(modalView);
}

// ── EDITAR PRODUCTO ───────────────────────────────────────────────────────────
async function abrirEditar(id) {
    const snap = await getDoc(doc(db, 'productos', id));
    if (!snap.exists()) return showToast('Producto no encontrado.', 'error');
    const p = snap.data();

    document.getElementById('prod-edit-code').value                = p.codigo;
    document.getElementById('prod-edit-code').dataset.docId        = id;
    document.getElementById('prod-edit-name').value                = p.nombre;
    document.getElementById('prod-edit-lote').value                = p.lote || '';
    document.getElementById('prod-edit-tipo').value                = p.tipo;
    document.getElementById('prod-edit-cantidad').value            = p.cantidad ?? '';
    document.getElementById('prod-edit-fecha-elab').value          = p.fechaElab;
    document.getElementById('prod-edit-fecha-vence').value         = p.fechaVence;
    document.getElementById('prod-edit-fecha-compra').value        = p.fechaCompra;
    document.getElementById('prod-edit-fecha-venta').value         = p.fechaVenta || '';
    document.getElementById('prod-edit-proveedor').value           = p.proveedor;
    document.getElementById('prod-edit-ubicacion').value           = p.ubicacion || '';
    document.getElementById('prod-edit-tipo-almacenamiento').value = p.tipoAlmacenamiento || '';
    document.getElementById('prod-edit-estado').value              = p.estado || 'disponible';
    document.getElementById('prod-edit-observaciones').value       = p.observaciones || '';
    document.getElementById('prod-edit-usuario').value             = sessionStorage.getItem('usuario') || 'admin';
    document.getElementById('prod-edit-fecha-registro').value      = p.fechaRegistro || '';
    document.getElementById('prod-edit-fecha-modificacion').value  = fechaHoraLocal();
    openModal(modalEdit);
}

document.getElementById('prod-edit-tipo').addEventListener('input', e => {
    const tipo = e.target.value.trim().toLowerCase();
    const fechaElab = document.getElementById('prod-edit-fecha-elab').value;
    if (!fechaElab) return;
    let fechaVence;
    switch (tipo) {
        case 'lácteo': case 'lacteo':   fechaVence = sumarDias(fechaElab, 7);  break;
        case 'carne':  case 'embutido': fechaVence = sumarDias(fechaElab, 3);  break;
        case 'panadería': case 'pan':   fechaVence = sumarDias(fechaElab, 5);  break;
        case 'bebida':                  fechaVence = sumarDias(fechaElab, 15); break;
        default: return;
    }
    document.getElementById('prod-edit-fecha-vence').value = fechaVence;
});

formEdit.addEventListener('submit', async e => {
    e.preventDefault();
    const docId = document.getElementById('prod-edit-code').dataset.docId;
    const datos = {
        codigo:             document.getElementById('prod-edit-code').value.trim(),
        nombre:             document.getElementById('prod-edit-name').value.trim(),
        lote:               document.getElementById('prod-edit-lote').value.trim(),
        tipo:               document.getElementById('prod-edit-tipo').value.trim(),
        cantidad:           Number(document.getElementById('prod-edit-cantidad').value) || 0,
        fechaElab:          document.getElementById('prod-edit-fecha-elab').value,
        fechaVence:         document.getElementById('prod-edit-fecha-vence').value,
        fechaCompra:        document.getElementById('prod-edit-fecha-compra').value,
        fechaVenta:         document.getElementById('prod-edit-fecha-venta').value || '',
        proveedor:          document.getElementById('prod-edit-proveedor').value.trim(),
        ubicacion:          document.getElementById('prod-edit-ubicacion').value.trim(),
        tipoAlmacenamiento: document.getElementById('prod-edit-tipo-almacenamiento').value,
        estado:             document.getElementById('prod-edit-estado').value,
        observaciones:      document.getElementById('prod-edit-observaciones').value.trim(),
        usuarioRegistra:    sessionStorage.getItem('usuario') || 'admin',
        fechaModificacion:  fechaHoraLocal()
    };
    try {
        await updateDoc(doc(db, 'productos', docId), datos);
        formEdit.reset();
        closeModal(modalEdit);
        await cargarProductos();
        showToast('Producto actualizado correctamente.');
    } catch (err) {
        console.error(err);
        showToast('Error al actualizar producto.', 'error');
    }
});

// ── ELIMINAR PRODUCTO ─────────────────────────────────────────────────────────
async function eliminarProducto(id) {
    const producto = productosCache.find(p => p.id === id);
    const nombre   = producto ? producto.nombre : 'este producto';
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"? Esta acción es irreversible.`)) return;
    try {
        await deleteDoc(doc(db, 'productos', id));
        await cargarProductos();
        showToast(`Producto "${nombre}" eliminado.`);
    } catch (err) {
        console.error(err);
        showToast('Error al eliminar producto.', 'error');
    }
}

// ── BUSCAR PRODUCTO ───────────────────────────────────────────────────────────
btnSearch.addEventListener('click', () => openModal(modalSearch));

inputSearch.addEventListener('input', () => {
    const termino    = inputSearch.value.trim().toLowerCase();
    const resultados = productosCache.filter(p =>
        p.codigo?.toLowerCase().includes(termino)   ||
        p.nombre?.toLowerCase().includes(termino)   ||
        p.proveedor?.toLowerCase().includes(termino)
    );
    const tbody = document.getElementById('prod-search-results');
    if (!termino) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;font-style:italic;color:#888;">Ingrese un término de búsqueda</td></tr>`;
        return;
    }
    if (resultados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#aaa;">No se encontraron productos.</td></tr>`;
        return;
    }
    tbody.innerHTML = resultados.map(p => {
        const sv = getSemaforoVence(p.fechaVence);
        const ss = getSemaforoStock(p.cantidad);
        return `<tr>
            <td>${p.codigo}</td>
            <td>${p.nombre}</td>
            <td>${p.proveedor}</td>
            <td>${p.fechaVence} ${sv.icono}</td>
            <td>${p.cantidad ?? '-'} ${ss.icono}</td>
            <td>
                <button class="btn-ver-prod"    data-id="${p.id}">👁️</button>
                <button class="btn-editar-prod" data-id="${p.id}">✏️</button>
                <button class="btn-borrar-prod" data-id="${p.id}">🗑️</button>
            </td>
        </tr>`;
    }).join('');
    tbody.querySelectorAll('.btn-ver-prod').forEach(btn =>
        btn.addEventListener('click', () => { closeModal(modalSearch); abrirVer(btn.dataset.id); }));
    tbody.querySelectorAll('.btn-editar-prod').forEach(btn =>
        btn.addEventListener('click', () => { closeModal(modalSearch); abrirEditar(btn.dataset.id); }));
    tbody.querySelectorAll('.btn-borrar-prod').forEach(btn =>
        btn.addEventListener('click', () => eliminarProducto(btn.dataset.id)));
});

// ── CERRAR SESIÓN ─────────────────────────────────────────────────────────────
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = '/HTML/index.html';
    });
}

// ── DROPDOWN USUARIO ──────────────────────────────────────────────────────────
const userInfoBtn = document.getElementById('userInfo');
const dropdown    = document.getElementById('userDropdown');
if (userInfoBtn && dropdown) {
    userInfoBtn.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });
    document.addEventListener('click', e => {
        if (!userInfoBtn.contains(e.target) && !dropdown.contains(e.target))
            dropdown.classList.remove('active');
    });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const uid = sessionStorage.getItem('uid');
    if (!uid) { window.location.href = '/HTML/login.html'; return; }
    try {
        const snap = await getDoc(doc(db, 'usuarios', uid));
        if (snap.exists()) {
            const d = snap.data();
            const nombreSpan = document.getElementById('nombreUsuario');
            if (nombreSpan) nombreSpan.textContent = `${d.primerNombre} ${d.primerApellido}`;
        }
    } catch (e) { console.error(e); }

    inicializarFiltros();
    inicializarOrdenColumnas();
    await cargarProductos();
});