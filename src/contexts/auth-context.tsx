// src/contexts/auth-context.tsx
'use client';

import type { User } from '@/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase'; // Import auth and db
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile, // Rename to avoid conflict with context's updateProfile
  updatePassword,
  sendPasswordResetEmail as fbSendPasswordResetEmail, // Rename
  confirmPasswordReset as fbConfirmPasswordReset, // Rename
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User as FirebaseUserDataType, // Type for Firebase user object
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// ================================================================================================
// !! IMPORTANT: MFA Functionality below is SIMPLIFIED. !!
// !! True TOTP MFA setup (QR code generation from secret, code verification) for authenticator apps
// !! typically requires backend logic (e.g., Firebase Cloud Functions).
// !! The current implementation toggles a flag in Firestore and uses a placeholder QR.
// ================================================================================================


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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
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
            name: firestoreData.name || firebaseUser.displayName, // Prefer Firestore name, fallback to Firebase Auth
            avatarUrl: firestoreData.avatarUrl || firebaseUser.photoURL, // Prefer Firestore avatar, fallback
            mustChangePassword: firestoreData.mustChangePassword || false,
            isMfaEnabled: firestoreData.isMfaEnabled || false,
          };
        } else {
          // New user logged in via Firebase Auth, but no Firestore profile yet
          // (e.g. if user was created directly in Firebase console without a corresponding Firestore doc)
          // Or, this is the very first login after account creation if done purely via Firebase Auth SDK
          const defaultMustChangePassword = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime;

          appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            avatarUrl: firebaseUser.photoURL,
            mustChangePassword: defaultMustChangePassword, // Default for new users or decide based on your logic
            isMfaEnabled: false,
          };
          // Create a profile in Firestore
          await setDoc(userRef, {
            email: appUser.email,
            name: appUser.name || '',
            avatarUrl: appUser.avatarUrl || '',
            mustChangePassword: appUser.mustChangePassword,
            isMfaEnabled: appUser.isMfaEnabled,
          }, { merge: true }); // merge true to avoid overwriting if somehow created concurrently
        }
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Theme initialization
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
    }
    
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user state and redirect
      // Toast is handled by onAuthStateChanged logic or redirect effect
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
      // onAuthStateChanged will set user to null
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
      if (data.name !== undefined) updatePayloadAuth.displayName = data.name;
      if (data.avatarUrl !== undefined) updatePayloadAuth.photoURL = data.avatarUrl;

      if (Object.keys(updatePayloadAuth).length > 0) {
        await fbUpdateProfile(auth.currentUser, updatePayloadAuth);
      }

      // Update Firestore profile
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const firestoreUpdateData: Partial<User> = {};
      if (data.name !== undefined) firestoreUpdateData.name = data.name;
      if (data.avatarUrl !== undefined) firestoreUpdateData.avatarUrl = data.avatarUrl;
      
      if (Object.keys(firestoreUpdateData).length > 0) {
        await updateDoc(userRef, firestoreUpdateData);
      }

      // Update local state
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
      return;
    }
    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      // If password changed successfully, also clear mustChangePassword flag in Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { mustChangePassword: false });
      setUser(prev => prev ? {...prev, mustChangePassword: false} : null);

      toast({ title: "Password Changed", description: "Your password has been successfully updated."});
    } catch (error: any) {
      console.error("Change password error:", error);
      toast({ variant: "destructive", title: "Password Change Failed", description: error.message });
      throw error; // Re-throw to allow form to handle its state
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
      
      // Update local state for mustChangePassword
      setUser(prevUser => prevUser ? { ...prevUser, mustChangePassword: false } : null);
      
      toast({ title: "Password Updated", description: "Your password has been successfully set."});
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Force change password error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update password." });
       // Potentially logout user if update fails catastrophically, or let them retry
    }
    setIsLoading(false);
  }, [router, toast]);
  
  const sendPasswordResetEmail = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      await fbSendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent.`});
    } catch (error: any) {
      console.error("Send password reset email error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
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
      toast({ variant: "destructive", title: "Password Reset Failed", description: error.message });
      throw error; // Re-throw for page to handle
    }
    setIsLoading(false);
  }, [toast, router]);

  const enableMfa = useCallback(async (): Promise<{ qrCodeUrl: string; recoveryCodes: string[] }> => {
    if (!auth.currentUser) {
      throw new Error("User not signed in");
    }
    setIsLoading(true);
    // SIMPLIFIED: Real TOTP setup requires backend.
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/EOTISHub:${auth.currentUser.email}?secret=SIMULATED_SECRET_REPLACE_WITH_REAL&issuer=EOTISHub`;
    const recoveryCodes = Array.from({length: 5}, () => Math.random().toString(36).substring(2, 10).toUpperCase());
    
    // We are not actually enabling MFA with Firebase Auth here, just simulating for UI.
    // In a real app, backend would generate secret, store it, etc.
    // Here, we'll just set a flag in Firestore.
    setIsLoading(false);
    toast({title: "MFA Setup (Simplified)", description: "Displaying mock QR. Actual MFA requires backend."})
    return { qrCodeUrl, recoveryCodes };
  }, [toast]);

  const confirmMfa = useCallback(async (code: string) => {
    if (!auth.currentUser) {
      throw new Error("User not signed in");
    }
    setIsLoading(true);
    // SIMPLIFIED: This is a mock confirmation.
    if (code === '000000') { // Use a "master" code for mock
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { isMfaEnabled: true });
      setUser(prev => prev ? {...prev, isMfaEnabled: true} : null);
      toast({ title: "MFA Enabled (Simplified)", description: "Multi-Factor Authentication flag is now active in profile."});
    } else {
      toast({ variant: "destructive", title: "MFA Confirmation Failed", description: "The MFA code was invalid (mock)."});
      throw new Error('Invalid MFA code (mock).');
    }
    setIsLoading(false);
  }, [toast]);
  
  const disableMfa = useCallback(async () => {
    if (!auth.currentUser) {
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
    // Update Firestore if you want to persist theme preference per user server-side
    // if (auth.currentUser) {
    //   const userRef = doc(db, 'users', auth.currentUser.uid);
    //   updateDoc(userRef, { theme: newTheme }).catch(console.error);
    // }
  }, []);

  // Redirect logic based on auth state and `mustChangePassword`
  useEffect(() => {
    if (isLoading) return;

    const authPages = ['/login', '/forgot-password', '/reset-password'];
    const isAuthPage = authPages.some(p => pathname.startsWith(p));

    if (user) {
      if (user.mustChangePassword && pathname !== '/force-change-password') {
        router.push('/force-change-password');
      } else if (!user.mustChangePassword && pathname === '/force-change-password') {
        router.push('/dashboard');
      } else if (isAuthPage && pathname !== '/reset-password') { // Allow /reset-password if token is present, even if logged in elsewhere
        router.push('/dashboard');
      }
    } else { // No user
      if (!isAuthPage && pathname !== '/force-change-password' && pathname !== '/') { // Also protect force-change-password, allow root to decide
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
