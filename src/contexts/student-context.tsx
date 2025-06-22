
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
          // No need to sort here anymore, Firestore does it.
          const fetchedStudents = result.students;
          setStudents(fetchedStudents);
          setError(null);
          
          const currentIdIsValid = fetchedStudents.some(s => s.id === selectedStudentId);

          if (!currentIdIsValid) {
            const newId = fetchedStudents.length > 0 ? fetchedStudents[0].id : null;
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
