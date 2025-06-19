// src/app/force-change-password/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, KeyRound } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const forceChangePasswordSchema = z.object({
  newPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ForceChangePasswordFormValues = z.infer<typeof forceChangePasswordSchema>;

export default function ForceChangePasswordPage() {
  const { user, forceChangePassword, isLoading: authIsLoading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authIsLoading && (!user || !user.mustChangePassword)) {
      // If user is not logged in, or doesn't need to change password, redirect.
      // Logout if user exists but mustChangePassword is false (should not happen if logic is correct)
      if (user && !user.mustChangePassword) {
        toast({ title: "Not Required", description: "Password change is not required for your account."});
        router.push('/dashboard');
      } else if (!user) {
         router.push('/login');
      }
    }
  }, [user, authIsLoading, router, toast]);

  const form = useForm<ForceChangePasswordFormValues>({
    resolver: zodResolver(forceChangePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit: SubmitHandler<ForceChangePasswordFormValues> = async (data) => {
    try {
      await forceChangePassword(data.newPassword);
      // Redirect is handled by forceChangePassword on success
    } catch (error) {
      // Toast is handled by forceChangePassword or caught here if it throws
      toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Failed to update password." });
    }
  };
  
  if (authIsLoading || !user || !user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="https://placehold.co/80x80.png?text=LOGO" alt="EOTIS Hub Logo" width={80} height={80} data-ai-hint="logo placeholder"/>
          </div>
          <CardTitle className="text-3xl font-headline">Update Your Password</CardTitle>
          <CardDescription>
            For security reasons, you must update your temporary password before proceeding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={authIsLoading}>
                {authIsLoading ? <Loader2 className="animate-spin mr-2" /> : <KeyRound className="mr-2" />}
                Set New Password
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="text-center">
            <Button variant="link" onClick={async () => { await logout(); }} disabled={authIsLoading}>
                Logout
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
