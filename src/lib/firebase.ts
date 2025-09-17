// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVdkQNNZAWXamVsITY37XF7Msq9X1iyt8",
  authDomain: "cornerof-nyc.firebaseapp.com",
  projectId: "cornerof-nyc",
  storageBucket: "cornerof-nyc.firebasestorage.app",
  messagingSenderId: "410559076966",
  appId: "1:410559076966:web:1868eed42791340f6b6ba7"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore with default database
const db = getFirestore(app); // Uses default database
const storage = getStorage(app);

// Debug Firebase configuration
if (typeof window !== 'undefined') {
  console.log('🔥 Firebase Configuration Debug:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    currentDomain: window.location.hostname
  });
}

export { app, auth, db, storage, RecaptchaVerifier, signInWithPhoneNumber };
