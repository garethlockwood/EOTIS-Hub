'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { PLACEHOLDER_FINANCIAL_DOCS } from '@/lib/constants';
import type { FinancialDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, Download, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
// Placeholder for Add/Edit Financial Document Dialog (future implementation)
// import { FinancialDocDialog } from '@/components/finances/financial-doc-dialog';

export default function FinancesPage() {
  const [documents, setDocuments] = useState<FinancialDocument[]>(PLACEHOLDER_FINANCIAL_DOCS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | FinancialDocument['type']>('all');
  // const [isFormOpen, setIsFormOpen] = useState(false);
  // const [editingDoc, setEditingDoc] = useState<FinancialDocument | null>(null);

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
      case 'Overdue': return 'destructive'; // Consider a different color if needed, e.g. amber
      default: return 'outline';
    }
  };
  
  // const handleSaveDoc = (doc: FinancialDocument) => {
  //   // Placeholder for save logic
  //   console.log("Saving document:", doc);
  //   setIsFormOpen(false);
  //   setEditingDoc(null);
  // };

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
          />
        </div>
        <Select value={filterType} onValueChange={(value: 'all' | FinancialDocument['type']) => setFilterType(value)}>
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
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{format(new Date(doc.uploadDate), 'PPP')}</TableCell>
                    <TableCell>{doc.amount ? `$${doc.amount.toFixed(2)}` : 'N/A'}</TableCell>
                    <TableCell>
                      {doc.status ? (
                        <Badge variant={getStatusBadgeVariant(doc.status)}>{doc.status}</Badge>
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
                    No financial documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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

// Dummy Card component to satisfy compiler, replace with actual if needed elsewhere.
// This is needed because the template used <Card> without importing it explicitly within the FinancesPage.
// Actual Card imports are in other files, but this one was missing.
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={className} {...props} />
  )
);
Card.displayName = "Card";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={className} {...props} />
  )
);
CardContent.displayName = "CardContent";
