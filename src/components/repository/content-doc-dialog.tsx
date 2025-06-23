
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { addContentDocument, updateContentDocument } from '@/app/(app)/repository/actions';
import { getDocumentTypes, addDocumentType, deleteDocumentType } from '@/app/(app)/repository/typeActions';
import type { ContentDocument } from '@/types';
import { Loader2, UploadCloud, Tag, X, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Separator } from '../ui/separator';

interface DocumentType {
  id: string;
  name: string;
}

interface ContentDocDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (doc: ContentDocument) => void;
  document?: ContentDocument | null;
  associatedUserId?: string;
}

const initialFormState = {
  name: '',
  description: '',
  type: '', // Default to empty
  version: '1.0',
  tags: '',
};

export function ContentDocDialog({ isOpen, onOpenChange, onSave, document, associatedUserId }: ContentDocDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formState, setFormState] = useState(initialFormState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [isManagingTypes, setIsManagingTypes] = useState(false);

  const fetchTypes = useCallback(async () => {
    const result = await getDocumentTypes();
    if (result.types) {
      setDocTypes(result.types);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchTypes();
      if (document) {
        setFormState({
          name: document.name,
          description: document.description || '',
          type: document.type,
          version: document.version || '1.0',
          tags: document.tags ? document.tags.join(', ') : '',
        });
        setSelectedFile(null);
      } else {
        resetForm();
      }
    }
  }, [document, isOpen, fetchTypes]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(file.type)) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Only PDF and DOC/DOCX files are allowed.' });
        setSelectedFile(null);
        if (event.target) event.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Maximum file size is 10MB.' });
        setSelectedFile(null);
        if (event.target) event.target.value = '';
        return;
      }
      setSelectedFile(file);
      if (!formState.name && !document) {
        setFormState(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }));
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setFormState(prev => ({ ...prev, type: value }));
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFormState(initialFormState);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Type name cannot be empty.' });
      return;
    }
    setIsManagingTypes(true);
    const result = await addDocumentType(newTypeName);
    if (result.success) {
      toast({ title: 'Type Added', description: `"${newTypeName}" has been added.` });
      setNewTypeName('');
      await fetchTypes();
    } else {
      toast({ variant: 'destructive', title: 'Failed to Add Type', description: result.error });
    }
    setIsManagingTypes(false);
  };

  const handleDeleteType = async (typeId: string, typeName: string) => {
    setIsManagingTypes(true);
    const result = await deleteDocumentType(typeId, typeName);
    if (result.success) {
      toast({ title: 'Type Deleted', description: `"${typeName}" has been deleted.` });
      if (formState.type === typeName) {
        setFormState(prev => ({ ...prev, type: '' }));
      }
      await fetchTypes();
    } else {
      toast({ variant: 'destructive', title: 'Failed to Delete Type', description: result.error });
    }
    setIsManagingTypes(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user.isAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only admins can manage documents.' });
      return;
    }

    if (!selectedFile && !document) {
      toast({ variant: 'destructive', title: 'Missing File', description: 'Please select a file to upload.' });
      return;
    }
    if (!formState.name.trim() || !formState.type) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please provide a name and type for the document.' });
      return;
    }
    setIsSubmitting(true);

    if (document) {
      // Logic for UPDATING a document
      const updates = {
          name: formState.name.trim(),
          description: formState.description.trim(),
          type: formState.type,
          version: formState.version.trim() || '1.0',
          tags: formState.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      const result = await updateContentDocument(document.id, updates, user.id);
      
      if (result.success && result.document) {
          toast({ title: 'Update Successful', description: `"${result.document.name}" has been updated.` });
          onSave(result.document);
          onOpenChange(false);
      } else {
          toast({ variant: 'destructive', title: 'Update Failed', description: result.error || 'An unknown error occurred.' });
      }
    } else {
      // Logic for ADDING a new document
      const formDataPayload = new FormData();
      if (selectedFile) formDataPayload.append('file', selectedFile);
      if (associatedUserId) formDataPayload.append('associatedUserId', associatedUserId);
      formDataPayload.append('name', formState.name.trim());
      formDataPayload.append('description', formState.description.trim());
      formDataPayload.append('type', formState.type);
      formDataPayload.append('version', formState.version.trim() || '1.0');
      formDataPayload.append('tags', formState.tags.trim());

      const result = await addContentDocument(formDataPayload, user.id);

      if (result.success && result.document) {
        toast({ title: 'Upload Successful', description: `"${result.document.name}" has been uploaded.` });
        onSave(result.document);
        onOpenChange(false);
      } else {
        toast({ variant: 'destructive', title: 'Upload Failed', description: result.error || 'An unknown error occurred.' });
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{document ? 'Edit Document' : 'Upload New Document'}</DialogTitle>
          <DialogDescription>
            {document ? 'Update the details of this document.' : 'Select a file and provide details. Max 10MB.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          {!document && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contentFile" className="text-right">File*</Label>
              <Input ref={fileInputRef} id="contentFile" type="file" onChange={handleFileChange} className="col-span-3" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required={!document} />
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
              <SelectContent onPointerDownOutside={(e) => e.preventDefault()}>
                {docTypes.map((docType) => (
                  <div key={docType.id} className="flex items-center justify-between pr-2 relative">
                    <SelectItem value={docType.name} className="flex-grow pr-8">{docType.name}</SelectItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          disabled={isManagingTypes}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{docType.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. Are you sure you want to permanently delete this document type? This will fail if the type is in use.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteType(docType.id, docType.name);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="p-2 space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground px-2">Add New Type</Label>
                  <div className="flex items-center gap-2 px-2">
                    <Input
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="New type name..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewType(); } }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleAddNewType(); }}
                      disabled={isManagingTypes || !newTypeName.trim()}
                    >
                      {isManagingTypes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
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
              <Input id="tags" name="tags" value={formState.tags} onChange={handleInputChange} className="col-span-3 pl-10" placeholder="e.g., math, year5 (comma-separated)" />
            </div>
          </div>

          <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-0 -mb-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!selectedFile && !document) || !user?.isAdmin}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              {document ? 'Save Changes' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
