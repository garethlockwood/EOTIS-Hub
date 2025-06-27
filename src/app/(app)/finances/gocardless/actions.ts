
'use server';

import { revalidatePath } from 'next/cache';
import { dbAdmin } from '@/lib/firebase-admin';
import type { BankAccount } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

export async function getBankConnections(userId: string): Promise<{ accounts?: BankAccount[], error?: string }> {
    if (!userId) {
        return { error: "User not authenticated." };
    }

    try {
        const snapshot = await dbAdmin.collection('users').doc(userId).collection('bankConnections').orderBy('linkedAt', 'desc').get();
        if (snapshot.empty) {
            return { accounts: [] };
        }
        
        const accounts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                linkedAt: (data.linkedAt as Timestamp).toDate().toISOString(),
            } as BankAccount;
        });

        return { accounts };
    } catch (error: any) {
        console.error("Error fetching bank connections:", error);
        if (error.code === 'FAILED_PRECONDITION') {
            return { error: "Database index required. Please create a composite index for bankConnections."}
        }
        return { error: "Failed to fetch connected accounts." };
    }
}

export async function disconnectBankAccount(userId: string, accountId: string): Promise<{ success?: boolean, error?: string }> {
    if (!userId) {
        return { error: "User not authenticated." };
    }
    if (!accountId) {
        return { error: "Account ID is required." };
    }

    try {
        await dbAdmin.collection('users').doc(userId).collection('bankConnections').doc(accountId).delete();
        revalidatePath('/finances/gocardless');
        return { success: true };
    } catch (error: any) {
        console.error("Error disconnecting bank account:", error);
        return { error: "Failed to disconnect account." };
    }
}
