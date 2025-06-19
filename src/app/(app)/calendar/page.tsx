
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventDialog } from '@/components/calendar/event-dialog';
import { PLACEHOLDER_CALENDAR_EVENTS } from '@/lib/constants';
import type { CalendarEvent } from '@/types';
import { format, isSameDay, parseISO, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, set, addMonths } from 'date-fns';
import { PlusCircle, Edit3, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CalendarIcon as TodayIcon } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { DayView } from '@/components/calendar/day-view';
import { WeekView } from '@/components/calendar/week-view';
import { useToast } from "@/hooks/use-toast";


export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    PLACEHOLDER_CALENDAR_EVENTS.map(event => ({
      ...event,
      start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
      end: typeof event.end === 'string' ? parseISO(event.end) : event.end,
    }))
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [zoomLevel, setZoomLevel] = useState(1.0); 

  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  // Moved hook-dependent calculations before the conditional return
  const currentWeekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const currentWeekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  const viewTitle = useMemo(() => {
    if (currentView === 'month') return format(selectedDate, 'MMMM yyyy');
    if (currentView === 'week') {
      const startFormatted = format(currentWeekStart, 'MMM d');
      const endFormatted = format(currentWeekEnd, 'MMM d, yyyy');
      return `${startFormatted} - ${endFormatted}`;
    }
    if (currentView === 'day') return format(selectedDate, 'EEEE, MMM d, yyyy');
    return '';
  }, [currentView, selectedDate, currentWeekStart, currentWeekEnd]);

  const eventsForSelectedDayInMonthView = useMemo(() => {
    if (currentView !== 'month' || !selectedDate) return [];
    return events.filter(event => isSameDay(event.start, selectedDate))
                 .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, selectedDate, currentView]);

  const eventDateModifiers = useMemo(() => {
    return {
      hasEvent: events.map(e => e.start),
    };
  }, [events]);
  
  useEffect(() => setIsMounted(true), []);

  if (!isMounted) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <PageHeader title="Interactive Calendar" description="Manage your lessons, meetings, and events.">
            <Button onClick={openNewEventDialog} disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Event
            </Button>
        </PageHeader>
        <div className="flex justify-center items-center flex-1">
            <p>Loading Calendar...</p>
        </div>
      </div>
    );
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const handleMonthDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      toast({ title: "Date Selected", description: `Displaying agenda for ${format(date, 'PPP')}.` });
    }
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
    toast({ title: "Event Saved", description: `Event "${eventToSave.title}" has been saved.`});
  };

  const handleDeleteEvent = (eventId: string) => {
    const eventTitle = events.find(e => e.id === eventId)?.title || "event";
    setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
    toast({ title: "Event Deleted", description: `Event "${eventTitle}" has been deleted.`, variant: "destructive"});
  };

  const openNewEventDialog = () => {
    setEditingEvent(null);
    setIsEventDialogOpen(true);
  };

  const openEditEventDialog = useCallback((event: CalendarEvent) => {
    setEditingEvent({
      ...event,
      start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
      end: typeof event.end === 'string' ? parseISO(event.end) : event.end,
    });
    setIsEventDialogOpen(true);
  }, []);

  const handleZoom = (amount: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2.0, prev + amount)));
  };

  const navigateDate = (offset: number) => {
    if (currentView === 'day') {
      setSelectedDate(prev => addDays(prev, offset));
    } else if (currentView === 'week') {
      setSelectedDate(prev => addDays(prev, offset * 7));
    } else if (currentView === 'month') {
      setSelectedDate(prev => addMonths(prev, offset));
    }
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleSelectDateFromView = (date: Date) => {
    setSelectedDate(date);
    setCurrentView('day'); 
  };

  const prevButtonTitle = currentView === 'day' ? "Previous Day" : currentView === 'week' ? "Previous Week" : "Previous Month";
  const nextButtonTitle = currentView === 'day' ? "Next Day" : currentView === 'week' ? "Next Week" : "Next Month";
  

  return (
    <>
      <PageHeader title="Interactive Calendar" description="Manage your lessons, meetings, and events.">
        <Button onClick={openNewEventDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>

      <div className="flex flex-col h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
        <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
          <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'month' | 'week' | 'day')} className="flex-1 flex flex-col">
            <div className="flex items-center p-2 border-b flex-wrap gap-2">
              <TabsList className="mr-auto">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-1 ml-auto md:ml-0">
                 <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} title={prevButtonTitle}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:inline-flex items-center">
                    <TodayIcon className="mr-1 h-4 w-4" /> Today
                </Button>
                 <Button variant="outline" size="icon" onClick={() => navigateDate(1)} title={nextButtonTitle}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm font-medium text-center w-full md:w-auto md:mx-2 order-first md:order-none py-1 md:py-0">{viewTitle}</span>

              {(currentView === 'week' || currentView === 'day') && (
                <div className="flex items-center gap-1 ml-auto">
                  <Button variant="outline" size="icon" onClick={() => handleZoom(-0.25)} disabled={zoomLevel <= 0.5} title="Zoom Out">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs w-10 text-center tabular-nums">{(zoomLevel * 100).toFixed(0)}%</span>
                  <Button variant="outline" size="icon" onClick={() => handleZoom(0.25)} disabled={zoomLevel >= 2.0} title="Zoom In">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="month" className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-auto">
              <Card className="w-full md:flex-shrink-0 md:w-auto self-start shadow-md">
                 <CardContent className="p-0">
                    <ShadCalendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleMonthDateSelect}
                        month={selectedDate}
                        onMonthChange={setSelectedDate}
                        className="p-3"
                        modifiers={eventDateModifiers}
                        modifiersClassNames={{ hasEvent: 'font-bold text-primary relative after:content-[\'\'] after:block after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full after:absolute after:left-1/2 after:transform after:-translate-x-1/2 after:bottom-1.5' }}
                    />
                 </CardContent>
              </Card>
              <Card className="flex-1 md:max-w-md lg:max-w-lg xl:max-w-xl overflow-hidden flex flex-col shadow-md">
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Agenda for {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full p-4">
                    {eventsForSelectedDayInMonthView.length > 0 ? (
                      <ul className="space-y-3">
                        {eventsForSelectedDayInMonthView.map(event => (
                          <li key={event.id} className="p-3 bg-muted/50 rounded-md shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold font-body">{event.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {format(event.start, 'p')} - {format(event.end, 'p')}
                                </p>
                                {event.tutorName && event.tutorName !== 'N/A' && (
                                  <p className="text-xs text-muted-foreground">Tutor: {event.tutorName}</p>
                                )}
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
                                      <AlertDialogAction onClick={() => handleDeleteEvent(event.id)} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{event.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        {selectedDate ? 'No events for this day.' : 'Select a day in the calendar to see events.'}
                      </p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="week" className="flex-1 overflow-hidden p-0">
              <WeekView
                selectedDate={selectedDate}
                events={events}
                zoomLevel={zoomLevel}
                onNavigateDate={setSelectedDate}
                onSelectDate={handleSelectDateFromView}
                onEventClick={openEditEventDialog}
                onDeleteEvent={handleDeleteEvent}
              />
            </TabsContent>
            <TabsContent value="day" className="flex-1 overflow-hidden p-0">
              <DayView
                selectedDate={selectedDate}
                events={events}
                zoomLevel={zoomLevel}
                onNavigateDate={setSelectedDate}
                onEventClick={openEditEventDialog}
                onDeleteEvent={handleDeleteEvent}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <EventDialog
        event={editingEvent}
        date={editingEvent ? undefined : selectedDate}
        isOpen={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        onSave={handleSaveEvent}
      />
    </>
  );
}
    
