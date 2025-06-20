
'use server';

import { auth, storage } from '@/lib/firebase'; // db is removed, storage is kept for file operations
import { Timestamp } from 'firebase/firestore'; // Timestamp is still useful
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { EHCPDocument } from '@/types';
import { revalidatePath } from 'next/cache';

// Dynamically import dbAdmin from firebase-admin
// This top-level await is fine in server components/actions
const { dbAdmin } = await import('@/lib/firebase-admin');

// Helper to check admin status using Admin SDK
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

export async function getEhcpDocuments(actingUserId: string): Promise<{ documents?: EHCPDocument[]; error?: string }> {
  console.log(`[Server Action getEhcpDocuments] actingUserId from client: "${actingUserId}"`);
  const serverAuthUser = auth.currentUser; // This uses client SDK auth, usually null in server actions unless special setup
  console.log(`[Server Action getEhcpDocuments] auth.currentUser on server (UID):`, serverAuthUser ? serverAuthUser.uid : 'null');

  if (!serverAuthUser) {
    console.warn('[Server Action getEhcpDocuments] auth.currentUser is null on the server via client SDK. This is expected if not using client auth context propagation. Admin SDK will operate with service account privileges.');
  } else if (serverAuthUser.uid !== actingUserId) {
    console.warn(`[Server Action getEhcpDocuments] Mismatch: serverAuthUser.uid (${serverAuthUser.uid}) !== actingUserId (${actingUserId}). This implies client auth context was available but mismatched.`);
  }

  if (!actingUserId || typeof actingUserId !== 'string' || actingUserId.trim() === '') {
    console.error('[Client Input Error] Error in getEhcpDocuments: Invalid or missing actingUserId provided to server action.');
    return { error: 'Invalid user identifier for fetching documents.' };
  }

  console.log(`Fetching EHCP documents with Admin SDK for associatedUserId: "${actingUserId}"`);

  try {
    const snapshot = await dbAdmin
      .collection('ehcpDocuments')
      .where('associatedUserId', '==', actingUserId)
      .orderBy('uploadDate', 'desc')
      .get();

    const documents = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        docId: docSnap.id,
        name: data.name,
        // Firestore Admin SDK Timestamp needs to be converted
        uploadDate: data.uploadDate ? (data.uploadDate.toDate ? data.uploadDate.toDate().toISOString() : new Date(data.uploadDate._seconds * 1000).toISOString()) : '',
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
    console.error('Error fetching EHCP documents (Admin SDK):', error);
    let constructedErrorMessage = `Failed to fetch documents. Code: ${error.code || 'N/A'}. Message: ${error.message || 'Unknown error'}`;
    if (error.details) constructedErrorMessage += ` Details: ${error.details}`;
    return { error: constructedErrorMessage };
  }
}

interface AddEhcpDocumentResult {
  success?: boolean;
  error?: string;
  document?: EHCPDocument;
}

