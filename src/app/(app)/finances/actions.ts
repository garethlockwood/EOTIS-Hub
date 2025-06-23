
'use server';

import type { FinancialDocument } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { tmpdir } from 'os';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const { dbAdmin, storageAdmin } = await import('@/lib/firebase-admin');
const bucket = storageAdmin.bucket();

async function isAdmin(uid: string | undefined): Promise<boolean> {
  if (!uid) return false;
  try {
    const userDocRef = dbAdmin.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    return userDocSnap.exists && userDocSnap.data()?.isAdmin === true;
  } catch (error) {
    console.error(`[isAdmin check in finances/actions] Error for UID ${uid}:`, error);
    return false;
  }
}

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

// Action to add a new financial document
export async function addFinancialDocument(
  formData: FormData,
  adminId: string
): Promise<{ success?: boolean; error?: string; document?: FinancialDocument }> {
  if (!(await isAdmin(adminId))) {
    return { error: 'Permission denied. Only admins can add documents.' };
  }

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const type = formData.get('type') as FinancialDocument['type'] | null;
  const amount = formData.get('amount') as string | null;
  const status = formData.get('status') as FinancialDocument['status'] | null;
  const studentId = formData.get('studentId') as string | null;
  
  if (!name || !type || !status || !studentId) {
    return { error: 'Missing required fields: name, type, status, and student association are required.' };
  }
  
  const newDocRef = dbAdmin.collection('financialDocuments').doc();
  let fileUrl: string | undefined;
  let storagePath: string | undefined;

  try {
    if (file && file.size > 0) {
      storagePath = `financial_documents/${newDocRef.id}/${file.name}`;
      const tempFilePath = path.join(tmpdir(), file.name);
      
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(tempFilePath, buffer);
      
      await bucket.upload(tempFilePath, {
        destination: storagePath,
        contentType: file.type,
      });
      
      await unlink(tempFilePath);

      [fileUrl] = await bucket.file(storagePath).getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
      });
    }

    const uploaderDoc = await dbAdmin.collection('users').doc(adminId).get();
    const uploaderName = uploaderDoc.exists ? uploaderDoc.data()?.name || 'Admin' : 'Admin';

    const newDocData: Omit<FinancialDocument, 'id' | 'uploadDate'> & { uploadDate: Timestamp } = {
        name,
        type,
        status,
        studentId,
        uploaderUid: adminId,
        amount: amount ? parseFloat(amount) : undefined,
        fileUrl,
        storagePath,
        uploadDate: Timestamp.now(),
    };

    await newDocRef.set(newDocData);
    revalidatePath('/finances');

    const returnedDocument: FinancialDocument = {
      ...newDocData,
      id: newDocRef.id,
      uploadDate: newDocData.uploadDate.toDate().toISOString(),
    };

    return { success: true, document: returnedDocument };

  } catch (error: any) {
    console.error('[addFinancialDocument] Error:', error);
    return { error: `Failed to add document: ${error.message}` };
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
