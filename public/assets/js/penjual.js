// ===== PENJUAL.JS — Dashboard Penjual =====
import { db, auth } from './firebase-config.js';
import {
    collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    formatRupiah, formatDate, todayStr, esc,
    showToast, showSection, updateDateBadge, bukaModal, tutupModal,
    toggleSidebar, stokBadge, stokColor
} from './shared.js';

// ===== STATE =====
let produkList = [];
let transaksiList = [];
let currentUser = null;
let unsubProduk, unsubTrx;

const PAGE_TITLES = {
    dashboard: 'Dashboard', catat: 'Catat Transaksi',
    riwayat: 'Riwayat Saya', stok: 'Stok Produk'
};

// ===== AUTH GUARD =====
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists() || snap.data().role !== 'penjual') {
        await signOut(auth);
        window.location.href = 'index.html';
        return;
    }
    currentUser = { uid: user.uid, email: user.email, ...snap.data() };
    document.getElementById('penjual-name').textContent = currentUser.nama || 'Penjual';
    document.getElementById('penjual-email').textContent = user.email;
    document.getElementById('penjual-avatar').textContent = (currentUser.nama || 'P')[0].toUpperCase();
    updateDateBadge();
    setInterval(updateDateBadge, 60000);
    setTodayDate();
    startListeners();
});

