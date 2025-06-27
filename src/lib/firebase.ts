
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Log whether environment variables appear to be loaded
console.log("Firebase Config Values Loaded in src/lib/firebase.ts (check your .env file and restart server if MISSING):");
console.log("API Key:", firebaseConfigValues.apiKey ? "Loaded" : "MISSING or undefined");
console.log("Auth Domain:", firebaseConfigValues.authDomain ? "Loaded" : "MISSING or undefined");
console.log("Project ID:", firebaseConfigValues.projectId ? "Loaded" : "MISSING or undefined");
console.log("Storage Bucket:", firebaseConfigValues.storageBucket ? "Loaded" : "MISSING or undefined");
console.log("Messaging Sender ID:", firebaseConfigValues.messagingSenderId ? "Loaded" : "MISSING or undefined");
console.log("App ID:", firebaseConfigValues.appId ? "Loaded" : "MISSING or undefined");

// Explicitly check for essential config values before initializing
if (!firebaseConfigValues.apiKey || !firebaseConfigValues.authDomain || !firebaseConfigValues.projectId) {
  const missingKeys = [];
  if (!firebaseConfigValues.apiKey) missingKeys.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfigValues.authDomain) missingKeys.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfigValues.projectId) missingKeys.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  
  const errorMessage = `Firebase configuration is missing: ${missingKeys.join(', ')}. Please check your .env file and ensure it's in the project root and you've restarted the Next.js server.`;
  console.error(errorMessage);
  // In a client-side context, you might throw this error to stop execution.
  // In a server-side module loaded at startup, this console error might be the primary indicator.
  // For Next.js, this will likely prevent the app from starting correctly or cause errors when Firebase is first used.
  if (typeof window !== 'undefined') {
    // If on client-side, throw error to make it more visible
    throw new Error(errorMessage);
  } else {
    // On server-side, this module might load, but subsequent Firebase calls will fail.
    // The console error above is key.
  }
}

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
const auth = getAuth(app);
const functions = getFunctions(app);

export { db, storage, auth, functions };
