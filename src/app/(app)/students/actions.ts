
'use server';

import type { Student } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

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

// Fetches all students managed by a specific admin
export async function getManagedStudents(
  adminId: string
): Promise<{ students?: Student[]; error?: string }> {
  if (!(await isAdmin(adminId))) {
    return { error: 'Permission denied. Only admins can view the student list.' };
  }

  try {
    const snapshot = await dbAdmin
      .collection('students') // Query the 'students' collection
      .where('managedBy', '==', adminId)
      .orderBy('name', 'asc')
      .get();

    if (snapshot.empty) {
      return { students: [] };
    }

    const students = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const createdAt = data.createdAt as Timestamp;
      return {
        id: docSnap.id,
        email: data.email,
        name: data.name || 'Unnamed Student',
        avatarUrl: data.avatarURL,
        managedBy: data.managedBy,
        createdAt: createdAt.toDate().toISOString(),
      } as Student;
    });

    return { students };
  } catch (error: any) {
    console.error('[getManagedStudents] Error:', error);
    return { error: `Failed to fetch students: ${error.message}` };
  }
}


// Action to create a new student record in the 'students' collection
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
    // Generate a new document reference in the 'students' collection
    const newStudentRef = dbAdmin.collection('students').doc();
    
    // Create the student document in the 'students' collection
    await newStudentRef.set({
      name,
      email,
      createdAt: Timestamp.now(),
      avatarURL: '', // Default empty avatar
      managedBy: adminId, // Link the student to the creating admin
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
