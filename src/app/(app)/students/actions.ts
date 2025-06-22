
'use server';

import type { User } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const { dbAdmin, authAdmin } = await import('@/lib/firebase-admin');

// Function to check if a user is an admin
async function isAdmin(uid: string | undefined): Promise<boolean> {
  if (!uid) return false;
  try {
    const userDocRef = dbAdmin.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    return userDocSnap.exists && userDocSnap.data()?.isAdmin === true;
  } catch (error) {
    console.error(`[isAdmin check in students/actions] Error for UID ${uid}:`, error);
    return false;
  }
}

// Fetches all non-admin users (i.e., students) if the requesting user is an admin
export async function getManagedStudents(
  adminId: string
): Promise<{ students?: User[]; error?: string }> {
  if (!(await isAdmin(adminId))) {
    return { error: 'Permission denied. Only admins can view the student list.' };
  }

  try {
    const snapshot = await dbAdmin
      .collection('users')
      .where('isAdmin', '==', false)
      .orderBy('name', 'asc')
      .get();

    if (snapshot.empty) {
      return { students: [] };
    }

    const students = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        email: data.email,
        name: data.name || 'Unnamed Student',
        avatarUrl: data.avatarURL,
        mustChangePassword: data.mustChangePassword || false,
        isMfaEnabled: data.isMfaEnabled || false,
        isAdmin: data.isAdmin || false,
      } as User;
    });

    return { students };
  } catch (error: any) {
    console.error('[getManagedStudents] Error:', error);
    return { error: `Failed to fetch students: ${error.message}` };
  }
}


// Action to create a new student user
export async function createStudent(
  adminId: string,
  studentData: { name: string; email: string; password?: string }
): Promise<{ success?: boolean; error?: string; studentId?: string }> {
  if (!(await isAdmin(adminId))) {
    return { error: 'Permission denied. Only admins can create students.' };
  }

  const { name, email, password } = studentData;
  if (!name || !email) {
    return { error: 'Name and email are required to create a student.' };
  }
  
  // A secure, random password. The user will be forced to change it.
  const tempPassword = password || Math.random().toString(36).slice(-8);

  try {
    // Create user in Firebase Auth
    const userRecord = await authAdmin.createUser({
      email,
      password: tempPassword,
      displayName: name,
      emailVerified: true, 
    });
    
    // Create user document in Firestore
    await dbAdmin.collection('users').doc(userRecord.uid).set({
      name,
      email,
      isAdmin: false,
      mustChangePassword: true, // Force password change on first login
      createdAt: Timestamp.now(),
      avatarURL: '', // Default empty avatar
      isMfaEnabled: false,
    });
    
    // Invalidate caches to show the new student in lists
    revalidatePath('/dashboard');
    
    return { success: true, studentId: userRecord.uid };
  } catch (error: any) {
    console.error('[createStudent] Error:', error);
    let errorMessage = 'Failed to create student.';
    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'A user with this email address already exists.';
    } else if (error.message) {
        errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}
