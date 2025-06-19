
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addEhcpDocument } from '@/app/(app)/ehcp/actions';
import { Loader2, UploadCloud } from 'lucide-react';

interface EhcpUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
  trigger?: React.ReactNode;
}

export function EhcpUploadDialog({ isOpen, onOpenChange, onUploadComplete, trigger }: EhcpUploadDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile]  = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Current' | 'Previous'>('Current');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Only PDF and DOCX files are allowed." });
        setSelectedFile(null);
        event.target.value = ""; // Clear the input
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ variant: "destructive", title: "File Too Large", description: "Maximum file size is 10MB." });
        setSelectedFile(null);
        event.target.value = ""; // Clear the input
        return;
      }
      setSelectedFile(file);
      setFileName(file.name.replace(/\.[^/.]+$/, "")); // Pre-fill name without extension
    } else {
      setSelectedFile(null);
    }
  };
  
  const resetForm = () => {
    setSelectedFile(null);
    setFileName('');
    setDescription('');
    setStatus('Current');
    // Also reset the file input visually if possible
    const fileInput = document.getElementById('ehcpFile') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileName.trim() || !status) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please provide a file, name, and status.' });
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', fileName.trim());
    formData.append('description', description.trim());
    formData.append('status', status);

    const result = await addEhcpDocument(formData);

    if (result.success) {
      toast({ title: 'Upload Successful', description: `"${fileName}" has been uploaded.` });
      onUploadComplete();
      onOpenChange(false); // Close dialog
      resetForm();
    } else {
      toast({ variant: 'destructive', title: 'Upload Failed', description: result.error || 'An unknown error occurred.' });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetForm(); // Reset form when dialog is closed
    }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Upload EHCP Document</DialogTitle>
          <DialogDescription>
            Select a PDF or DOCX file and provide details. Max file size: 10MB.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div>
            <Label htmlFor="ehcpFile">Document File (PDF or DOCX)</Label>
            <Input id="ehcpFile" type="file" onChange={handleFileChange} className="mt-1" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required />
          </div>
          
          <div>
            <Label htmlFor="fileName">Document Name</Label>
            <Input id="fileName" value={fileName} onChange={(e) => setFileName(e.target.value)} className="mt-1" placeholder="e.g., Final EHCP - John Doe" required />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
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
            <Button type="submit" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Upload Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

