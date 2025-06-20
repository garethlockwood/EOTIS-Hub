
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addContentDocument } from '@/app/(app)/repository/actions';
import type { ContentDocument } from '@/types';
import { Loader2, UploadCloud, Tag } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ContentDocDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (doc: ContentDocument) => void; // Callback after successful save
  document?: ContentDocument | null; // For editing, not fully implemented yet
}

const initialFormState = {
  name: '',
  description: '',
  type: 'General' as ContentDocument['type'],
  version: '1.0',
  tags: '', // Comma-separated string
};

export function ContentDocDialog({ isOpen, onOpenChange, onSave, document }: ContentDocDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formState, setFormState] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) { // Only reset/populate form when dialog is opened
      if (document) {
        setFormState({
          name: document.name,
          description: document.description || '',
          type: document.type,
          version: document.version || '1.0',
          tags: document.tags ? document.tags.join(', ') : '',
        });
        setSelectedFile(null); // Clear file for edit mode, file re-upload would be separate
      } else {
        resetForm(); // Reset for new document
      }
    }
  }, [document, isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
       if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Only PDF and DOC/DOCX files are allowed." });
        setSelectedFile(null);
        if(event.target) event.target.value = ""; 
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ variant: "destructive", title: "File Too Large", description: "Maximum file size is 10MB." });
        setSelectedFile(null);
        if(event.target) event.target.value = ""; 
        return;
      }
      setSelectedFile(file);
      if (!formState.name && !document) { // Auto-fill name if empty and it's a new document
        setFormState(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, "") }));
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: ContentDocument['type']) => {
    setFormState(prev => ({ ...prev, type: value }));
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFormState(initialFormState);
    const fileInput = document.getElementById('contentFile') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user.isAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only admins can upload documents.' });
      return;
    }
    if (!selectedFile && !document) { // Require file for new documents
      toast({ variant: 'destructive', title: 'Missing File', description: 'Please select a file to upload.' });
      return;
    }
    if (!formState.name.trim() || !formState.type) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please provide a name and type for the document.' });
      return;
    }
    setIsSubmitting(true);

    const formDataPayload = new FormData();
    if (selectedFile) {
      formDataPayload.append('file', selectedFile);
    }
    formDataPayload.append('name', formState.name.trim());
    formDataPayload.append('description', formState.description.trim());
    formDataPayload.append('type', formState.type);
    formDataPayload.append('version', formState.version.trim() || '1.0');
    formDataPayload.append('tags', formState.tags.trim());

    if (document) {
      // Edit logic (not fully implemented in this iteration for 'addContentDocument' focus)
      // You would call an 'updateContentDocument' action here, passing document.id
      toast({ title: "Edit functionality pending", description: "Document editing is not fully implemented yet.", variant: "default"});
      console.warn("Attempted to edit document, but update action is not implemented.", document.id, formDataPayload);
      setIsSubmitting(false);
      onOpenChange(false); // Close dialog after attempting edit
      return;
    }

    const result = await addContentDocument(formDataPayload, user.id);

    if (result.success && result.document) {
      toast({ title: 'Upload Successful', description: `"${result.document.name}" has been uploaded.` });
      onSave(result.document); 
      onOpenChange(false);
      // resetForm is called by useEffect when isOpen changes to false
    } else {
      toast({ variant: 'destructive', title: 'Upload Failed', description: result.error || 'An unknown error occurred.' });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        // resetForm() is now handled by useEffect watching isOpen
    }}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{document ? 'Edit Document' : 'Upload New Document'}</DialogTitle>
          <DialogDescription>
            {document ? 'Update the details of this document.' : 'Select a file (PDF, DOC, DOCX) and provide details. Max 10MB.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          {!document && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contentFile" className="text-right">File*</Label>
              <Input id="contentFile" type="file" onChange={handleFileChange} className="col-span-3" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!document} />
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name*</Label>
            <Input id="name" name="name" value={formState.name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., Year 5 Maths Plan Q1" required />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Description</Label>
            <Textarea id="description" name="description" value={formState.description} onChange={handleInputChange} className="col-span-3 min-h-[80px]" placeholder="Optional: Brief summary of the document" />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type*</Label>
            <Select name="type" value={formState.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LessonPlan">Lesson Plan</SelectItem>
                <SelectItem value="Report">Report</SelectItem>
                <SelectItem value="Resource">Resource</SelectItem>
                <SelectItem value="Invoice">Invoice</SelectItem>
                <SelectItem value="General">General Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="version" className="text-right">Version</Label>
            <Input id="version" name="version" value={formState.version} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 1.0, 2.1" />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <div className="col-span-3 relative">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="tags" name="tags" value={formState.tags} onChange={handleInputChange} className="col-span-3 pl-10" placeholder="e.g., math, year5, assessment (comma-separated)" />
            </div>
          </div>
          
          <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-0 -mb-4"> {/* Make footer sticky */}
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!selectedFile && !document) || !user?.isAdmin}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {document ? 'Save Changes (Disabled)' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
