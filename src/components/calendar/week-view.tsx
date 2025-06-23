
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
  endOfWeek,
  isBefore,
  isAfter,
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

  const weekEvents = events.filter(event => {
    const start = event.start as Date;
    const end = event.end as Date;
    return (
      isWithinInterval(start, { start: viewStart, end: viewEnd }) ||
      isWithinInterval(end, { start: viewStart, end: viewEnd }) ||
      (isBefore(start, viewStart) && isAfter(end, viewEnd))
    );
  });

  const allDayEvents = weekEvents.filter(event => event.allDay);
  const timedEvents = weekEvents.filter(event => !event.allDay);
  
  const getEventPosition = (event: CalendarEvent) => {
    const start = event.start as Date;
    const end = event.end as Date;

    const top = getHours(start) * HOUR_HEIGHT + getMinutes(start);
    const height = differenceInMinutes(end, start);
    
    const dayIndex = days.findIndex(day => isSameDay(day, start));

    if (dayIndex === -1) return null;

    return {
      top: `${top}px`,
      height: `${Math.max((height / 60) * HOUR_HEIGHT, 20)}px`,
      dayIndex,
    };
  };

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="grid grid-cols-[auto_repeat(7,1fr)] sticky top-0 bg-background z-20 border-b shrink-0">
            <div className="w-14 border-r"></div> {/* Spacer for time gutter */}
            {days.map((day) => (
                <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted" onClick={() => onDayHeaderClick(day)}>
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
        {allDayEvents.length > 0 && (
            <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b shrink-0">
                <div className="w-14 text-center text-xs font-semibold self-start py-1 border-r">all-day</div>
                <div className="col-start-2 col-span-7 grid grid-cols-7 relative p-0.5">
                    {allDayEvents.map((event, index) => {
                        const eventStart = event.start as Date;
                        const eventEnd = event.end as Date;
                        const startDayIndex = days.findIndex(d => isSameDay(d, max([eventStart, viewStart])));
                        const endDayIndex = days.findIndex(d => isSameDay(d, min([eventEnd, viewEnd])));

                        if (startDayIndex === -1) return null;
                        
                        const span = endDayIndex >= startDayIndex ? endDayIndex - startDayIndex + 1 : 1;

                        return (
                            <div
                                key={event.id}
                                onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                className="bg-primary/80 text-primary-foreground text-xs font-medium rounded px-2 py-0.5 cursor-pointer hover:bg-primary z-10 mx-px my-[1px] truncate"
                                style={{ 
                                    backgroundColor: event.color,
                                    gridColumn: `${startDayIndex + 1} / span ${span}`,
                                    gridRow: index + 1
                                }}
                            >
                                {event.title}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Timed Section */}
        <ScrollArea className="flex-1">
            <div className="relative" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
                {/* Background Grid */}
                <div className="absolute inset-0 grid grid-cols-[auto_1fr]">
                    <div className="w-14">
                        {timeSlots.map(hour => (
                            <div key={`time-${hour}`} className="h-[60px] text-right text-xs text-muted-foreground pr-1 relative -top-2">
                                {hour > 0 ? format(new Date(0, 0, 0, hour), 'p') : ''}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {days.map((day) => (
                            <div key={day.toISOString()} className="border-r">
                                {timeSlots.map(hour => (
                                    <div key={hour} className="border-t h-[60px]"></div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Events Overlay */}
                <div className="absolute inset-0 grid grid-cols-[auto_1fr]">
                    <div className="w-14"></div> {/* Spacer */}
                    <div className="col-start-2 grid grid-cols-7">
                        {timedEvents.map(event => {
                            const pos = getEventPosition(event);
                            if (!pos) return null;
                            
                            return (
                                <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                    className="absolute rounded-md p-1 shadow-md overflow-hidden cursor-pointer group text-card-foreground"
                                    style={{
                                        top: pos.top,
                                        height: pos.height,
                                        left: `calc(${(pos.dayIndex / 7) * 100}% + 2px)`,
                                        width: `calc(${(1 / 7) * 100}% - 4px)`,
                                        backgroundColor: event.color || 'hsl(var(--primary))',
                                        zIndex: 10,
                                    }}
                                >
                                    <p className="font-semibold text-xs truncate">{event.title}</p>
                                    <p className="text-[10px] truncate">{format(event.start as Date, 'p')}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </ScrollArea>
    </div>
  );
}
