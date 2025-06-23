
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import type { CalendarEvent } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { getCurrencySymbol } from '@/lib/utils';
import { getTutorNames } from '@/app/(app)/staff/actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface EventDialogProps {
  event?: CalendarEvent | null;
  date?: Date; // Pre-fill date for new event
  studentId?: string | null; // Student to associate with new event
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (event: CalendarEvent) => void;
  trigger?: React.ReactNode;
}

const initialEventState: Omit<CalendarEvent, 'id'> = {
  title: '',
  start: new Date(),
  end: new Date(new Date().setHours(new Date().getHours() + 1)),
  tutorName: '',
  cost: 0,
  meetingLink: '',
  description: '',
  studentId: undefined,
};

export function EventDialog({ event, date, studentId, isOpen, onOpenChange, onSave, trigger }: EventDialogProps) {
  const { currency } = useAuth();
  const [formData, setFormData] = useState<Omit<CalendarEvent, 'id'>>(initialEventState);
  const [open, setOpen] = useState(isOpen || false);
  const [tutorList, setTutorList] = useState<string[]>([]);

  useEffect(() => {
    getTutorNames().then(result => {
      if (result.tutors) {
        const sortedTutors = result.tutors.sort((a, b) => a.localeCompare(b));
        setTutorList(sortedTutors);
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
        end: typeof event.end === 'string' ? parseISO(event.end) : event.end,
      });
    } else if (date) {
      setFormData({
        ...initialEventState,
        start: date,
        end: new Date(new Date(date).setHours(date.getHours() + 1)),
        studentId: studentId || undefined,
      });
    } else {
      setFormData({
        ...initialEventState,
        studentId: studentId || undefined,
      });
    }
  }, [event, date, studentId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'cost' ? parseFloat(value) || 0 : value }));
  };

  const handleDateChange = (date: Date | undefined, field: 'start' | 'end') => {
    if (date) {
      // Preserve time part of the date
      const originalDate = formData[field];
      const newDate = new Date(date);
      newDate.setHours(originalDate.getHours());
      newDate.setMinutes(originalDate.getMinutes());
      newDate.setSeconds(originalDate.getSeconds());
      setFormData(prev => ({ ...prev, [field]: newDate }));
    }
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => {
    const timeValue = e.target.value; // HH:mm
    const [hours, minutes] = timeValue.split(':').map(Number);
    const currentDate = formData[field] || new Date();
    const newDate = new Date(currentDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setFormData(prev => ({ ...prev, [field]: newDate }));
  };


  const handleTutorChange = (value: string) => {
    setFormData(prev => ({ ...prev, tutorName: value }));
  };
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: CalendarEvent = {
      ...formData,
      id: event?.id || '',
      color: event?.color || 'hsl(var(--primary))',
      studentId: event?.studentId || studentId || undefined,
    };
    onSave(newEvent);
    if (onOpenChange) onOpenChange(false); else setOpen(false);
  };

  const handleOpenChange = (newOpenState: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpenState);
    } else {
      setOpen(newOpenState);
    }
    if (!newOpenState) {
      // Reset form on close
      const resetState = event ? {
        ...event,
        start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
        end: typeof event.end === 'string' ? parseISO(event.end) : event.end,
      } : {
        ...initialEventState,
        start: date || new Date(),
        end: date ? new Date(new Date(date).setHours(date.getHours() + 1)) : new Date(new Date().setHours(new Date().getHours() + 1)),
        studentId: studentId || undefined,
      };
      setFormData(resetState);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{event ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          <DialogDescription>
            {event ? 'Update the details of your event.' : 'Fill in the details for your new lesson or meeting.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title/Subject</Label>
            <Input id="title" name="title" value={formData.title} onChange={handleInputChange} className="col-span-3" required />
          </div>
          
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm font-medium">Date &amp; Time</AccordionTrigger>
              <AccordionContent>
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Start Date &amp; Time</Label>
                    <ShadCalendar
                      mode="single"
                      selected={formData.start}
                      onSelect={(d) => handleDateChange(d, 'start')}
                      className="rounded-md border"
                    />
                    <Input type="time" value={format(formData.start, 'HH:mm')} onChange={(e) => handleTimeChange(e, 'start')} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date &amp; Time</Label>
                    <ShadCalendar
                      mode="single"
                      selected={formData.end}
                      onSelect={(d) => handleDateChange(d, 'end')}
                      className="rounded-md border"
                    />
                    <Input type="time" value={format(formData.end, 'HH:mm')} onChange={(e) => handleTimeChange(e, 'end')} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>


          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tutorName" className="text-right">Tutor</Label>
            <Select name="tutorName" value={formData.tutorName} onValueChange={handleTutorChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a tutor" />
              </SelectTrigger>
              <SelectContent>
                {tutorList.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
                <SelectItem value="N/A">N/A / Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cost" className="text-right">Cost</Label>
            <div className="relative col-span-3">
               <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(currency)}</span>
              <Input id="cost" name="cost" type="number" value={formData.cost} onChange={handleInputChange} className="pl-8" />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meetingLink" className="text-right">Meeting Link</Label>
            <Input id="meetingLink" name="meetingLink" value={formData.meetingLink} onChange={handleInputChange} className="col-span-3" placeholder="Optional: e.g., Zoom, Google Meet" />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Description</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} className="col-span-3 min-h-[80px] font-ptsans" placeholder="Optional: Add notes or details about the lesson/meeting." />
          </div>
        <DialogFooter className="sticky bottom-0 bg-background py-4 border-t -mx-6 px-6">
          <Button type="button" variant="outline" onClick={() => { if (onOpenChange) onOpenChange(false); else setOpen(false); }}>Cancel</Button>
          <Button type="submit">Save Event</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
