// src/app/force-change-password/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
    } catch (error) {
      // Error toast is handled by AuthContext
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
            <Image src="/eotis-hub-logo.png" alt="EOTIS Hub Logo" width={120} height={115} priority />
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
