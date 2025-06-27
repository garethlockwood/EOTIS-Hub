
'use server';

import type { StaffMember } from '@/types';
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
    console.error(`[isAdmin check in staff/actions] Error for UID ${uid}:`, error);
    return false;
  }
}

// Fetches all staff members associated with a specific student
export async function getStaffForStudent(
  studentId: string
): Promise<{ staff?: StaffMember[]; error?: string }> {
  if (!studentId) {
    return { error: 'A student must be selected.' };
  }

  try {
    const snapshot = await dbAdmin
      .collection('staff')
      .where('studentIds', 'array-contains', studentId)
      .get();
    
    if (snapshot.empty) {
      return { staff: [] };
    }

    const staffList = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data
      } as StaffMember;
    });

    // Sort in-memory to avoid needing a composite index
    staffList.sort((a, b) => a.name.localeCompare(b.name));

    return { staff: staffList };
  } catch (error: any) {
    console.error('[getStaffForStudent] Error:', error);
    return { error: `Failed to fetch staff: ${error.message}` };
  }
}

// Action to create a new staff member record
export async function addStaffMember(
  staffData: Omit<StaffMember, 'id'>,
  adminId: string,
): Promise<{ success?: boolean; error?: string; staffMember?: StaffMember }> {
    if (!(await isAdmin(adminId))) {
        return { error: 'Permission denied. Only admins can add staff.' };
    }

    if (!staffData || !staffData.name || !staffData.type || !staffData.studentIds) {
        return { error: 'Missing required staff data: name, type, and student association.' };
    }

    try {
        const newStaffRef = dbAdmin.collection('staff').doc();
        
        const newStaffData = {
          ...staffData,
          // Use a placeholder avatar. Avatar upload is a separate feature.
          avatarUrl: staffData.avatarUrl || 'https://placehold.co/100x100.png',
          dataAiHint: staffData.dataAiHint || (staffData.type === 'Tutor' ? 'teacher person' : 'professional person'),
        };
        
        await newStaffRef.set(newStaffData);
        
        revalidatePath('/staff');
        
        const createdStaffMember: StaffMember = {
            id: newStaffRef.id,
            ...newStaffData
        };

        return { success: true, staffMember: createdStaffMember };

    } catch (error: any) {
        console.error('[addStaffMember] Error:', error);
        return { error: `Failed to create staff member: ${error.message}` };
    }
}

// Fetches just the names of all tutors
export async function getTutorNames(): Promise<{ tutors?: string[]; error?: string }> {
  try {
    const snapshot = await dbAdmin
      .collection('staff')
      .where('type', '==', 'Tutor')
      .get();
    
    if (snapshot.empty) {
      return { tutors: [] };
    }
    
    const tutors = snapshot.docs.map(doc => doc.data().name as string);

    // Sort in-memory
    tutors.sort((a, b) => a.localeCompare(b));

    return { tutors };
  } catch (error: any) {
     console.error('[getTutorNames] Error:', error);
    return { error: `Failed to fetch tutors: ${error.message}` };
  }
}
