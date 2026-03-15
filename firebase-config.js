// firebase-config.js — MenStyle
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5_2wx4pNKm_R0qYVHM4zBcfehKQsqiLw",
  authDomain: "menstyle-cb582.firebaseapp.com",
  projectId: "menstyle-cb582",
  storageBucket: "menstyle-cb582.firebasestorage.app",
  messagingSenderId: "603435098673",
  appId: "1:603435098673:web:74b644b41f322129bd2b10",
  measurementId: "G-BYV8DVTHY8"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export { db };
