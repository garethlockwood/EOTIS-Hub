// src/app/reset-password/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      // Handle missing token, e.g., redirect or show error
      // For now, we'll just log it. In a real app, show an error message.
      console.error("Reset token missing from URL.");
      toast({ variant: "destructive", title: "Invalid Link", description: "Password reset token is missing or invalid." });
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
    if (!token) {
      toast({ variant: "destructive", title: "Error", description: "Cannot reset password without a valid token." });
      return;
    }
    setIsLoading(true);
    // Simulate API call to reset password
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Password reset for token:', token, 'with new password:', data.password);
    setIsLoading(false);
    setSubmitted(true);
    toast({ title: "Password Reset Successful", description: "Your password has been changed. You can now sign in." });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="https://placehold.co/80x80.png?text=LOGO" alt="EOTIS Hub Logo" width={80} height={80} data-ai-hint="logo placeholder" />
          </div>
          <CardTitle className="text-3xl font-headline">Reset Your Password</CardTitle>
          <CardDescription>
            {submitted 
              ? "Your password has been successfully reset." 
              : (token ? "Enter your new password below." : "This reset link is invalid or has expired.")}
          </CardDescription>
        </CardHeader>
        {!submitted && token && (
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : <KeyRound className="mr-2" />}
                  Reset Password
                </Button>
              </form>
            </Form>
          </CardContent>
        )}
        <CardFooter className="flex justify-center">
          {submitted || !token ? (
            <Link href="/login" passHref>
                <Button variant="link">Back to Sign In</Button>
            </Link>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
