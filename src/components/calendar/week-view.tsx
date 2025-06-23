
'use client';

import type { CalendarEvent } from '@/types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Edit3, Trash2 } from 'lucide-react';
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

interface WeekViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  zoomLevel: number; 
  onNavigateDate: (date: Date) => void; 
  onSelectDate: (date: Date) => void; 
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function WeekView({ selectedDate, events, zoomLevel, onSelectDate, onEventClick, onDeleteEvent }: WeekViewProps) {
  const weekStartsOn = 1; // Monday
  const viewStart = startOfWeek(selectedDate, { weekStartsOn });
  const viewEnd = endOfWeek(selectedDate, { weekStartsOn });
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });

  const getEventsForDay = (day: Date) => {
    return events
      .filter(event => isSameDay(event.start as Date, day))
      .sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime());
  };
  
  const eventItemMinHeight = 40 * Math.max(0.5, zoomLevel * 0.8);

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-border sticky top-0 bg-background z-10">
        {days.map(day => (
          <div key={day.toISOString()} className="p-2 text-center border-r border-border last:border-r-0">
            <p className={cn("text-xs sm:text-sm font-medium", isToday(day) ? "text-primary font-bold" : "text-muted-foreground")}>{format(day, 'EEE')}</p>
            <p 
              className={cn(
                "text-lg sm:text-xl font-semibold cursor-pointer hover:text-primary",
                isToday(day) ? "text-primary" : "text-foreground",
                !isSameMonth(day, selectedDate) && "text-muted-foreground/70"
              )}
              onClick={() => onSelectDate(day)}
            >
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 h-full">
          {days.map(day => (
            <div 
              key={`content-${day.toISOString()}`} 
              className="border-r border-border last:border-r-0 p-1.5 space-y-1.5"
            >
              {getEventsForDay(day).map(event => (
                <div
                  key={event.id}
                  className="rounded-md p-1.5 shadow cursor-pointer group relative"
                  style={{
                    backgroundColor: event.color ? `${event.color}CC` : `hsla(var(--primary)/0.8)`, 
                    color: `hsl(var(--primary-foreground))`,
                    minHeight: `${eventItemMinHeight}px`
                  }}
                  onClick={() => onEventClick(event)}
                >
                  <p className="text-[10px] sm:text-xs font-semibold truncate">{event.title}</p>
                  <p className="text-[9px] sm:text-[10px] truncate">{format(event.start as Date, 'p')}</p>
                  {zoomLevel > 0.8 && event.tutorName && event.tutorName !== 'N/A' && <p className="text-[9px] truncate hidden sm:block">Tutor: {event.tutorName}</p>}
                  <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                     <Button variant="ghost" size="icon" className="h-5 w-5 text-primary-foreground hover:bg-primary-foreground/20" onClick={(e) => { e.stopPropagation(); onEventClick(event); }}>
                        <Edit3 className="h-2.5 w-2.5" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive-foreground hover:bg-destructive-foreground/20" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the event "{event.title}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteEvent(event.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
