'use server';

import { Timestamp } from 'firebase/firestore';
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
        uploadDate: data.uploadDate.toDate().toISOString(),
        uploaderUid: data.uploaderUid,
        uploaderName: data.uploaderName,
        uploaderRole: data.uploaderRole,
        description: data.description,
        fileUrl: data.fileUrl,
        storagePath: data.storagePath,
        fileType: data.fileType,
        version: data.version,
        tags: data.tags,
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
  const tagsRaw = formData.get('tags') as string | null; // comma-separated

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
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    const uploaderDoc = await dbAdmin.collection('users').doc(actingAdminUserId).get();
    const uploaderName = uploaderDoc.exists ? (uploaderDoc.data()?.name || uploaderDoc.data()?.email || 'Admin') : 'Admin';
    const uploaderRole = uploaderDoc.exists ? (uploaderDoc.data()?.role || 'Admin') : 'Admin';

    const newDocData = {
      name,
      description: description || '',
      type,
      version: version || '1.0',
      tags,
      fileUrl: downloadURL,
      storagePath,
      fileType: file.type.includes('pdf') ? 'pdf' : 'docx',
      uploaderUid: actingAdminUserId,
      uploaderName,
      uploaderRole,
      uploadDate: Timestamp.now(),
      id: newDocRef.id,
    };

    await newDocRef.set(newDocData);
    revalidatePath('/repository');

    return {
      success: true,
      document: {
        ...newDocData,
        uploadDate: newDocData.uploadDate.toDate().toISOString(),
      } as ContentDocument,
    };
  } catch (err: any) {
    console.error('Upload failed:', err);
    return { error: err.message || 'Upload failed.' };
  }
}
