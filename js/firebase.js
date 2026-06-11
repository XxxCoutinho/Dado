import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDnHSWDVyknhU0V4JwIOLiSlEX2U2T3Hu8",
  authDomain: "dado-1d5f1.firebaseapp.com",
  projectId: "dado-1d5f1",
  storageBucket: "dado-1d5f1.firebasestorage.app",
  messagingSenderId: "401639555884",
  appId: "1:401639555884:web:955de92edaff9738832289",
  measurementId: "G-2G84QZ4V21"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
