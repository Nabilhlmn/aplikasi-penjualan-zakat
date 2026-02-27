// ===== ADMIN.JS — Dashboard Admin =====
import { db, auth } from './firebase-config.js';
import {
    collection, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
    onSnapshot, query, orderBy, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword }
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    formatRupiah, formatDate, todayStr, formatTotalPerSatuan,
    esc, showToast, showSection, updateDateBadge, bukaModal, tutupModal,
    toggleSidebar, stokBadge, stokColor
} from './shared.js';

// ===== STATE =====
let produkList = [];
let transaksiList = [];
let usersList = [];
let unsubProduk, unsubTrx, unsubUsers;

const PAGE_TITLES = {
    dashboard: 'Dashboard', produk: 'Manajemen Produk',
    transaksi: 'Semua Transaksi', laporan: 'Laporan', users: 'Kelola User'
};

// ===== AUTH GUARD =====
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists() || snap.data().role !== 'admin') {
        await signOut(auth);
        window.location.href = 'index.html';
        return;
    }
    const data = snap.data();
    document.getElementById('admin-name').textContent = data.nama || 'Admin';
    document.getElementById('admin-email').textContent = user.email;
    document.getElementById('admin-avatar').textContent = (data.nama || 'A')[0].toUpperCase();
    updateDateBadge();
    setInterval(updateDateBadge, 60000);
    startListeners();
});

// ===== REAL-TIME LISTENERS =====
function startListeners() {
    // Produk
    unsubProduk = onSnapshot(collection(db, 'produk'), snap => {
        produkList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderProdukList();
        renderStockOverview();
        renderFilterProduk();
        updateDashboard();
    });

    // Transaksi
    unsubTrx = onSnapshot(query(collection(db, 'transaksi'), orderBy('createdAt', 'desc')), snap => {
        transaksiList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateDashboard();
        renderTrxTable(transaksiList);
        renderRecentTable();
    });

    // Users
    unsubUsers = onSnapshot(collection(db, 'users'), snap => {
        usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUsersList();
        renderFilterPenjual();
        document.getElementById('badge-users').textContent = usersList.length;
    });
}

// ===== NAVIGATION =====
window.showSec = (name) => showSection(name, PAGE_TITLES);
window.toggleSidebar = toggleSidebar;
window.tutupModal = tutupModal;

window.doLogout = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

// ===== DASHBOARD =====
function updateDashboard() {
    const lunas = transaksiList.filter(t => t.status === 'Lunas');
    const belum = transaksiList.filter(t => t.status !== 'Lunas');
    const pemasukan = lunas.reduce((a, t) => a + (t.total || 0), 0);
    const piutang = belum.reduce((a, t) => a + (t.total || 0), 0);
    const today = todayStr();
    const todayCount = transaksiList.filter(t => t.tanggal === today).length;

    document.getElementById('s-pemasukan').textContent = formatRupiah(pemasukan);
    document.getElementById('s-transaksi').textContent = transaksiList.length;
    document.getElementById('s-terjual').textContent = formatTotalPerSatuan(transaksiList);
    document.getElementById('s-today').textContent = todayCount;
    document.getElementById('s-piutang').textContent = formatRupiah(piutang);
}

function renderRecentTable() {
    const recent = transaksiList.slice(0, 8);
    const tbody = document.getElementById('tbody-recent');
    const empty = document.getElementById('empty-recent');
    tbody.parentElement.style.display = recent.length ? '' : 'none';
    empty.style.display = recent.length ? 'none' : 'block';
    tbody.innerHTML = recent.map((t, i) => `
    <tr>
      <td>${i + 1}</td><td>${formatDate(t.tanggal)}</td>
      <td class="text-muted">${esc(t.penjualNama || '-')}</td>
      <td class="font-bold">${esc(t.nama)}</td>
      <td>${esc(t.produkNama)}</td>
      <td>${parseFloat(t.qty).toLocaleString('id-ID')} ${t.satuan || ''}</td>
      <td class="text-green font-bold">${formatRupiah(t.total)}</td>
      <td><span class="status-badge ${t.status === 'Lunas' ? 'lunas' : 'belum'}">${esc(t.status)}</span></td>
    </tr>`).join('');
}

