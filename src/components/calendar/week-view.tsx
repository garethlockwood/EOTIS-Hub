
'use client';

import type { CalendarEvent } from '@/types';
import {
  format,
  startOfWeek,
  eachDayOfInterval,
  isToday,
  isSameDay,
  getHours,
  getMinutes,
  differenceInMinutes,
  isWithinInterval,
  max,
  min,
} from 'date-fns';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayHeaderClick: (date: Date) => void;
}

const HOUR_HEIGHT = 60; // Base height for one hour in pixels

export function WeekView({ selectedDate, events, onEventClick, onDayHeaderClick }: WeekViewProps) {
  const weekStartsOn = 1; // Monday
  const viewStart = startOfWeek(selectedDate, { weekStartsOn });
  const viewEnd = endOfWeek(viewStart, { weekStartsOn });
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const weekEvents = events.filter(event => 
    isWithinInterval(event.start as Date, { start: viewStart, end: viewEnd }) ||
    isWithinInterval(event.end as Date, { start: viewStart, end: viewEnd }) ||
    (event.start as Date < viewStart && event.end as Date > viewEnd)
  );

  const allDayEvents = weekEvents.filter(event => event.allDay);
  const timedEvents = weekEvents.filter(event => !event.allDay);
  
  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="grid grid-cols-[auto_repeat(7,1fr)] sticky top-0 bg-background z-20 border-b shrink-0">
            <div className="w-14 border-r"></div> {/* Spacer for time gutter */}
            {days.map((day) => (
                <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0 cursor-pointer" onClick={() => onDayHeaderClick(day)}>
                    <p className={cn('text-xs font-medium', isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
                        {format(day, 'EEE')}
                    </p>
                    <p className={cn('text-2xl font-semibold', isToday(day) ? 'text-primary' : 'text-foreground')}>
                        {format(day, 'd')}
                    </p>
                </div>
            ))}
        </div>
        
        {/* All-day Section */}
        <div className="border-b p-1 min-h-[30px]">
            <div className="grid grid-cols-[auto_repeat(7,1fr)] relative">
                <div className="w-14 text-center text-xs font-semibold self-center">all-day</div>
                {days.map((day, dayIndex) => (
                    <div key={day.toISOString()} className="col-start-2_auto col-span-1 border-r h-full relative" style={{ gridColumnStart: dayIndex + 2}}></div>
                ))}
                {allDayEvents.map(event => {
                    const eventStart = event.start as Date;
                    const eventEnd = event.end as Date;
                    
                    const startDayIndex = days.findIndex(d => isSameDay(d, max([eventStart, viewStart])));
                    const endDayIndex = days.findIndex(d => isSameDay(d, min([eventEnd, viewEnd])));

                    if (startDayIndex === -1) return null;
                    
                    const span = endDayIndex >= startDayIndex ? endDayIndex - startDayIndex + 1 : 1;

                    return (
                        <div
                            key={event.id}
                            onClick={() => onEventClick(event)}
                            className="absolute bg-primary/80 text-primary-foreground text-xs font-medium rounded px-2 py-0.5 cursor-pointer hover:bg-primary z-10 m-0.5 truncate"
                            style={{ 
                                backgroundColor: event.color,
                                gridColumnStart: startDayIndex + 2,
                                gridColumnEnd: `span ${span}`,
                            }}
                        >
                            {event.title}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Timed Section */}
        <ScrollArea className="flex-1">
            <div className="relative grid grid-cols-[auto_repeat(7,1fr)] isolate">
                {/* Time Gutter & Grid Lines */}
                <div className="w-14 sticky left-0 z-10 bg-background">
                    {timeSlots.map(hour => (
                        <div key={`time-${hour}`} className="h-[60px] text-right text-xs text-muted-foreground pr-1 relative -top-2">
                             {hour > 0 ? format(new Date(0, 0, 0, hour), 'ha') : ''}
                        </div>
                    ))}
                </div>
                <div className="col-start-2 col-span-7 grid grid-cols-7 relative">
                     {days.map((day, dayIndex) => (
                        <div key={day.toISOString()} className="border-r">
                             {timeSlots.map(hour => (
                                <div key={hour} className="h-[60px] border-t"></div>
                             ))}
                        </div>
                     ))}
                     {/* Events */}
                    {timedEvents.map(event => {
                        const eventStart = event.start as Date;
                        if (!isWithinInterval(eventStart, {start: viewStart, end: viewEnd})) return null;

                        const dayIndex = days.findIndex(d => isSameDay(d, eventStart));
                        if (dayIndex === -1) return null;
                        
                        const top = (getHours(eventStart) * HOUR_HEIGHT) + getMinutes(eventStart);
                        const duration = differenceInMinutes(event.end as Date, eventStart);
                        const height = (duration / 60) * HOUR_HEIGHT;

                        return (
                            <div
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className="absolute rounded-md p-1 shadow-md overflow-hidden cursor-pointer group text-card-foreground"
                                style={{
                                    top: `${top}px`,
                                    height: `${Math.max(height, 20)}px`,
                                    left: `calc(${(dayIndex / 7) * 100}% + 2px)`,
                                    width: `calc(${(1 / 7) * 100}% - 4px)`,
                                    backgroundColor: event.color || 'hsl(var(--primary))',
                                    zIndex: 10,
                                }}
                            >
                                <p className="font-semibold text-xs truncate">{event.title}</p>
                                <p className="text-[10px] truncate">{format(eventStart, 'p')}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}
