
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EventDialog } from '@/components/calendar/event-dialog';
import type { CalendarEvent } from '@/types';
import { format, isSameDay, parseISO, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, set, addMonths } from 'date-fns';
import { PlusCircle, Edit3, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CalendarIcon as TodayIcon, Loader2, UserX, AlertTriangle } from 'lucide-react';
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
import { useStudent } from '@/hooks/use-student';
import { useAuth } from '@/hooks/use-auth';
import { getCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from './actions';

export default function CalendarPage() {
  const { user } = useAuth();
  const { selectedStudent, isLoading: studentIsLoading } = useStudent();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [zoomLevel, setZoomLevel] = useState(1.0); 
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const currentWeekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const currentWeekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  
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

  const eventDateModifiers = useMemo(() => {
    return {
      hasEvent: events.map(e => e.start as Date),
    };
  }, [events]);
  
  const openNewEventDialog = useCallback(() => {
    if (!studentId) {
      toast({ variant: 'destructive', title: 'No Student Selected', description: 'Please select a student before adding an event.' });
      return;
    }
    setEditingEvent(null);
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

  useEffect(() => setIsMounted(true), []);

  const handleMonthDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSaveEvent = async (eventToSave: CalendarEvent) => {
    const isNew = !eventToSave.id;
    const result = await saveCalendarEvent({
      ...eventToSave,
      id: isNew ? undefined : eventToSave.id,
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

  const handleZoom = (amount: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2.0, prev + amount)));
  };

  const navigateDate = (offset: number) => {
    if (currentView === 'day' || currentView === 'month') {
      setSelectedDate(prev => addDays(prev, offset));
    } else if (currentView === 'week') {
      setSelectedDate(prev => addDays(prev, offset * 7));
    }
  };
  
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleSelectDateFromView = (date: Date) => {
    setSelectedDate(date);
    setCurrentView('day'); 
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
    
    return (
        <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'month' | 'week' | 'day')} className="flex-1 flex flex-col">
            <div className="flex items-center p-2 border-b flex-wrap gap-2">
              <TabsList className="mr-auto">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-1 ml-auto md:ml-0">
                 <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} title={currentView === 'week' ? "Previous Week" : "Previous Day"}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:inline-flex items-center">
                    <TodayIcon className="mr-1 h-4 w-4" /> Today
                </Button>
                 <Button variant="outline" size="icon" onClick={() => navigateDate(1)} title={currentView === 'week' ? "Next Week" : "Next Day"}>
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

            <TabsContent value="month" className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
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
              <div className="flex-1 overflow-hidden flex flex-col shadow-inner bg-muted/30 rounded-lg">
                <DayView
                  selectedDate={selectedDate}
                  events={events}
                  zoomLevel={1.0}
                  onNavigateDate={() => {}}
                  onEventClick={openEditEventDialog}
                  onDeleteEvent={handleDeleteEvent}
                />
              </div>
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
    );
  };

  return (
    <>
      <PageHeader title="Interactive Calendar" description="Manage your lessons, meetings, and events.">
        <Button onClick={openNewEventDialog} disabled={!selectedStudent}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>

      <div className="flex flex-col flex-1 h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]">
        {renderContent()}
      </div>

      <EventDialog
        event={editingEvent}
        date={editingEvent ? undefined : selectedDate}
        studentId={studentId}
        isOpen={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
        onSave={handleSaveEvent}
      />
    </>
  );
}
