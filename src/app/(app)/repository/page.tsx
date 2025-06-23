
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Search, Download, Edit, Trash2, Tag, Loader2, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import type { ContentDocument } from '@/types';
import { getContentDocuments } from './actions';
import { ContentDocDialog } from '@/components/repository/content-doc-dialog';
import { useStudent } from '@/hooks/use-student';

export default function RepositoryPage() {
  const { user } = useAuth();
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const [documents, setDocuments] = useState<ContentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | ContentDocument['type']>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ContentDocument | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDocs = async () => {
      setIsLoading(true);
      const result = await getContentDocuments();
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: `Failed to load content documents: ${result.error}` });
        setDocuments([]);
      } else {
        setDocuments(result.documents || []);
      }
      setIsLoading(false);
    };
    fetchDocs();
  }, [toast]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Show if doc is global OR if it matches the selected student
      const matchesStudent = !doc.associatedUserId || doc.associatedUserId === selectedStudent?.id;
      if (!matchesStudent) return false;

      const matchesType = filterType === 'all' || doc.type === filterType;
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.tags && doc.tags.join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [documents, searchTerm, filterType, selectedStudent]);

  const handleSaveDoc = (doc: ContentDocument) => {
    toast({title: 'Document Saved', description: `"${doc.name}" has been processed successfully.`});
    const existingIndex = documents.findIndex(d => d.id === doc.id);
    if (existingIndex !== -1) {
      const updated = [...documents];
      updated[existingIndex] = doc;
      setDocuments(updated);
    } else {
      setDocuments([doc, ...documents]);
    }
    setIsFormOpen(false);
    setEditingDoc(null);
  };
  
  const renderContent = () => {
    if (isLoading || studentIsLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    // Admins need to select a student to see student-specific documents
    if (!selectedStudent && user?.isAdmin) {
       return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96 text-center">
            <UserX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Student Selected</h3>
            <p className="text-muted-foreground">Please select a student to view their documents. Global documents are always visible.</p>
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
                  <TableHead>Description</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell><Badge variant="secondary">{doc.type}</Badge></TableCell>
                      <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{doc.description || 'N/A'}</TableCell>
                      <TableCell>
                        {doc.tags && doc.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1"/>{tag}</Badge>)}
                          </div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (doc.fileUrl) {
                            window.open(doc.fileUrl, '_blank');
                          } else {
                            toast({variant: "destructive", title: 'File URL is missing'});
                          }
                        }}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingDoc(doc); setIsFormOpen(true); }} disabled={!user?.isAdmin}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled title="Delete (not implemented)" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No documents found matching your criteria.
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
      <PageHeader title="Content Repository" description="Centralized place for lesson plans, reports, and other documents.">
        <Button disabled={!user?.isAdmin || !selectedStudent} title={!user?.isAdmin ? "Admin rights required" : (!selectedStudent ? "Select a student to upload a document" : "Upload Document")} onClick={() => { setEditingDoc(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Select value={filterType} onValueChange={(value: 'all' | ContentDocument['type']) => setFilterType(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="LessonPlan">Lesson Plan</SelectItem>
            <SelectItem value="Report">Report</SelectItem>
            <SelectItem value="Resource">Resource</SelectItem>
            <SelectItem value="Invoice">Invoice</SelectItem>
            <SelectItem value="General">General Document</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderContent()}

      <ContentDocDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        document={editingDoc} 
        onSave={handleSaveDoc}
        associatedUserId={selectedStudent?.id}
      />
    </>
  );
}
