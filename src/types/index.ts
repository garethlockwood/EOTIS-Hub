
import type { LucideIcon } from 'lucide-react';

export type Currency = 'USD' | 'GBP' | 'EUR';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  label?: string;
}

export interface User {
  id: string; // Firebase UID
  name?: string | null; // Firebase displayName or from Firestore
  email?: string | null; // Firebase email
  avatarUrl?: string | null; // Firebase photoURL or from Firestore (field 'avatarURL')
  isMfaEnabled?: boolean; // Custom, from Firestore
  mustChangePassword?: boolean; // Custom, from Firestore
  isAdmin?: boolean; // Custom, from Firestore
}

export interface Student {
  id: string; // Document ID from 'students' collection
  name: string;
  email: string;
  avatarUrl?: string | null;
  managedBy: string; // Admin UID
  createdAt?: string; // ISO string from Timestamp
}


export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  studentId: string;
  createdAt: string; // ISO string from Timestamp
}

export interface UpcomingLesson {
  id:string;
  subject: string;
  tutor: string;
  time: string; // e.g., "10:00 AM - 11:00 AM"
  date: string; // e.g., "2024-07-28"
  meetingLink?: string;
  studentId: string;
}

export interface UnpaidInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: string; // e.g., "2024-08-01"
  studentId: string;
}

export interface ScheduledMeeting {
  id: string;
  title: string;
  time: string; // e.g., "2:00 PM"
  date: string; // e.g., "2024-07-29"
  participants: string[];
  meetingLink?: string;
  studentId: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  tutorName: string;
  cost: number;
  meetingLink?: string;
  description?: string;
  color?: string;
  textColor?: string;
  studentId?: string;
  createdAt?: string;
  updatedAt?: string;
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
  studentIds?: string[];
}

export interface FinancialDocument {
  id:string; // Firestore document ID
  name: string;
  type: 'Invoice' | 'Receipt' | 'FinancialReport';
  uploadDate: string; // ISO string (from Firestore Timestamp)
  fileUrl?: string;
  storagePath?: string;
  amount?: number;
  status?: 'Paid' | 'Unpaid' | 'Overdue';
  uploaderUid?: string;
  studentId: string;
}

export interface ContentDocument {
  id: string;
  type: string;
  name: string;
  uploadDate: string;
  uploaderUid: string;
  uploaderName: string;
  uploaderRole: string;
  description: string;
  fileUrl: string;
  storagePath: string;
  fileType: string;
  version: string;
  tags: string[];
  associatedUserId?: string; // Optional: Link to a specific student
}


export interface EHCPDocument {
  docId: string; // Firestore document ID
  name: string;
  uploadDate: string; // ISO string (converted from Firestore Timestamp)
  status: 'Current' | 'Previous';
  fileUrl: string; // Download URL from Firebase Storage
  storagePath: string; // Path in Firebase Storage (for deletion)
  fileType: 'pdf' | 'docx';
  description?: string;
  uploaderUid: string; // UID of the admin who uploaded
  uploaderName?: string; // Optional: denormalized name of uploader
  originalFileName: string;
  associatedUserId: string; // UID of the user (e.g., student) this document belongs to
}
