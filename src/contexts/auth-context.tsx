// src/contexts/auth-context.tsx
'use client';

import type { User } from '@/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forceChangePassword: (newPassword: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  enableMfa: () => Promise<{ qrCodeUrl: string; recoveryCodes: string[] }>;
  confirmMfa: (code: string) => Promise<void>;
  disableMfa: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getMockUsers = (): User[] => {
  const stored = localStorage.getItem('mockUsers');
  // Initialize with a default user if none exist, for easier first-time setup
  if (!stored) {
    const defaultUser: User & { password?: string; mustChangePassword?: boolean } = {
      id: 'admin-01',
      email: 'admin@eotishub.com',
      name: 'Admin User',
      avatarUrl: 'https://placehold.co/100x100.png?text=A',
      isMfaEnabled: false,
      password: 'password123', // Temporary default password
      mustChangePassword: true, // Force change on first login
    };
    saveMockUsers([defaultUser]);
    return [defaultUser];
  }
  return JSON.parse(stored);
};

const saveMockUsers = (users: User[]) => {
  localStorage.setItem('mockUsers', JSON.stringify(users));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false); // Moved here to ensure it runs after attempting to load user

    // Initialize mockUsers if not already present
    getMockUsers();


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
    const foundUser = users.find(u => u.email === email && (u as any).password === pass);

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('authUser', JSON.stringify(foundUser));
      toast({ title: "Login Successful", description: `Welcome back, ${foundUser.name || foundUser.email}!`});
      if (foundUser.mustChangePassword) {
        router.push('/force-change-password');
      } else {
        router.push('/dashboard');
      }
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
    localStorage.removeItem('mockPasswordResetToken');
    toast({ title: "Logged Out", description: "You have been successfully logged out."});
    router.push('/login');
    setIsLoading(false);
  }, [router, toast]);

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => {
    setIsLoading(true);
    let success = false;
    setUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...data };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      
      let users = getMockUsers();
      users = users.map(u => u.id === updatedUser.id ? updatedUser : u);
      saveMockUsers(users);
      success = true;
      return updatedUser;
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsLoading(false);
    if (!success) {
        toast({ variant: "destructive", title: "Profile Update Failed", description: "Could not update profile."});
    }
     // Success toast is usually handled by the page calling updateProfile for more specific messages
  }, [toast]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    let users = getMockUsers();
    const currentUserInList = users.find(u => u.id === user?.id);

    if (currentUserInList && (currentUserInList as any).password === currentPassword) {
      (currentUserInList as any).password = newPassword;
      // Also ensure mustChangePassword flag is cleared if it was still set
      currentUserInList.mustChangePassword = false; 
      saveMockUsers(users);
      
      setUser(prevUser => {
         if (!prevUser) return null;
         const updatedUserInSession = { ...prevUser, password: newPassword, mustChangePassword: false } as User & {password?: string};
         localStorage.setItem('authUser', JSON.stringify(updatedUserInSession));
         return updatedUserInSession;
       });
      toast({ title: "Password Changed", description: "Your password has been successfully updated."});
    } else {
      toast({ variant: "destructive", title: "Password Change Failed", description: "Incorrect current password."});
      throw new Error("Incorrect current password.");
    }
    setIsLoading(false);
  }, [user, toast]);

  const forceChangePassword = useCallback(async (newPassword: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "No user logged in." });
      router.push('/login');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    let users = getMockUsers();
    const userIndex = users.findIndex(u => u.id === user.id);

    if (userIndex > -1) {
      (users[userIndex] as any).password = newPassword;
      users[userIndex].mustChangePassword = false;
      saveMockUsers(users);

      const updatedUserSession = { ...user, password: newPassword, mustChangePassword: false } as User & {password?: string};
      setUser(updatedUserSession);
      localStorage.setItem('authUser', JSON.stringify(updatedUserSession));
      
      toast({ title: "Password Updated", description: "Your password has been successfully set."});
      router.push('/dashboard');
    } else {
      toast({ variant: "destructive", title: "Error", description: "User not found. Please log in again." });
      setUser(null);
      localStorage.removeItem('authUser');
      router.push('/login');
    }
    setIsLoading(false);
  }, [user, router, toast]);
  
  const sendPasswordResetEmail = useCallback(async (email: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const users = getMockUsers();
    const userExists = users.some(u => u.email === email);

    if (userExists) {
      const mockToken = `mocktoken-${Date.now()}`;
      localStorage.setItem('mockPasswordResetToken', JSON.stringify({email, token: mockToken, expires: Date.now() + 3600000 }));
      console.log(`Mock password reset link: /reset-password?token=${mockToken}`);
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent. (Mock: Check console for link).`});
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
          users[userIndex].mustChangePassword = false; // Clear this flag too
          saveMockUsers(users);
          localStorage.removeItem('mockPasswordResetToken');
          toast({ title: "Password Reset Successful", description: "Your password has been changed. You can now sign in."});
          router.push('/login');
        } else {
           toast({ variant: "destructive", title: "Password Reset Failed", description: "User not found for this token."});
           throw new Error("User not found for this token.");
        }
      } else {
        toast({ variant: "destructive", title: "Password Reset Failed", description: "Invalid or expired reset token."});
        throw new Error("Invalid or expired reset token.");
      }
    } else {
      toast({ variant: "destructive", title: "Password Reset Failed", description: "No reset token found."});
      throw new Error("No reset token found.");
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
    if (code === '000000') { 
        setUser(prev => {
        if (!prev) return null;
        const updatedUser = { ...prev, isMfaEnabled: true };
        localStorage.setItem('authUser', JSON.stringify(updatedUser));
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
    if (isLoading) return; // Don't run redirect logic while still loading initial auth state

    const authPages = ['/login', '/forgot-password', '/reset-password'];
    const isAuthPage = authPages.some(p => pathname.startsWith(p));

    if (user) {
      if (user.mustChangePassword && pathname !== '/force-change-password') {
        router.push('/force-change-password');
      } else if (!user.mustChangePassword && pathname === '/force-change-password') {
        router.push('/dashboard');
      } else if (isAuthPage) {
        router.push('/dashboard');
      }
    } else { // No user
      if (!isAuthPage && pathname !== '/force-change-password') { // Also protect force-change-password if no user
        router.push('/login');
      }
    }
  }, [user, isLoading, router, pathname]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile, changePassword, forceChangePassword, sendPasswordResetEmail, confirmPasswordReset, enableMfa, confirmMfa, disableMfa, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
};
