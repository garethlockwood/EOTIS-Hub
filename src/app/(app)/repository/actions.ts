
'use server';

import { Timestamp } from 'firebase-admin/firestore';
import type { ContentDocument } from '@/types';
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
    console.error(`Error checking admin status for UID ${uid}:`, error);
    return false;
  }
}

export async function getContentDocuments(): Promise<{ documents?: ContentDocument[]; error?: string }> {
  try {
    const snapshot = await dbAdmin
      .collection('contentDocuments')
      .orderBy('uploadDate', 'desc')
      .get();

    const documents = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: data.type,
        name: data.name,
        uploadDate: (data.uploadDate as Timestamp).toDate().toISOString(),
        uploaderUid: data.uploaderUid,
        uploaderName: data.uploaderName,
        uploaderRole: data.uploaderRole,
        description: data.description,
        fileUrl: data.fileUrl,
        storagePath: data.storagePath,
        fileType: data.fileType,
        version: data.version,
        tags: data.tags,
        associatedUserId: data.associatedUserId, // Include associatedUserId
      } as ContentDocument;
    });
    return { documents };
  } catch (error: any) {
    return { error: `Failed to fetch content documents: ${error.message}` };
  }
}

export async function addContentDocument(formData: FormData, actingAdminUserId: string): Promise<{ success?: boolean; error?: string; document?: ContentDocument }> {
  if (!actingAdminUserId || !(await isAdmin(actingAdminUserId))) {
    return { error: 'Admin privileges required.' };
  }

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const description = formData.get('description') as string | null;
  const type = formData.get('type') as 'LessonPlan' | 'Report' | 'Resource' | 'Invoice' | 'General' | null;
  const version = formData.get('version') as string | null;
  const tagsRaw = formData.get('tags') as string | null;
  const associatedUserId = formData.get('associatedUserId') as string | null;

  if (!file || !name || !type) {
    return { error: 'Missing required fields (file, name, or type).' };
  }

  const tags = tagsRaw ? tagsRaw.split(',').map(tag => tag.trim()).filter(Boolean) : [];

  const newDocRef = dbAdmin.collection('contentDocuments').doc();
  const storagePath = `repository_documents/${newDocRef.id}/${file.name}`;
  const tempFilePath = path.join(tmpdir(), file.name);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
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
    const uploaderName = uploaderDoc.exists ? (uploaderDoc.data()?.name || uploaderDoc.data()?.email || 'Admin') : 'Admin';
    const uploaderRole = uploaderDoc.exists ? (uploaderDoc.data()?.role || 'Admin') : 'Admin';

    const newDocData: Omit<ContentDocument, 'uploadDate' | 'id'> & { uploadDate: Timestamp } = {
      name,
      description: description || '',
      type,
      version: version || '1.0',
      tags,
      fileUrl: downloadURL,
      storagePath,
      fileType: file.type.includes('pdf') ? 'pdf' : (file.type.includes('word') ? 'docx' : 'other'),
      uploaderUid: actingAdminUserId,
      uploaderName,
      uploaderRole,
      uploadDate: Timestamp.now(),
    };
    
    if (associatedUserId) {
        (newDocData as any).associatedUserId = associatedUserId;
    }


    await newDocRef.set(newDocData);
    revalidatePath('/repository');

    return {
      success: true,
      document: {
        ...newDocData,
        id: newDocRef.id,
        uploadDate: newDocData.uploadDate.toDate().toISOString(),
      } as ContentDocument,
    };
  } catch (err: any) {
    console.error('Upload failed:', err);
    return { error: err.message || 'Upload failed.' };
  }
}

export async function updateContentDocument(
  docId: string,
  updates: Partial<Omit<ContentDocument, 'id' | 'fileUrl' | 'storagePath' | 'fileType' | 'uploaderUid' | 'uploaderName' | 'uploaderRole' | 'uploadDate'>>,
  actingAdminUserId: string
): Promise<{ success?: boolean; error?: string; document?: ContentDocument }> {
  if (!actingAdminUserId || !(await isAdmin(actingAdminUserId))) {
    return { error: 'Admin privileges required to update documents.' };
  }

  if (!docId) {
    return { error: 'Document ID is required for an update.' };
  }

  try {
    const docRef = dbAdmin.collection('contentDocuments').doc(docId);
    
    const updatePayload: any = { ...updates };
    delete updatePayload.id;

    await docRef.update(updatePayload);
    revalidatePath('/repository');

    const updatedDocSnap = await docRef.get();
    if (!updatedDocSnap.exists) {
      return { error: 'Failed to retrieve the updated document.' };
    }
    const updatedData = updatedDocSnap.data()!;

    const returnedDocument: ContentDocument = {
      id: updatedDocSnap.id,
      type: updatedData.type,
      name: updatedData.name,
      uploadDate: (updatedData.uploadDate as Timestamp).toDate().toISOString(),
      uploaderUid: updatedData.uploaderUid,
      uploaderName: updatedData.uploaderName,
      uploaderRole: updatedData.uploaderRole,
      description: updatedData.description,
      fileUrl: updatedData.fileUrl,
      storagePath: updatedData.storagePath,
      fileType: updatedData.fileType,
      version: updatedData.version,
      tags: updatedData.tags,
      associatedUserId: updatedData.associatedUserId,
    };

    return { success: true, document: returnedDocument };
  } catch (err: any) {
    console.error('[updateContentDocument] Update failed:', err);
    return { error: err.message || 'Update failed.' };
  }
}

export async function deleteContentDocument(
  docId: string,
  storagePath: string | undefined,
  adminId: string
): Promise<{ success?: boolean; error?: string }> {
  
  if (!(await isAdmin(adminId))) {
      return { error: 'Permission denied. Only admins can delete documents.' };
  }

  if (!docId) {
      return { error: 'Document ID is required for deletion.' };
  }

  try {
      if (storagePath) {
          try {
              await bucket.file(storagePath).delete();
              console.log(`[deleteContentDocument] Deleted from storage: ${storagePath}`);
          } catch (err: any) {
              if (err.code === 404) {
                  console.warn(`[deleteContentDocument] File not found in storage at ${storagePath}. Proceeding with Firestore delete.`);
              } else {
                  throw err;
              }
          }
      }

      await dbAdmin.collection('contentDocuments').doc(docId).delete();
      revalidatePath('/repository');
      return { success: true };

  } catch (error: any) {
      console.error('[deleteContentDocument] Error:', error);
      return { error: `Failed to delete document: ${error.message}` };
  }
}
