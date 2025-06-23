'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Loader2, UserX, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useStudent } from '@/hooks/use-student';
import { useToast } from '@/hooks/use-toast';
import { getCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from './actions';
import type { CalendarEvent } from '@/types';
import { EventDialog } from '@/components/calendar/event-dialog';
import { format, parseISO } from 'date-fns';

export default function CalendarPage() {
  const { user } = useAuth();
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const { toast } = useToast();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!selectedStudent?.id) {
      setIsLoading(false);
      setEvents([]);
      return;
    }

    setIsLoading(true);
    const result = await getCalendarEvents(selectedStudent.id);
    if (result.events) {
      setEvents(result.events);
      setError(null);
    } else {
      setError(result.error || 'Failed to load events.');
      toast({ variant: 'destructive', title: 'Error loading events', description: result.error });
    }
    setIsLoading(false);
  }, [selectedStudent, toast]);

  useEffect(() => {
    fetchEvents();
  }, [selectedStudent, fetchEvents]);
  
  const handleNewEvent = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    
    setSelectedEvent({
      id: '',
      title: '',
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
      tutorName: '',
      cost: 0,
      meetingLink: '',
      description: '',
    });
    setIsFormOpen(true);
  };
  
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleSave = async (eventData: Omit<CalendarEvent, 'id'> & { id?: string }) => {
    if (!selectedStudent?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'No student selected.' });
      return;
    }
    
    const payload = {
        ...eventData,
        studentId: selectedStudent.id,
    };
    
    const result = await saveCalendarEvent(payload);
    
    if (result.success && result.event) {
        toast({ title: 'Event Saved', description: `"${result.event.title}" has been saved.` });
        fetchEvents();
        setIsFormOpen(false);
        setSelectedEvent(null);
    } else {
        toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
    }
  };

  const renderContent = () => {
    if (isLoading || studentIsLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!selectedStudent && user?.isAdmin) {
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
    
    if (error) {
       return (
         <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Error Loading Calendar</h3>
              <p className="text-destructive/80">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchEvents} className="mt-2">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
       <Card>
        <CardHeader>
            <CardTitle>Scheduled Events</CardTitle>
            <CardDescription>
              {`Showing ${events.length} upcoming events for ${selectedStudent?.name || 'the selected student'}.`}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {events.length > 0 ? (
                <ul className="space-y-4">
                    {events.sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime()).map(event => (
                        <li key={event.id} onClick={() => handleSelectEvent(event)} className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <p className="font-semibold">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                                {format(parseISO(event.start as string), 'PPP, p')} - {format(parseISO(event.end as string), 'p')}
                            </p>
                            {event.tutorName && <p className="text-sm text-muted-foreground">Tutor: {event.tutorName}</p>}
                        </li>
                    ))}
                </ul>
            ) : (
                 <div className="text-center py-10">
                    <p className="text-muted-foreground">No events scheduled.</p>
                </div>
            )}
        </CardContent>
       </Card>
    );
  };
  
  return (
    <>
      <PageHeader title="Calendar" description="Manage lessons and meetings.">
        <Button onClick={handleNewEvent} disabled={!selectedStudent}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>

      {renderContent()}

      <EventDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        event={selectedEvent}
        studentId={selectedStudent?.id}
        onSave={handleSave}
      />
    </>
  );
}
