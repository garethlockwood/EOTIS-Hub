
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import CalendarView from '@/components/calendar/calendar-view';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, UserX } from 'lucide-react';
import { useStudent } from '@/hooks/use-student';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEvent } from '@/types';
import { getCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from './actions';
import { EventDialog } from '@/components/calendar/event-dialog';
import type { EventInput, DateSelectArg, EventClickArg, EventChangeArg } from '@fullcalendar/core';
import { Card, CardContent } from '@/components/ui/card';

export default function CalendarPage() {
  const [view, setView] = useState('dayGridMonth');
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const { toast } = useToast();

  const [events, setEvents] = useState<EventInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Store the full CalendarEvent for editing, or just start/end for creating
  const [dialogData, setDialogData] = useState<Partial<CalendarEvent> | null>(null);

  const fetchEvents = useCallback(async (studentId: string) => {
    setIsLoading(true);
    const result = await getCalendarEvents(studentId);
    if (result.events) {
      setEvents(result.events);
    } else if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (selectedStudent?.id) {
      fetchEvents(selectedStudent.id);
    } else {
      setEvents([]);
      setIsLoading(false);
    }
  }, [selectedStudent, fetchEvents]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // This function is intentionally left blank.
    // The "Add Event" button is the primary method for creating new events.
    // This prevents the dialog from opening when a user simply clicks or drags on a date.
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = events.find(e => e.id === clickInfo.event.id);
    if (event) {
        setDialogData({
            ...event,
            start: clickInfo.event.startStr,
            end: clickInfo.event.endStr,
        });
      setIsDialogOpen(true);
    }
  };
  
  const handleEventChange = async (changeInfo: EventChangeArg) => {
      const { event } = changeInfo;
      const originalEvent = events.find(e => e.id === event.id);

      const eventToSave = {
          ...originalEvent,
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          studentId: selectedStudent?.id,
      };

      if (!eventToSave.studentId) {
          toast({ variant: 'destructive', title: 'Error', description: "A student must be selected to update an event." });
          changeInfo.revert();
          return;
      }
      
      const result = await saveCalendarEvent(eventToSave as any);
      if (result.success) {
          toast({ title: 'Event Updated', description: `"${event.title}" has been rescheduled.` });
          if(selectedStudent?.id) fetchEvents(selectedStudent.id);
      } else {
          toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
          changeInfo.revert();
      }
  }

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id'> & { id?: string }) => {
    if (!selectedStudent?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'A student must be selected.' });
      return;
    }

    const payload = {
      ...eventData,
      studentId: selectedStudent.id,
    };

    const result = await saveCalendarEvent(payload);

    if (result.success) {
      toast({ title: 'Event Saved', description: `"${result.event?.title}" has been saved.` });
      fetchEvents(selectedStudent.id);
      setIsDialogOpen(false);
      setDialogData(null);
    } else {
      toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
    }
  };
  
  const handleDeleteEvent = async (eventId: string) => {
    if (!selectedStudent?.id) return;
    const result = await deleteCalendarEvent(eventId);
     if (result.success) {
      toast({ title: 'Event Deleted' });
      fetchEvents(selectedStudent.id);
      setIsDialogOpen(false);
      setDialogData(null);
    } else {
      toast({ variant: 'destructive', title: 'Delete Failed', description: result.error });
    }
  }
  
  const renderContent = () => {
     if (studentIsLoading || isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    if (!selectedStudent) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-96 text-center">
            <UserX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Student Selected</h3>
            <p className="text-muted-foreground">Please select a student to view their calendar.</p>
          </CardContent>
        </Card>
      );
    }

    return (
       <div className="mt-4 rounded-lg border bg-card text-card-foreground shadow-sm">
        <CalendarView 
            key={view + selectedStudent.id} 
            view={view}
            events={events}
            onDateSelect={handleDateSelect}
            onEventClick={handleEventClick}
            onEventChange={handleEventChange}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Manage your lessons and meetings."
      >
        <Button onClick={() => {
            setDialogData({ start: new Date(), end: new Date(Date.now() + 3600000) });
            setIsDialogOpen(true);
        }}
        disabled={!selectedStudent}
        >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="dayGridMonth" onValueChange={(value) => {
          setView(value);
      }} className="w-full">
        <TabsList className="flex w-full md:w-[400px]">
          <TabsTrigger value="dayGridMonth" className="flex-1">Month</TabsTrigger>
          <TabsTrigger value="timeGridWeek" className="flex-1">Week</TabsTrigger>
          <TabsTrigger value="timeGridDay" className="flex-1">Day</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {renderContent()}

      <EventDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={dialogData as CalendarEvent}
        studentId={selectedStudent?.id}
      />
    </>
  );
}
