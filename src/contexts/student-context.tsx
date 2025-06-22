
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
  refreshAndSelectStudent: (studentId: string) => void;
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
  const [studentIdToSelectAfterFetch, setStudentIdToSelectAfterFetch] = useState<string | null>(null);

  const refreshStudents = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  const refreshAndSelectStudent = useCallback((studentId: string) => {
    setStudentIdToSelectAfterFetch(studentId);
    refreshStudents();
  }, [refreshStudents]);

  useEffect(() => {
    if (!adminUser?.isAdmin) {
      if (!authIsLoading) {
        setStudents([]);
        setSelectedStudentId(null);
        localStorage.removeItem('selectedStudentId');
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    getManagedStudents(adminUser.id)
      .then(result => {
        if (result.students) {
          setStudents(result.students);
          setError(null); // Clear previous errors on success
          
          let idToSet = selectedStudentId;

          // If a specific student was requested for selection, prioritize that.
          if (studentIdToSelectAfterFetch && result.students.some(s => s.id === studentIdToSelectAfterFetch)) {
            idToSet = studentIdToSelectAfterFetch;
            setStudentIdToSelectAfterFetch(null); // Reset after use
          } else {
            // Otherwise, validate the current selection or pick the first student.
            const currentIsValid = result.students.some(s => s.id === selectedStudentId);
            if (!currentIsValid && result.students.length > 0) {
              idToSet = result.students[0].id;
            } else if (!currentIsValid && result.students.length === 0) {
              idToSet = null;
            }
          }

          // Update state and localStorage only if there's a change.
          if (idToSet !== selectedStudentId) {
            setSelectedStudentId(idToSet);
            if (idToSet) {
              localStorage.setItem('selectedStudentId', idToSet);
            } else {
              localStorage.removeItem('selectedStudentId');
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
  }, [adminUser, authIsLoading, refetchTrigger, selectedStudentId, studentIdToSelectAfterFetch]);

  const handleSetSelectedStudent = useCallback((student: Student | null) => {
    const newId = student ? student.id : null;
    setSelectedStudentId(newId);
    if (newId) {
      localStorage.setItem('selectedStudentId', newId);
    } else {
      localStorage.removeItem('selectedStudentId');
    }
  }, []);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || (students.length > 0 ? students[0] : null);
  }, [students, selectedStudentId]);

  const value = {
    students,
    selectedStudent,
    setSelectedStudent: handleSetSelectedStudent,
    isLoading: authIsLoading || isLoading,
    error,
    refreshStudents,
    refreshAndSelectStudent,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
};
