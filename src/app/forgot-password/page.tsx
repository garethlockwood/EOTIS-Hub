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
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormValues> = async (data) => {
    setIsLoading(true);
    // Simulate API call to request password reset
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Password reset requested for:', data.email);
    setIsLoading(false);
    setSubmitted(true);
    toast({
        title: "Password Reset Email Sent",
        description: `If an account exists for ${data.email}, a password reset link has been sent. (This is a mock response)`,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4">
             <Image src="https://placehold.co/80x80.png?text=LOGO" alt="EOTIS Hub Logo" width={80} height={80} data-ai-hint="logo placeholder" />
           </div>
          <CardTitle className="text-3xl font-headline">Forgot Password?</CardTitle>
          <CardDescription>
            {submitted 
              ? "Check your email for a password reset link. If you don't see it, check your spam folder."
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
