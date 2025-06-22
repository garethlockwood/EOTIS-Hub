'use server';

import type { User } from '@/types';

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
