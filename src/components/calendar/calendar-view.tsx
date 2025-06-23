
'use client';

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventChangeArg, EventInput } from '@fullcalendar/core';

interface CalendarViewProps {
  view: string;
  events: EventInput[];
  onDateSelect: (selectInfo: DateSelectArg) => void;
  onEventClick: (clickInfo: EventClickArg) => void;
  onEventChange: (changeInfo: EventChangeArg) => void;
}

export default function CalendarView({ view, events, onDateSelect, onEventClick, onEventChange }: CalendarViewProps) {
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
        select={onDateSelect}
        eventClick={onEventClick}
        eventChange={onEventChange} // Handles drag/drop & resize
        height="auto"
      />
    </div>
  );
}