function renderStockOverview() {
    const el = document.getElementById('stock-overview');
    if (!produkList.length) { el.innerHTML = '<div class="empty-state"><span>📦</span><p>Belum ada produk</p></div>'; return; }
    const maxStok = Math.max(...produkList.map(p => p.stok || 0), 1);
    el.innerHTML = produkList.map(p => {
        const pct = Math.min(100, Math.round(((p.stok || 0) / maxStok) * 100));
        const sc = stokColor(p.stok || 0);
        return `<div class="stock-item">
      <div style="font-size:22px">🌾</div>
      <div class="stock-bar-wrap">
        <div class="stock-bar-label">
          <span class="font-bold">${esc(p.nama)}</span>
          <span style="color:${sc};font-weight:700">${(p.stok || 0).toLocaleString('id-ID')} ${p.satuan}</span>
        </div>
        <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%;background:${sc}"></div></div>
      </div>
    </div>`;
    }).join('');
}

// ===== PRODUK =====
window.saveProduk = async (e) => {
    e.preventDefault();
    const id = document.getElementById('produk-edit-id').value;
    const data = {
        nama: document.getElementById('inp-pnama').value.trim(),
        satuan: document.getElementById('inp-psat').value,
        harga: parseFloat(document.getElementById('inp-phrg').value) || 0,
        stok: parseFloat(document.getElementById('inp-pstok').value) || 0,
        keterangan: document.getElementById('inp-pket').value.trim(),
        updatedAt: serverTimestamp()
    };
    try {
        if (id) {
            await updateDoc(doc(db, 'produk', id), data);
            showToast('Produk diperbarui ✅', 'success');
        } else {
            await addDoc(collection(db, 'produk'), { ...data, createdAt: serverTimestamp() });
            showToast('Produk ditambahkan ✅', 'success');
        }
        resetProdukForm();
    } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
};

window.editProduk = (id) => {
    const p = produkList.find(p => p.id === id);
    if (!p) return;
    document.getElementById('produk-edit-id').value = p.id;
    document.getElementById('inp-pnama').value = p.nama;
    document.getElementById('inp-psat').value = p.satuan;
    document.getElementById('inp-phrg').value = p.harga;
    document.getElementById('inp-pstok').value = p.stok;
    document.getElementById('inp-pket').value = p.keterangan || '';
    document.getElementById('produk-form-title').textContent = '✏️ Edit Produk';
    document.getElementById('btn-produk-submit').textContent = '💾 Update';
};

window.hapusProduk = (id) => {
    const p = produkList.find(p => p.id === id);
    bukaModal(`Hapus produk "<strong>${esc(p?.nama)}</strong>"?`, async () => {
        try { await deleteDoc(doc(db, 'produk', id)); showToast('Produk dihapus', 'success'); }
        catch (err) { showToast('Gagal: ' + err.message, 'error'); }
    });
};

window.resetProdukForm = () => {
    document.getElementById('form-produk').reset();
    document.getElementById('produk-edit-id').value = '';
    document.getElementById('produk-form-title').textContent = 'Tambah Produk';
    document.getElementById('btn-produk-submit').textContent = '💾 Simpan';
};

function renderProdukList() {
    const el = document.getElementById('list-produk');
    document.getElementById('badge-produk').textContent = produkList.length + ' produk';
    if (!produkList.length) { el.innerHTML = '<div class="empty-state"><span>📦</span><p>Belum ada produk</p></div>'; return; }
    el.innerHTML = produkList.map(p => {
        const stok = p.stok || 0;
        const sc = stokColor(stok);
        return `<div class="produk-item">
      <div class="produk-color">🌾</div>
      <div class="produk-info">
        <div class="produk-nama">${esc(p.nama)}${stokBadge(stok)}</div>
        <div class="produk-meta">${formatRupiah(p.harga)}/${p.satuan} &nbsp;·&nbsp; Stok: <strong style="color:${sc}">${stok.toLocaleString('id-ID')} ${p.satuan}</strong>${p.keterangan ? '&nbsp;·&nbsp;' + esc(p.keterangan) : ''}</div>
      </div>
      <div class="produk-actions">
        <button class="btn-icon edit" onclick="editProduk('${p.id}')">✏️</button>
        <button class="btn-icon del" onclick="hapusProduk('${p.id}')">🗑️</button>
      </div>
    </div>`;
    }).join('');
}

function renderFilterProduk() {
    const sel = document.getElementById('f-produk');
    const lap = document.getElementById('lap-penjual') ? null : null; // skip
    if (!sel) return;
    sel.innerHTML = '<option value="">Semua Produk</option>' +
        produkList.map(p => `<option value="${p.id}">${esc(p.nama)}</option>`).join('');
}

function renderFilterPenjual() {
    ['f-penjual', 'lap-penjual'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const penjual = usersList.filter(u => u.role === 'penjual');
        sel.innerHTML = '<option value="">Semua Penjual</option>' +
            penjual.map(u => `<option value="${u.id}">${esc(u.nama)}</option>`).join('');
    });
}

