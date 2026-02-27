// ===== SHARED UTILITIES =====
// Digunakan bersama oleh admin.js dan penjual.js

export function formatRupiah(n) {
    return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayStr() {
    return new Date().toISOString().split('T')[0];
}

export function formatTotalPerSatuan(list) {
    const per = {};
    list.forEach(t => {
        const sat = t.satuan || 'kg';
        per[sat] = (per[sat] || 0) + (parseFloat(t.qty) || 0);
    });
    const parts = Object.entries(per).map(([sat, qty]) => qty.toLocaleString('id-ID') + ' ' + sat);
    return parts.length ? parts.join(' · ') : '0';
}

export function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

let _toastTimer;
export function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

export function showSection(name, pageTitleMap) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const sec = document.getElementById('section-' + name);
    const nav = document.getElementById('nav-' + name);
    if (sec) sec.classList.add('active');
    if (nav) nav.classList.add('active');
    const titleEl = document.getElementById('pageTitle');
    if (titleEl && pageTitleMap) titleEl.textContent = pageTitleMap[name] || name;
    if (window.innerWidth < 900) {
        document.getElementById('sidebar')?.classList.remove('open');
    }
}

export function updateDateBadge() {
    const el = document.getElementById('dateBadge');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

let _onKonfirm = null;
export function bukaModal(pesan, onOk) {
    document.getElementById('modal-hapus-pesan').innerHTML = pesan;
    document.getElementById('modal-hapus').classList.add('open');
    _onKonfirm = onOk;
    document.getElementById('btn-konfirm-hapus').onclick = () => {
        tutupModal('modal-hapus');
        if (_onKonfirm) _onKonfirm();
    };
}
export function tutupModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

export function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
}

export function stokBadge(stok, satuan) {
    if (stok <= 0) return `<span style="background:rgba(239,68,68,.15);color:#ef4444;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:6px">● HABIS</span>`;
    if (stok <= 10) return `<span style="background:rgba(245,158,11,.15);color:var(--amber);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:6px">⚠ Stok Rendah</span>`;
    return '';
}

export function stokColor(stok) {
    return stok <= 0 ? '#ef4444' : stok <= 10 ? 'var(--amber)' : 'var(--green-400)';
}
