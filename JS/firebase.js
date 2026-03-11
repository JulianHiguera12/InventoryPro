import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-ZARWaAbERL9plwO2ysiovskHjTMwFWQ",
  authDomain: "inventorypro-54bc5.firebaseapp.com",
  projectId: "inventorypro-54bc5",
  storageBucket: "inventorypro-54bc5.firebasestorage.app",
  messagingSenderId: "245090565226",
  appId: "1:245090565226:web:685a1a9c99485afe1dde13"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

