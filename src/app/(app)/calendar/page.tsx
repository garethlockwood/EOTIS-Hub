
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardHeader, CardTitle, CardDescription, ScrollArea
import { EventDialog } from '@/components/calendar/event-dialog';
import { PLACEHOLDER_CALENDAR_EVENTS } from '@/lib/constants';
import type { CalendarEvent } from '@/types';
import { format, isSameDay, parseISO, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, set } from 'date-fns';
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
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0 = 100%

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const { toast } = useToast();


  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const handleMonthDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // Optionally switch to day view: setCurrentView('day');
      toast({ title: "Date Selected", description: `Displaying details for ${format(date, 'PPP')}. Use Week/Day tabs for more views.` });
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


  const eventDateModifiers = useMemo(() => {
    return {
      hasEvent: events.map(e => e.start),
    };
  }, [events]);

  const handleZoom = (amount: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(2.0, prev + amount)));
  };

  const navigateDate = (offset: number) => {
    if (currentView === 'day') {
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
    setCurrentView('day'); // Switch to day view when a date is selected from week/day view
  };

  const currentWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const currentWeekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

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
  

  return (
    <>
      <PageHeader title="Interactive Calendar" description="Manage your lessons, meetings, and events.">
        <Button onClick={openNewEventDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>

      <div className="flex flex-col h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)]"> {/* Adjusted height calculation */}
        <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
          <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'month' | 'week' | 'day')} className="flex-1 flex flex-col">
            <div className="flex items-center p-2 border-b flex-wrap gap-2">
              <TabsList className="mr-auto">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-1 ml-auto md:ml-0">
                 <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} title={currentView === 'day' ? "Previous Day" : "Previous Week"}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:inline-flex items-center">
                    <TodayIcon className="mr-1 h-4 w-4" /> Today
                </Button>
                 <Button variant="outline" size="icon" onClick={() => navigateDate(1)} title={currentView === 'day' ? "Next Day" : "Next Week"}>
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

            <TabsContent value="month" className="flex-1 overflow-auto p-0 relative">
              <ShadCalendar
                mode="single"
                selected={selectedDate}
                onSelect={handleMonthDateSelect}
                month={selectedDate} // Control displayed month
                onMonthChange={setSelectedDate} // Update selectedDate when month changes via internal nav
                className="rounded-md w-full p-1 sm:p-2 md:p-4"
                modifiers={eventDateModifiers}
                modifiersClassNames={{ hasEvent: 'font-bold text-primary relative after:content-[\'\'] after:block after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full after:absolute after:left-1/2 after:transform after:-translate-x-1/2 after:bottom-1.5' }}
              />
            </TabsContent>
            <TabsContent value="week" className="flex-1 overflow-auto">
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
            <TabsContent value="day" className="flex-1 overflow-auto">
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
