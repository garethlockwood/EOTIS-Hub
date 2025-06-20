
// src/app/(app)/profile/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Shield, Palette, User as UserIcon, KeyRound, QrCode } from 'lucide-react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image'; // Keep for QR code display
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types'; // Keep your app's User type
import { storage, auth } from '@/lib/firebase'; // Import auth for currentUser
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useSearchParams } from 'next/navigation';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').optional(),
  avatarFile: z.custom<FileList>((val) => val instanceof FileList, "Please upload a file")
                .optional()
                .refine(files => !files || files.length === 0 || (files?.[0]?.size ?? 0) <= 5 * 1024 * 1024, `Max file size is 5MB.`)
                .refine(files => !files || files.length === 0 || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(files?.[0]?.type ?? ''), 'Only .jpg, .jpeg, .png, .webp and .gif formats are supported.'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters.'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ['confirmPassword'],
});
type PasswordFormValues = z.infer<typeof passwordSchema>;

const mfaCodeSchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits.').regex(/^\d{6}$/, 'Invalid code format.'),
});
type MfaCodeFormValues = z.infer<typeof mfaCodeSchema>;


function ProfilePageContent() {
  const { user, updateProfile, changePassword, theme, setTheme, isLoading: authLoading, enableMfa, confirmMfa, disableMfa } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');


  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // values will be set in useEffect based on user state
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mfaCodeForm = useForm<MfaCodeFormValues>({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name || '', avatarFile: undefined });
      setAvatarPreview(user.avatarUrl || null);
    }
  }, [user, profileForm]);


  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Please select a JPG, PNG, WEBP, or GIF image."});
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast({ variant: "destructive", title: "File Too Large", description: "Maximum avatar size is 5MB."});
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      profileForm.setValue('avatarFile', files, { shouldValidate: true });
    } else {
      setAvatarPreview(user?.avatarUrl || null);
      profileForm.setValue('avatarFile', undefined);
    }
  };

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!auth.currentUser) { // Check Firebase auth.currentUser
      toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
      return;
    }
    setIsSavingProfile(true);
    const updatePayload: Partial<Pick<User, 'name' | 'avatarUrl'>> = {};

    if (data.name !== undefined && data.name !== (user?.name || '')) {
      updatePayload.name = data.name;
    }

    if (data.avatarFile && data.avatarFile.length > 0) {
      const file = data.avatarFile[0];
      const fileExtension = file.name.split('.').pop();
      const newFileName = `avatar.${fileExtension}`;
      const storagePath = `avatars/${auth.currentUser.uid}/${newFileName}`;
      const storageRef = ref(storage, storagePath);
      
      try {
        const uploadTask = uploadBytesResumable(storageRef, file);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {},
            (error) => {
              console.error("Firebase Storage upload error:", error);
              toast({ variant: "destructive", title: "Avatar Upload Failed", description: error.message || "Could not upload image." });
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                updatePayload.avatarUrl = downloadURL;
                resolve();
              } catch (error) {
                 console.error("Error getting download URL:", error);
                 toast({ variant: "destructive", title: "Avatar URL Error", description: (error as Error).message || "Could not get image URL." });
                 reject(error);
              }
            }
          );
        });
      } catch (error) {
        setIsSavingProfile(false);
        return;
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      try {
        await updateProfile(updatePayload); // This now calls AuthContext's updateProfile
        // Toast is handled by AuthContext or here if more specific message needed
      } catch (error) {
        // Error already toasted by AuthContext
      }
    } else {
      toast({ title: "No Changes", description: "No changes were detected in your profile." });
    }
    
    setIsSavingProfile(false);
    // Form reset and avatar preview update is handled by useEffect watching `user`
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    setIsChangingPassword(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      passwordForm.reset();
    } catch (error) {
      // Error toast is handled by AuthContext's changePassword
    }
    setIsChangingPassword(false);
  };
  
  const handleEnableMfa = async () => {
    setIsSettingUpMfa(true);
    mfaCodeForm.reset();
    try {
      const { qrCodeUrl, recoveryCodes } = await enableMfa(); // Calls AuthContext function
      setMfaQrCodeUrl(qrCodeUrl);
      setMfaRecoveryCodes(recoveryCodes);
      // Toast regarding simplified MFA is in AuthContext
    } catch (error: any) {
      toast({ variant: "destructive", title: "MFA Error", description: error.message || "Could not start MFA setup." });
    }
    // Keep isSettingUpMfa as true if QR is shown, or false if error. Let user proceed or cancel.
    // For this simplified version, we will set it to false as the "setup" is just displaying QR.
    // setIsSettingUpMfa(false); // Let it be true while QR is shown. User clicks verify or cancel.
  };

  const onMfaCodeSubmit: SubmitHandler<MfaCodeFormValues> = async (data) => {
    setIsSettingUpMfa(true); 
    try {
      await confirmMfa(data.code); // Calls AuthContext function
      setMfaQrCodeUrl(null); 
      setMfaRecoveryCodes([]);
      // Toast is handled by AuthContext
    } catch (error: any) {
      // Error toast is handled by AuthContext
    }
    setIsSettingUpMfa(false);
    mfaCodeForm.reset();
  };
  
  const handleCancelMfaSetup = () => {
    setMfaQrCodeUrl(null);
    setMfaRecoveryCodes([]);
    setIsSettingUpMfa(false); 
    mfaCodeForm.reset();
  };
  
  const handleDisableMfa = async () => {
    setIsSettingUpMfa(true);
    try {
      await disableMfa(); // Calls AuthContext function
      // Toast is handled by AuthContext
    } catch (error: any) {
      // Error toast is handled by AuthContext
    }
    setIsSettingUpMfa(false);
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'security', 'appearance'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);


  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="My Profile & Settings" description="Manage your account details, security, and application preferences." />
      <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          window.history.replaceState(null, '', `/profile?tab=${value}`);
          if (!isSavingProfile && value === 'profile' && user) { // Check user exists
            setAvatarPreview(user.avatarUrl || null);
            profileForm.reset({ name: user.name || '', avatarFile: undefined });
          }
      }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" />Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your name and avatar. Max avatar size: 5MB (JPG, PNG, GIF, WEBP).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview || undefined} alt={user.name || 'User'} data-ai-hint="user avatar"/>
                    <AvatarFallback>{user.name ? user.name.substring(0,2).toUpperCase() : (user.email ? user.email.substring(0,2).toUpperCase() : 'U')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <Label htmlFor="avatarFile">Change Avatar</Label>
                     <Controller
                        name="avatarFile"
                        control={profileForm.control}
                        render={({ field }) => (
                            <Input 
                                id="avatarFile" 
                                type="file" 
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                onChange={(e) => {
                                    field.onChange(e.target.files); 
                                    handleAvatarChange(e);         
                                }}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                name={field.name}
                                className="mt-1"
                            />
                        )}
                    />
                    {profileForm.formState.errors.avatarFile && <p className="text-sm text-destructive mt-1">{profileForm.formState.errors.avatarFile.message}</p>}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...profileForm.register('name')} className="mt-1" />
                  {profileForm.formState.errors.name && <p className="text-sm text-destructive mt-1">{profileForm.formState.errors.name.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={user.email || ''} disabled className="mt-1 bg-muted/50" />
                  <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here. Contact support if needed.</p>
                </div>
                
                <Button type="submit" disabled={isSavingProfile || authLoading || (!profileForm.formState.isDirty && !profileForm.getValues('avatarFile'))}>
                  {isSavingProfile || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your login password.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} className="mt-1" />
                    {passwordForm.formState.errors.currentPassword && <p className="text-sm text-destructive mt-1">{passwordForm.formState.errors.currentPassword.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} className="mt-1" />
                    {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} className="mt-1" />
                    {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
                  </div>
                  <Button type="submit" disabled={isChangingPassword || authLoading}>
                    {isChangingPassword || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multi-Factor Authentication (MFA)</CardTitle>
                <CardDescription>Simplified MFA: Enhance your account security using an authenticator app (e.g., Google Authenticator, Authy). Full TOTP setup requires backend changes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.isMfaEnabled ? (
                  <div>
                    <p className="text-green-600 font-medium mb-2">MFA flag is currently enabled in your profile.</p>
                    <Button variant="destructive" onClick={handleDisableMfa} disabled={isSettingUpMfa || authLoading}>
                      {isSettingUpMfa || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Disable MFA Flag
                    </Button>
                  </div>
                ) : mfaQrCodeUrl ? (
                  <>
                    <p>1. Scan the placeholder QR code with your authenticator app:</p>
                    <div className="flex justify-center my-4">
                         <Image src={mfaQrCodeUrl} alt="MFA QR Code" width={200} height={200} data-ai-hint="qr code"/>
                    </div>
                    <p>2. Enter the 6-digit code from your authenticator app (use '000000' for this mock):</p>
                    <form onSubmit={mfaCodeForm.handleSubmit(onMfaCodeSubmit)} className="flex items-start gap-2">
                         <div className="flex-grow">
                            <Input placeholder="000000" {...mfaCodeForm.register('code')} />
                            {mfaCodeForm.formState.errors.code && <p className="text-sm text-destructive mt-1">{mfaCodeForm.formState.errors.code.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSettingUpMfa || authLoading}>
                            {isSettingUpMfa || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                            Verify & Enable Flag
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancelMfaSetup} disabled={isSettingUpMfa || authLoading}>Cancel</Button>
                    </form>
                    {mfaRecoveryCodes.length > 0 && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="font-semibold">Save your recovery codes (mock)!</p>
                        <p className="text-xs text-muted-foreground">Store these in a safe place. They can be used to access your account if you lose access to your authenticator app.</p>
                        <ul className="list-disc list-inside mt-2 font-mono text-sm">
                          {mfaRecoveryCodes.map(code => <li key={code}>{code}</li>)}
                        </ul>
                         <Button variant="outline" size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(mfaRecoveryCodes.join('\n'))}>Copy Codes</Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-2">MFA flag is currently disabled in your profile.</p>
                    <Button onClick={handleEnableMfa} disabled={isSettingUpMfa || authLoading}>
                      {isSettingUpMfa || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Enable MFA Flag
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="theme-toggle" className="font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  aria-label="Toggle dark mode"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function ProfilePage() {
  return (
    // Suspense is good practice for pages with useSearchParams
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <ProfilePageContent />
    </Suspense>
  )
}

