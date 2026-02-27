// ================================================================
// KONFIGURASI FIREBASE
// ================================================================
// LANGKAH SETUP:
// 1. Buka https://console.firebase.google.com
// 2. Klik "Add project" → beri nama (misal: beras-zakat)
// 3. Setelah project dibuat, klik ikon Web (</>)
// 4. Daftarkan app → salin nilai dari firebaseConfig ke sini
// 5. Di Firebase Console → Build → Firestore Database → Create database
// 6. Di Firebase Console → Build → Authentication → Sign-in method → Email/Password → Enable
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ⬇️ GANTI DENGAN KONFIGURASI FIREBASE ANDA
const firebaseConfig = {
    apiKey: "AIzaSyCQ3Axgi8uR4jCwy1BzIizT0QspOma0sQ4",
    authDomain: "zakatapp-v1.firebaseapp.com",
    projectId: "zakatapp-v1",
    storageBucket: "zakatapp-v1.firebasestorage.app",
    messagingSenderId: "64879688270",
    appId: "1:64879688270:web:1be8def2024e9d2cfc211f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