// ===== TRANSAKSI FILTER =====
let _displayedTrx = [];

window.filterTrx = () => {
    const nama = (document.getElementById('f-nama')?.value || '').toLowerCase();
    const penjual = document.getElementById('f-penjual')?.value || '';
    const produk = document.getElementById('f-produk')?.value || '';
    const dari = document.getElementById('f-dari')?.value || '';
    const sampai = document.getElementById('f-sampai')?.value || '';
    const status = document.getElementById('f-status')?.value || '';

    let data = [...transaksiList];
    if (nama) data = data.filter(t => t.nama?.toLowerCase().includes(nama));
    if (penjual) data = data.filter(t => t.penjualId === penjual);
    if (produk) data = data.filter(t => t.produkId === produk);
    if (dari) data = data.filter(t => t.tanggal >= dari);
    if (sampai) data = data.filter(t => t.tanggal <= sampai);
    if (status) data = data.filter(t => t.status === status);
    _displayedTrx = data;
    renderTrxTable(data);
};

window.resetFilter = () => {
    ['f-nama', 'f-penjual', 'f-produk', 'f-dari', 'f-sampai', 'f-status'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    filterTrx();
};

function renderTrxTable(data) {
    const tbody = document.getElementById('tbody-trx');
    const empty = document.getElementById('empty-trx');
    document.getElementById('badge-trx').textContent = data.length + ' catatan';
    tbody.parentElement.style.display = data.length ? '' : 'none';
    empty.style.display = data.length ? 'none' : 'block';

    tbody.innerHTML = data.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="white-space:nowrap">${formatDate(t.tanggal)}</td>
      <td class="text-muted">${esc(t.penjualNama || '-')}</td>
      <td class="font-bold">${esc(t.nama)}</td>
      <td>${esc(t.produkNama)}</td>
      <td>${parseFloat(t.qty).toLocaleString('id-ID')} ${t.satuan || ''}</td>
      <td class="text-muted">${formatRupiah(t.harga)}</td>
      <td class="text-green font-bold">${formatRupiah(t.total)}</td>
      <td><span class="status-badge ${t.status === 'Lunas' ? 'lunas' : 'belum'}">${esc(t.status)}</span></td>
      <td class="text-muted" style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${esc(t.catatan || '—')}</td>
      <td>
        <div style="display:flex;gap:4px">
          ${t.status !== 'Lunas' ? `<button class="btn btn-sm btn-primary" onclick="tandaiLunas('${t.id}')">✅</button>` : ''}
          <button class="btn-icon del" onclick="hapusTrx('${t.id}','${esc(t.nama)}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
}

window.tandaiLunas = async (id) => {
    try {
        await updateDoc(doc(db, 'transaksi', id), { status: 'Lunas' });
        showToast('Ditandai Lunas ✅', 'success');
    } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
};

window.hapusTrx = (id, nama) => {
    bukaModal(`Hapus transaksi atas nama "<strong>${nama}</strong>"?<br><small style="color:var(--amber);margin-top:6px;display:block">⚠️ Stok akan dikembalikan ke produk</small>`,
        async () => {
            try {
                // Kembalikan stok
                const snap = await getDoc(doc(db, 'transaksi', id));
                if (snap.exists()) {
                    const t = snap.data();
                    await runTransaction(db, async tx => {
                        const pRef = doc(db, 'produk', t.produkId);
                        const pDoc = await tx.get(pRef);
                        if (pDoc.exists()) tx.update(pRef, { stok: (pDoc.data().stok || 0) + (parseFloat(t.qty) || 0) });
                        tx.delete(doc(db, 'transaksi', id));
                    });
                }
                showToast('Dihapus — stok dikembalikan', 'success');
            } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
        });
};

// ===== LAPORAN =====
window.lapBulanIni = () => {
    const now = new Date(), y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    document.getElementById('lap-dari').value = `${y}-${m}-01`;
    document.getElementById('lap-sampai').value = `${y}-${m}-${String(last).padStart(2, '0')}`;
    renderLaporan();
};
window.lapTahunIni = () => {
    const y = new Date().getFullYear();
    document.getElementById('lap-dari').value = `${y}-01-01`;
    document.getElementById('lap-sampai').value = `${y}-12-31`;
    renderLaporan();
};

window.renderLaporan = () => {
    const dari = document.getElementById('lap-dari').value;
    const sampai = document.getElementById('lap-sampai').value;
    const penjual = document.getElementById('lap-penjual').value;

    let data = [...transaksiList];
    if (dari) data = data.filter(t => t.tanggal >= dari);
    if (sampai) data = data.filter(t => t.tanggal <= sampai);
    if (penjual) data = data.filter(t => t.penjualId === penjual);

    const lunas = data.filter(t => t.status === 'Lunas');
    const pemasukan = lunas.reduce((a, t) => a + (t.total || 0), 0);

    document.getElementById('lap-pemasukan').textContent = formatRupiah(pemasukan);
    document.getElementById('lap-jml').textContent = data.length;
    document.getElementById('lap-terjual').textContent = formatTotalPerSatuan(data);

    // Per produk
    const perP = {};
    data.forEach(t => {
        if (!perP[t.produkId]) perP[t.produkId] = { nama: t.produkNama, qty: 0, total: 0, satuan: t.satuan };
        if (t.status === 'Lunas') perP[t.produkId].total += t.total || 0;
        perP[t.produkId].qty += parseFloat(t.qty) || 0;
    });
    const rows = Object.values(perP);
    const tbody = document.getElementById('tbody-lap');
    const empty = document.getElementById('empty-lap');
    if (!rows.length) { tbody.innerHTML = ''; empty.style.display = 'block'; }
    else {
        empty.style.display = 'none';
        tbody.innerHTML = rows.map(r => `<tr>
      <td class="font-bold">🌾 ${esc(r.nama)}</td>
      <td>${r.qty.toLocaleString('id-ID')} ${r.satuan || ''}</td>
      <td class="text-green font-bold">${formatRupiah(r.total)}</td>
    </tr>`).join('');
    }

    // Belum lunas
    const bl = transaksiList.filter(t => t.status === 'Belum Lunas').sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const tbodyBL = document.getElementById('tbody-bl');
    const emptyBL = document.getElementById('empty-bl');
    if (!bl.length) { tbodyBL.innerHTML = ''; emptyBL.style.display = 'block'; }
    else {
        emptyBL.style.display = 'none';
        tbodyBL.innerHTML = bl.map(t => `<tr>
      <td>${formatDate(t.tanggal)}</td>
      <td class="text-muted">${esc(t.penjualNama || '-')}</td>
      <td class="font-bold">${esc(t.nama)}</td>
      <td>${esc(t.produkNama)}</td>
      <td class="text-amber font-bold">${formatRupiah(t.total)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="tandaiLunas('${t.id}')">✅ Tandai Lunas</button></td>
    </tr>`).join('');
    }
};

// ===== USERS =====
window.addUser = async (e) => {
    e.preventDefault();
    const nama = document.getElementById('inp-unama').value.trim();
    const email = document.getElementById('inp-uemail').value.trim();
    const pass = document.getElementById('inp-upass').value;
    const role = document.getElementById('inp-urole').value;

    try {
        // Buat akun Auth
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        // Simpan profil user di Firestore
        await setDoc(doc(db, 'users', cred.user.uid), { nama, email, role, createdAt: serverTimestamp() });
        showToast(`User "${nama}" berhasil ditambahkan ✅`, 'success');
        document.getElementById('form-user').reset();
    } catch (err) {
        let msg = err.message;
        if (err.code === 'auth/email-already-in-use') msg = 'Email sudah terdaftar.';
        showToast('Gagal: ' + msg, 'error');
    }
};

window.hapusUser = (id, nama) => {
    bukaModal(`Hapus user "<strong>${nama}</strong>"?<br><small style="color:var(--amber);margin-top:6px;display:block">⚠️ Data transaksinya tidak ikut terhapus</small>`,
        async () => {
            try { await deleteDoc(doc(db, 'users', id)); showToast('User dihapus', 'success'); }
            catch (err) { showToast('Gagal: ' + err.message, 'error'); }
        });
};

function renderUsersList() {
    const el = document.getElementById('list-users');
    if (!usersList.length) { el.innerHTML = '<div class="empty-state"><span>👥</span><p>Belum ada user</p></div>'; return; }
    el.innerHTML = usersList.map(u => `
    <div class="produk-item">
      <div class="user-avatar" style="flex-shrink:0">${(u.nama || '?')[0].toUpperCase()}</div>
      <div class="produk-info">
        <div class="produk-nama">${esc(u.nama)} <span class="role-badge ${u.role}" style="font-size:10px">${u.role}</span></div>
        <div class="produk-meta">${esc(u.email)}</div>
      </div>
      <div class="produk-actions">
        <button class="btn-icon del" onclick="hapusUser('${u.id}','${esc(u.nama)}')">🗑️</button>
      </div>
    </div>`).join('');
}
