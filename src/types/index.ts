import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  label?: string;
}

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  isMfaEnabled?: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface UpcomingLesson {
  id: string;
  subject: string;
  tutor: string;
  time: string; // e.g., "10:00 AM - 11:00 AM"
  date: string; // e.g., "2024-07-28"
  meetingLink?: string;
}

export interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: string; // e.g., "2024-08-01"
}

export interface ScheduledMeeting {
  id: string;
  title: string;
  time: string; // e.g., "2:00 PM"
  date: string; // e.g., "2024-07-29"
  participants: string[];
  meetingLink?: string;
}

export interface CalendarEvent {
  id: string;
  title: string; // subject
  start: Date;
  end: Date;
  tutorName: string;
  cost: number;
  meetingLink?: string;
  description?: string;
  color?: string; // Optional color for the event
}

export interface StaffMember {
  id: string;
  name: string;
  type: 'Tutor' | 'Professional';
  bio: string;
  hourlyRate?: number; // For tutors
  specialty?: string; // For professionals
  avatarUrl?: string;
  dataAiHint?: string;
  contactEmail?: string;
  contactPhone?: string;
  subjects?: string[]; // For tutors
}

export interface FinancialDocument {
  id: string;
  name: string;
  type: 'Invoice' | 'Receipt' | 'FinancialReport';
  uploadDate: string; // e.g., "2024-07-20"
  fileUrl?: string; // Placeholder or link
  amount?: number;
  status?: 'Paid' | 'Unpaid' | 'Overdue';
}

export interface ContentDocument {
  id: string;
  name: string;
  type: 'LessonPlan' | 'Report' | 'Resource' | 'Invoice' | 'General';
  uploadDate: string; // e.g., "2024-07-20"
  fileUrl?: string; // Placeholder or link
  description?: string;
  tags?: string[];
}
