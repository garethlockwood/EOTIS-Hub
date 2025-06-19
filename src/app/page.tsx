// src/app/page.tsx
'use client'; // Make this a client component to use hooks if needed for initial redirect logic

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth'; // Assuming useAuth can be used here or a simpler check

export default function RootPage() {
  const router = useRouter();
  // Simpler check or rely on middleware. For immediate client-side redirect:
  // const { user, isLoading } = useAuth(); 

  useEffect(() => {
    // Basic check: if localStorage has a user, go to dashboard, else login.
    // Middleware should handle more robust protection.
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  // Render null or a loading indicator while redirecting
  return null; 
}
