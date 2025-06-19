'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventDialog } from '@/components/calendar/event-dialog';
import { PLACEHOLDER_CALENDAR_EVENTS } from '@/lib/constants';
import type { CalendarEvent } from '@/types';
import { format, isSameDay, parseISO } from 'date-fns';
import { PlusCircle, Edit3, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => 
    PLACEHOLDER_CALENDAR_EVENTS.map(event => ({
      ...event,
      start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
      end: typeof event.end === 'string' ? parseISO(event.end) : event.end,
    }))
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);


  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleSaveEvent = (eventToSave: CalendarEvent) => {
    setEvents(prevEvents => {
      const existingEventIndex = prevEvents.findIndex(e => e.id === eventToSave.id);
      if (existingEventIndex > -1) {
        const updatedEvents = [...prevEvents];
        updatedEvents[existingEventIndex] = eventToSave;
        return updatedEvents;
      }
      return [...prevEvents, eventToSave];
    });
    setEditingEvent(null);
    setIsEventDialogOpen(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
  };

  const openNewEventDialog = () => {
    setEditingEvent(null);
    setIsEventDialogOpen(true);
  };

  const openEditEventDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventDialogOpen(true);
  };

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return events
      .filter(event => isSameDay(event.start, selectedDate))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [selectedDate, events]);

  const eventDateModifiers = useMemo(() => {
    const modifiers: Record<string, Date[]> = {};
    events.forEach(event => {
      const dateKey = format(event.start, 'yyyy-MM-dd');
      if (!modifiers[dateKey]) {
        modifiers[dateKey] = [];
      }
      modifiers[dateKey].push(event.start);
    });
    return {
      ...modifiers,
      hasEvent: events.map(e => e.start),
    };
  }, [events]);

  const eventDayClassNames = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    if (eventDateModifiers[dateKey]) {
      return 'bg-primary/20 rounded-md';
    }
    return '';
  };
  
  if (!isMounted) {
    // You can return a loading skeleton here if you have one
    return <div className="flex justify-center items-center h-screen"><p>Loading Calendar...</p></div>;
  }

  return (
    <>
      <PageHeader title="Interactive Calendar" description="Manage your lessons, meetings, and events.">
        <Button onClick={openNewEventDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="lg:w-2/3 xl:w-3/4 shadow-lg">
          <CardContent className="p-2 md:p-4">
            <ShadCalendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md w-full"
              modifiers={eventDateModifiers}
              modifiersClassNames={{ hasEvent: 'font-bold text-primary relative after:content-[\'\'] after:block after:w-1 after:h-1 after:bg-primary after:rounded-full after:absolute after:left-1/2 after:-bottom-1 after:-translate-x-1/2' }}
              
            />
          </CardContent>
        </Card>

        <Card className="lg:w-1/3 xl:w-1/4 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">
              Events for {selectedDate ? format(selectedDate, 'PPP') : 'Selected Date'}
            </CardTitle>
            <CardDescription>
              {selectedDate ? `You have ${eventsForSelectedDate.length} event(s) scheduled.` : 'Select a date to see events.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] lg:h-[400px]">
              {eventsForSelectedDate.length > 0 ? (
                <ul className="space-y-3">
                  {eventsForSelectedDate.map(event => (
                    <li key={event.id} className="p-3 rounded-md shadow-sm transition-colors" style={{ backgroundColor: event.color ? `${event.color}40` : 'hsl(var(--secondary))' }}> {/* 40 for ~25% opacity */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold font-body">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(event.start, 'p')} - {format(event.end, 'p')}
                          </p>
                          {event.tutorName !== 'N/A' && <p className="text-sm text-muted-foreground">Tutor: {event.tutorName}</p>}
                          {event.cost > 0 && <p className="text-sm text-muted-foreground">Cost: ${event.cost}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEventDialog(event)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the event "{event.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteEvent(event.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {event.description && <p className="text-sm text-muted-foreground mt-1 font-ptsans">{event.description}</p>}
                      {event.meetingLink && <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block mt-1">Join Meeting</a>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {selectedDate ? 'No events for this day.' : 'Please select a date from the calendar.'}
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <EventDialog
        event={editingEvent}
        date={editingEvent ? undefined : selectedDate} // Pass selectedDate only for new events
        isOpen={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        onSave={handleSaveEvent}
      />
    </>
  );
}
