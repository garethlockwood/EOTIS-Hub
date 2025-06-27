
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Loader2, PowerOff, Banknote } from 'lucide-react';
import Image from 'next/image';
import { getBankConnections, disconnectBankAccount } from './actions';
import type { BankAccount } from '@/types';
import { format } from 'date-fns';

const banks = [
    { id: 'ob-uk-sandbox', name: 'UK Sandbox Bank', logo: 'https://placehold.co/40x40.png' },
    // Add more real banks here as needed
];

function GoCardlessPageContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isLoading, setIsLoading] = useState<string | null>(null); // for new connections
    const [isProcessingCallback, setIsProcessingCallback] = useState(false);
    const [isFetchingAccounts, setIsFetchingAccounts] = useState(true);
    const [connectedAccounts, setConnectedAccounts] = useState<BankAccount[]>([]);

    const fetchConnectedAccounts = useCallback(async () => {
        if (!user?.id) return;
        setIsFetchingAccounts(true);
        const result = await getBankConnections(user.id);
        if (result.accounts) {
            setConnectedAccounts(result.accounts);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error || 'Could not fetch connected accounts.' });
        }
        setIsFetchingAccounts(false);
    }, [user, toast]);

    useEffect(() => {
        if(user?.id) {
            fetchConnectedAccounts();
        }
    }, [user, fetchConnectedAccounts]);
    
    // Handle redirect back from GoCardless
    useEffect(() => {
        const requisitionId = searchParams.get('ref');
        if (requisitionId) {
            setIsProcessingCallback(true);
            const completeBankConnection = httpsCallable(functions, 'completeBankConnection');
            completeBankConnection({ requisitionId })
                .then(() => {
                    toast({ title: 'Success', description: 'Bank account connected successfully.' });
                    fetchConnectedAccounts();
                })
                .catch((error) => {
                    console.error("Error completing bank connection:", error);
                    toast({ variant: 'destructive', title: 'Connection Failed', description: error.message || 'Could not finalize bank connection.' });
                })
                .finally(() => {
                    setIsProcessingCallback(false);
                    // Clean URL
                    router.replace('/finances/gocardless', { scroll: false });
                });
        }
    }, [searchParams, toast, fetchConnectedAccounts, router]);


    const handleLinkBankAccount = async (bankId: string) => {
        setIsLoading(bankId);
        try {
            const createBankLink = httpsCallable(functions, 'createBankLink');
            const redirectUrl = `${window.location.origin}/finances/gocardless`;
            
            const result: any = await createBankLink({ bankId, redirectUrl });
            
            if (result.data && result.data.link) {
                // Store requisition ID temporarily if needed, though redirect param is better
                window.location.href = result.data.link;
            } else {
                throw new Error("Failed to get bank link from function.");
            }
        } catch (error: any) {
            console.error("Error creating bank link:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Could not initiate bank linking process.',
            });
            setIsLoading(null);
        }
    };

    const handleDisconnect = async (accountId: string) => {
        if (!user?.id) return;
        setIsLoading(accountId); // Use loading state to disable button
        const result = await disconnectBankAccount(user.id, accountId);
        if (result.success) {
            toast({ title: 'Account Disconnected' });
            fetchConnectedAccounts();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsLoading(null);
    }

    return (
        <>
            <PageHeader title="Bank Connections" description="Connect your bank account using GoCardless to automatically import statements." />
            
            {(isProcessingCallback) && (
                 <Card className="mb-6">
                    <CardContent className="p-6 flex items-center justify-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div>
                            <h3 className="font-semibold text-lg">Processing Connection</h3>
                            <p className="text-muted-foreground">Finalizing your new bank connection, please wait...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Connected Accounts</CardTitle>
                    <CardDescription>Manage your currently linked bank accounts.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isFetchingAccounts ? (
                         <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : connectedAccounts.length > 0 ? (
                        <div className="space-y-4">
                            {connectedAccounts.map(account => (
                                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Image src={account.institutionLogo || 'https://placehold.co/40x40.png'} alt={`${account.institutionName} logo`} width={40} height={40} data-ai-hint="bank logo" />
                                        <div>
                                            <p className="font-semibold">{account.accountName || account.institutionName}</p>
                                            <p className="text-sm text-muted-foreground">{account.iban || 'Account details pending'}</p>
                                            <p className="text-xs text-muted-foreground">Linked on {format(new Date(account.linkedAt), 'PPP')}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleDisconnect(account.id)} disabled={!!isLoading}>
                                         {isLoading === account.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                                        Disconnect
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">No bank accounts connected yet.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Add a New Connection</CardTitle>
                    <CardDescription>Choose your bank from the list below to begin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {banks.map(bank => (
                        <div key={bank.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <Image src={bank.logo} alt={`${bank.name} logo`} width={40} height={40} data-ai-hint="bank logo" />
                                <span className="font-medium">{bank.name}</span>
                            </div>
                            <Button onClick={() => handleLinkBankAccount(bank.id)} disabled={!!isLoading || isProcessingCallback}>
                                {isLoading === bank.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
                                Connect
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </>
    );
}

export default function GoCardlessPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <GoCardlessPageContent />
        </Suspense>
    )
}
