
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { EventDialog } from '@/components/calendar/event-dialog';
import type { CalendarEvent } from '@/types';
import { format, parseISO, addDays, addMonths, addWeeks, startOfWeek, addHours, isSameDay } from 'date-fns';
import { PlusCircle, ChevronLeft, ChevronRight, Loader2, UserX, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useStudent } from '@/hooks/use-student';
import { useAuth } from '@/hooks/use-auth';
import { getCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from './actions';
import { MainCalendar } from '@/components/calendar/week-view';
import { ScrollArea } from '@/components/ui/scroll-area';

type ViewType = 'Month' | 'Week' | 'Day';

const DayEventsList = ({ events, selectedDate, onEventClick }: { events: CalendarEvent[], selectedDate: Date, onEventClick: (event: CalendarEvent) => void }) => {
    const dailyEvents = useMemo(() => events.filter(event => 
        isSameDay(event.start as Date, selectedDate)
    ).sort((a,b) => (a.start as Date).getTime() - (b.start as Date).getTime()), [events, selectedDate]);

    if (dailyEvents.length === 0) {
        return <div className="text-center text-muted-foreground p-8">No events scheduled for this day.</div>
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
                {dailyEvents.map(event => (
                    <Card key={event.id} className="p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onEventClick(event)}>
                        <CardHeader className="p-0 mb-2">
                           <CardTitle className="text-base font-semibold">{event.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-sm text-muted-foreground space-y-1">
                            <p>{event.allDay ? 'All Day' : `${format(event.start as Date, 'h:mm a')} - ${format(event.end as Date, 'h:mm a')}`}</p>
                            {event.tutorName && <p>Tutor: {event.tutorName}</p>}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
};


export default function CalendarPage() {
  const { user } = useAuth();
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('Week');
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  const studentId = selectedStudent?.id;

  const fetchEvents = useCallback(async () => {
    if (!studentId) {
      setEvents([]);
      setIsLoadingEvents(false);
      return;
    }
    setIsLoadingEvents(true);
    setError(null);
    try {
      const result = await getCalendarEvents(studentId);
      if (result.events) {
        const parsedEvents = result.events.map(event => ({
          ...event,
          start: parseISO(event.start as string),
          end: parseISO(event.end as string),
        }));
        setEvents(parsedEvents);
      } else if (result.error) {
        setError(result.error);
        toast({ variant: 'destructive', title: 'Error loading events', description: result.error });
      }
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch calendar events.' });
    } finally {
      setIsLoadingEvents(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => setIsMounted(true), []);

  const openNewEventDialog = useCallback((start?: Date, end?: Date) => {
    if (!studentId) {
      toast({ variant: 'destructive', title: 'No Student Selected', description: 'Please select a student before adding an event.' });
      return;
    }
    const newEvent: CalendarEvent = {
        id: '', // Empty ID signifies a new event
        title: '',
        start: start || new Date(),
        end: end || addHours(start || new Date(), 1),
        allDay: false,
        studentId: studentId,
        tutorName: '',
        cost: 0
    }
    setEditingEvent(newEvent);
    setIsEventDialogOpen(true);
  }, [studentId, toast]);

  const openEditEventDialog = useCallback((event: CalendarEvent) => {
    setEditingEvent({
      ...event,
      start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
      end: typeof event.end === 'string' ? parseISO(event.end) : event.end,
    });
    setIsEventDialogOpen(true);
  }, []);

  const handleSaveEvent = async (eventToSave: Omit<CalendarEvent, 'id'> & { id?: string }) => {
    const result = await saveCalendarEvent({
      ...eventToSave,
      studentId: studentId,
    });

    if (result.success && result.event) {
      toast({ title: "Event Saved", description: `Event "${eventToSave.title}" has been saved.`});
      await fetchEvents();
    } else {
      toast({ variant: "destructive", title: "Save Failed", description: result.error || "Could not save the event." });
    }
    setEditingEvent(null);
    setIsEventDialogOpen(false);
  };
  
  const handleDeleteEvent = async (eventId: string) => {
    const eventTitle = events.find(e => e.id === eventId)?.title || "event";
    const result = await deleteCalendarEvent(eventId);
    if(result.success) {
      toast({ title: "Event Deleted", description: `Event "${eventTitle}" has been deleted.`, variant: "destructive"});
      await fetchEvents();
    } else {
      toast({ variant: "destructive", title: "Delete Failed", description: result.error || "Could not delete the event."});
    }
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedDate(new Date());
      return;
    }

    const increment = direction === 'prev' ? -1 : 1;
    if (currentView === 'Day') {
      setSelectedDate(prev => addDays(prev, increment));
    } else if (currentView === 'Week') {
      setSelectedDate(prev => addWeeks(prev, increment));
    } else { // month
      setSelectedDate(prev => addMonths(prev, increment));
    }
  };
  
  const viewTitle = useMemo(() => {
    if (currentView === 'Month') return format(selectedDate, 'MMMM yyyy');
    if (currentView === 'Week') {
      const weekStartsOn = 1;
      const start = startOfWeek(selectedDate, { weekStartsOn });
      const end = addDays(start, 6);
      return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
    }
    return format(selectedDate, 'EEEE, MMMM d, yyyy');
  }, [currentView, selectedDate]);
  
  const handleTimeRangeSelected = (start: Date, end: Date) => {
    openNewEventDialog(start, end);
  };

  const renderContent = () => {
    if (studentIsLoading || !isMounted) {
      return (
        <div className="flex justify-center items-center flex-1 h-[calc(100vh-16rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    if (!selectedStudent && user?.isAdmin) {
       return (
        <Card className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <UserX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Student Selected</h3>
            <p className="text-muted-foreground">Please select a student to view their calendar.</p>
        </Card>
      );
    }

    if (isLoadingEvents) {
      return (
        <div className="flex justify-center items-center flex-1 h-[calc(100vh-16rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }
    
    if (error) {
      return (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Error Loading Events</h3>
              <p className="text-destructive/80">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchEvents} className="mt-2">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const calendarHeader = (
       <div className="flex items-center p-2 border-b flex-wrap gap-2">
          <div className='flex items-center gap-1'>
              <Button variant="outline" onClick={() => handleNavigate('today')}>Today</Button>
              <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <h2 className="text-lg font-semibold text-center ml-4 mr-auto">{viewTitle}</h2>
          <div className='flex items-center gap-2'>
              {(['Month', 'Week', 'Day'] as ViewType[]).map(view => (
                  <Button 
                      key={view} 
                      variant={currentView === view ? 'default' : 'outline'}
                      onClick={() => setCurrentView(view)}
                      className='capitalize'
                  >
                      {view}
                  </Button>
              ))}
          </div>
      </div>
    );
    
    if (currentView === 'Month') {
      return (
        <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
          {calendarHeader}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="p-4 flex justify-center border-b md:border-r md:border-b-0">
              <ShadCalendar
                mode="single"
                selected={selectedDate}
                onSelect={(day) => day && setSelectedDate(day)}
                className="rounded-md"
              />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <h3 className="font-semibold p-4 border-b text-lg">
                Events for {format(selectedDate, 'PPP')}
              </h3>
              <div className="flex-1 overflow-y-auto">
                <DayEventsList events={events} selectedDate={selectedDate} onEventClick={openEditEventDialog} />
              </div>
            </div>
          </div>
        </Card>
      )
    }
    
    return (
        <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
            {calendarHeader}
            <div className="flex-1 overflow-auto">
              <MainCalendar 
                events={events}
                viewType={currentView}
                selectedDate={selectedDate}
                onEventClick={openEditEventDialog}
                onTimeRangeSelected={handleTimeRangeSelected}
              />
            </div>
        </Card>
    );
  };

  return (
    <>
      <PageHeader title="Interactive Calendar" description="Manage your lessons, meetings, and events.">
        <Button onClick={() => openNewEventDialog()} disabled={!selectedStudent}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>

      <div className="flex flex-col flex-1 h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
        {renderContent()}
      </div>

      {isEventDialogOpen && (
        <EventDialog
            event={editingEvent}
            studentId={studentId}
            isOpen={isEventDialogOpen}
            onOpenChange={setIsEventDialogOpen}
            onSave={handleSaveEvent}
        />
      )}
    </>
  );
}
