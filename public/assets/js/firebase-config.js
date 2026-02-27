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
    apiKey: "AIzaSyA2CqwUOfVWOgzfpfhTp8LPyEt4hL3E13g",
    authDomain: "beras-zakat.firebaseapp.com",
    projectId: "beras-zakat",
    storageBucket: "beras-zakat.firebasestorage.app",
    messagingSenderId: "165052635514",
    appId: "1:165052635514:web:054292759dc93edcc05ec3",
    measurementId: "G-HD4DHGQ8LB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
