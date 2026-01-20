
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Use a more robust import method to avoid resolution issues with firestore exports
import * as firestore from "firebase/firestore";

const { getFirestore } = firestore as any;

const firebaseConfig = {
  apiKey: "AIzaSyDbZwrKoVd1iaoZRfquW1L4JA78t19D4K8",
  authDomain: "tagfindrt.firebaseapp.com",
  projectId: "tagfindrt",
  storageBucket: "tagfindrt.firebasestorage.app",
  messagingSenderId: "395358413628",
  appId: "1:395358413628:web:2559a57a724503a406b439"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;