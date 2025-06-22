
'use server';

import type { User } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Only dbAdmin is needed, authAdmin is removed for student creation
const { dbAdmin } = await import('@/lib/firebase-admin');

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

    // Updated to reflect that students don't have auth-related properties
    const students = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        email: data.email,
        name: data.name || 'Unnamed Student',
        avatarUrl: data.avatarURL,
        isAdmin: data.isAdmin || false,
      } as User;
    });

    return { students };
  } catch (error: any) {
    console.error('[getManagedStudents] Error:', error);
    return { error: `Failed to fetch students: ${error.message}` };
  }
}


// Action to create a new student user record in Firestore only
export async function createStudent(
  adminId: string,
  studentData: { name: string; email: string; }
): Promise<{ success?: boolean; error?: string; studentId?: string }> {
  if (!(await isAdmin(adminId))) {
    return { error: 'Permission denied. Only admins can create students.' };
  }

  const { name, email } = studentData;
  if (!name || !email) {
    return { error: 'Name and email are required to create a student.' };
  }
  
  try {
    // Generate a new document reference in Firestore to get an ID
    const newStudentRef = dbAdmin.collection('users').doc();
    
    // Create user document in Firestore. No Firebase Auth user is created.
    await newStudentRef.set({
      name,
      email,
      isAdmin: false, // Students are never admins
      createdAt: Timestamp.now(),
      avatarURL: '', // Default empty avatar
    });
    
    // Invalidate caches to show the new student in lists
    revalidatePath('/dashboard');
    revalidatePath('/ehcp');
    
    return { success: true, studentId: newStudentRef.id };
  } catch (error: any) {
    console.error('[createStudent] Error:', error);
    let errorMessage = 'Failed to create student record.';
    if (error.message) {
        errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}
