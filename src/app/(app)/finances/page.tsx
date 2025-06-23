
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import type { FinancialDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Download, Edit, Trash2, Loader2, UserX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStudent } from '@/hooks/use-student';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getFinancialDocuments, deleteFinancialDocument } from './actions';
import { Card, CardContent } from '@/components/ui/card';
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
// Placeholder for Add/Edit Financial Document Dialog (future implementation)
// import { FinancialDocDialog } from '@/components/finances/financial-doc-dialog';

export default function FinancesPage() {
  const { user, currency } = useAuth();
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | FinancialDocument['type']>('all');
  // const [isFormOpen, setIsFormOpen] = useState(false);
  // const [editingDoc, setEditingDoc] = useState<FinancialDocument | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!selectedStudent?.id) {
      setIsLoading(false);
      setDocuments([]);
      return;
    }
    setIsLoading(true);
    const result = await getFinancialDocuments(selectedStudent.id);
    if (result.documents) {
      setDocuments(result.documents);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
      setDocuments([]);
    }
    setIsLoading(false);
  }, [selectedStudent?.id, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [selectedStudent, fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesType = filterType === 'all' || doc.type === filterType;
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.status && doc.status.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [documents, searchTerm, filterType]);

  const getStatusBadgeVariant = (status?: FinancialDocument['status']) => {
    switch (status) {
      case 'Paid': return 'default'; // Using primary color for paid
      case 'Unpaid': return 'destructive';
      case 'Overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const handleDelete = async (doc: FinancialDocument) => {
    if (!user?.id || !user.isAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only admins can delete documents.' });
      return;
    }
    setIsDeleting(doc.id);
    const result = await deleteFinancialDocument(doc.id, doc.storagePath, user.id);
    if (result.success) {
      toast({ title: 'Document Deleted', description: `"${doc.name}" has been removed.`});
      await fetchDocuments();
    } else {
      toast({ variant: 'destructive', title: 'Delete Failed', description: result.error });
    }
    setIsDeleting(null);
  };
  
  // const handleSaveDoc = (doc: FinancialDocument) => {
  //   // Placeholder for save logic
  //   console.log("Saving document:", doc);
  //   setIsFormOpen(false);
  //   setEditingDoc(null);
  // };

  const renderContent = () => {
    if (studentIsLoading || isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!selectedStudent && user?.isAdmin) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96 text-center">
            <UserX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Student Selected</h3>
            <p className="text-muted-foreground">Please select a student to view their financial documents.</p>
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
                <TableHead>Type</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map(doc => (
                  <TableRow key={doc.id} className={isDeleting === doc.id ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{format(parseISO(doc.uploadDate), 'PPP')}</TableCell>
                    <TableCell>{doc.amount ? formatCurrency(doc.amount, currency) : 'N/A'}</TableCell>
                    <TableCell>
                      {doc.status ? (
                        <Badge variant={getStatusBadgeVariant(doc.status)}>{doc.status}</Badge>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" asChild disabled={!doc.fileUrl} title="Download">
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                       <Button variant="ghost" size="icon" disabled title="Edit (disabled)"> {/* onClick={() => { setEditingDoc(doc); setIsFormOpen(true); }} */}
                        <Edit className="h-4 w-4" />
                      </Button>
                       {user?.isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Document"
                              className="text-destructive hover:text-destructive"
                              disabled={isDeleting === doc.id}
                            >
                              {isDeleting === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the document "{doc.name}". This action cannot be undone.
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
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No financial documents found for this student.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <>
      <PageHeader title="Financial Section" description="Manage invoices, receipts, and financial reports.">
        <Button disabled> {/* onClick={() => { setEditingDoc(null); setIsFormOpen(true); }} */}
          <PlusCircle className="mr-2 h-4 w-4" /> Add Document
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
            disabled={!selectedStudent}
          />
        </div>
        <Select value={filterType} onValueChange={(value: 'all' | FinancialDocument['type']) => setFilterType(value)} disabled={!selectedStudent}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Invoice">Invoice</SelectItem>
            <SelectItem value="Receipt">Receipt</SelectItem>
            <SelectItem value="FinancialReport">Financial Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderContent()}
      
      {/* 
      <FinancialDocDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        document={editingDoc} 
        onSave={handleSaveDoc} 
      /> 
      */}
    </>
  );
}
