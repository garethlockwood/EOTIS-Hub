'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { StaffCard } from '@/components/staff/staff-card';
import { PLACEHOLDER_STAFF } from '@/lib/constants';
import type { StaffMember } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
// Placeholder for Add/Edit Staff Dialog (future implementation)
// import { StaffFormDialog } from '@/components/staff/staff-form-dialog';

export default function StaffDirectoryPage() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>(PLACEHOLDER_STAFF);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Tutor' | 'Professional'>('all');
  // const [isFormOpen, setIsFormOpen] = useState(false);
  // const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

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

  // const handleSaveStaff = (member: StaffMember) => {
  //   // Placeholder for save logic
  //   console.log("Saving staff member:", member);
  //   setIsFormOpen(false);
  //   setEditingMember(null);
  // };

  return (
    <>
      <PageHeader title="Staff Directory" description="Find tutors and engaged professionals.">
        <Button disabled={!user?.isAdmin} title={!user?.isAdmin ? "Admin rights required" : "Add Staff Member"}> {/* onClick={() => { setEditingMember(null); setIsFormOpen(true); }} */}
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
          />
        </div>
        <Select value={filterType} onValueChange={(value: 'all' | 'Tutor' | 'Professional') => setFilterType(value)}>
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

      {filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStaff.map(member => (
            <StaffCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">No staff members found matching your criteria.</p>
        </div>
      )}

      {/* Placeholder for Add/Edit Staff Dialog
      <StaffFormDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        staffMember={editingMember} 
        onSave={handleSaveStaff} 
      /> 
      */}
    </>
  );
}
