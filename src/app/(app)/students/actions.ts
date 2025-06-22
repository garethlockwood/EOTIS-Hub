
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
      // .orderBy('name', 'asc') // Removed to prevent FAILED_PRECONDITION error. Sorting is now done on the client.
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
): Promise<{ success?: boolean; error?: string; student?: Student }> {
  if (!(await isAdmin(adminId))) {
    return { error: 'Permission denied. Only admins can create students.' };
  }

  const { name, email } = studentData;
  if (!name || !email) {
    return { error: 'Name and email are required to create a student.' };
  }
  
  try {
    const newStudentRef = dbAdmin.collection('students').doc();
    
    const newStudentData = {
      name,
      email,
      createdAt: Timestamp.now(),
      avatarURL: '',
      managedBy: adminId,
    };
    
    await newStudentRef.set(newStudentData);
    
    revalidatePath('/dashboard');
    revalidatePath('/ehcp');
    
    const createdStudent: Student = {
        id: newStudentRef.id,
        name: newStudentData.name,
        email: newStudentData.email,
        managedBy: newStudentData.managedBy,
        avatarUrl: newStudentData.avatarURL,
        createdAt: newStudentData.createdAt.toDate().toISOString()
    };

    return { success: true, student: createdStudent };
  } catch (error: any) {
    console.error('[createStudent] Error:', error);
    let errorMessage = 'Failed to create student record.';
    if (error.message) {
        errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}
