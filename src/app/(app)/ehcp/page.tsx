
// src/app/(app)/ehcp/page.tsx
'use client';

import React, { useState, useMemo, Fragment } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { PLACEHOLDER_EHCP_DOCS } from '@/lib/constants';
import type { EHCPDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Search, Download, Edit, Trash2, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function EhcpPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<EHCPDocument[]>(
    PLACEHOLDER_EHCP_DOCS.map(doc => ({
      ...doc,
      // Ensure uploadDate is consistently a string for initial state
      uploadDate: typeof doc.uploadDate === 'string' ? doc.uploadDate : new Date(doc.uploadDate).toISOString(),
    }))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDocument, setEditingDocument] = useState<EHCPDocument | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<EHCPDocument['status'] | ''>('');

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        doc.status.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }).sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [documents, searchTerm]);

  const getStatusBadgeVariant = (status: EHCPDocument['status']) => {
    switch (status) {
      case 'Current': return 'default';
      case 'Previous': return 'secondary';
      default: return 'outline';
    }
  };

  const handleDeleteDocument = (docId: string) => {
    const docToDelete = documents.find(d => d.id === docId);
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
    toast({
      title: "Document Deleted",
      description: `"${docToDelete?.name || 'Document'}" has been removed.`,
      variant: "destructive",
    });
  };

  const openStatusDialog = (doc: EHCPDocument) => {
    setEditingDocument(doc);
    setSelectedStatus(doc.status);
    setIsStatusDialogOpen(true);
  };

  const handleStatusChange = () => {
    if (!editingDocument || !selectedStatus) return;

    setDocuments(prevDocs =>
      prevDocs.map(doc =>
        doc.id === editingDocument.id ? { ...doc, status: selectedStatus as EHCPDocument['status'] } : doc
      )
    );
    toast({
      title: "Status Updated",
      description: `Status for "${editingDocument.name}" changed to ${selectedStatus}.`,
    });
    setIsStatusDialogOpen(false);
    setEditingDocument(null);
  };

  return (
    <>
      <PageHeader title="EHCP Documents" description="Manage current and previous Education, Health and Care Plans.">
        <Button disabled={!user?.isAdmin} title={!user?.isAdmin ? "Admin rights required" : "Upload Document (placeholder)"}>
          <PlusCircle className="mr-2 h-4 w-4" /> Upload EHCP Document
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, description, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(doc.status)}>{doc.status}</Badge>
                    </TableCell>
                    <TableCell>{format(parseISO(doc.uploadDate), 'PPP')}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{doc.description || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {doc.fileType === 'pdf' ? (
                        <Button variant="ghost" size="icon" asChild title="View PDF">
                          <Link href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" asChild title="View (Download DOCX)">
                           <Link href={doc.fileUrl} download={doc.name}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild title="Download">
                        <Link href={doc.fileUrl} download={doc.name}>
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                      {user?.isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" title="Change Status" className="hidden md:inline-flex" onClick={() => openStatusDialog(doc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete Document" className="text-destructive hover:text-destructive hidden md:inline-flex">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the document "{doc.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No EHCP documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {editingDocument && (
        <Dialog open={isStatusDialogOpen} onOpenChange={(isOpen) => {
          setIsStatusDialogOpen(isOpen);
          if (!isOpen) setEditingDocument(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Status for "{editingDocument.name}"</DialogTitle>
              <DialogDescription>Select the new status for this document.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select value={selectedStatus} onValueChange={(value: EHCPDocument['status']) => setSelectedStatus(value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Current">Current</SelectItem>
                    <SelectItem value="Previous">Previous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsStatusDialogOpen(false); setEditingDocument(null); }}>Cancel</Button>
              <Button onClick={handleStatusChange}>Save Status</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
