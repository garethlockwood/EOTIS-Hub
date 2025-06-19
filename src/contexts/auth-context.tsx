// src/contexts/auth-context.tsx
'use client';

import type { User } from '@/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>; // Pass is unused in mock
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>; // Allow avatarUrl
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  enableMfa: () => Promise<{ qrCodeUrl: string; recoveryCodes: string[] }>;
  confirmMfa: (code: string) => Promise<void>;
  disableMfa: () => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const router = useRouter();
  const pathname = usePathname();

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

  const login = useCallback(async (email: string, _pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockUser: User = { id: '1', email, name: 'Test User', avatarUrl: 'https://placehold.co/100x100.png?text=U', isMfaEnabled: false };
    setUser(mockUser);
    localStorage.setItem('authUser', JSON.stringify(mockUser));
    setIsLoading(false);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    localStorage.removeItem('authUser');
    setIsLoading(false);
    router.push('/login');
  }, [router]);

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...data };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      return updatedUser;
    });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    // In a real app, you'd show a success toast from the page after this promise resolves
  }, []);

  const changePassword = useCallback(async (_currentPassword: string, _newPassword: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock: In a real app, call backend. If successful:
    // alert('Password changed successfully (mocked).');
    // If error:
    // alert('Failed to change password (mocked). Current password might be incorrect.');
    // For now, handled by toast on page
  }, []);

  const enableMfa = useCallback(async (): Promise<{ qrCodeUrl: string; recoveryCodes: string[] }> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Backend would generate actual QR and codes
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/EOTISHub:${user?.email}?secret=MOCKSECRET&issuer=EOTISHub`;
    const recoveryCodes = Array.from({length: 5}, () => Math.random().toString(36).substring(2, 10).toUpperCase());
    
    // Do NOT set isMfaEnabled to true here. It's set upon successful confirmation.
    // User state is updated in confirmMfa.
    return { qrCodeUrl, recoveryCodes };
  }, [user?.email]);

  const confirmMfa = useCallback(async (code: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock: verify code (e.g. '123456' is valid)
    if (code === '000000') { // Example valid code for mock
        setUser(prev => {
        if (!prev) return null;
        const updatedUser = { ...prev, isMfaEnabled: true };
        localStorage.setItem('authUser', JSON.stringify(updatedUser));
        return updatedUser;
        });
    } else {
        throw new Error('Invalid MFA code. Please try again.');
    }
  }, []);
  
  const disableMfa = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
     setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, isMfaEnabled: false };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, []);

  useEffect(() => {
    if (!isLoading && !user && !pathname.startsWith('/login') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password')) {
      router.push('/login');
    }
  }, [user, isLoading, router, pathname]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile, changePassword, enableMfa, confirmMfa, disableMfa, theme, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
};
