
'use server';

import type { FinancialDocument } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const { dbAdmin, storageAdmin } = await import('@/lib/firebase-admin');
const bucket = storageAdmin.bucket();


// Fetches all financial documents for a specific student
export async function getFinancialDocuments(
  studentId: string
): Promise<{ documents?: FinancialDocument[]; error?: string }> {
  if (!studentId) {
    return { error: 'A student must be selected.' };
  }

  try {
    const snapshot = await dbAdmin
      .collection('financialDocuments')
      // For now, sorting by uploadDate descending. Create an index if prompted.
      .where('studentId', '==', studentId)
      .orderBy('uploadDate', 'desc')
      .get();
    
    if (snapshot.empty) {
      return { documents: [] };
    }

    const documents = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        type: data.type,
        uploadDate: (data.uploadDate as Timestamp).toDate().toISOString(),
        fileUrl: data.fileUrl,
        storagePath: data.storagePath,
        amount: data.amount,
        status: data.status,
        uploaderUid: data.uploaderUid,
        studentId: data.studentId,
      } as FinancialDocument;
    });

    return { documents };
  } catch (error: any) {
    console.error('[getFinancialDocuments] Error:', error);
    if (error.code === 'FAILED_PRECONDITION') {
        return { error: 'Firestore index required. Please create an index on (studentId ASC, uploadDate DESC) in the `financialDocuments` collection.' };
    }
    return { error: `Failed to fetch financial documents: ${error.message}` };
  }
}


// Action to delete a financial document
export async function deleteFinancialDocument(
    docId: string,
    storagePath: string | undefined, // storagePath can be optional for docs without files
    adminId: string
): Promise<{ success?: boolean; error?: string }> {
    
    // Admin check
    try {
        const userDoc = await dbAdmin.collection('users').doc(adminId).get();
        if (!userDoc.exists || !userDoc.data()?.isAdmin) {
            return { error: 'Permission denied. Only admins can delete documents.' };
        }
    } catch(e) {
        console.error('Admin check failed during financial doc deletion', e);
        return { error: 'Could not verify user permissions.' };
    }

    if (!docId) {
        return { error: 'Document ID is required for deletion.' };
    }

    try {
        // Delete from storage if path exists
        if (storagePath) {
            try {
                await bucket.file(storagePath).delete();
                console.log(`[deleteFinancialDocument] Deleted from storage: ${storagePath}`);
            } catch (err: any) {
                // If file doesn't exist in storage, we can still delete the DB record.
                if (err.code === 404) {
                    console.warn(`[deleteFinancialDocument] File not found in storage at ${storagePath}. Proceeding with Firestore delete.`);
                } else {
                    // For other storage errors, we might want to stop.
                    throw err;
                }
            }
        }

        // Delete from Firestore
        await dbAdmin.collection('financialDocuments').doc(docId).delete();
        revalidatePath('/finances');
        return { success: true };

    } catch (error: any) {
        console.error('[deleteFinancialDocument] Error:', error);
        return { error: `Failed to delete document: ${error.message}` };
    }
}
