'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { PLACEHOLDER_CONTENT_DOCS } from '@/lib/constants';
import type { ContentDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Search, Download, Edit, Trash2, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
// Placeholder for Add/Edit Content Document Dialog (future implementation)
// import { ContentDocDialog } from '@/components/repository/content-doc-dialog';

export default function RepositoryPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ContentDocument[]>(PLACEHOLDER_CONTENT_DOCS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | ContentDocument['type']>('all');
  // const [isFormOpen, setIsFormOpen] = useState(false);
  // const [editingDoc, setEditingDoc] = useState<ContentDocument | null>(null);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesType = filterType === 'all' || doc.type === filterType;
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.tags && doc.tags.join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [documents, searchTerm, filterType]);
  
  // const handleSaveDoc = (doc: ContentDocument) => {
  //   // Placeholder for save logic
  //   console.log("Saving document:", doc);
  //   setIsFormOpen(false);
  //   setEditingDoc(null);
  // };

  return (
    <>
      <PageHeader title="Content Repository" description="Centralized place for lesson plans, reports, and other documents.">
        <Button disabled={!user?.isAdmin} title={!user?.isAdmin ? "Admin rights required" : "Upload Document"}> {/* onClick={() => { setEditingDoc(null); setIsFormOpen(true); }} */}
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
                      <Button variant="ghost" size="icon" disabled={!doc.fileUrl} title="Download (disabled)">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled title="Edit (disabled)"> {/* onClick={() => { setEditingDoc(doc); setIsFormOpen(true); }} */}
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled title="Delete (disabled)" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* 
      <ContentDocDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        document={editingDoc} 
        onSave={handleSaveDoc} 
      /> 
      */}
    </>
  );
}
