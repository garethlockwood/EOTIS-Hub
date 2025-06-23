
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, startOfDay, endOfDay, setHours, setMinutes, getHours, getMinutes, differenceInMilliseconds } from 'date-fns';
import type { CalendarEvent } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { getCurrencySymbol } from '@/lib/utils';
import { getTutorNames } from '@/app/(app)/staff/actions';
import { Trash2 } from 'lucide-react';

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  allDay: z.boolean().default(false),
  start: z.date(),
  end: z.date(),
  tutorName: z.string().optional(),
  cost: z.coerce.number().optional(),
  meetingLink: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  description: z.string().optional(),
}).refine(data => data.end >= data.start, {
  message: 'End date must be after start date.',
  path: ['end'],
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventDialogProps {
  event?: Partial<CalendarEvent> | null;
  studentId?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
  onDelete?: (eventId: string) => void;
}

export function EventDialog({ event, studentId, isOpen, onOpenChange, onSave, onDelete }: EventDialogProps) {
  const { currency } = useAuth();
  const [tutorList, setTutorList] = useState<string[]>([]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
  });

  const { watch, setValue, reset } = form;
  const isAllDay = watch('allDay');
  const startDate = watch('start');
  const endDate = watch('end');

  useEffect(() => {
    getTutorNames().then(result => {
      if (result.tutors) {
        setTutorList(result.tutors.sort());
      }
    });
  }, []);
  
  useEffect(() => {
    if (isOpen && event) {
        reset({
          title: event.title || '',
          allDay: event.allDay || false,
          start: event.start ? (typeof event.start === 'string' ? parseISO(event.start) : event.start) : new Date(),
          end: event.end ? (typeof event.end === 'string' ? parseISO(event.end) : event.end) : new Date(Date.now() + 3600000),
          tutorName: event.tutorName || '',
          cost: event.cost || 0,
          meetingLink: event.meetingLink || '',
          description: event.description || '',
        });
    } else if (!isOpen) {
        reset({ // Reset to default when closing
            title: '',
            allDay: false,
            start: new Date(),
            end: new Date(Date.now() + 3600000),
            tutorName: '',
            cost: 0,
            meetingLink: '',
            description: '',
        });
    }
  }, [event, isOpen, reset]);


  const handleAllDayToggle = (checked: boolean) => {
    setValue('allDay', checked);
    if (checked) {
      setValue('start', startOfDay(startDate), { shouldValidate: true });
      setValue('end', endOfDay(startDate), { shouldValidate: true });
    }
  };

  const handleStartDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    const duration = differenceInMilliseconds(endDate, startDate);

    const newStart = setMinutes(setHours(selectedDate, getHours(startDate)), getMinutes(startDate));
    const newEnd = new Date(newStart.getTime() + duration);

    setValue('start', newStart, { shouldValidate: true });
    setValue('end', newEnd, { shouldValidate: true });
  }

  const handleTimeChange = (field: 'start' | 'end', time: string) => {
    const originalDate = field === 'start' ? startDate : endDate;
    const [hours, minutes] = time.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
        const newDate = setMinutes(setHours(originalDate, hours), minutes);
        setValue(field, newDate, { shouldValidate: true });
    }
  };


  const onSubmit: SubmitHandler<EventFormValues> = (data) => {
    const submissionData = {
      ...event,
      ...data,
      id: event?.id,
      studentId,
      tutorName: data.tutorName?.trim() || '',
    };
    onSave(submissionData);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{event?.id ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          <DialogDescription>
            {event?.id ? 'Update the details of your event.' : 'Fill in the details for your new lesson or meeting.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} required /></FormControl><FormMessage /></FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2">
              <Checkbox id="allDay" checked={isAllDay} onCheckedChange={handleAllDayToggle} />
              <label htmlFor="allDay" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                All-day event
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
               <FormField control={form.control} name="start" render={({ field }) => (
                  <FormItem>
                     <FormLabel>Start Date {isAllDay ? '' : '& Time'}</FormLabel>
                     <FormControl>
                        <ShadCalendar mode="single" selected={field.value} onSelect={handleStartDateSelect} className="rounded-md border"/>
                     </FormControl>
                     {!isAllDay && (
                        <div className="flex items-center gap-2">
                           <Input type="time" value={format(field.value, 'HH:mm')} onChange={e => handleTimeChange('start', e.target.value)} />
                        </div>
                     )}
                     <FormMessage />
                  </FormItem>
               )} />
               <FormField control={form.control} name="end" render={({ field }) => (
                  <FormItem>
                     <FormLabel>End Date {isAllDay ? '' : '& Time'}</FormLabel>
                     <FormControl>
                        <ShadCalendar mode="single" selected={field.value} onSelect={field.onChange} className="rounded-md border"/>
                     </FormControl>
                     {!isAllDay && (
                        <div className="flex items-center gap-2">
                           <Input type="time" value={format(field.value, 'HH:mm')} onChange={e => handleTimeChange('end', e.target.value)} />
                        </div>
                     )}
                     <FormMessage />
                  </FormItem>
               )} />
            </div>

            <FormField
              control={form.control}
              name="tutorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tutor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ' '}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a tutor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value=" ">None</SelectItem>
                      {tutorList.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost ({getCurrencySymbol(currency)})</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Link</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea className="min-h-[80px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:justify-between">
                <div>
                {event?.id && onDelete && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" className="mr-auto">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the event "{event.title}". This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(event.id!)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Save Event</Button>
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
