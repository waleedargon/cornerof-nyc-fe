// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Firebase products are already configured below

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBc68gxtE_YZLwfzeXEWJA5XY1BSJyrZ0",
  authDomain: "cornerof-nyc-a5faf.firebaseapp.com",
  projectId: "cornerof-nyc-a5faf",
  storageBucket: "cornerof-nyc-a5faf.firebasestorage.app",
  messagingSenderId: "648028746747",
  appId: "1:648028746747:web:9e2242c864fc1a12a0d15e"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore with default database
const db = getFirestore(app); // Uses default database
const storage = getStorage(app);


export { app, auth, db, storage, RecaptchaVerifier, signInWithPhoneNumber };
