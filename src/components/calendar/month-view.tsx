
'use client';

import React, { useMemo } from 'react';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CalendarEvent } from '@/types';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const DailyEventList = ({ events, onEventClick }: { events: CalendarEvent[], onEventClick: (event: CalendarEvent) => void }) => {
  if (events.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No events scheduled for this day.</div>
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {events.map(event => (
          <Card 
            key={event.id} 
            className={cn("p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer")}
            style={{ backgroundColor: event.color }}
            onClick={() => onEventClick(event)}
          >
            <CardHeader className="p-0 mb-2">
               <CardTitle className="text-base font-semibold" style={{ color: event.textColor }}>{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-sm space-y-1" style={{ color: event.textColor }}>
                <p>{event.allDay ? 'All Day' : `${format(parseISO(event.start as string), 'h:mm a')} - ${format(parseISO(event.end as string), 'h:mm a')}`}</p>
                {event.tutorName && <p>Tutor: {event.tutorName}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};


export function MonthView({ currentDate, onDateSelect, events, onEventClick }: MonthViewProps) {
  const dailyEvents = useMemo(() => events
    .filter(event => isSameDay(parseISO(event.start as string), currentDate))
    .sort((a,b) => (new Date(a.start as string)).getTime() - (new Date(b.start as string)).getTime()), 
    [events, currentDate]
  );
  
  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
      <div className="p-4 flex justify-center border-b md:border-r md:border-b-0">
        <ShadCalendar
          mode="single"
          selected={currentDate}
          onSelect={(day) => day && onDateSelect(day)}
          className="rounded-md"
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <h3 className="font-semibold p-4 border-b text-lg">
          Events for {format(currentDate, 'PPP')}
        </h3>
        <div className="flex-1 overflow-y-auto">
          <DailyEventList events={dailyEvents} onEventClick={onEventClick} />
        </div>
      </div>
    </div>
  );
}
