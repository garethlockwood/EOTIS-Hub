
'use server';

import { auth, db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, Timestamp, getDoc, where, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { EHCPDocument } from '@/types';
import { revalidatePath } from 'next/cache';

// Helper to check admin status
async function isAdmin(uid: string | undefined): Promise<boolean> {
  if (!uid) return false; // Ensure UID is provided
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() && userDocSnap.data()?.isAdmin === true;
}

export async function getEhcpDocuments(actingUserId: string): Promise<{ documents?: EHCPDocument[]; error?: string }> {
  if (!actingUserId || typeof actingUserId !== 'string' || actingUserId.trim() === '') {
    console.error('Error in getEhcpDocuments: Invalid or missing actingUserId provided.');
    return { error: 'Invalid user identifier for fetching documents.' };
  }

  console.log(`Fetching EHCP documents for actingUserId: "${actingUserId}"`); // Log the actingUserId

  try {
    const q = query(
      collection(db, 'ehcpDocuments'),
      where('associatedUserId', '==', actingUserId),
      orderBy('uploadDate', 'desc') // orderBy is reinstated
    );

    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        docId: docSnap.id,
        name: data.name,
        uploadDate: data.uploadDate ? (data.uploadDate as Timestamp).toDate().toISOString() : '',
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
    console.error('Error fetching EHCP documents (actions.ts):', error); 
    let errorMessage = 'Failed to fetch documents due to an unexpected error.';
    if (error.code && error.message) {
      errorMessage = `Error ${error.code}: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.code) {
      errorMessage = `Firestore Error Code: ${error.code}`;
    }
    // Specifically identify permission denied for clarity, but include original details
    if (error.code === 'permission-denied') {
        errorMessage = `Missing or insufficient permissions. (Code: ${error.code}). Original message: ${error.message || 'No additional message.'}`;
    }
    return { error: errorMessage };
  }
}

interface AddEhcpDocumentResult {
  success?: boolean;
  error?: string;
  document?: EHCPDocument;
}

export async function addEhcpDocument(formData: FormData, actingUserId: string): Promise<AddEhcpDocumentResult> {
  if (!actingUserId) {
    return { error: 'User not authenticated.' };
  }
  if (!(await isAdmin(actingUserId))) {
    return { error: 'User does not have admin privileges.' };
  }

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as 'Current' | 'Previous' | null;

  if (!file || !name || !status ) {
    return { error: 'Missing required fields (file, name, or status).' };
  }

  if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
    return { error: 'Invalid file type. Only PDF and DOCX are allowed.' };
  }
  
  let uploaderName = 'Unknown Admin';
  try {
    const actingUserDocRef = doc(db, 'users', actingUserId);
    const actingUserDocSnap = await getDoc(actingUserDocRef);
    if (actingUserDocSnap.exists()) {
      const userData = actingUserDocSnap.data();
      uploaderName = userData?.name || userData?.email || 'Admin';
    }
  } catch (e) {
    console.error("Error fetching uploader's name: ", e);
  }


  const fileType = file.type === 'application/pdf' ? 'pdf' : 'docx';
  const newDocFirestoreRef = doc(collection(db, 'ehcpDocuments')); 
  const documentId = newDocFirestoreRef.id;
  const storagePath = `ehcp_documents/${documentId}/${file.name}`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    const newDocData = {
      name,
      description: description || '',
      status,
      fileUrl: downloadURL,
      storagePath,
      fileType,
      uploaderUid: actingUserId,
      uploaderName: uploaderName,
      originalFileName: file.name,
      uploadDate: Timestamp.now(), 
      associatedUserId: actingUserId, 
      docId: documentId, 
    };

    await setDoc(newDocFirestoreRef, newDocData); 
    
    revalidatePath('/ehcp');

    return { 
        success: true, 
        document: {
            ...newDocData,
            uploadDate: newDocData.uploadDate.toDate().toISOString(),
        } as EHCPDocument
    };
  } catch (error: any) {
    console.error('Error adding EHCP document:', error);
    return { error: error.message || 'Failed to add document.' };
  }
}

export async function deleteEhcpDocument(docId: string, storagePath: string, actingUserId: string): Promise<{ success?: boolean; error?: string }> {
  if (!actingUserId) {
    return { error: 'User not authenticated.' };
  }
  if (!(await isAdmin(actingUserId))) {
    return { error: 'User does not have admin privileges.' };
  }

  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);

    await deleteDoc(doc(db, 'ehcpDocuments', docId));
    
    revalidatePath('/ehcp');
    return { success: true };
  } catch (error:any) {
    console.error('Error deleting EHCP document:', error);
    if (error.code === 'storage/object-not-found') {
        try {
            await deleteDoc(doc(db, 'ehcpDocuments', docId));
            revalidatePath('/ehcp');
            return { success: true, error: "File not found in storage, but Firestore entry deleted." };
        } catch (fsError: any) {
             return { error: `File not found in storage. Firestore delete error: ${fsError.message}` };
        }
    }
    return { error: error.message || 'Failed to delete document.' };
  }
}

export async function updateEhcpDocumentStatus(docId: string, newStatus: 'Current' | 'Previous', actingUserId: string): Promise<{ success?: boolean; error?: string }> {
  if (!actingUserId) {
    return { error: 'User not authenticated.' };
  }
  if (!(await isAdmin(actingUserId))) {
    return { error: 'User does not have admin privileges.' };
  }

  try {
    await updateDoc(doc(db, 'ehcpDocuments', docId), { status: newStatus });
    revalidatePath('/ehcp');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating EHCP document status:', error);
    return { error: error.message || 'Failed to update status.' };
  }
}

