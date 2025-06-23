
'use client';

import type { CalendarEvent } from '@/types';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isSameMonth,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  differenceInMinutes,
  isWithinInterval,
} from 'date-fns';
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

const HOUR_HEIGHT_BASE = 60; // px for 100% zoom (1 hour)
const MIN_EVENT_HEIGHT = 20; // px

interface WeekViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  zoomLevel: number;
  onNavigateDate: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function WeekView({
  selectedDate,
  events,
  zoomLevel,
  onSelectDate,
  onEventClick,
  onDeleteEvent,
}: WeekViewProps) {
  const weekStartsOn = 1; // Monday
  const viewStart = startOfWeek(selectedDate, { weekStartsOn });
  const viewEnd = endOfWeek(selectedDate, { weekStartsOn });
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
  const hourHeight = HOUR_HEIGHT_BASE * zoomLevel;

  const timeSlots = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 hours

  const eventsForWeek = events.filter(event => 
    isWithinInterval(event.start as Date, { start: viewStart, end: viewEnd })
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header row with weekdays */}
      <div className="grid grid-cols-[auto_repeat(7,1fr)] sticky top-0 bg-background z-20 border-b shrink-0">
        <div className="w-14 border-r"></div> {/* Spacer for time gutter */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="p-2 text-center border-r border-border last:border-r-0"
          >
            <p
              className={cn(
                'text-xs sm:text-sm font-medium',
                isToday(day) ? 'text-primary font-bold' : 'text-muted-foreground'
              )}
            >
              {format(day, 'EEE')}
            </p>
            <p
              className={cn(
                'text-lg sm:text-xl font-semibold cursor-pointer hover:text-primary',
                isToday(day) ? 'text-primary' : 'text-foreground',
                !isSameMonth(day, selectedDate) && 'text-muted-foreground/70'
              )}
              onClick={() => onSelectDate(day)}
            >
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="relative grid grid-cols-[auto_1fr] isolate">
          {/* Time Gutter and Background Lines Container */}
          <div className="col-span-full row-span-full grid grid-cols-[auto_1fr]">
            
            {/* Time Gutter Labels */}
            <div className="w-14 sticky left-0 z-10 bg-background pr-2">
              {timeSlots.map(hour => (
                <div
                  key={`time-${hour}`}
                  className="h-[var(--hour-height)] text-right text-xs text-muted-foreground -mt-2 pt-2 pr-1"
                  style={{ '--hour-height': `${hourHeight}px` } as React.CSSProperties}
                >
                  {hour > 0 ? format(setMinutes(setHours(new Date(), hour),0), 'ha') : ''}
                </div>
              ))}
            </div>

            {/* Grid Lines Area */}
            <div className="relative col-start-2 grid grid-cols-7">
              {/* Horizontal Lines */}
              {timeSlots.map(hour => (
                <div
                  key={`h-line-${hour}`}
                  className="col-span-7 h-[var(--hour-height)] border-b border-border"
                  style={{ '--hour-height': `${hourHeight}px` } as React.CSSProperties}
                ></div>
              ))}
              {/* Vertical Lines */}
              {days.slice(0, 6).map((_, dayIndex) => (
                 <div 
                    key={`v-line-${dayIndex}`}
                    className="absolute top-0 bottom-0 border-r border-border"
                    style={{ left: `${(dayIndex + 1) * (100 / 7)}%` }}
                 ></div>
              ))}
            </div>
          </div>

          {/* Events Overlay Container */}
          <div className="col-start-2 row-start-1 relative">
            <div className="absolute inset-0 grid grid-cols-7">
              {eventsForWeek.map(event => {
                  const dayIndex = days.findIndex(d => isSameDay(d, event.start as Date));
                  if (dayIndex === -1) return null;

                  const startHour = getHours(event.start as Date) + getMinutes(event.start as Date) / 60;
                  
                  const top = startHour * hourHeight;
                  const durationMinutes = differenceInMinutes(event.end as Date, event.start as Date);
                  let eventHeight = (durationMinutes / 60) * hourHeight;
                  eventHeight = Math.max(eventHeight, MIN_EVENT_HEIGHT * zoomLevel);

                  return (
                  <div
                      key={event.id}
                      className="absolute rounded-md p-1.5 shadow-md overflow-hidden cursor-pointer group"
                      style={{
                          top: `${top}px`,
                          height: `${eventHeight}px`,
                          left: `calc(${(dayIndex * 100/7)}% + 4px)`, // Position within the day column
                          width: `calc(${100/7}% - 8px)`, // Width of the day column
                          backgroundColor: event.color ? `${event.color}E6` : `hsla(var(--primary)/0.9)`, 
                          color: `hsl(var(--card-foreground))`,
                          zIndex: 10 
                      }}
                      onClick={() => onEventClick(event)}
                  >
                      <h4 className="text-xs font-semibold truncate">{event.title}</h4>
                      <p className="text-[10px] truncate">{format(event.start as Date, 'p')} - {format(event.end as Date, 'p')}</p>
                      {eventHeight > 40 * zoomLevel && event.tutorName && event.tutorName !== 'N/A' && <p className="text-[10px] truncate hidden sm:block">Tutor: {event.tutorName}</p>}

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
                                      This will permanently delete the event "{event.title}".
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
        </div>
      </ScrollArea>
    </div>
  );
}
