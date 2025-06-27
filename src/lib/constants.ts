
import type { NavItem } from '@/types';
import { LayoutDashboard, CalendarDays, Users, CreditCard, FolderKanban, ClipboardList } from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Calendar', href: '/calendar', icon: CalendarDays },
  { title: 'Staff Directory', href: '/staff', icon: Users },
  { title: 'Finances', href: '/finances', icon: CreditCard },
  { title: 'Content Repository', href: '/repository', icon: FolderKanban },
  { title: 'EHCP Documents', href: '/ehcp', icon: ClipboardList },
];

// All placeholder data has been removed as the dashboard now uses live data.
