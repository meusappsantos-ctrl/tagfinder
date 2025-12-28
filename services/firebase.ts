
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do novo projeto Firebase (tagfindrt)
const firebaseConfig = {
  apiKey: "AIzaSyDbZwrKoVd1iaoZRfquW1L4JA78t19D4K8",
  authDomain: "tagfindrt.firebaseapp.com",
  projectId: "tagfindrt",
  storageBucket: "tagfindrt.firebasestorage.app",
  messagingSenderId: "395358413628",
  appId: "1:395358413628:web:2559a57a724503a406b439"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