// ===== REAL-TIME LISTENERS =====
function startListeners() {
    // Produk (semua — read-only untuk penjual)
    unsubProduk = onSnapshot(collection(db, 'produk'), snap => {
        produkList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderProdukSelect();
        renderStokList();
    });

    // Transaksi milik penjual ini saja
    const q = query(
        collection(db, 'transaksi'),
        where('penjualId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
    );
    unsubTrx = onSnapshot(q, snap => {
        transaksiList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateDashboard();
        renderRecentTable();
        filterRiwayat();
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
    const today = todayStr();

    document.getElementById('s-pemasukan').textContent = formatRupiah(lunas.reduce((a, t) => a + (t.total || 0), 0));
    document.getElementById('s-transaksi').textContent = transaksiList.length;
    document.getElementById('s-today').textContent = transaksiList.filter(t => t.tanggal === today).length;
    document.getElementById('s-piutang').textContent = formatRupiah(belum.reduce((a, t) => a + (t.total || 0), 0));
}

function renderRecentTable() {
    const recent = transaksiList.slice(0, 5);
    const tbody = document.getElementById('tbody-recent');
    const empty = document.getElementById('empty-recent');
    tbody.parentElement.style.display = recent.length ? '' : 'none';
    empty.style.display = recent.length ? 'none' : 'block';
    tbody.innerHTML = recent.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatDate(t.tanggal)}</td>
      <td class="font-bold">${esc(t.nama)}</td>
      <td>${esc(t.produkNama)}</td>
      <td>${parseFloat(t.qty).toLocaleString('id-ID')} ${t.satuan || ''}</td>
      <td class="text-green font-bold">${formatRupiah(t.total)}</td>
      <td><span class="status-badge ${t.status === 'Lunas' ? 'lunas' : 'belum'}">${esc(t.status)}</span></td>
    </tr>`).join('');
}

// ===== CATAT TRANSAKSI =====
function setTodayDate() {
    const inp = document.getElementById('inp-tgl');
    if (inp) inp.value = todayStr();
}

function renderProdukSelect() {
    const sel = document.getElementById('inp-produk');
    if (!sel) return;
    const opts = produkList.map(p => {
        const stok = p.stok || 0;
        const habis = stok <= 0 ? ' — HABIS' : '';
        const stokInfo = `Stok: ${stok.toLocaleString('id-ID')} ${p.satuan}`;
        return `<option value="${p.id}" data-harga="${p.harga}" data-satuan="${p.satuan}" data-stok="${stok}"${stok <= 0 ? ' disabled' : ''}>
      ${esc(p.nama)} — ${formatRupiah(p.harga)}/${p.satuan} (${stokInfo}${habis})
    </option>`;
    }).join('');
    sel.innerHTML = '<option value="">-- Pilih Produk --</option>' + opts;
}

window.autoHarga = () => {
    const sel = document.getElementById('inp-produk');
    const opt = sel.options[sel.selectedIndex];
    if (opt?.dataset.harga) {
        document.getElementById('inp-harga').value = opt.dataset.harga;
        hitungTotal();
    }
};

window.hitungTotal = () => {
    const qty = parseFloat(document.getElementById('inp-qty').value) || 0;
    const harga = parseFloat(document.getElementById('inp-harga').value) || 0;
    document.getElementById('total-display').textContent = formatRupiah(qty * harga);
};

window.saveTrx = async (e) => {
    e.preventDefault();
    const id = document.getElementById('trx-edit-id').value;
    const tanggal = document.getElementById('inp-tgl').value;
    const nama = document.getElementById('inp-nama').value.trim();
    const produkId = document.getElementById('inp-produk').value;
    const qty = parseFloat(document.getElementById('inp-qty').value) || 0;
    const harga = parseFloat(document.getElementById('inp-harga').value) || 0;
    const status = document.getElementById('inp-status').value;
    const catatan = document.getElementById('inp-catatan').value.trim();

    if (!produkId) { showToast('Pilih produk!', 'error'); return; }
    const sel = document.getElementById('inp-produk');
    const opt = sel.options[sel.selectedIndex];
    const produkNama = opt ? opt.text.split(' — ')[0].trim() : '';
    const satuan = opt?.dataset.satuan || '';
    const total = qty * harga;

    try {
        if (id) {
            // MODE EDIT — rollback stok lama, deduct stok baru
            const oldSnap = await getDoc(doc(db, 'transaksi', id));
            if (!oldSnap.exists()) throw new Error('Transaksi tidak ditemukan');
            const old = oldSnap.data();

            await runTransaction(db, async tx => {
                const pOldRef = doc(db, 'produk', old.produkId);
                const pNewRef = doc(db, 'produk', produkId);
                const pOldDoc = await tx.get(pOldRef);
                const pNewDoc = await tx.get(pNewRef);

                // Validasi stok baru (setelah rollback)
                const stokSetelahRollback = (pOldDoc.id === pNewRef.id)
                    ? (pOldDoc.data()?.stok || 0) + (parseFloat(old.qty) || 0)
                    : (pNewDoc.data()?.stok || 0);

                if (stokSetelahRollback < qty) throw new Error(`Stok tidak cukup! Tersisa: ${stokSetelahRollback} ${satuan}`);

                // Rollback stok lama
                if (pOldDoc.exists()) tx.update(pOldRef, { stok: (pOldDoc.data().stok || 0) + (parseFloat(old.qty) || 0) });
                // Deduct stok baru
                const latestNew = await tx.get(pNewRef);
                if (latestNew.exists()) tx.update(pNewRef, { stok: (latestNew.data().stok || 0) - qty });
                // Update transaksi
                tx.update(doc(db, 'transaksi', id), { tanggal, nama, produkId, produkNama, satuan, qty, harga, total, status, catatan });
            });
            showToast('Catatan diperbarui ✅', 'success');
        } else {
            // MODE BARU — validasi stok lalu kurangi
            const pRef = doc(db, 'produk', produkId);
            await runTransaction(db, async tx => {
                const pDoc = await tx.get(pRef);
                if (!pDoc.exists()) throw new Error('Produk tidak ditemukan');
                const stokSisa = pDoc.data().stok || 0;
                if (stokSisa < qty) throw new Error(`Stok tidak cukup! Tersisa: ${stokSisa} ${satuan}`);
                tx.update(pRef, { stok: stokSisa - qty });
                tx.set(doc(collection(db, 'transaksi')), {
                    tanggal, nama, produkId, produkNama, satuan, qty, harga, total, status, catatan,
                    penjualId: currentUser.uid, penjualNama: currentUser.nama || currentUser.email,
                    createdAt: serverTimestamp()
                });
            });
            showToast(`Transaksi dicatat ✅  Stok berkurang ${qty} ${satuan}`, 'success');
        }
        resetCatat();
    } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
};

window.resetCatat = () => {
    document.getElementById('form-catat').reset();
    document.getElementById('trx-edit-id').value = '';
    document.getElementById('catat-title').textContent = 'Form Pencatatan';
    document.getElementById('total-display').textContent = 'Rp 0';
    setTodayDate();
};

// ===== RIWAYAT =====
window.filterRiwayat = () => {
    const nama = (document.getElementById('r-nama')?.value || '').toLowerCase();
    const dari = document.getElementById('r-dari')?.value || '';
    const sampai = document.getElementById('r-sampai')?.value || '';
    const status = document.getElementById('r-status')?.value || '';

    let data = [...transaksiList];
    if (nama) data = data.filter(t => t.nama?.toLowerCase().includes(nama));
    if (dari) data = data.filter(t => t.tanggal >= dari);
    if (sampai) data = data.filter(t => t.tanggal <= sampai);
    if (status) data = data.filter(t => t.status === status);

    document.getElementById('badge-riwayat').textContent = data.length + ' catatan';
    const tbody = document.getElementById('tbody-riwayat');
    const empty = document.getElementById('empty-riwayat');
    tbody.parentElement.style.display = data.length ? '' : 'none';
    empty.style.display = data.length ? 'none' : 'block';

    tbody.innerHTML = data.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="white-space:nowrap">${formatDate(t.tanggal)}</td>
      <td class="font-bold">${esc(t.nama)}</td>
      <td>${esc(t.produkNama)}</td>
      <td>${parseFloat(t.qty).toLocaleString('id-ID')} ${t.satuan || ''}</td>
      <td class="text-muted">${formatRupiah(t.harga)}</td>
      <td class="text-green font-bold">${formatRupiah(t.total)}</td>
      <td><span class="status-badge ${t.status === 'Lunas' ? 'lunas' : 'belum'}">${esc(t.status)}</span></td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn-icon edit" onclick="editTrx('${t.id}')">✏️</button>
          <button class="btn-icon del" onclick="hapusTrx('${t.id}','${esc(t.nama)}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
};

window.resetRiwayat = () => {
    ['r-nama', 'r-dari', 'r-sampai', 'r-status'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    filterRiwayat();
};

window.editTrx = (id) => {
    const t = transaksiList.find(t => t.id === id);
    if (!t) return;
    showSec('catat');
    document.getElementById('trx-edit-id').value = t.id;
    document.getElementById('inp-tgl').value = t.tanggal;
    document.getElementById('inp-nama').value = t.nama;
    document.getElementById('inp-produk').value = t.produkId;
    document.getElementById('inp-qty').value = t.qty;
    document.getElementById('inp-harga').value = t.harga;
    document.getElementById('inp-status').value = t.status;
    document.getElementById('inp-catatan').value = t.catatan || '';
    document.getElementById('catat-title').textContent = '✏️ Edit Catatan';
    hitungTotal();
};

window.hapusTrx = (id, nama) => {
    bukaModal(`Hapus catatan atas nama "<strong>${nama}</strong>"?<br><small style="color:var(--amber);display:block;margin-top:6px">⚠️ Stok akan dikembalikan</small>`,
        async () => {
            try {
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

// ===== STOK VIEW =====
function renderStokList() {
    const el = document.getElementById('list-stok');
    const bdg = document.getElementById('badge-stok');
    if (bdg) bdg.textContent = produkList.length + ' produk';
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
    </div>`;
    }).join('');
}
