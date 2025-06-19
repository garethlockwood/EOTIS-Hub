// src/app/(app)/ehcp/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
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

export default function EhcpPage() {
  const { user } = useAuth(); // For potential future user-specific filtering or upload permissions
  const [documents, setDocuments] = useState<EHCPDocument[]>(PLACEHOLDER_EHCP_DOCS);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        doc.status.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }).sort((a,b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()); // Sort by date, newest first
  }, [documents, searchTerm]);

  const getStatusBadgeVariant = (status: EHCPDocument['status']) => {
    switch (status) {
      case 'Current': return 'default'; // Primary color for Current
      case 'Previous': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <>
      <PageHeader title="EHCP Documents" description="Manage current and previous Education, Health and Care Plans.">
        <Button disabled title="Upload Document (placeholder)"> {/* onClick={() => { setIsFormOpen(true); }} */}
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
        {/* Add filtering by status if needed later */}
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
                        // For DOCX, "View" will also trigger a download
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
                       <Button variant="ghost" size="icon" disabled title="Edit (placeholder)" className="hidden md:inline-flex">
                        <Edit className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" disabled title="Delete (placeholder)" className="text-destructive hover:text-destructive hidden md:inline-flex">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
      {/* 
      <EhcpDocDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        // document={editingDoc} 
        // onSave={handleSaveDoc} 
      /> 
      */}
    </>
  );
}
