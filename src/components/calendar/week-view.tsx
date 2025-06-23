'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { DayPilot, DayPilotCalendar, DayPilotMonth } from '@daypilot/daypilot-lite-react';
import type { CalendarEvent } from '@/types';

interface MainCalendarProps {
  events: CalendarEvent[];
  viewType: 'Day' | 'Week' | 'Month';
  selectedDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onTimeRangeSelected: (start: Date, end: Date) => void;
}

export function MainCalendar({
  events,
  viewType,
  selectedDate,
  onEventClick,
  onTimeRangeSelected,
}: MainCalendarProps) {
  const calendarRef = useRef<any>(null);
  const monthRef = useRef<any>(null);

  const dayPilotEvents = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      text: event.title,
      start: new DayPilot.Date(event.start),
      end: new DayPilot.Date(event.end),
      backColor: event.color || 'hsl(var(--primary))',
      fontColor: 'hsl(var(--primary-foreground))',
      allDay: event.allDay,
    }));
  }, [events]);

  const calendarConfig: DayPilot.CalendarConfig = {
    viewType: "Week",
    headerDateFormat: 'dddd, MMMM d, yyyy',
    cellHeight: 40,
    timeRangeSelectedHandling: "CallBack",
    onTimeRangeSelected: async (args: DayPilot.Args.TimeRangeSelected) => {
      onTimeRangeSelected(args.start.toDate(), args.end.toDate());
    },
    eventMoveHandling: "Disabled",
    eventResizeHandling: "Disabled",
    onEventClick: async (args: DayPilot.Args.EventClick) => {
      const originalEvent = events.find(e => e.id === args.e.id());
      if (originalEvent) {
        onEventClick(originalEvent);
      }
    },
  };
  
  const monthConfig: DayPilot.MonthConfig = {
    eventHeight: 25,
    timeRangeSelectedHandling: "CallBack",
    onTimeRangeSelected: async (args: DayPilot.Args.TimeRangeSelected) => {
        onTimeRangeSelected(args.start.toDate(), args.end.toDate());
    },
    eventMoveHandling: "Disabled",
    eventResizeHandling: "Disabled",
    onEventClick: async (args: DayPilot.Args.EventClick) => {
        const originalEvent = events.find(e => e.id === args.e.id());
        if (originalEvent) {
          onEventClick(originalEvent);
        }
    },
  };

  useEffect(() => {
    if (viewType === 'Month') {
        if(monthRef.current?.control) {
            monthRef.current.control.startDate = new DayPilot.Date(selectedDate);
            monthRef.current.control.events.list = dayPilotEvents;
            monthRef.current.control.update();
        }
    } else {
        if(calendarRef.current?.control) {
            calendarRef.current.control.startDate = new DayPilot.Date(selectedDate);
            calendarRef.current.control.viewType = viewType;
            calendarRef.current.control.events.list = dayPilotEvents;
            calendarRef.current.control.update({events: dayPilotEvents});
        }
    }
  }, [selectedDate, viewType, dayPilotEvents]);

  const calendarStyle = {
    height: '100%',
    width: '100%',
  };

  return (
    <div className="flex-1 w-full h-full relative">
      <div style={{...calendarStyle, display: viewType === 'Month' ? 'none' : 'block' }}>
        <DayPilotCalendar {...calendarConfig} ref={calendarRef} />
      </div>
      <div style={{...calendarStyle, display: viewType === 'Month' ? 'block' : 'none' }}>
        <DayPilotMonth {...monthConfig} ref={monthRef} />
      </div>
    </div>
  );
}

// Dummy export to prevent breaking changes if this file was imported elsewhere
export function WeekView() { 
    return null; 
}
