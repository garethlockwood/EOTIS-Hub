
'use client';

import type { CalendarEvent } from '@/types';
import { format, getHours, getMinutes, differenceInMinutes, isSameDay } from 'date-fns';
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const HOUR_HEIGHT = 60; // Base height for one hour in pixels

export function DayView({ selectedDate, events, onEventClick }: DayViewProps) {
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const dayEvents = events.filter(event => isSameDay(event.start as Date, selectedDate));
  const allDayEvents = dayEvents.filter(event => event.allDay);
  const timedEvents = dayEvents.filter(event => !event.allDay);

  return (
    <div className="flex flex-col h-full">
      {/* All-day Section */}
      {allDayEvents.length > 0 && (
        <div className="border-b p-2">
          <div className="grid grid-cols-[auto_1fr] items-center">
            <div className="w-14 text-center text-xs font-semibold">all-day</div>
            <div className="flex flex-wrap gap-1">
              {allDayEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="bg-primary/80 text-primary-foreground text-xs font-medium rounded px-2 py-0.5 cursor-pointer hover:bg-primary"
                  style={{ backgroundColor: event.color }}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timed Section */}
      <ScrollArea className="flex-1">
        <div className="relative grid grid-cols-[auto_1fr] isolate">
          {/* Time Gutter */}
          <div className="w-14 sticky left-0 z-10 bg-background">
            {timeSlots.map(hour => (
              <div key={`time-${hour}`} className="h-[60px] text-right text-xs text-muted-foreground pr-1 relative -top-2">
                {hour > 0 ? format(new Date(0, 0, 0, hour), 'ha') : ''}
              </div>
            ))}
          </div>

          {/* Grid and Events */}
          <div className="relative col-start-2">
            {/* Grid lines */}
            {timeSlots.map(hour => (
              <div key={`line-${hour}`} className="h-[60px] border-b border-t border-border"></div>
            ))}

            {/* Events */}
            {timedEvents.map(event => {
              const start = event.start as Date;
              const end = event.end as Date;
              const top = (getHours(start) * HOUR_HEIGHT) + getMinutes(start);
              const duration = differenceInMinutes(end, start);
              const height = (duration / 60) * HOUR_HEIGHT;

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute left-1 right-1 rounded-md p-2 shadow-md overflow-hidden cursor-pointer group text-card-foreground"
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 20)}px`,
                    backgroundColor: event.color || 'hsl(var(--primary))',
                    zIndex: 10,
                  }}
                >
                  <p className="font-semibold text-xs truncate">{event.title}</p>
                  <p className="text-xs truncate">{format(start, 'p')} - {format(end, 'p')}</p>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
