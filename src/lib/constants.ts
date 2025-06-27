
import type { NavItem } from '@/types';
import { LayoutDashboard, CalendarDays, Users, CreditCard, FolderKanban, ClipboardList, Link as LinkIcon, List } from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Calendar', href: '/calendar', icon: CalendarDays },
  { title: 'Staff Directory', href: '/staff', icon: Users },
  {
    title: 'Finances',
    href: '/finances', // Base path for highlighting
    icon: CreditCard,
    items: [
      { title: 'Overview', href: '/finances', icon: List },
      { title: 'Bank Linking', href: '/finances/gocardless', icon: LinkIcon },
    ]
  },
  { title: 'Content Repository', href: '/repository', icon: FolderKanban },
  { title: 'EHCP Documents', href: '/ehcp', icon: ClipboardList },
];

// All placeholder data has been removed as the dashboard now uses live data.
