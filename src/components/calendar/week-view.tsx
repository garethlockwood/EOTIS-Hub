// src/components/calendar/week-view.tsx
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { format, startOfWeek, addDays, getHours, getMinutes, isWithinInterval, differenceInMinutes, isSameDay, isBefore, isAfter } from 'date-fns';
import type { CalendarEvent } from '@/types';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent: (start: Date, end: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour
const WEEK_STARTS_ON = 1; // Monday

export function WeekView({ currentDate, events, onEventClick, onNewEvent }: WeekViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: WEEK_STARTS_ON });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const weekEvents = useMemo(() => {
    const viewStart = weekDays[0];
    const viewEnd = addDays(weekDays[6], 1);
    return events.filter(event => 
      isWithinInterval(event.start as Date, { start: viewStart, end: viewEnd }) ||
      isWithinInterval(event.end as Date, { start: viewStart, end: viewEnd }) ||
      (isBefore(event.start as Date, viewStart) && isAfter(event.end as Date, viewEnd))
    );
  }, [events, weekDays]);

  const allDayEvents = weekEvents.filter(event => event.allDay);
  const timedEvents = weekEvents.filter(event => !event.allDay);

  const getEventPosition = (event: CalendarEvent) => {
    const start = event.start as Date;
    const end = event.end as Date;
    const top = (getHours(start) * HOUR_HEIGHT) + getMinutes(start);
    const duration = differenceInMinutes(end, start);
    const height = (duration / 60) * HOUR_HEIGHT;
    const dayIndex = weekDays.findIndex(day => isSameDay(day, start));
    return { top, height, dayIndex };
  };

  const handleGridClick = (hour: number, dayIndex: number) => {
    const day = weekDays[dayIndex];
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    onNewEvent(start, end);
  }

  const renderCurrentTimeIndicator = () => {
    const todayIndex = weekDays.findIndex(day => isSameDay(currentTime, day));
    if (todayIndex === -1) return null;

    const top = (getHours(currentTime) * HOUR_HEIGHT) + getMinutes(currentTime);

    return (
      <div className="absolute w-full h-full pointer-events-none" style={{ left: `calc(${todayIndex / 7 * 100}%)`, width: `calc(100% / 7)` }}>
        <div className="relative h-full">
           <div className="absolute left-0 w-full" style={{ top: `${top}px` }}>
            <div className="relative h-px bg-red-500">
              <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Week Header */}
      <div className="flex border-b border-border">
        <div className="w-16 flex-shrink-0 border-r border-border"></div>
        {weekDays.map(day => (
          <div key={day.toString()} className="flex-1 text-center py-2">
            <div className={cn("text-xs text-muted-foreground", isSameDay(day, new Date()) && "font-semibold")}>
              {format(day, 'E')}
            </div>
            <div className={cn("text-2xl font-bold", isSameDay(day, new Date()) && "text-primary")}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      
      {/* All-day Events Section */}
      {allDayEvents.length > 0 && (
         <div className="flex border-b border-border">
            <div className="w-16 flex-shrink-0 border-r border-border text-center text-xs py-1 text-muted-foreground">All day</div>
            <div className="flex-1 relative grid grid-cols-7">
               {allDayEvents.map(event => {
                  const dayIndex = weekDays.findIndex(day => isSameDay(day, event.start as Date));
                   return (
                     <div key={event.id} className="p-1" style={{ gridColumnStart: dayIndex + 1 }}>
                         <div
                            className="bg-primary text-card-foreground rounded px-2 py-0.5 text-sm truncate cursor-pointer"
                            onClick={() => onEventClick(event)}
                         >
                            {event.title}
                        </div>
                     </div>
                   );
               })}
            </div>
         </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {/* Background Grid */}
            <div className="absolute inset-0 grid grid-cols-[auto_1fr]">
                 {/* Time Gutter */}
                <div className="w-16 text-center text-xs text-muted-foreground flex-shrink-0">
                    {HOURS.map(hour => (
                    <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="relative -top-2 pt-2 border-r border-border">
                        {hour > 0 ? `${format(new Date().setHours(hour), 'ha')}` : ''}
                    </div>
                    ))}
                </div>
                 {/* Day Columns */}
                <div className="relative grid grid-cols-7">
                    {/* Horizontal Lines */}
                    {HOURS.map(hour => (
                        <div key={hour} className="col-span-7 border-t border-border" style={{ height: `${HOUR_HEIGHT}px` }}></div>
                    ))}

                    {/* Vertical Lines */}
                    {weekDays.slice(0, 6).map((_, dayIndex) => (
                         <div key={dayIndex} className="absolute top-0 h-full border-r border-border" style={{ left: `calc(${(dayIndex + 1) / 7 * 100}%)`}}></div>
                    ))}

                     {/* Clickable Day/Hour slots */}
                    {weekDays.map((_, dayIndex) => (
                        <div key={dayIndex} className="relative" style={{ gridColumn: `${dayIndex + 1} / span 1` }}>
                            {HOURS.map(hour => (
                                <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => handleGridClick(hour, dayIndex)}></div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Events Overlay */}
            <div className="absolute inset-0 grid grid-cols-[auto_1fr]">
                <div className="w-16"></div> {/* Spacer for time gutter */}
                <div className="relative grid grid-cols-7">
                    {timedEvents.map(event => {
                    const { top, height, dayIndex } = getEventPosition(event);
                    if (dayIndex === -1) return null;
                    
                    return (
                        <div
                        key={event.id}
                        className="absolute p-2 rounded-lg shadow-md cursor-pointer overflow-hidden"
                        style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `calc(${dayIndex / 7 * 100}% + 4px)`,
                            width: `calc(${100 / 7}% - 8px)`,
                            backgroundColor: 'hsl(var(--primary))',
                            color: 'hsl(var(--card-foreground))',
                        }}
                        onClick={() => onEventClick(event)}
                        >
                        <p className="font-bold text-sm truncate">{event.title}</p>
                        <p className="text-xs truncate">{format(event.start as Date, 'p')} - {format(event.end as Date, 'p')}</p>
                        </div>
                    );
                    })}
                    {renderCurrentTimeIndicator()}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
