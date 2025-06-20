// src/lib/print-admin-env.ts
import { storageAdmin } from './firebase-admin';

console.log('🧪 FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('🧪 FIREBASE_STORAGE_BUCKET (.env):', process.env.FIREBASE_STORAGE_BUCKET);
console.log('🧪 Firebase Admin Bucket:', storageAdmin.bucket().name);
