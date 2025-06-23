
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import CalendarView from '@/components/calendar/calendar-view';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function CalendarPage() {
  const [view, setView] = useState('dayGridMonth');

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Manage your lessons and meetings."
      >
        <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="month" onValueChange={(value) => {
          if (value === 'month') setView('dayGridMonth');
          else if (value === 'week') setView('timeGridWeek');
          else if (value === 'day') setView('timeGridDay');
      }} className="w-full">
        <TabsList className="flex w-full md:w-[400px]">
          <TabsTrigger value="month" className="flex-1">Month</TabsTrigger>
          <TabsTrigger value="week" className="flex-1">Week</TabsTrigger>
          <TabsTrigger value="day" className="flex-1">Day</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-4 rounded-lg border bg-card text-card-foreground shadow-sm">
        <CalendarView key={view} view={view} />
      </div>
    </>
  );
}
