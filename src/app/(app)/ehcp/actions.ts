
'use server';

import { auth, db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, Timestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { EHCPDocument } from '@/types';
import { revalidatePath } from 'next/cache';

// Helper to check admin status
async function isAdmin(uid: string): Promise<boolean> {
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  return userDocSnap.exists() && userDocSnap.data()?.isAdmin === true;
}

export async function getEhcpDocuments(): Promise<{ documents?: EHCPDocument[]; error?: string }> {
  try {
    const q = query(collection(db, 'ehcpDocuments'), orderBy('uploadDate', 'desc'));
    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        docId: docSnap.id,
        name: data.name,
        uploadDate: (data.uploadDate as Timestamp).toDate().toISOString(),
        status: data.status,
        fileUrl: data.fileUrl,
        storagePath: data.storagePath,
        fileType: data.fileType,
        description: data.description,
        uploaderUid: data.uploaderUid,
        uploaderName: data.uploaderName, // Assuming you might store this
        originalFileName: data.originalFileName,
      } as EHCPDocument;
    });
    return { documents };
  } catch (error: any) {
    console.error('Error fetching EHCP documents:', error);
    return { error: error.message || 'Failed to fetch documents.' };
  }
}

interface AddEhcpDocumentResult {
  success?: boolean;
  error?: string;
  document?: EHCPDocument;
}

export async function addEhcpDocument(formData: FormData): Promise<AddEhcpDocumentResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { error: 'User not authenticated.' };
  }
  if (!(await isAdmin(currentUser.uid))) {
    return { error: 'User does not have admin privileges.' };
  }

  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as 'Current' | 'Previous' | null;

  if (!file || !name || !status) {
    return { error: 'Missing required fields (file, name, or status).' };
  }

  if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
    return { error: 'Invalid file type. Only PDF and DOCX are allowed.' };
  }
  
  const fileType = file.type === 'application/pdf' ? 'pdf' : 'docx';
  const documentId = doc(collection(db, 'ehcpDocuments')).id; // Generate a new ID
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
      uploaderUid: currentUser.uid,
      uploaderName: currentUser.displayName || currentUser.email, // Store uploader's name
      originalFileName: file.name,
      uploadDate: Timestamp.now(),
    };

    await addDoc(collection(db, 'ehcpDocuments'), newDocData);
    
    revalidatePath('/ehcp'); // Revalidate the EHCP page cache

    return { 
        success: true, 
        document: {
            ...newDocData,
            docId: documentId, // This won't be the actual ID from addDoc, but good for immediate client update if needed
            uploadDate: newDocData.uploadDate.toDate().toISOString(),
        } as EHCPDocument
    };
  } catch (error: any) {
    console.error('Error adding EHCP document:', error);
    return { error: error.message || 'Failed to add document.' };
  }
}

export async function deleteEhcpDocument(docId: string, storagePath: string): Promise<{ success?: boolean; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { error: 'User not authenticated.' };
  }
  if (!(await isAdmin(currentUser.uid))) {
    return { error: 'User does not have admin privileges.' };
  }

  try {
    // Delete from Storage
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);

    // Delete from Firestore
    await deleteDoc(doc(db, 'ehcpDocuments', docId));
    
    revalidatePath('/ehcp');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting EHCP document:', error);
    if (error.code === 'storage/object-not-found') {
        // If file not found in storage, still try to delete from Firestore
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

export async function updateEhcpDocumentStatus(docId: string, newStatus: 'Current' | 'Previous'): Promise<{ success?: boolean; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { error: 'User not authenticated.' };
  }
  if (!(await isAdmin(currentUser.uid))) {
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

