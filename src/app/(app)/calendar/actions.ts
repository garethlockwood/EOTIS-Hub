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
      return {
        id: docSnap.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings for client-side compatibility
        start: (data.start as Timestamp).toDate().toISOString(),
        end: (data.end as Timestamp).toDate().toISOString(),
      } as CalendarEvent;
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
        
        const returnedEvent: CalendarEvent = {
            id: eventRef.id,
            ...savedData,
            start: (savedData.start as Timestamp).toDate().toISOString(),
            end: (savedData.end as Timestamp).toDate().toISOString(),
        } as CalendarEvent;

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
