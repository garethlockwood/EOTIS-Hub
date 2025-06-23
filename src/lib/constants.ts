
import type { NavItem, UpcomingLesson, UnpaidInvoice, ScheduledMeeting, TodoItem, StaffMember, FinancialDocument, ContentDocument, CalendarEvent, EHCPDocument } from '@/types';
import { LayoutDashboard, CalendarDays, Users, CreditCard, FolderKanban, Sparkles, UserCircle2 as ProfileIcon, ClipboardList } from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Calendar', href: '/calendar', icon: CalendarDays },
  { title: 'Staff Directory', href: '/staff', icon: Users },
  { title: 'Finances', href: '/finances', icon: CreditCard },
  { title: 'Content Repository', href: '/repository', icon: FolderKanban },
  { title: 'EHCP Documents', href: '/ehcp', icon: ClipboardList },
  { title: 'AI Assistant', href: '/assistant', icon: Sparkles },
];

export const PLACEHOLDER_TODOS: TodoItem[] = [
  { id: '1', text: 'Prepare slides for Math 101', completed: false, studentId: 'student_1_placeholder' },
  { id: '2', text: 'Send invoice #INV-003', completed: true, studentId: 'student_1_placeholder' },
  { id: '3', text: 'Schedule follow-up with Mr. Smith', completed: false, studentId: 'student_2_placeholder' },
];

export const PLACEHOLDER_LESSONS: UpcomingLesson[] = [
  { id: '1', subject: 'Algebra II', tutor: 'Dr. Emily Carter', time: '10:00 AM - 11:00 AM', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], meetingLink: '#', studentId: 'student_1_placeholder' },
  { id: '2', subject: 'Introduction to Physics', tutor: 'Mr. John Doe', time: '2:00 PM - 3:00 PM', date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], meetingLink: '#', studentId: 'student_2_placeholder' },
];

export const PLACEHOLDER_INVOICES: UnpaidInvoice[] = [
  { id: '1', invoiceNumber: 'INV-001', clientName: 'Parent A', amount: 150, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], studentId: 'student_1_placeholder' },
  { id: '2', invoiceNumber: 'INV-002', clientName: 'Parent B', amount: 200, dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], studentId: 'student_2_placeholder' },
];

export const PLACEHOLDER_MEETINGS: ScheduledMeeting[] = [
  { id: '1', title: 'EHCP Review Meeting', time: '3:00 PM', date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], participants: ['Sarah Miller', 'EHCP Coordinator'], meetingLink: '#', studentId: 'student_1_placeholder' },
  { id: '2', title: 'Progress Update with Parents', time: '11:00 AM', date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], participants: ['Mr. & Mrs. Davis'], meetingLink: '#', studentId: 'student_2_placeholder' },
];

export const PLACEHOLDER_FINANCIAL_DOCS: FinancialDocument[] = [
  { id: '1', name: 'Invoice INV-00123.pdf', type: 'Invoice', uploadDate: '2024-07-01', amount: 250, status: 'Unpaid', fileUrl: '#', studentId: 'student_1_placeholder' },
  { id: '2', name: 'Receipt RCPT-0045.pdf', type: 'Receipt', uploadDate: '2024-06-28', amount: 180, status: 'Paid', fileUrl: '#', studentId: 'student_1_placeholder' },
  { id: '3', name: 'Q2 Financial Report.docx', type: 'FinancialReport', uploadDate: '2024-07-05', fileUrl: '#', studentId: 'student_2_placeholder' },
];

export const PLACEHOLDER_CONTENT_DOCS: ContentDocument[] = [
  { id: '1', name: 'Algebra Lesson Plan - Week 1.pdf', type: 'LessonPlan', uploadDate: '2024-07-10', description: 'Introductory concepts for Algebra.', tags: ['Math', 'Algebra', 'Beginner'], fileUrl: '#', uploaderUid: '', uploaderName: '', uploaderRole: '', storagePath: '', fileType: 'pdf', version: '1.0', associatedUserId: 'student_1_placeholder' },
  { id: '2', name: 'Student Progress Report - June.docx', type: 'Report', uploadDate: '2024-07-02', description: 'Monthly progress report for assigned students.', tags: ['Report', 'Progress'], fileUrl: '#', uploaderUid: '', uploaderName: '', uploaderRole: '', storagePath: '', fileType: 'docx', version: '1.0', associatedUserId: 'student_2_placeholder' },
  { id: '3', name: 'EHCP Guidance UK.pdf', type: 'Resource', uploadDate: '2024-06-15', description: 'Official guidance document on EHCP process.', tags: ['EHCP', 'Legal', 'UK'], fileUrl: '#', uploaderUid: '', uploaderName: '', uploaderRole: '', storagePath: '', fileType: 'pdf', version: '1.0' }, // Global document
  { id: '4', name: 'Invoice Template.xlsx', type: 'Invoice', uploadDate: '2024-05-20', description: 'Standard invoice template for tutors.', tags: ['Invoice', 'Template', 'Finance'], fileUrl: '#', uploaderUid: '', uploaderName: '', uploaderRole: '', storagePath: '', fileType: 'xlsx', version: '1.0' }, // Global document
];
