// src/lib/print-env.ts

export function printFirebaseEnvVars() {
    console.log('🟡 Firebase Environment Variables:');
    console.log('-----------------------------------');
    console.log('FIREBASE_PROJECT_ID:         ', process.env.FIREBASE_PROJECT_ID);
    console.log('FIREBASE_CLIENT_EMAIL:       ', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('FIREBASE_STORAGE_BUCKET:     ', process.env.FIREBASE_STORAGE_BUCKET);
    console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    console.log('-----------------------------------\n');
  }
  