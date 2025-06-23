
'use client';

import type { CalendarEvent } from '@/types';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MonthViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthView({ selectedDate, events, onDayClick, onEventClick }: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dayKey = format(event.start as Date, 'yyyy-MM-dd');
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(event);
    });
    return map;
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 sticky top-0 bg-background z-10 border-b">
        {WEEKDAYS.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-7 grid-rows-5 flex-1">
        {days.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(dayKey) || [];
          const MAX_EVENTS_TO_SHOW = 2;

          return (
            <div
              key={day.toString()}
              className={cn(
                'border-r border-b p-2 flex flex-col relative',
                !isSameMonth(day, monthStart) && 'bg-muted/50 text-muted-foreground',
                isToday(day) && 'bg-accent/20'
              )}
              onClick={() => onDayClick(day)}
            >
              <time
                dateTime={format(day, 'yyyy-MM-dd')}
                className={cn(
                  'self-start mb-1 h-6 w-6 flex items-center justify-center rounded-full text-sm',
                   isToday(day) && 'bg-primary text-primary-foreground font-bold'
                )}
              >
                {format(day, 'd')}
              </time>
              <div className="flex-1 space-y-1 overflow-hidden">
                {dayEvents.slice(0, MAX_EVENTS_TO_SHOW).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                    className="text-xs rounded-sm px-1.5 py-0.5 text-white truncate cursor-pointer"
                    style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}
                    title={event.title}
                  >
                    {!event.allDay && <span className="font-bold">{format(event.start as Date, 'p')}</span>} {event.title}
                  </div>
                ))}
                {dayEvents.length > MAX_EVENTS_TO_SHOW && (
                   <div className="text-xs text-muted-foreground font-semibold cursor-pointer hover:underline mt-1">
                        + {dayEvents.length - MAX_EVENTS_TO_SHOW} more
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
