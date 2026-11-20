import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TERI_API_KEY",
  authDomain: "TERA_AUTH_DOMAIN",
  projectId: "TERA_PROJECT_ID",
  storageBucket: "TERA_STORAGE_BUCKET",
  messagingSenderId: "TERA_MESSAGING_ID",
  appId: "TERA_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
