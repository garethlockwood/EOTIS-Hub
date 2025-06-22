'use client';

import React from 'react';
import { useStudent } from '@/hooks/use-student';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function StudentSelector() {
  const { user: adminUser } = useAuth();
  const { students, selectedStudent, setSelectedStudent, isLoading, error } = useStudent();

  if (!adminUser?.isAdmin) {
    return null; // Don't render the selector for non-admins
  }

  const handleValueChange = (studentId: string) => {
    const studentToSelect = students.find(s => s.id === studentId);
    if (studentToSelect) {
      setSelectedStudent(studentToSelect);
    }
  };

  return (
    <div className="flex items-center gap-2">
       <Users className="h-5 w-5 text-muted-foreground hidden sm:block" />
       <Select
            value={selectedStudent?.id ?? ''}
            onValueChange={handleValueChange}
            disabled={isLoading || students.length === 0}
        >
        <SelectTrigger className="w-[180px] md:w-[220px] lg:w-[250px]">
            <SelectValue placeholder={isLoading ? "Loading..." : (error ? "Error" : (students.length === 0 ? "No Students" : "Select a student"))}>
                 {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span>Loading...</span>
                    </div>
                ) : selectedStudent ? (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedStudent.avatarUrl || undefined} alt={selectedStudent.name || "Student"} />
                            <AvatarFallback>{selectedStudent.name ? selectedStudent.name.substring(0, 2).toUpperCase() : 'S'}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{selectedStudent.name}</span>
                    </div>
                ) : (
                    <span>{error ? "Error loading" : "Select Student"}</span>
                )}
            </SelectValue>
        </SelectTrigger>
        <SelectContent>
            {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                     <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={student.avatarUrl || undefined} alt={student.name || "Student"} />
                            <AvatarFallback>{student.name ? student.name.substring(0, 2).toUpperCase() : 'S'}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{student.name}</span>
                    </div>
                </SelectItem>
            ))}
        </SelectContent>
       </Select>
    </div>
  );
}
