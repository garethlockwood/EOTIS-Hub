// src/app/forgot-password/page.tsx
'use client';

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import Image from 'next/image'; // Added import for Image
import { useAuth } from '@/hooks/use-auth';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { sendPasswordResetEmail, isLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = async (data) => {
    try {
      await sendPasswordResetEmail(data.email);
      setSubmitted(true);
    } catch (error) {
      // Error is handled by AuthContext
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4">
             <Image src="/eotis-hub-logo.png" alt="EOTIS Hub Logo" width={80} height={77} priority />
           </div>
          <CardTitle className="text-3xl font-headline">Forgot Password?</CardTitle>
          <CardDescription>
            {submitted 
              ? "If an account with that email exists, a password reset link has been sent. Please check your inbox (and spam folder)."
              : "Enter your email address and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>
        {!submitted && (
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Mail className="mr-2" />}
                  Send Reset Link
                </Button>
              </form>
            </Form>
          </CardContent>
        )}
        <CardFooter className="flex justify-center">
          <Link href="/login" passHref>
            <Button variant="link">Back to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
