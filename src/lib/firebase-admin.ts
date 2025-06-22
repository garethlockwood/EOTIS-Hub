
// src/lib/firebase-admin.ts
import 'dotenv/config'; // ✅ Ensure .env loads in CLI + runtime
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// ✅ Load and validate required environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

console.log('🔎 FIREBASE_PROJECT_ID:', projectId);
console.log('🔎 FIREBASE_CLIENT_EMAIL:', clientEmail);
console.log('🔎 FIREBASE_PRIVATE_KEY exists:', !!privateKey);
console.log('🔎 FIREBASE_STORAGE_BUCKET:', storageBucket);

// ✅ Guard clause: fail fast if required values are missing
if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  throw new Error('❌ Missing one or more required Firebase Admin environment variables. Check your .env file.');
}

// ✅ Initialize Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });
}

// ✅ Export Firestore and Storage instances
const dbAdmin = getFirestore();
const storageAdmin = getStorage();
const authAdmin = getAuth();


// ✅ Log the actual bucket name
const actualBucketName = storageAdmin.bucket().name;
if (!actualBucketName || !actualBucketName.includes('.appspot.com')) {
  console.warn('⚠️ FIREBASE_STORAGE_BUCKET may be incorrect. Using bucket:', actualBucketName);
} else {
  console.log('✅ Admin SDK Storage Bucket:', actualBucketName);
}

export { dbAdmin, storageAdmin, authAdmin };
