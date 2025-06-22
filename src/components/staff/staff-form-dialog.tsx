
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { addStaffMember } from '@/app/(app)/staff/actions';
import { Loader2, UserPlus } from 'lucide-react';
import type { StaffMember } from '@/types';

const staffFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  type: z.enum(['Tutor', 'Professional']),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  hourlyRate: z.coerce.number().optional(),
  specialty: z.string().optional(),
  subjects: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffAdded: (newStaffMember: StaffMember) => void;
  staffMember?: StaffMember | null;
  studentId: string;
}

export function StaffFormDialog({ isOpen, onOpenChange, onStaffAdded, staffMember, studentId }: StaffFormDialogProps) {
  const { user: adminUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: '',
      type: 'Tutor',
      bio: '',
      contactEmail: '',
      contactPhone: '',
      hourlyRate: 0,
      specialty: '',
      subjects: '',
    },
  });
  
  const selectedType = form.watch('type');

  useEffect(() => {
    if (staffMember) {
      form.reset({
        name: staffMember.name,
        type: staffMember.type,
        bio: staffMember.bio,
        contactEmail: staffMember.contactEmail || '',
        contactPhone: staffMember.contactPhone || '',
        hourlyRate: staffMember.hourlyRate || 0,
        specialty: staffMember.specialty || '',
        subjects: staffMember.subjects?.join(', ') || '',
      });
    } else {
      form.reset();
    }
  }, [staffMember, form]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  const onSubmit: SubmitHandler<StaffFormValues> = async (data) => {
    if (!adminUser?.id) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Admin user not found.' });
      return;
    }
    if (!studentId) {
        toast({ variant: 'destructive', title: 'Student Error', description: 'No student selected to associate with.' });
        return;
    }

    setIsSubmitting(true);
    
    const staffPayload: Omit<StaffMember, 'id'> = {
      name: data.name,
      type: data.type,
      bio: data.bio,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      studentIds: [studentId], // Associate with the current student
    };

    if (data.type === 'Tutor') {
      staffPayload.hourlyRate = data.hourlyRate;
      staffPayload.subjects = data.subjects ? data.subjects.split(',').map(s => s.trim()).filter(Boolean) : [];
    } else {
      staffPayload.specialty = data.specialty;
    }

    const result = await addStaffMember(staffPayload, adminUser.id);

    if (result.success && result.staffMember) {
      toast({
        title: 'Staff Member Added',
        description: `${data.name} has been added to the directory.`,
      });
      onStaffAdded(result.staffMember);
      handleOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{staffMember ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the new staff member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select staff type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Tutor">Tutor</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            
            {selectedType === 'Tutor' && (
                <>
                    <FormField control={form.control} name="subjects" render={({ field }) => (
                        <FormItem><FormLabel>Subjects</FormLabel>
                        <FormControl><Input placeholder="Math, Physics (comma-separated)" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="hourlyRate" render={({ field }) => (
                        <FormItem><FormLabel>Hourly Rate</FormLabel>
                        <FormControl><Input type="number" placeholder="50" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                </>
            )}
            
            {selectedType === 'Professional' && (
                <FormField control={form.control} name="specialty" render={({ field }) => (
                    <FormItem><FormLabel>Specialty</FormLabel>
                    <FormControl><Input placeholder="Educational Psychologist" {...field} /></FormControl>
                    <FormMessage /></FormItem>
                )} />
            )}

            <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem><FormLabel>Biography</FormLabel>
                <FormControl><Textarea placeholder="A short bio about their experience..." {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />

             <FormField control={form.control} name="contactEmail" render={({ field }) => (
                <FormItem><FormLabel>Contact Email</FormLabel>
                <FormControl><Input type="email" placeholder="staff@example.com" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="contactPhone" render={({ field }) => (
                <FormItem><FormLabel>Contact Phone</FormLabel>
                <FormControl><Input type="tel" placeholder="01234 567890" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />

            <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-0 -mb-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {staffMember ? 'Save Changes' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
