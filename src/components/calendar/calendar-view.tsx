'use client';

import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg } from '@fullcalendar/core';

interface CalendarViewProps {
  view: string;
}

export default function CalendarView({ view }: CalendarViewProps) {
  const [events, setEvents] = useState([
    {
      id: '1',
      title: 'Maths',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  ]);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const title = prompt('New event title');
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();

    if (title) {
      const newEvent = {
        id: String(events.length + 1),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
      };
      setEvents([...events, newEvent]);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (confirm(`Delete event '${clickInfo.event.title}'?`)) {
      setEvents(events.filter(e => e.id !== clickInfo.event.id));
    }
  };

  return (
    <div className="p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={view}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '', // We use our own tabs for view switching
        }}
        selectable={true}
        editable={true}
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
        height="auto"
      />
    </div>
  );
}
