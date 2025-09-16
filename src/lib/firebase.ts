// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyHpg_Eo3uxbhAmg1e33nX_Kk-GGtZwGs",
  authDomain: "group-vibe-chatroom.firebaseapp.com",
  projectId: "group-vibe-chatroom",
  storageBucket: "group-vibe-chatroom.firebasestorage.app",
  messagingSenderId: "768552762158",
  appId: "1:768552762158:web:57ef6c9b134404e10358bf"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
