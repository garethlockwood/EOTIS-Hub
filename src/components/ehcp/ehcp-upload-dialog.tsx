
'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { addEhcpDocument, updateEhcpDocument } from '@/app/(app)/ehcp/actions';
import { Loader2, UploadCloud, Save } from 'lucide-react';
import type { EHCPDocument } from '@/types';

interface EhcpUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  actingUserId: string; 
  associatedUserId: string;
  document?: EHCPDocument | null;
}

export function EhcpUploadDialog({ isOpen, onOpenChange, onSave, actingUserId, associatedUserId, document }: EhcpUploadDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile]  = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Current' | 'Previous'>('Current');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEditing = !!document;

  const resetForm = () => {
    setSelectedFile(null);
    setFileName('');
    setDescription('');
    setStatus('Current');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isEditing && document) {
        setFileName(document.name);
        setDescription(document.description || '');
        setStatus(document.status);
        setSelectedFile(null); // File cannot be changed when editing
      } else {
        resetForm();
      }
    }
  }, [isOpen, document, isEditing]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Only PDF and DOCX files are allowed." });
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = ""; 
        return;
      }
      if (file.size > 10 * 1024 * 1024) { 
        toast({ variant: "destructive", title: "File Too Large", description: "Maximum file size is 10MB." });
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      if (!isEditing) {
        setFileName(file.name.replace(/\.[^/.]+$/, "")); 
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actingUserId) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'Cannot save document without an authenticated admin user.' });
      return;
    }
    if (!associatedUserId) {
      toast({ variant: 'destructive', title: 'Student Not Selected', description: 'A student must be selected to associate the document.' });
      return;
    }
    if (!fileName.trim() || !status || (!selectedFile && !isEditing)) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please provide a file, name, and status.' });
      return;
    }
    
    setIsSubmitting(true);
    let result;

    if (isEditing && document) {
      result = await updateEhcpDocument(document.docId, {
        name: fileName.trim(),
        description: description.trim(),
        status,
      }, actingUserId);
    } else if (selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', fileName.trim());
      formData.append('description', description.trim());
      formData.append('status', status);
      formData.append('associatedUserId', associatedUserId);
      result = await addEhcpDocument(formData, actingUserId);
    }

    if (result?.success) {
      toast({ title: `Document ${isEditing ? 'Updated' : 'Uploaded'}`, description: `"${fileName}" has been saved.` });
      onSave();
      onOpenChange(false); 
      resetForm();
    } else {
      toast({ variant: 'destructive', title: 'Save Failed', description: result?.error || 'An unknown error occurred.' });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditing ? 'Edit EHCP Document' : 'Upload EHCP Document'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this document.' : 'Select a PDF or DOCX file and provide details. Max file size: 10MB.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {!isEditing && (
            <div>
              <Label htmlFor="ehcpFile">Document File (PDF or DOCX)*</Label>
              <Input ref={fileInputRef} id="ehcpFile" type="file" onChange={handleFileChange} className="mt-1" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
            </div>
          )}
          
          <div>
            <Label htmlFor="fileName">Document Name*</Label>
            <Input id="fileName" value={fileName} onChange={(e) => setFileName(e.target.value)} className="mt-1" placeholder="e.g., Final EHCP - [Student Name]" required />
          </div>

          <div>
            <Label htmlFor="status">Status*</Label>
            <Select value={status} onValueChange={(value: 'Current' | 'Previous') => setStatus(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Current">Current</SelectItem>
                <SelectItem value="Previous">Previous</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[80px]" placeholder="e.g., Notes about this version..." />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !fileName || !status || (!selectedFile && !isEditing) || !actingUserId || !associatedUserId}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Save className="mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" />)}
              {isEditing ? 'Save Changes' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