export async function addEhcpDocument(formData: FormData, actingAdminUserId: string): Promise<AddEhcpDocumentResult> {
  if (!actingAdminUserId) {
    return { error: 'Admin user not authenticated for action.' };
  }
  if (!(await isAdmin(actingAdminUserId))) {
    return { error: 'User performing action does not have admin privileges.' };
  }

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as 'Current' | 'Previous' | null;
  // The associatedUserId now comes from the form, validated by admin.
  const associatedUserId = formData.get('associatedUserId') as string | null;


  if (!file || !name || !status || !associatedUserId) {
    return { error: 'Missing required fields (file, name, status, or associated user ID).' };
  }

  if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
    return { error: 'Invalid file type. Only PDF and DOCX are allowed.' };
  }
  
  let uploaderName = 'Unknown Admin';
  try {
    const actingAdminUserDocRef = dbAdmin.collection('users').doc(actingAdminUserId);
    const actingAdminUserDocSnap = await actingAdminUserDocRef.get();
    if (actingAdminUserDocSnap.exists) {
      const adminData = actingAdminUserDocSnap.data();
      uploaderName = adminData?.name || adminData?.email || 'Admin';
    }
  } catch (e) {
    console.error("Error fetching admin uploader's name: ", e);
  }

  const fileType = file.type === 'application/pdf' ? 'pdf' : 'docx';
  const newDocFirestoreRef = dbAdmin.collection('ehcpDocuments').doc(); 
  const documentId = newDocFirestoreRef.id;
  
  // Storage operations continue to use client SDK instance for this example
  const storagePath = `ehcp_documents/${documentId}/${file.name}`;
  const storageRefInstance = ref(storage, storagePath);

  try {
    await uploadBytes(storageRefInstance, file);
    const downloadURL = await getDownloadURL(storageRefInstance);

    const newDocData = {
      name,
      description: description || '',
      status,
      fileUrl: downloadURL,
      storagePath,
      fileType,
      uploaderUid: actingAdminUserId, // Admin who uploaded
      uploaderName: uploaderName,
      originalFileName: file.name,
      uploadDate: Timestamp.now(), // Firestore Admin SDK Timestamp
      associatedUserId: associatedUserId, // The user this document is for
      docId: documentId, 
    };

    await newDocFirestoreRef.set(newDocData);
    
    revalidatePath('/ehcp');
    revalidatePath(`/ehcp?userId=${associatedUserId}`); // Revalidate for the specific user if applicable

    // Convert Firestore Admin Timestamp to ISO string for the returned document
    const adminTimestamp = newDocData.uploadDate as unknown as { toDate: () => Date };

    return { 
        success: true, 
        document: {
            ...newDocData,
            uploadDate: adminTimestamp.toDate().toISOString(),
        } as EHCPDocument
    };
  } catch (error: any) {
    console.error('Error adding EHCP document (Admin SDK for Firestore, Client SDK for Storage):', error);
    return { error: error.message || 'Failed to add document.' };
  }
}

export async function deleteEhcpDocument(docId: string, storagePathToDelete: string, actingAdminUserId: string): Promise<{ success?: boolean; error?: string }> {
  if (!actingAdminUserId) {
    return { error: 'Admin user not authenticated for action.' };
  }
  if (!(await isAdmin(actingAdminUserId))) {
    return { error: 'User performing action does not have admin privileges.' };
  }

  try {
    // Storage operation
    const fileRef = ref(storage, storagePathToDelete);
    await deleteObject(fileRef);

    // Firestore operation with Admin SDK
    await dbAdmin.collection('ehcpDocuments').doc(docId).delete();
    
    revalidatePath('/ehcp');
    // Consider revalidating specific user path if known: revalidatePath(`/ehcp?userId=...`);
    return { success: true };
  } catch (error:any) {
    console.error('Error deleting EHCP document:', error);
    if (error.code === 'storage/object-not-found') {
        try {
            // Firestore operation with Admin SDK
            await dbAdmin.collection('ehcpDocuments').doc(docId).delete();
            revalidatePath('/ehcp');
            return { success: true, error: "File not found in storage, but Firestore entry deleted." };
        } catch (fsError: any) {
             return { error: `File not found in storage. Firestore delete error: ${fsError.message}` };
        }
    }
    return { error: error.message || 'Failed to delete document.' };
  }
}

export async function updateEhcpDocumentStatus(docId: string, newStatus: 'Current' | 'Previous', actingAdminUserId: string): Promise<{ success?: boolean; error?: string }> {
  if (!actingAdminUserId) {
    return { error: 'Admin user not authenticated for action.' };
  }
  if (!(await isAdmin(actingAdminUserId))) {
    return { error: 'User performing action does not have admin privileges.' };
  }

  try {
    // Firestore operation with Admin SDK
    await dbAdmin.collection('ehcpDocuments').doc(docId).update({ status: newStatus });
    revalidatePath('/ehcp');
    // Consider revalidating specific user path if known: revalidatePath(`/ehcp?userId=...`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating EHCP document status (Admin SDK):', error);
    return { error: error.message || 'Failed to update status.' };
  }
}
    

    