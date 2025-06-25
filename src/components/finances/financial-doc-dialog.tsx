
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { addFinancialDocument, updateFinancialDocument } from '@/app/(app)/finances/actions';
import { Loader2, UploadCloud, Save } from 'lucide-react';
import type { FinancialDocument } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';

const financialDocSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  type: z.enum(['Invoice', 'Receipt', 'FinancialReport']),
  amount: z.coerce.number().optional(),
  status: z.enum(['Paid', 'Unpaid', 'Overdue']),
  file: z.custom<FileList>().optional(),
});

type FormValues = z.infer<typeof financialDocSchema>;

interface FinancialDocDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void; // A simple callback to refetch data on the parent page
  document?: FinancialDocument | null;
  studentId: string;
}

export function FinancialDocDialog({ isOpen, onOpenChange, onSave, document, studentId }: FinancialDocDialogProps) {
  const { user: adminUser, currency } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!document;

  const form = useForm<FormValues>({
    resolver: zodResolver(financialDocSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (document) {
        form.reset({
          name: document.name,
          type: document.type,
          amount: document.amount,
          status: document.status,
          file: undefined,
        });
      } else {
        form.reset({
          name: '',
          type: 'Invoice',
          amount: 0,
          status: 'Unpaid',
          file: undefined,
        });
      }
    }
  }, [document, isOpen, form]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
    onOpenChange(open);
  };

  const onSubmit = async (data: FormValues) => {
    if (!adminUser?.id || !studentId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or student information is missing.' });
      return;
    }
    
    setIsSubmitting(true);
    let result;

    if (isEditing && document) {
        const updatePayload = {
            name: data.name,
            type: data.type,
            status: data.status,
            amount: data.amount,
        };
        result = await updateFinancialDocument(document.id, updatePayload, adminUser.id);
    } else {
        const formData = new FormData();
        if (data.file?.[0]) {
          formData.append('file', data.file[0]);
        }
        formData.append('name', data.name);
        formData.append('type', data.type);
        formData.append('status', data.status);
        formData.append('studentId', studentId);
        if (data.amount !== undefined) {
          formData.append('amount', String(data.amount));
        }
        result = await addFinancialDocument(formData, adminUser.id);
    }
    
    if (result.success) {
      toast({ title: `Document ${isEditing ? 'Updated' : 'Saved'}`, description: `"${data.name}" has been successfully processed.` });
      onSave(); // Trigger refetch on the page
      handleOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: 'Save Failed', description: result.error || 'An unexpected error occurred.' });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{document ? 'Edit' : 'Add'} Financial Document</DialogTitle>
          <DialogDescription>
            {document ? 'Update the details for this document.' : 'Upload a new invoice, receipt, or report.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., July Tutoring Invoice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Invoice">Invoice</SelectItem>
                        <SelectItem value="Receipt">Receipt</SelectItem>
                        <SelectItem value="FinancialReport">Financial Report</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({getCurrencySymbol(currency)})</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="150.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Attach File (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      ref={fileInputRef}
                      {...fieldProps}
                      onChange={(event) => onChange(event.target.files)}
                      disabled={isEditing}
                    />
                  </FormControl>
                  {isEditing && <p className="text-xs text-muted-foreground mt-1">File replacement is not supported during edit.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Save className="mr-2 h-4 w-4" />: <UploadCloud className="mr-2 h-4 w-4" />)}
                {document ? 'Save Changes' : 'Add Document'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
