
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Ensure getAuth is imported
import { getStorage } from 'firebase/storage';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

console.log("Firebase Config Values Loaded in src/lib/firebase.ts:");
console.log("API Key:", firebaseConfigValues.apiKey ? "Loaded" : "MISSING or undefined");
console.log("Auth Domain:", firebaseConfigValues.authDomain ? "Loaded" : "MISSING or undefined");
console.log("Project ID:", firebaseConfigValues.projectId ? "Loaded" : "MISSING or undefined");
console.log("Storage Bucket:", firebaseConfigValues.storageBucket ? "Loaded" : "MISSING or undefined");
console.log("Messaging Sender ID:", firebaseConfigValues.messagingSenderId ? "Loaded" : "MISSING or undefined");
console.log("App ID:", firebaseConfigValues.appId ? "Loaded" : "MISSING or undefined");


const firebaseConfig: FirebaseOptions = firebaseConfigValues;

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // Initialize and export auth

export { db, storage, auth }; // Export auth
