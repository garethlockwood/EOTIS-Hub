import type { NavItem, UpcomingLesson, UnpaidInvoice, ScheduledMeeting, TodoItem, StaffMember, FinancialDocument, ContentDocument, CalendarEvent } from '@/types';
import { LayoutDashboard, CalendarDays, Users, CreditCard, FolderKanban, Sparkles, Bot } from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Calendar', href: '/calendar', icon: CalendarDays },
  { title: 'Staff Directory', href: '/staff', icon: Users },
  { title: 'Finances', href: '/finances', icon: CreditCard },
  { title: 'Content Repository', href: '/repository', icon: FolderKanban },
  { title: 'AI Assistant', href: '/assistant', icon: Bot },
];

export const PLACEHOLDER_TODOS: TodoItem[] = [
  { id: '1', text: 'Prepare slides for Math 101', completed: false },
  { id: '2', text: 'Send invoice #INV-003', completed: true },
  { id: '3', text: 'Schedule follow-up with Mr. Smith', completed: false },
];

export const PLACEHOLDER_LESSONS: UpcomingLesson[] = [
  { id: '1', subject: 'Algebra II', tutor: 'Dr. Emily Carter', time: '10:00 AM - 11:00 AM', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], meetingLink: '#' },
  { id: '2', subject: 'Introduction to Physics', tutor: 'Mr. John Doe', time: '2:00 PM - 3:00 PM', date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], meetingLink: '#' },
];

export const PLACEHOLDER_INVOICES: UnpaidInvoice[] = [
  { id: '1', invoiceNumber: 'INV-001', clientName: 'Parent A', amount: 150, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0] },
  { id: '2', invoiceNumber: 'INV-002', clientName: 'Parent B', amount: 200, dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0] },
];

export const PLACEHOLDER_MEETINGS: ScheduledMeeting[] = [
  { id: '1', title: 'EHCP Review Meeting', time: '3:00 PM', date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], participants: ['Sarah Miller', 'EHCP Coordinator'], meetingLink: '#' },
  { id: '2', title: 'Progress Update with Parents', time: '11:00 AM', date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], participants: ['Mr. & Mrs. Davis'], meetingLink: '#' },
];

export const PLACEHOLDER_STAFF: StaffMember[] = [
  { id: '1', name: 'Dr. Emily Carter', type: 'Tutor', bio: 'PhD in Mathematics with 10+ years of teaching experience. Specializes in advanced algebra and calculus.', hourlyRate: 75, avatarUrl: 'https://placehold.co/100x100.png', contactEmail: 'emily.carter@eotishub.com', subjects: ['Mathematics', 'Calculus', 'Algebra'] , dataAiHint: "woman teacher" },
  { id: '2', name: 'Mr. John Doe', type: 'Tutor', bio: 'MSc in Physics, passionate about making science accessible to all students. 5 years experience.', hourlyRate: 60, avatarUrl: 'https://placehold.co/100x100.png', contactEmail: 'john.doe@eotishub.com', subjects: ['Physics', 'General Science'] , dataAiHint: "man teacher"},
  { id: '3', name: 'Dr. Sarah Miller', type: 'Professional', specialty: 'Educational Psychologist', bio: 'Chartered Educational Psychologist focused on learning assessments and support strategies for children with SEN.', avatarUrl: 'https://placehold.co/100x100.png', contactEmail: 'sarah.miller@eotishub.com', dataAiHint: "woman professional" },
  { id: '4', name: 'Mr. David Wilson', type: 'Professional', specialty: 'Speech Therapist', bio: 'Experienced Speech and Language Therapist working with children to improve communication skills.', avatarUrl: 'https://placehold.co/100x100.png', contactEmail: 'david.wilson@eotishub.com', dataAiHint: "man professional" },
];

export const PLACEHOLDER_FINANCIAL_DOCS: FinancialDocument[] = [
  { id: '1', name: 'Invoice INV-00123.pdf', type: 'Invoice', uploadDate: '2024-07-01', amount: 250, status: 'Unpaid', fileUrl: '#' },
  { id: '2', name: 'Receipt RCPT-0045.pdf', type: 'Receipt', uploadDate: '2024-06-28', amount: 180, status: 'Paid', fileUrl: '#' },
  { id: '3', name: 'Q2 Financial Report.docx', type: 'FinancialReport', uploadDate: '2024-07-05', fileUrl: '#' },
];

export const PLACEHOLDER_CONTENT_DOCS: ContentDocument[] = [
  { id: '1', name: 'Algebra Lesson Plan - Week 1.pdf', type: 'LessonPlan', uploadDate: '2024-07-10', description: 'Introductory concepts for Algebra.', tags: ['Math', 'Algebra', 'Beginner'], fileUrl: '#' },
  { id: '2', name: 'Student Progress Report - June.docx', type: 'Report', uploadDate: '2024-07-02', description: 'Monthly progress report for assigned students.', tags: ['Report', 'Progress'], fileUrl: '#' },
  { id: '3', name: 'EHCP Guidance UK.pdf', type: 'Resource', uploadDate: '2024-06-15', description: 'Official guidance document on EHCP process.', tags: ['EHCP', 'Legal', 'UK'], fileUrl: '#' },
  { id: '4', name: 'Invoice Template.xlsx', type: 'Invoice', uploadDate: '2024-05-20', description: 'Standard invoice template for tutors.', tags: ['Invoice', 'Template', 'Finance'], fileUrl: '#' },
];

export const PLACEHOLDER_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'evt1', title: 'Math Session - Alice', start: new Date(new Date().setDate(new Date().getDate() + 1)), end: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(new Date().getHours() + 1)), tutorName: 'Dr. Emily Carter', cost: 75, meetingLink: '#', color: 'hsl(var(--primary))' },
  { id: 'evt2', title: 'Physics Lab - Bob', start: new Date(new Date().setDate(new Date().getDate() + 2)), end: new Date(new Date(new Date().setDate(new Date().getDate() + 2)).setHours(new Date().getHours() + 2)), tutorName: 'Mr. John Doe', cost: 120, meetingLink: '#', color: 'hsl(var(--accent))' },
  { id: 'evt3', title: 'EHCP Consultation', start: new Date(new Date().setDate(new Date().getDate() -1)), end: new Date(new Date(new Date().setDate(new Date().getDate() -1)).setHours(new Date().getHours() + 1)), tutorName: 'N/A', cost: 0, description: 'Meeting with SENCO', color: 'hsl(var(--secondary))' },
];

export const TUTOR_NAMES: string[] = PLACEHOLDER_STAFF.filter(s => s.type === 'Tutor').map(s => s.name);
