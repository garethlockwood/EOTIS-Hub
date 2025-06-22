'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { getManagedStudents } from '@/app/(app)/students/actions';

interface StudentContextType {
  students: User[];
  selectedStudent: User | null;
  setSelectedStudent: (student: User | null) => void;
  isLoading: boolean;
  error?: string | null;
}

export const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: adminUser, isLoading: authIsLoading } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedStudentId');
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminUser?.isAdmin) {
      setIsLoading(true);
      getManagedStudents(adminUser.id)
        .then(result => {
          if (result.students) {
            setStudents(result.students);
            // If no student is selected or the selected one is no longer valid, select the first one.
            const currentIsValid = result.students.some(s => s.id === selectedStudentId);
            if ((!selectedStudentId || !currentIsValid) && result.students.length > 0) {
              setSelectedStudentId(result.students[0].id);
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
    } else if (!authIsLoading) {
      // If user is not an admin, clear student data
      setStudents([]);
      setSelectedStudentId(null);
      setIsLoading(false);
    }
  }, [adminUser, authIsLoading, selectedStudentId]);

  const handleSetSelectedStudent = useCallback((student: User | null) => {
    const newId = student ? student.id : null;
    setSelectedStudentId(newId);
    if (newId) {
      localStorage.setItem('selectedStudentId', newId);
    } else {
      localStorage.removeItem('selectedStudentId');
    }
  }, []);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const value = {
    students,
    selectedStudent,
    setSelectedStudent: handleSetSelectedStudent,
    isLoading: authIsLoading || isLoading,
    error,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
};
