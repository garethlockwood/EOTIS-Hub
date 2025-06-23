
'use client';

import type { CalendarEvent } from '@/types';
import { format, isSameDay, setHours, setMinutes, getHours, getMinutes, differenceInMinutes, addDays } from 'date-fns';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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


const HOUR_HEIGHT_BASE = 60; // px for 100% zoom (1 hour)
const MIN_EVENT_HEIGHT = 20; // px

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  zoomLevel: number;
  onNavigateDate: (date: Date) => void; 
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function DayView({ selectedDate, events, zoomLevel, onEventClick, onDeleteEvent }: DayViewProps) {
  const hourHeight = HOUR_HEIGHT_BASE * zoomLevel;

  const timeSlots = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 hours

  const eventsForDay = events
    .filter(event => isSameDay(event.start as Date, selectedDate))
    .sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime());

  return (
    <ScrollArea className="h-full w-full">
      <div className="relative grid grid-cols-[auto_1fr] isolate">
        {/* Time Gutter */}
        <div className="sticky left-0 z-10 bg-background pr-2 pt-[calc(var(--hour-height)/2)] -mt-[calc(var(--hour-height)/2)]" style={{ '--hour-height': `${hourHeight}px` } as React.CSSProperties}>
          {timeSlots.map(hour => (
            <div
              key={`time-${hour}`}
              className="h-[var(--hour-height)] text-right text-xs text-muted-foreground pr-1 border-r border-border flex items-start justify-end"
              style={{ '--hour-height': `${hourHeight}px` } as React.CSSProperties}
            >
              {format(setMinutes(setHours(new Date(), hour),0), 'ha')}
            </div>
          ))}
        </div>

        {/* Events Area */}
        <div className="relative col-start-2">
          {/* Hour Lines */}
          {timeSlots.map(hour => (
            <div
              key={`line-${hour}`}
              className="h-[var(--hour-height)] border-b border-border"
              style={{ '--hour-height': `${hourHeight}px` } as React.CSSProperties}
            ></div>
          ))}

          {/* Render Events */}
          {eventsForDay.map(event => {
            const startHour = getHours(event.start as Date) + getMinutes(event.start as Date) / 60;
            const endHour = getHours(event.end as Date) + getMinutes(event.end as Date) / 60;
            
            const top = startHour * hourHeight;
            const durationMinutes = differenceInMinutes(event.end as Date, event.start as Date);
            let eventHeight = (durationMinutes / 60) * hourHeight;
            eventHeight = Math.max(eventHeight, MIN_EVENT_HEIGHT * zoomLevel);


            return (
              <div
                key={event.id}
                className="absolute left-1 right-1 rounded-md p-2 shadow-md overflow-hidden cursor-pointer group"
                style={{
                  top: `${top}px`,
                  height: `${eventHeight}px`,
                  backgroundColor: event.color ? `${event.color}E6` : `hsla(var(--primary)/0.9)`, 
                  color: `hsl(var(--primary-foreground))`,
                  zIndex: 10 
                }}
                onClick={() => onEventClick(event)}
              >
                <h4 className="text-xs sm:text-sm font-semibold truncate">{event.title}</h4>
                <p className="text-xs truncate">{format(event.start as Date, 'p')} - {format(event.end as Date, 'p')}</p>
                {event.tutorName && event.tutorName !== 'N/A' && <p className="text-xs truncate hidden sm:block">Tutor: {event.tutorName}</p>}
                 {eventHeight > 40 * zoomLevel && event.description && <p className="text-xs truncate mt-1 hidden md:block">{event.description}</p>}
                 <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20" onClick={(e) => { e.stopPropagation(); onEventClick(event); }}>
                        <Edit3 className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive-foreground hover:bg-destructive-foreground/20" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-3 w-3" />
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
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
    
