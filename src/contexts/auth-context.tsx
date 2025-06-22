
// src/contexts/auth-context.tsx
'use client';

// !! IMPORTANT: MFA Functionality below is SIMPLIFIED. !!
// !! True TOTP MFA setup (QR code generation from secret, code verification) for authenticator apps
// !! typically requires backend logic (e.g., Firebase Cloud Functions).
// !! The current implementation toggles a flag in Firestore and uses a placeholder QR.
// !! AUTHENTICATION IS NOW REAL (Firebase Auth).

import type { User, Currency } from '@/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile,
  updatePassword,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  confirmPasswordReset as fbConfirmPasswordReset,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseUserDataType,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';


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
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [currency, setCurrencyState] = useState<Currency>('GBP');
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserDataType | null) => {
      setIsLoading(true);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        let appUser: User;

        if (userSnap.exists()) {
          const firestoreData = userSnap.data();
          appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firestoreData.name || firebaseUser.displayName,
            avatarUrl: firestoreData.avatarURL || firebaseUser.photoURL,
            mustChangePassword: firestoreData.mustChangePassword || false,
            isMfaEnabled: firestoreData.isMfaEnabled || false,
            isAdmin: firestoreData.isAdmin || false, // Fetch isAdmin flag
          };
        } else {
          // For a brand new Firebase Auth user not yet in Firestore
          const defaultMustChangePassword = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime;
          appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            avatarUrl: firebaseUser.photoURL,
            mustChangePassword: defaultMustChangePassword,
            isMfaEnabled: false,
            isAdmin: false, // Default to not admin
          };
          // Create their Firestore document
          await setDoc(userRef, {
            email: appUser.email,
            name: appUser.name || '',
            avatarURL: appUser.avatarUrl || '',
            mustChangePassword: appUser.mustChangePassword,
            isMfaEnabled: appUser.isMfaEnabled,
            isAdmin: appUser.isAdmin, // Save isAdmin flag
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
    }

    const storedCurrency = localStorage.getItem('currency') as Currency | null;
    if (storedCurrency) {
      setCurrencyState(storedCurrency);
    }
    
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Login error:", error);
      toast({ variant: "destructive", title: "Login Failed", description: error.message || "Invalid email or password."});
    }
    setIsLoading(false);
  }, [toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out."});
      router.push('/login');
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
    setIsLoading(false);
  }, [router, toast]);

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => {
    if (!auth.currentUser) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "No user is currently signed in."});
      return;
    }
    setIsLoading(true);
    try {
      const updatePayloadAuth: { displayName?: string | null; photoURL?: string | null } = {};
      if (data.name !== undefined && data.name !== null) updatePayloadAuth.displayName = data.name;
      if (data.avatarUrl !== undefined && data.avatarUrl !== null) updatePayloadAuth.photoURL = data.avatarUrl;

      if (Object.keys(updatePayloadAuth).length > 0) {
        await fbUpdateProfile(auth.currentUser, updatePayloadAuth);
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const firestoreUpdatePayload: { name?: string; avatarURL?: string } = {};
      if (data.name !== undefined) firestoreUpdatePayload.name = data.name;
      if (data.avatarUrl !== undefined) firestoreUpdatePayload.avatarURL = data.avatarUrl; 
      
      if (Object.keys(firestoreUpdatePayload).length > 0) {
        await updateDoc(userRef, firestoreUpdatePayload);
      }

      setUser(prevUser => prevUser ? { ...prevUser, ...data } : null);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ variant: "destructive", title: "Profile Update Failed", description: error.message });
    }
    setIsLoading(false);
  }, [toast]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      toast({ variant: "destructive", title: "Error", description: "No user is signed in or email is missing." });
      throw new Error("No user is signed in or email is missing.");
    }
    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { mustChangePassword: false });
      setUser(prev => prev ? {...prev, mustChangePassword: false} : null);

      toast({ title: "Password Changed", description: "Your password has been successfully updated."});
    } catch (error: any) {
      console.error("Change password error:", error);
      toast({ variant: "destructive", title: "Password Change Failed", description: error.message });
      throw error;
    }
    setIsLoading(false);
  }, [toast]);

  const forceChangePassword = useCallback(async (newPassword: string) => {
    if (!auth.currentUser) {
      toast({ variant: "destructive", title: "Error", description: "No user logged in." });
      router.push('/login');
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { mustChangePassword: false });
      
      setUser(prevUser => prevUser ? { ...prevUser, mustChangePassword: false } : null);
      
      toast({ title: "Password Updated", description: "Your password has been successfully set."});
    } catch (error: any) {
      console.error("Force change password error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update password." });
    }
    setIsLoading(false);
  }, [router, toast]);
  
  const sendPasswordResetEmail = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      await fbSendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent.`});
    } catch (error: any)  {
      console.error("Send password reset email error:", error);
      const firebaseError = error as { code?: string; message: string };
      toast({ variant: "destructive", title: "Error", description: firebaseError.message || "Failed to send password reset email." });
    }
    setIsLoading(false);
  }, [toast]);

  const confirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    setIsLoading(true);
    try {
      await fbConfirmPasswordReset(auth, token, newPassword);
      toast({ title: "Password Reset Successful", description: "Your password has been changed. You can now sign in."});
      router.push('/login');
    } catch (error: any) {
      console.error("Confirm password reset error:", error);
      const firebaseError = error as { code?: string; message: string };
      toast({ variant: "destructive", title: "Password Reset Failed", description: firebaseError.message || "Invalid or expired reset code." });
      throw error;
    }
    setIsLoading(false);
  }, [toast, router]);

  const enableMfa = useCallback(async (): Promise<{ qrCodeUrl: string; recoveryCodes: string[] }> => {
    if (!auth.currentUser || !auth.currentUser.email) {
      toast({variant: "destructive", title: "MFA Error", description: "User not signed in or email missing."})
      throw new Error("User not signed in or email missing");
    }
    setIsLoading(true);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/EOTISHub:${encodeURIComponent(auth.currentUser.email)}?secret=SIMULATED_MOCK_SECRET&issuer=EOTISHub`;
    const recoveryCodes = Array.from({length: 5}, () => Math.random().toString(36).substring(2, 10).toUpperCase());
    
    setIsLoading(false);
    toast({title: "MFA Setup (Simplified)", description: "Displaying mock QR. Full MFA requires backend changes."})
    return { qrCodeUrl, recoveryCodes };
  }, [toast]);

  const confirmMfa = useCallback(async (code: string) => {
    if (!auth.currentUser) {
      toast({variant: "destructive", title: "MFA Error", description: "User not signed in."})
      throw new Error("User not signed in");
    }
    setIsLoading(true);
    if (code === '000000') { 
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { isMfaEnabled: true });
      setUser(prev => prev ? {...prev, isMfaEnabled: true} : null);
      toast({ title: "MFA Enabled (Simplified)", description: "Multi-Factor Authentication flag is now active in profile."});
    } else {
      toast({ variant: "destructive", title: "MFA Confirmation Failed", description: "The MFA code was invalid (mock). Use '000000'."});
      throw new Error('Invalid MFA code (mock). Use "000000".');
    }
    setIsLoading(false);
  }, [toast]);
  
  const disableMfa = useCallback(async () => {
    if (!auth.currentUser) {
      toast({variant: "destructive", title: "MFA Error", description: "User not signed in."})
      throw new Error("User not signed in");
    }
    setIsLoading(true);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { isMfaEnabled: false });
    setUser(prev => prev ? {...prev, isMfaEnabled: false} : null);
    toast({ title: "MFA Disabled (Simplified)", description: "Multi-Factor Authentication flag has been turned off in profile."});
    setIsLoading(false);
  }, [toast]);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }, []);
  
  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);
    toast({ title: "Currency Updated", description: `Currency set to ${newCurrency}.` });
  }, [toast]);

  useEffect(() => {
    if (isLoading) return;

    const publicPaths = ['/login', '/forgot-password', '/reset-password'];
    const isPublicPath = publicPaths.some(p => pathname.startsWith(p));
    const isRootPath = pathname === '/'; 

    if (user) {
      if (user.mustChangePassword && pathname !== '/force-change-password') {
        router.push('/force-change-password');
      } else if (!user.mustChangePassword && pathname === '/force-change-password') {
        router.push('/dashboard');
      } else if (isPublicPath && !pathname.startsWith('/reset-password')) { 
        router.push('/dashboard');
      }
    } else { 
      if (!isPublicPath && !isRootPath && pathname !== '/force-change-password') {
        router.push('/login');
      }
    }
  }, [user, isLoading, router, pathname]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile, changePassword, forceChangePassword, sendPasswordResetEmail, confirmPasswordReset, enableMfa, confirmMfa, disableMfa, theme, setTheme, currency, setCurrency }}>
      {children}
    </AuthContext.Provider>
  );
};
