import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCvvnG3BExrwHTtgqRtoyJK1Dxnr2ljoF4",
  authDomain: "smart-journel.firebaseapp.com",
  projectId: "smart-journel",
  storageBucket: "smart-journel.firebasestorage.app",
  messagingSenderId: "951559141981",
  appId: "1:951559141981:web:e7f31e8ce333c769702bb4",
  measurementId: "G-HGQZQJ60EG"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
