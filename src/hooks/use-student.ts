'use client';

import { useContext } from 'react';
import { StudentContext } from '@/contexts/student-context';

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
