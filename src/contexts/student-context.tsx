
'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Student } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { getManagedStudents } from '@/app/(app)/students/actions';

interface StudentContextType {
  students: Student[];
  selectedStudent: Student | null;
  setSelectedStudent: (student: Student | null) => void;
  isLoading: boolean;
  error?: string | null;
  refreshStudents: () => void;
  addAndSelectStudent: (student: Student) => void;
}

export const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: adminUser, isLoading: authIsLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedStudentId');
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refreshStudents = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  const addAndSelectStudent = (newStudent: Student) => {
    setStudents(prevStudents => 
      [...prevStudents, newStudent].sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectedStudentId(newStudent.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedStudentId', newStudent.id);
    }
  };

  useEffect(() => {
    if (!adminUser?.isAdmin) {
      if (!authIsLoading) {
        setStudents([]);
        setSelectedStudentId(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedStudentId');
        }
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    getManagedStudents(adminUser.id)
      .then(result => {
        if (result.students) {
          setStudents(result.students);
          setError(null);
          
          const currentIdIsValid = result.students.some(s => s.id === selectedStudentId);

          if (!currentIdIsValid) {
            const newId = result.students.length > 0 ? result.students[0].id : null;
            setSelectedStudentId(newId);
            if (typeof window !== 'undefined') {
              if (newId) {
                localStorage.setItem('selectedStudentId', newId);
              } else {
                localStorage.removeItem('selectedStudentId');
              }
            }
          }
        } else if (result.error) {
          setError(result.error);
        }
      })
      .catch(err => {
          console.error("Failed to fetch students in context", err);
          setError("An unexpected error occurred while fetching students.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [adminUser, authIsLoading, refetchTrigger]);

  const handleSetSelectedStudent = useCallback((student: Student | null) => {
    const newId = student ? student.id : null;
    setSelectedStudentId(newId);
    if (typeof window !== 'undefined') {
      if (newId) {
        localStorage.setItem('selectedStudentId', newId);
      } else {
        localStorage.removeItem('selectedStudentId');
      }
    }
  }, []);

  const selectedStudent = useMemo(() => {
    // When the list of students updates, ensure the selected ID is still valid.
    if (students.length > 0 && selectedStudentId && !students.some(s => s.id === selectedStudentId)) {
        // The previously selected student is not in the list, so default to the first one.
        const newDefaultId = students[0].id;
        if (typeof window !== 'undefined') {
            localStorage.setItem('selectedStudentId', newDefaultId);
        }
        // This state update will be queued and might not reflect immediately, 
        // so we return students[0] directly for this render pass.
        // A more complex setup might use another useEffect to handle this.
        return students[0];
    }
    return students.find(s => s.id === selectedStudentId) || (students.length > 0 ? students[0] : null);
  }, [students, selectedStudentId]);

  const value = {
    students,
    selectedStudent,
    setSelectedStudent: handleSetSelectedStudent,
    isLoading: authIsLoading || isLoading,
    error,
    refreshStudents,
    addAndSelectStudent,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
};
