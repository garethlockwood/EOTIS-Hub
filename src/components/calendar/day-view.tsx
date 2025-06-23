// src/components/calendar/day-view.tsx
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { format, getHours, getMinutes, isSameDay, differenceInMinutes } from 'date-fns';
import type { CalendarEvent } from '@/types';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent: (start: Date, end: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour

export function DayView({ currentDate, events, onEventClick, onNewEvent }: DayViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const start = event.start as Date;
      return isSameDay(start, currentDate);
    });
  }, [events, currentDate]);

  const getEventPosition = (event: CalendarEvent) => {
    const start = event.start as Date;
    const end = event.end as Date;
    const top = (getHours(start) * HOUR_HEIGHT) + getMinutes(start);
    const duration = differenceInMinutes(end, start);
    const height = (duration / 60) * HOUR_HEIGHT;
    return { top, height };
  };
  
  const handleGridClick = (hour: number, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = Math.floor(offsetY / HOUR_HEIGHT * 60);

    const start = new Date(currentDate);
    start.setHours(hour, minutes, 0, 0);

    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
    onNewEvent(start, end);
  }

  const renderCurrentTimeIndicator = () => {
    if (!isSameDay(currentTime, currentDate)) return null;

    const top = (getHours(currentTime) * HOUR_HEIGHT) + getMinutes(currentTime);

    return (
      <div className="absolute left-0 w-full" style={{ top: `${top}px` }}>
        <div className="relative h-px bg-red-500">
          <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500"></div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Day Header */}
        <div className="flex border-b border-border">
            <div className="w-16 flex-shrink-0 border-r border-border"></div>
            <div className="flex-1 text-center py-2">
                {/* Header content can be added here if needed */}
            </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 overflow-y-auto">
            <div className="flex h-full" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                {/* Time Gutter */}
                <div className="w-16 text-center text-xs text-muted-foreground flex-shrink-0">
                    {HOURS.map(hour => (
                    <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="relative -top-2 pt-2">
                        {hour > 0 ? `${format(new Date().setHours(hour), 'ha')}` : ''}
                    </div>
                    ))}
                </div>
                {/* Calendar Grid */}
                <div className="flex-1 grid grid-cols-1 relative">
                    {/* Background Lines */}
                    {HOURS.map(hour => (
                    <div 
                        key={hour} 
                        className="border-t border-r border-border" 
                        style={{ height: `${HOUR_HEIGHT}px` }} 
                        onClick={(e) => handleGridClick(hour, e)}>
                    </div>
                    ))}
                    
                    {/* Events */}
                    {dayEvents.map(event => {
                    const { top, height } = getEventPosition(event);
                    return (
                        <div
                        key={event.id}
                        className="absolute left-1 right-1 p-2 rounded-lg shadow-md cursor-pointer overflow-hidden"
                        style={{
                            top: `${top}px`,
                            height: `${height}px`,
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
  );
}
