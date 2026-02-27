# Beras Zakat — Sistem Pencatatan Penjualan Online

Aplikasi web real-time untuk mencatat penjualan beras zakat berbasis Firebase (Firestore + Authentication + Hosting).

---

## 📁 Struktur Folder

```
zakatApp.v.1/
├── public/                     ← File web (Firebase Hosting)
│   ├── index.html              ← Halaman login
│   ├── admin.html              ← Dashboard admin
│   ├── penjual.html            ← Dashboard penjual
│   └── assets/
│       ├── css/
│       │   └── style.css       ← Global stylesheet
│       └── js/
│           ├── firebase-config.js  ← Konfigurasi koneksi Firebase
│           ├── shared.js           ← Utilitas bersama (format, toast, modal)
│           ├── admin.js            ← Logika halaman admin
│           └── penjual.js          ← Logika halaman penjual
├── firestore.rules             ← Security rules Firestore
├── firebase.json               ← Konfigurasi Firebase Hosting
├── .firebaserc                 ← Alias project Firebase
└── README.md
```

---

## ✨ Fitur

- **Login** berbasis Firebase Authentication (email & password)
- **Role Admin**: kelola produk, kelola user, lihat semua transaksi, laporan & cetak
- **Role Penjual**: catat transaksi, riwayat pribadi, pantau stok
- **Real-time**: data sinkron otomatis di semua perangkat via Firestore
- **Stok otomatis**: berkurang saat transaksi dicatat, kembali saat dihapus

---

## 🚀 Setup & Deployment

### 1. Konfigurasi Firebase
Edit `public/assets/js/firebase-config.js` dan isi dengan konfigurasi project Firebase Anda.

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 3. Deploy ke Firebase Hosting
```bash
firebase deploy --only hosting
```

### 4. Buat Akun Admin Pertama
- Buka Firebase Console → **Authentication** → **Add user**
- Buka **Firestore** → koleksi `users` → tambah dokumen dengan ID = UID admin
  ```json
  {
    "email": "admin@email.com",
    "nama": "Administrator",
    "role": "admin"
  }
  ```

---

## 🛠️ Teknologi

| Teknologi | Kegunaan |
|---|---|
| HTML + CSS + JS (Vanilla) | Frontend |
| Firebase Authentication | Login & manajemen user |
| Cloud Firestore | Database real-time |
| Firebase Hosting | Hosting web |

---

## 📝 Lisensi

MIT License — bebas digunakan dan dimodifikasi.
