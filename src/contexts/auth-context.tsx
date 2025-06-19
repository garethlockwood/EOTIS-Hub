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
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  enableMfa: () => Promise<{ qrCodeUrl: string; recoveryCodes: string[] }>; // Mocked
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
    // Simulate checking auth status
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);

    // Theme initialization
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const mockUser: User = { id: '1', email, name: 'Test User', avatarUrl: 'https://placehold.co/40x40.png', isMfaEnabled: false };
    setUser(mockUser);
    localStorage.setItem('authUser', JSON.stringify(mockUser));
    setIsLoading(false);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    localStorage.removeItem('authUser');
    setIsLoading(false);
    router.push('/login');
  }, [router]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return;
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('authUser', JSON.stringify(updatedUser));
    // In a real app, you'd show a success toast
  }, [user]);

  const changePassword = useCallback(async (_currentPassword: string, _newPassword: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real app, you'd handle success/error and show a toast
    alert('Password change flow placeholder. Implement with backend.');
  }, []);

  const enableMfa = useCallback(async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(prev => prev ? ({ ...prev, isMfaEnabled: false }) : null); // Temporarily set to false until confirmed
    // In a real app, backend generates QR code URL and recovery codes
    return { qrCodeUrl: 'https://placehold.co/200x200.png?text=Mock+QR+Code', recoveryCodes: ['ABCDE-FGHIJ', 'KLMNO-PQRST'] };
  }, []);

  const confirmMfa = useCallback(async (_code: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, isMfaEnabled: true };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      return updatedUser;
    });
    alert('MFA Enabled (mocked).');
  }, []);
  
  const disableMfa = useCallback(async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
     setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, isMfaEnabled: false };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      return updatedUser;
    });
    alert('MFA Disabled (mocked).');
  }, []);


  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, []);

  // Route protection logic (client-side part, works with middleware)
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
