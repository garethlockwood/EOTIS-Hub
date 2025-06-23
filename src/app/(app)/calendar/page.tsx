
'use client';

import { PageHeader } from '@/components/common/page-header';
import CalendarView from '@/components/calendar/calendar-view';

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Manage your lessons and meetings."
      />
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <CalendarView />
      </div>
    </>
  );
}
