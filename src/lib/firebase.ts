import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9zDAHVgka5Ldg9mBDdY1nZGh_7PUZFu4",
  authDomain: "blood-line-52ffb.firebaseapp.com",
  projectId: "blood-line-52ffb",
  storageBucket: "blood-line-52ffb.firebasestorage.app",
  messagingSenderId: "1091788647434",
  appId: "1:1091788647434:web:de479715264ac2e82c03f3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
