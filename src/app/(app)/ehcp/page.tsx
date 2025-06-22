
// src/app/(app)/ehcp/page.tsx
'use client';

import React, { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import type { EHCPDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Search, Download, Edit, Trash2, Eye, Loader2, AlertTriangle, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useStudent } from '@/hooks/use-student'; // Import the new hook
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
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EhcpUploadDialog } from '@/components/ehcp/ehcp-upload-dialog';
import { getEhcpDocuments, deleteEhcpDocument, updateEhcpDocumentStatus } from './actions';

export default function EhcpPage() {
  const { user } = useAuth();
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<EHCPDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingDocument, setEditingDocument] = useState<EHCPDocument | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<EHCPDocument['status'] | ''>('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user?.isAdmin || !selectedStudent?.id) {
      setIsLoading(false);
      setDocuments([]);
      if(user?.isAdmin && !selectedStudent?.id) {
          setError(null); // Not an error, just need to select a student
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await getEhcpDocuments(selectedStudent.id);

      if (result) { 
        if (result.documents) {
          setDocuments(result.documents);
        } else if (result.error) {
          setError(result.error);
          setDocuments([]);
        } else {
          setError('Received an unexpected response format from the server.');
          setDocuments([]);
        }
      } else {
        setError('Failed to load documents. No response received from the server.');
        setDocuments([]);
      }
    } catch (e: any) {
      console.error('Client-side error in fetchDocuments:', e);
      setError(e.message || 'An unexpected error occurred while fetching documents.');
      setDocuments([]);
    }
    setIsLoading(false);
  }, [user?.isAdmin, selectedStudent?.id]);

  useEffect(() => {
    // This effect now triggers whenever the selected student changes.
    if (user?.isAdmin) {
      fetchDocuments();
    }
  }, [user?.isAdmin, selectedStudent, fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        doc.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.uploaderName && doc.uploaderName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [documents, searchTerm]);

  const getStatusBadgeVariant = (status: EHCPDocument['status']) => {
    switch (status) {
      case 'Current': return 'default';
      case 'Previous': return 'secondary';
      default: return 'outline';
    }
  };

  const handleDelete = async (doc: EHCPDocument) => {
    if (!user?.id) {
      toast({ variant: "destructive", title: "Authentication Error", description: "Cannot perform delete action." });
      return;
    }
    setIsDeleting(doc.docId);
    const result = await deleteEhcpDocument(doc.docId, doc.storagePath, user.id);
    if (result.success) {
      toast({
        title: "Document Deleted",
        description: `"${doc.name}" has been removed.`,
      });
      await fetchDocuments(); 
    } else {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: result.error || "Could not delete the document.",
      });
    }
    setIsDeleting(null);
  };

  const openStatusDialog = (doc: EHCPDocument) => {
    setEditingDocument(doc);
    setSelectedStatus(doc.status);
    setIsStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!editingDocument || !selectedStatus || !user?.id) {
      toast({ variant: "destructive", title: "Error", description: "Cannot update status. Required information missing or user not authenticated." });
      return;
    }
    setIsUpdatingStatus(editingDocument.docId);
    
    const result = await updateEhcpDocumentStatus(editingDocument.docId, selectedStatus as EHCPDocument['status'], user.id);
    
    if (result.success) {
      toast({
        title: "Status Updated",
        description: `Status for "${editingDocument.name}" changed to ${selectedStatus}.`,
      });
      await fetchDocuments(); 
    } else {
      toast({
        variant: "destructive",
        title: "Status Update Failed",
        description: result.error || "Could not update status.",
      });
    }
    setIsStatusDialogOpen(false);
    setEditingDocument(null);
    setIsUpdatingStatus(null);
  };

  const renderContent = () => {
    if (isLoading || studentIsLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    if (!user?.isAdmin) {
        return (
             <Card className="bg-destructive/10 border-destructive">
                <CardContent className="p-6 flex items-center gap-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <div>
                    <h3 className="font-semibold text-destructive">Access Denied</h3>
                    <p className="text-destructive/80">You do not have permission to view this page.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    if (!selectedStudent) {
      return (
        <div className="flex flex-col justify-center items-center h-64 text-center">
            <UserX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Student Selected</h3>
            <p className="text-muted-foreground">Please select a student from the dropdown in the header to view their documents.</p>
        </div>
      );
    }
    if (error) {
      return (
         <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Error Loading Documents</h3>
              <p className="text-destructive/80">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchDocuments} className="mt-2">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="hidden md:table-cell">Uploader</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map(doc => (
                    <TableRow key={doc.docId} className={isDeleting === doc.docId || isUpdatingStatus === doc.docId ? 'opacity-50' : ''}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={doc.name}>{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(doc.status)}>{doc.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {doc.uploadDate ? format(parseISO(doc.uploadDate), 'PPp') : 'N/A'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[150px] truncate" title={doc.uploaderName || doc.uploaderUid}>{doc.uploaderName || doc.uploaderUid}</TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs truncate text-sm text-muted-foreground" title={doc.description || 'N/A'}>{doc.description || 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {doc.fileType === 'pdf' ? (
                          <Button variant="ghost" size="icon" asChild title="View PDF">
                            <Link href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" asChild title={`Download ${doc.fileType.toUpperCase()}`}>
                             <Link href={doc.fileUrl} download={doc.originalFileName}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" asChild title="Download">
                          <Link href={doc.fileUrl} download={doc.originalFileName}>
                            <Download className="h-4 w-4" />
                          </Link>
                        </Button>
                        {user?.isAdmin && (
                          <>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Change Status" 
                                className="hidden md:inline-flex" 
                                onClick={() => openStatusDialog(doc)}
                                disabled={isDeleting === doc.docId || isUpdatingStatus === doc.docId}
                            >
                              {isUpdatingStatus === doc.docId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Delete Document" 
                                    className="text-destructive hover:text-destructive hidden md:inline-flex"
                                    disabled={isDeleting === doc.docId || isUpdatingStatus === doc.docId}
                                >
                                  {isDeleting === doc.docId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                                  <AlertDialogAction onClick={() => handleDelete(doc)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
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
                    <TableCell colSpan={6} className="h-24 text-center">
                      No EHCP documents found for this student. {searchTerm && "Try adjusting your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
  }

  return (
    <>
      <PageHeader title="EHCP Documents" description="Manage current and previous Education, Health and Care Plans.">
        {user?.isAdmin && (
          <Button onClick={() => setIsUploadDialogOpen(true)} disabled={!user || !selectedStudent}>
            <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, description, status, or uploader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
            disabled={!user || !selectedStudent}
          />
        </div>
      </div>
        
      {renderContent()}
      
      {user?.isAdmin && selectedStudent && (
        <EhcpUploadDialog
          isOpen={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          onUploadComplete={fetchDocuments}
          actingUserId={user.id} 
          associatedUserId={selectedStudent.id}
        />
      )}
      
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
              <Button variant="outline" onClick={() => { setIsStatusDialogOpen(false); setEditingDocument(null); }} disabled={isUpdatingStatus === editingDocument.docId}>Cancel</Button>
              <Button onClick={handleStatusUpdate} disabled={isUpdatingStatus === editingDocument.docId || !selectedStatus || selectedStatus === editingDocument.status || !user?.id}>
                {isUpdatingStatus === editingDocument.docId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Save Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
