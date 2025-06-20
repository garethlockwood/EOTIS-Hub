// src/app/reset-password/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { Loader2, KeyRound } from 'lucide-react';
import Image from 'next/image'; // Added import for Image
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const { confirmPasswordReset, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [oobCode, setOobCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (code) {
      setOobCode(code);
    } else {
      console.error("Password reset code (oobCode) missing from URL.");
      toast({ variant: "destructive", title: "Invalid Link", description: "Password reset code is missing or invalid." });
    }
  }, [searchParams, toast]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit: SubmitHandler<ResetPasswordFormValues> = async (data) => {
    if (!oobCode) {
      toast({ variant: "destructive", title: "Error", description: "Cannot reset password without a valid code." });
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(oobCode, data.password);
      setSubmitted(true);
    } catch (error) {
      // Error toast is handled by AuthContext
    }
    setIsSubmitting(false);
  };
  
  const currentIsLoading = authIsLoading || isSubmitting;

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/eotis-hub-logo.png" alt="EOTIS Hub Logo" width={80} height={77} priority />
        </div>
        <CardTitle className="text-3xl font-headline">Reset Your Password</CardTitle>
        <CardDescription>
          {submitted 
            ? "If your reset code was valid, your password has been successfully reset." 
            : (oobCode ? "Enter your new password below." : "This reset link appears to be invalid or has expired.")}
        </CardDescription>
      </CardHeader>
      {!submitted && oobCode && (
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
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
              <Button type="submit" className="w-full" disabled={currentIsLoading}>
                {currentIsLoading ? <Loader2 className="animate-spin mr-2" /> : <KeyRound className="mr-2" />}
                Reset Password
              </Button>
            </form>
          </Form>
        </CardContent>
      )}
      <CardFooter className="flex justify-center">
        { (submitted || !oobCode) && (
          <Link href="/login" passHref>
              <Button variant="link">Back to Sign In</Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <ResetPasswordContent />
      </div>
    </Suspense>
  );
}
