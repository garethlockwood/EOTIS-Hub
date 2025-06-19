// src/app/(app)/profile/page.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Upload, Shield, Palette, User as UserIcon, KeyRound, QrCode } from 'lucide-react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').optional(),
  // email: z.string().email().optional(), // Email likely not editable or handled differently
  avatarFile: z.instanceof(FileList).optional(),
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


export default function ProfilePage() {
  const { user, updateProfile, changePassword, theme, setTheme, isLoading: authLoading, enableMfa, confirmMfa, disableMfa } = useAuth();
  const { toast } = useToast();
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);


  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name || '', avatarFile: undefined },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mfaCodeForm = useForm<MfaCodeFormValues>({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { code: '' },
  });

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setIsSavingProfile(true);
    // In a real app, handle avatarFile upload first, get URL, then updateProfile
    // For now, we'll just pass the name.
    await updateProfile({ name: data.name });
    if (data.avatarFile && data.avatarFile.length > 0) {
        toast({ title: "Avatar Upload", description: "Avatar upload is a placeholder. Real implementation needed."});
    }
    toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    setIsSavingProfile(false);
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    setIsChangingPassword(true);
    await changePassword(data.currentPassword, data.newPassword);
    // Real app would provide feedback from changePassword function.
    // For mock, we alert in useAuth. We can also toast here.
    toast({ title: "Password Change Request", description: "Password change attempt submitted (mocked)." });
    passwordForm.reset();
    setIsChangingPassword(false);
  };
  
  const handleEnableMfa = async () => {
    setIsSettingUpMfa(true);
    try {
      const { qrCodeUrl, recoveryCodes } = await enableMfa();
      setMfaQrCodeUrl(qrCodeUrl);
      setMfaRecoveryCodes(recoveryCodes);
      mfaCodeForm.reset();
    } catch (error) {
      toast({ variant: "destructive", title: "MFA Error", description: "Could not start MFA setup." });
      setIsSettingUpMfa(false); // Ensure loading state is reset on error
    }
    // setIsSettingUpMfa(false) will be handled by confirm or cancel
  };

  const onMfaCodeSubmit: SubmitHandler<MfaCodeFormValues> = async (data) => {
    setIsSettingUpMfa(true); // Keep loading
    try {
      await confirmMfa(data.code);
      setMfaQrCodeUrl(null); // Clear QR after confirmation
      setMfaRecoveryCodes([]);
      toast({ title: "MFA Setup Complete", description: "Multi-Factor Authentication has been enabled." });
    } catch (error) {
      toast({ variant: "destructive", title: "MFA Confirmation Failed", description: "The MFA code was invalid. Please try again." });
    }
    setIsSettingUpMfa(false);
    mfaCodeForm.reset();
  };
  
  const handleCancelMfaSetup = () => {
    setMfaQrCodeUrl(null);
    setMfaRecoveryCodes([]);
    setIsSettingUpMfa(false); 
    // Optionally call a backend endpoint to cancel any pending MFA setup if needed
  };
  
  const handleDisableMfa = async () => {
    setIsSettingUpMfa(true);
    try {
      await disableMfa();
      toast({ title: "MFA Disabled", description: "Multi-Factor Authentication has been disabled." });
    } catch (error) {
      toast({ variant: "destructive", title: "MFA Error", description: "Could not disable MFA." });
    }
    setIsSettingUpMfa(false);
  };


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
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" />Security</TabsTrigger>
          <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" />Appearance</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your name and avatar.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.name ? user.name.substring(0,2).toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <Label htmlFor="avatarFile">Change Avatar (PNG, JPG)</Label>
                    <Controller
                        name="avatarFile"
                        control={profileForm.control}
                        render={({ field: { onChange, value, ...restField } }) => (
                            <Input 
                                id="avatarFile" 
                                type="file" 
                                accept="image/png, image/jpeg"
                                onChange={(e) => onChange(e.target.files)}
                                {...restField}
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
                  <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed.</p>
                </div>
                
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
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
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Change Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multi-Factor Authentication (MFA)</CardTitle>
                <CardDescription>Enhance your account security using Microsoft Authenticator or a compatible app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.isMfaEnabled ? (
                  <div>
                    <p className="text-green-600 font-medium mb-2">MFA is currently enabled.</p>
                    <Button variant="destructive" onClick={handleDisableMfa} disabled={isSettingUpMfa}>
                      {isSettingUpMfa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Disable MFA
                    </Button>
                  </div>
                ) : mfaQrCodeUrl ? (
                  <>
                    <p>1. Scan the QR code with Microsoft Authenticator or a compatible TOTP app:</p>
                    <div className="flex justify-center my-4">
                         <Image src={mfaQrCodeUrl} alt="MFA QR Code" width={200} height={200} data-ai-hint="qr code" />
                    </div>
                    <p>2. Enter the 6-digit code from your authenticator app:</p>
                    <form onSubmit={mfaCodeForm.handleSubmit(onMfaCodeSubmit)} className="flex items-start gap-2">
                         <div className="flex-grow">
                            <Input placeholder="123456" {...mfaCodeForm.register('code')} />
                            {mfaCodeForm.formState.errors.code && <p className="text-sm text-destructive mt-1">{mfaCodeForm.formState.errors.code.message}</p>}
                        </div>
                        <Button type="submit" disabled={isSettingUpMfa}>
                            {isSettingUpMfa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                            Verify & Enable
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancelMfaSetup} disabled={isSettingUpMfa}>Cancel</Button>
                    </form>
                    {mfaRecoveryCodes.length > 0 && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="font-semibold">Save your recovery codes!</p>
                        <p className="text-xs text-muted-foreground">Store these in a safe place. They can be used to access your account if you lose access to your authenticator app.</p>
                        <ul className="list-disc list-inside mt-2 font-mono text-sm">
                          {mfaRecoveryCodes.map(code => <li key={code}>{code}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-2">MFA is currently disabled.</p>
                    <Button onClick={handleEnableMfa} disabled={isSettingUpMfa}>
                      {isSettingUpMfa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Enable MFA
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
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
