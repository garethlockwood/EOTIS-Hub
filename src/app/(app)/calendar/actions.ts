
'use server';

import type { CalendarEvent } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const { dbAdmin } = await import('@/lib/firebase-admin');

// Fetches all calendar events for a specific student
export async function getCalendarEvents(
  studentId: string
): Promise<{ events?: CalendarEvent[]; error?: string }> {
  if (!studentId) {
    return { error: 'A student must be selected.' };
  }

  try {
    const snapshot = await dbAdmin
      .collection('calendarEvents')
      .where('studentId', '==', studentId)
      .get();
    
    if (snapshot.empty) {
      return { events: [] };
    }

    const events = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      // Explicitly construct the event object and convert all timestamps
      const event: CalendarEvent = {
        id: docSnap.id,
        title: data.title,
        tutorName: data.tutorName,
        cost: data.cost,
        meetingLink: data.meetingLink,
        description: data.description,
        color: data.color,
        studentId: data.studentId,
        start: (data.start as Timestamp).toDate().toISOString(),
        end: (data.end as Timestamp).toDate().toISOString(),
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
      };
      return event;
    });

    return { events };
  } catch (error: any) {
    console.error('[getCalendarEvents] Error:', error);
    return { error: `Failed to fetch calendar events: ${error.message}` };
  }
}

// Action to create or update a calendar event
export async function saveCalendarEvent(
  eventData: Omit<CalendarEvent, 'id' | 'start' | 'end'> & { start: Date | string; end: Date | string; id?: string; },
): Promise<{ success?: boolean; error?: string; event?: CalendarEvent }> {
  
    if (!eventData.studentId) {
        return { error: 'Event must be associated with a student.' };
    }

    try {
        const { id, start, end, ...dataToSave } = eventData;
        
        const payload: any = {
            ...dataToSave,
            start: Timestamp.fromDate(new Date(start)),
            end: Timestamp.fromDate(new Date(end)),
            updatedAt: Timestamp.now(),
        };

        let eventRef;
        if (id) {
            // Update existing event
            eventRef = dbAdmin.collection('calendarEvents').doc(id);
            await eventRef.update(payload);
        } else {
            // Create new event
            payload.createdAt = Timestamp.now();
            eventRef = dbAdmin.collection('calendarEvents').doc();
            await eventRef.set(payload);
        }
        
        revalidatePath('/calendar');
        
        const savedDoc = await eventRef.get();
        const savedData = savedDoc.data();

        if (!savedData) {
            return { error: 'Failed to retrieve saved event.' };
        }
        
        // Explicitly construct the returned event and convert all timestamps
        const returnedEvent: CalendarEvent = {
            id: eventRef.id,
            title: savedData.title,
            tutorName: savedData.tutorName,
            cost: savedData.cost,
            meetingLink: savedData.meetingLink,
            description: savedData.description,
            color: savedData.color,
            studentId: savedData.studentId,
            start: (savedData.start as Timestamp).toDate().toISOString(),
            end: (savedData.end as Timestamp).toDate().toISOString(),
            createdAt: savedData.createdAt ? (savedData.createdAt as Timestamp).toDate().toISOString() : undefined,
            updatedAt: savedData.updatedAt ? (savedData.updatedAt as Timestamp).toDate().toISOString() : undefined,
        };

        return { success: true, event: returnedEvent };

    } catch (error: any) {
        console.error('[saveCalendarEvent] Error:', error);
        return { error: `Failed to save event: ${error.message}` };
    }
}

// Action to delete a calendar event
export async function deleteCalendarEvent(
    eventId: string,
): Promise<{ success?: boolean; error?: string }> {
    if (!eventId) {
        return { error: 'Event ID is required for deletion.' };
    }

    try {
        await dbAdmin.collection('calendarEvents').doc(eventId).delete();
        revalidatePath('/calendar');
        return { success: true };
    } catch (error: any) {
        console.error('[deleteCalendarEvent] Error:', error);
        return { error: `Failed to delete event: ${error.message}` };
    }
}
