
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

const banks = [
    { id: 'ob-uk-sandbox', name: 'UK Sandbox Bank', logo: 'https://placehold.co/40x40.png' },
    // Add more real banks here as needed
];

export default function GoCardlessPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleLinkBankAccount = async (bankId: string) => {
        setIsLoading(bankId);
        try {
            const createBankLink = httpsCallable(functions, 'createBankLink');
            // Construct a redirect URL that brings the user back to this page with a status
            const redirectUrl = `${window.location.origin}/finances/gocardless?status=success`;
            
            const result: any = await createBankLink({ bankId, redirectUrl });
            
            if (result.data && result.data.link) {
                // Redirect the user to the GoCardless authorization URL
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

    return (
        <>
            <PageHeader title="Link Bank Account" description="Connect your bank account using GoCardless to automatically import statements." />
            <Card>
                <CardHeader>
                    <CardTitle>Select Your Bank</CardTitle>
                    <CardDescription>Choose your bank from the list below to begin the secure connection process. This will redirect you to your bank's website to authorize access.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {banks.map(bank => (
                        <div key={bank.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <Image src={bank.logo} alt={`${bank.name} logo`} width={40} height={40} data-ai-hint="bank logo" />
                                <span className="font-medium">{bank.name}</span>
                            </div>
                            <Button onClick={() => handleLinkBankAccount(bank.id)} disabled={!!isLoading}>
                                {isLoading === bank.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Connect
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </>
    );
}
