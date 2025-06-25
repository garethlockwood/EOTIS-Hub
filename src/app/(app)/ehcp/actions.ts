
'use server';

import { Timestamp } from 'firebase-admin/firestore';
import type { EHCPDocument } from '@/types';
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
    console.error(`[isAdmin] Error checking admin status for UID ${uid}:`, error);
    return false;
  }
}

export async function getEhcpDocuments(
  studentId: string
): Promise<{ documents?: EHCPDocument[]; error?: string }> {
  if (!studentId || typeof studentId !== 'string' || studentId.trim() === '') {
    return { error: 'Invalid user identifier.' };
  }

  try {
    const snapshot = await dbAdmin
      .collection('ehcpDocuments')
      .where('associatedUserId', '==', studentId)
      .orderBy('uploadDate', 'desc')
      .get();

    const documents = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        docId: docSnap.id,
        name: data.name,
        uploadDate: data.uploadDate.toDate().toISOString(),
        status: data.status,
        fileUrl: data.fileUrl,
        storagePath: data.storagePath,
        fileType: data.fileType,
        description: data.description,
        uploaderUid: data.uploaderUid,
        uploaderName: data.uploaderName,
        originalFileName: data.originalFileName,
        associatedUserId: data.associatedUserId,
      } as EHCPDocument;
    });
    return { documents };
  } catch (error: any) {
    console.error('[getEhcpDocuments] Error:', error);
    return { error: `Failed to fetch documents: ${error.message}` };
  }
}

export async function addEhcpDocument(
  formData: FormData,
  actingAdminUserId: string
): Promise<{ success?: boolean; error?: string; document?: EHCPDocument }> {
  if (!actingAdminUserId || !(await isAdmin(actingAdminUserId))) {
    return { error: 'Admin privileges required.' };
  }

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as 'Current' | 'Previous' | null;
  const associatedUserId = formData.get('associatedUserId') as string | null;

  if (!file || !name || !status || !associatedUserId) {
    return { error: 'Missing required fields.' };
  }

  const newDocRef = dbAdmin.collection('ehcpDocuments').doc();
  const storagePath = `ehcp_documents/${newDocRef.id}/${file.name}`;
  const tempFilePath = path.join(tmpdir(), file.name);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`📁 Uploading "${file.name}" to ${storagePath} (${buffer.length} bytes)`);

    await writeFile(tempFilePath, buffer);

    await bucket.upload(tempFilePath, {
      destination: storagePath,
      contentType: file.type,
    });

    await unlink(tempFilePath);

    const [downloadURL] = await bucket.file(storagePath).getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // Far future date
    });

    const uploaderDoc = await dbAdmin.collection('users').doc(actingAdminUserId).get();
    const uploaderName = uploaderDoc.exists
      ? uploaderDoc.data()?.name || uploaderDoc.data()?.email || 'Admin'
      : 'Admin';

    const newDocData = {
      name,
      description: description || '',
      status,
      fileUrl: downloadURL,
      storagePath,
      fileType: file.type.includes('pdf') ? 'pdf' : 'docx',
      uploaderUid: actingAdminUserId,
      uploaderName,
      originalFileName: file.name,
      uploadDate: Timestamp.now(),
      associatedUserId,
      docId: newDocRef.id,
    };

    await newDocRef.set(newDocData);
    revalidatePath('/ehcp');
    revalidatePath(`/ehcp?userId=${associatedUserId}`);

    return {
      success: true,
      document: {
        ...newDocData,
        uploadDate: newDocData.uploadDate.toDate().toISOString(),
      } as EHCPDocument,
    };
  } catch (err: any) {
    console.error('[addEhcpDocument] Upload failed:', err);
    return { error: err.message || 'Upload failed.' };
  }
}

export async function deleteEhcpDocument(
  docId: string,
  storagePath: string,
  actingAdminUserId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!actingAdminUserId) return { error: 'Admin user not authenticated.' };

    const adminDoc = await dbAdmin.collection('users').doc(actingAdminUserId).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      return { error: 'Only admins can delete documents.' };
    }

    try {
      await bucket.file(storagePath).delete();
      console.log(`[deleteEhcpDocument] Deleted from storage: ${storagePath}`);
    } catch (err: any) {
      if (err.code === 404) {
        console.warn('[deleteEhcpDocument] File not found in storage. Proceeding with Firestore delete.');
      } else {
        console.error('[deleteEhcpDocument] Storage deletion error:', err);
        return { error: 'Storage deletion failed: ' + err.message };
      }
    }

    await dbAdmin.collection('ehcpDocuments').doc(docId).delete();
    revalidatePath('/ehcp');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteEhcpDocument] Error:', error);
    return { error: error.message || 'Unexpected error during document deletion.' };
  }
}

export async function updateEhcpDocument(
  docId: string,
  updates: { name: string; description?: string; status: 'Current' | 'Previous' },
  actingAdminUserId: string
): Promise<{ success?: boolean; error?: string; document?: EHCPDocument }> {
  if (!(await isAdmin(actingAdminUserId))) {
    return { error: 'Admin privileges required to update documents.' };
  }

  if (!docId) {
    return { error: 'Document ID is required for an update.' };
  }

  try {
    const docRef = dbAdmin.collection('ehcpDocuments').doc(docId);
    
    await docRef.update({
      name: updates.name,
      description: updates.description || '',
      status: updates.status,
    });
    
    revalidatePath('/ehcp');

    const updatedDocSnap = await docRef.get();
    if (!updatedDocSnap.exists) {
      return { error: 'Failed to retrieve the updated document.' };
    }
    const updatedData = updatedDocSnap.data()!;

    const returnedDocument: EHCPDocument = {
        docId: updatedDocSnap.id,
        name: updatedData.name,
        uploadDate: updatedData.uploadDate.toDate().toISOString(),
        status: updatedData.status,
        fileUrl: updatedData.fileUrl,
        storagePath: updatedData.storagePath,
        fileType: updatedData.fileType,
        description: updatedData.description,
        uploaderUid: updatedData.uploaderUid,
        uploaderName: updatedData.uploaderName,
        originalFileName: updatedData.originalFileName,
        associatedUserId: updatedData.associatedUserId,
    };

    return { success: true, document: returnedDocument };
  } catch (err: any) {
    console.error('[updateEhcpDocument] Update failed:', err);
    return { error: err.message || 'Update failed.' };
  }
}
