
'use server';

import { dbAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

// Simple type for clarity
interface DocumentType {
  id: string;
  name: string;
}

// Fetches all document types
export async function getDocumentTypes(): Promise<{ types?: DocumentType[]; error?: string }> {
  try {
    const snapshot = await dbAdmin.collection('documentTypes').orderBy('name').get();
    const types = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
    return { types };
  } catch (error: any) {
    console.error('[getDocumentTypes] Error:', error);
    if (error.code === 'FAILED_PRECONDITION' && error.message.includes('index')) {
        return { error: 'Firestore index required. Please create an index for `documentTypes` ordered by `name`.' };
    }
    return { error: 'Failed to fetch document types.' };
  }
}

// Adds a new document type
export async function addDocumentType(typeName: string): Promise<{ success?: boolean; error?: string; type?: DocumentType }> {
  if (!typeName || typeName.trim() === '') {
    return { error: 'Type name cannot be empty.' };
  }
  const trimmedName = typeName.trim();

  try {
    // Check for duplicates (case-insensitive check can be done here if needed)
    const snapshot = await dbAdmin.collection('documentTypes').where('name', '==', trimmedName).get();
    if (!snapshot.empty) {
      return { error: `Type "${trimmedName}" already exists.` };
    }

    const newDocRef = dbAdmin.collection('documentTypes').doc();
    const newType = { name: trimmedName };
    await newDocRef.set(newType);

    revalidatePath('/repository');

    return { success: true, type: { id: newDocRef.id, ...newType } };
  } catch (error: any) {
    console.error('[addDocumentType] Error:', error);
    return { error: 'Failed to add new document type.' };
  }
}

// Deletes a document type
export async function deleteDocumentType(typeId: string, typeName: string): Promise<{ success?: boolean; error?: string }> {
  if (!typeId || !typeName) {
    return { error: 'Type ID and name are required.' };
  }

  try {
    // Check if the type is in use
    const usageSnapshot = await dbAdmin.collection('contentDocuments').where('type', '==', typeName).limit(1).get();
    if (!usageSnapshot.empty) {
      return { error: `Cannot delete type "${typeName}" as it is currently in use by one or more documents.` };
    }

    await dbAdmin.collection('documentTypes').doc(typeId).delete();
    
    revalidatePath('/repository');
    
    return { success: true };
  } catch (error: any) {
    console.error('[deleteDocumentType] Error:', error);
    return { error: 'Failed to delete document type.' };
  }
}
