// src/contexts/auth-context.tsx
'use client';

import type { User } from '@/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, pass: string) => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  enableMfa: () => Promise<{ qrCodeUrl: string; recoveryCodes: string[] }>;
  confirmMfa: (code: string) => Promise<void>;
  disableMfa: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get users from localStorage
const getMockUsers = (): User[] => {
  const stored = localStorage.getItem('mockUsers');
  return stored ? JSON.parse(stored) : [];
};

// Helper to save users to localStorage
const saveMockUsers = (users: User[]) => {
  localStorage.setItem('mockUsers', JSON.stringify(users));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);

    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = getMockUsers();
    const foundUser = users.find(u => u.email === email && (u as any).password === pass); // Insecure: for mock only

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('authUser', JSON.stringify(foundUser));
      toast({ title: "Login Successful", description: `Welcome back, ${foundUser.name || foundUser.email}!`});
      router.push('/dashboard');
    } else {
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or password."});
    }
    setIsLoading(false);
  }, [router, toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    localStorage.removeItem('authUser');
    localStorage.removeItem('mockPasswordResetToken'); // Clean up mock token
    toast({ title: "Logged Out", description: "You have been successfully logged out."});
    router.push('/login');
    setIsLoading(false);
  }, [router, toast]);

  const signup = useCallback(async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    let users = getMockUsers();
    if (users.find(u => u.email === email)) {
      setIsLoading(false);
      throw new Error('An account with this email already exists.');
    }
    const newUser: User & { password?: string } = { id: Date.now().toString(), email, name, avatarUrl: `https://placehold.co/100x100.png?text=${name[0].toUpperCase()}`, isMfaEnabled: false, password: pass };
    users.push(newUser);
    saveMockUsers(users);
    
    // Automatically log in the new user
    setUser(newUser);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    toast({ title: "Signup Successful!", description: `Welcome, ${name}! You are now logged in.`});
    router.push('/dashboard');
    setIsLoading(false);
  }, [router, toast]);

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => {
    setIsLoading(true);
    let success = false;
    setUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...data };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      
      // Update in mockUsers list as well
      let users = getMockUsers();
      users = users.map(u => u.id === updatedUser.id ? updatedUser : u);
      saveMockUsers(users);
      success = true;
      return updatedUser;
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsLoading(false);
    if (success) {
        // Toast is handled by page for more specific messages
    } else {
        toast({ variant: "destructive", title: "Profile Update Failed", description: "Could not update profile."});
    }
  }, [toast]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    let users = getMockUsers();
    const currentUser = users.find(u => u.id === user?.id);

    if (currentUser && (currentUser as any).password === currentPassword) {
      (currentUser as any).password = newPassword;
      saveMockUsers(users);
      // Update active user session if password was part of user object (it is in mock)
       setUser(prevUser => {
         if (!prevUser) return null;
         const updatedUserInSession = { ...prevUser, password: newPassword } as User & {password?: string};
         localStorage.setItem('authUser', JSON.stringify(updatedUserInSession));
         return updatedUserInSession;
       });
      toast({ title: "Password Changed", description: "Your password has been successfully updated."});
    } else {
      toast({ variant: "destructive", title: "Password Change Failed", description: "Incorrect current password."});
    }
    setIsLoading(false);
  }, [user, toast]);
  
  const sendPasswordResetEmail = useCallback(async (email: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const users = getMockUsers();
    const userExists = users.some(u => u.email === email);

    if (userExists) {
      // In a real app, backend sends email with a real token.
      // Mock: Store a token in localStorage (very insecure, for demo only)
      const mockToken = `mocktoken-${Date.now()}`;
      localStorage.setItem('mockPasswordResetToken', JSON.stringify({email, token: mockToken, expires: Date.now() + 3600000 })); // Expires in 1 hour
      console.log(`Mock password reset link: /reset-password?token=${mockToken}`);
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent. (This is a mock response. Check console for link).`});
    } else {
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent. (Mock: User not found, but sending generic message).`});
    }
    setIsLoading(false);
  }, [toast]);

  const confirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const storedTokenData = localStorage.getItem('mockPasswordResetToken');
    
    if (storedTokenData) {
      const { email, token: validToken, expires } = JSON.parse(storedTokenData);
      if (token === validToken && Date.now() < expires) {
        let users = getMockUsers();
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex > -1) {
          (users[userIndex] as any).password = newPassword;
          saveMockUsers(users);
          localStorage.removeItem('mockPasswordResetToken');
          toast({ title: "Password Reset Successful", description: "Your password has been changed. You can now sign in."});
          router.push('/login');
        } else {
           toast({ variant: "destructive", title: "Password Reset Failed", description: "User not found for this token."});
        }
      } else {
        toast({ variant: "destructive", title: "Password Reset Failed", description: "Invalid or expired reset token."});
      }
    } else {
      toast({ variant: "destructive", title: "Password Reset Failed", description: "No reset token found."});
    }
    setIsLoading(false);
  }, [toast, router]);


  const enableMfa = useCallback(async (): Promise<{ qrCodeUrl: string; recoveryCodes: string[] }> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/EOTISHub:${user?.email}?secret=MOCKSECRET1234567890&issuer=EOTISHub`;
    const recoveryCodes = Array.from({length: 5}, () => Math.random().toString(36).substring(2, 10).toUpperCase());
    setIsLoading(false);
    return { qrCodeUrl, recoveryCodes };
  }, [user?.email]);

  const confirmMfa = useCallback(async (code: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (code === '000000') { // Example valid code for mock
        setUser(prev => {
        if (!prev) return null;
        const updatedUser = { ...prev, isMfaEnabled: true };
        localStorage.setItem('authUser', JSON.stringify(updatedUser));
        // Update in mockUsers list as well
        let users = getMockUsers();
        users = users.map(u => u.id === updatedUser.id ? updatedUser : u);
        saveMockUsers(users);
        toast({ title: "MFA Enabled", description: "Multi-Factor Authentication is now active."});
        return updatedUser;
        });
    } else {
        toast({ variant: "destructive", title: "MFA Confirmation Failed", description: "The MFA code was invalid."});
        throw new Error('Invalid MFA code.');
    }
    setIsLoading(false);
  }, [toast]);
  
  const disableMfa = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
     setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, isMfaEnabled: false };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      // Update in mockUsers list as well
      let users = getMockUsers();
      users = users.map(u => u.id === updatedUser.id ? updatedUser : u);
      saveMockUsers(users);
      toast({ title: "MFA Disabled", description: "Multi-Factor Authentication has been turned off."});
      return updatedUser;
    });
    setIsLoading(false);
  }, [toast]);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, []);

  useEffect(() => {
    if (!isLoading && !user && !pathname.startsWith('/login') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password') && !pathname.startsWith('/signup')) {
      router.push('/login');
    }
     if (!isLoading && user && (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password'))) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router, pathname]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, signup, updateProfile, changePassword, sendPasswordResetEmail, confirmPasswordReset, enableMfa, confirmMfa, disableMfa, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
};
