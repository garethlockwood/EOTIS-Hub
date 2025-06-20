
'use server';

import { dbAdmin } from '@/lib/firebase-admin';
import { auth, db, storage } from '@/lib/firebase'; // Ensure auth is imported
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, Timestamp, getDoc, where, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // Added storage imports
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
  const serverAuthUser = auth.currentUser;
  console.log(`[Server Action getEhcpDocuments] actingUserId from client: "${actingUserId}"`);
  console.log(`[Server Action getEhcpDocuments] auth.currentUser on server (UID):`, serverAuthUser ? serverAuthUser.uid : 'null');
  
  if (!serverAuthUser) {
    console.warn('[Server Action getEhcpDocuments] auth.currentUser is null on the server. This likely means request.auth will be null in Firestore rules for queries from this action.');
  } else if (serverAuthUser.uid !== actingUserId) {
    console.warn(`[Server Action getEhcpDocuments] Mismatch: serverAuthUser.uid (${serverAuthUser.uid}) !== actingUserId (${actingUserId}). This should not happen if client passes its own ID.`);
  }


  if (!actingUserId || typeof actingUserId !== 'string' || actingUserId.trim() === '') {
    console.error('[Client Input Error] Error in getEhcpDocuments: Invalid or missing actingUserId provided to server action.');
    return { error: 'Invalid user identifier for fetching documents.' };
  }

  console.log(`Fetching EHCP documents for actingUserId: "${actingUserId}" (this is the value used in the Firestore query)`);

  try {
    const q = query(
      collection(db, 'ehcpDocuments'),
      where('associatedUserId', '==', actingUserId),
      orderBy('uploadDate', 'desc')
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

    let constructedErrorMessage: string;

    if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
      let baseMessage = `Missing or insufficient permissions. (Code: ${error.code})`;
      let detailsMessage = "";
      // Check if error.message is a non-empty, non-"undefined", non-"null" string
      if (typeof error.message === 'string' && error.message.trim() !== '' && error.message.toLowerCase() !== 'undefined' && error.message.toLowerCase() !== 'null') {
        detailsMessage = ` Original Firebase message: "${error.message}"`;
      } else if (error.details && typeof error.details === 'string' && error.details.trim() !== '') {
        // Fallback to error.details if message is not useful
        detailsMessage = ` Additional details from Firebase: "${error.details}"`;
      } else {
        detailsMessage = " No additional message details from Firebase.";
      }
      constructedErrorMessage = baseMessage + detailsMessage;
    } else {
      // General error handling for non-permission errors
      let parts = [];
      if (error.code) parts.push(`Code: ${error.code}`);
      // Check if error.message is a non-empty, non-"undefined", non-"null" string
      if (typeof error.message === 'string' && error.message.trim() !== '' && error.message.toLowerCase() !== 'undefined' && error.message.toLowerCase() !== 'null') {
        parts.push(`Message: "${error.message}"`);
      }
      if (error.details && typeof error.details === 'string' && error.details.trim() !== '') {
         parts.push(`Details: "${error.details}"`);
      }

      if (parts.length > 0) {
        constructedErrorMessage = `Failed to fetch documents. ${parts.join('. ')}`;
      } else {
        constructedErrorMessage = 'Failed to fetch documents due to an unexpected error. Check server logs for the complete error object.';
      }
    }
    return { error: constructedErrorMessage };
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
  const storageRefInstance = ref(storage, storagePath); // Renamed to avoid conflict with storage import

  try {
    await uploadBytes(storageRefInstance, file); // Use renamed variable
    const downloadURL = await getDownloadURL(storageRefInstance); // Use renamed variable

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
    
