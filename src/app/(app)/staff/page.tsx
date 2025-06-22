
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { StaffCard } from '@/components/staff/staff-card';
import type { StaffMember } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, Loader2, UserX } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useStudent } from '@/hooks/use-student';
import { Card, CardContent } from '@/components/ui/card';
import { getStaffForStudent } from './actions';
import { useToast } from '@/hooks/use-toast';
import { StaffFormDialog } from '@/components/staff/staff-form-dialog';


export default function StaffDirectoryPage() {
  const { user } = useAuth();
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Tutor' | 'Professional'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedStudent?.id) {
      setStaffList([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getStaffForStudent(selectedStudent.id)
      .then(result => {
        if (result.staff) {
          const sortedStaff = result.staff.sort((a, b) => a.name.localeCompare(b.name));
          setStaffList(sortedStaff);
          setError(null);
        } else {
          setStaffList([]);
          setError(result.error || 'Failed to load staff.');
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      })
      .finally(() => setIsLoading(false));
  }, [selectedStudent, toast]);


  const filteredStaff = useMemo(() => {
    return staffList.filter(member => {
      const matchesType = filterType === 'all' || member.type === filterType;
      const matchesSearch = 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.specialty && member.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.subjects && member.subjects.join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [staffList, searchTerm, filterType]);

  const handleStaffAdded = (newStaffMember: StaffMember) => {
    setStaffList(prev => [...prev, newStaffMember].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const renderContent = () => {
    if (studentIsLoading || isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    if (!selectedStudent) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96 text-center">
            <UserX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Student Selected</h3>
            <p className="text-muted-foreground">Please select a student to view their associated staff.</p>
          </CardContent>
        </Card>
      );
    }

    if (error) {
       return (
        <div className="text-center py-10 text-destructive">
            <p className="text-xl">{error}</p>
        </div>
      );
    }
    
    if (filteredStaff.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStaff.map(member => (
            <StaffCard key={member.id} member={member} />
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No staff members found for this student.</p>
        <p className="text-sm text-muted-foreground">{searchTerm || filterType !== 'all' ? "Try adjusting your filters." : "You can add one using the button above."}</p>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Staff Directory" description="Find tutors and engaged professionals for the selected student.">
        <Button 
          disabled={!user?.isAdmin || !selectedStudent} 
          title={!user?.isAdmin ? "Admin rights required" : (!selectedStudent ? "Select a student to add staff" : "Add Staff Member")}
          onClick={() => { setEditingMember(null); setIsFormOpen(true); }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Staff Member
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, bio, specialty, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
            disabled={!selectedStudent}
          />
        </div>
        <Select value={filterType} onValueChange={(value: 'all' | 'Tutor' | 'Professional') => setFilterType(value)} disabled={!selectedStudent}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Tutor">Tutors</SelectItem>
            <SelectItem value="Professional">Professionals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderContent()}

      {selectedStudent && (
        <StaffFormDialog 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          staffMember={editingMember} 
          onStaffAdded={handleStaffAdded}
          studentId={selectedStudent.id}
        />
      )}
    </>
  );
}
