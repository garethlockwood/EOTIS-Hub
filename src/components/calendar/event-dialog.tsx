
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as ShadCalendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, addHours, addMinutes, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import type { CalendarEvent } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { getCurrencySymbol } from '@/lib/utils';
import { getTutorNames } from '@/app/(app)/staff/actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronUp, ChevronDown } from 'lucide-react';

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
  event?: CalendarEvent | null;
  studentId?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
}

export function EventDialog({ event, studentId, isOpen, onOpenChange, onSave }: EventDialogProps) {
  const { currency } = useAuth();
  const [tutorList, setTutorList] = useState<string[]>([]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      allDay: false,
      start: new Date(),
      end: addHours(new Date(), 1),
      tutorName: '',
      cost: 0,
      meetingLink: '',
      description: '',
    },
  });

  const isAllDay = form.watch('allDay');

  useEffect(() => {
    getTutorNames().then(result => {
      if (result.tutors) {
        setTutorList(result.tutors.sort());
      }
    });
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      if (event) { // Handles both new (with empty id) and existing events
        form.reset({
          title: event.title,
          allDay: event.allDay || false,
          start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
          end: typeof event.end === 'string' ? parseISO(event.end) : event.end,
          tutorName: event.tutorName || '',
          cost: event.cost || 0,
          meetingLink: event.meetingLink || '',
          description: event.description || '',
        });
      } else { // Fallback for safety, though event should always be provided now
        const now = new Date();
        form.reset({
          title: '',
          allDay: false,
          start: now,
          end: addHours(now, 1),
          tutorName: '',
          cost: 0,
          meetingLink: '',
          description: '',
        });
      }
    }
  }, [event, isOpen, form]);

  const handleAllDayToggle = (checked: boolean) => {
    const currentStart = form.getValues('start');
    if (checked) {
        form.setValue('start', startOfDay(currentStart));
        form.setValue('end', endOfDay(currentStart));
    }
  };

  const handleStartDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    const oldStart = form.getValues('start');
    const oldEnd = form.getValues('end');
    const duration = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      oldStart.getHours(),
      oldStart.getMinutes()
    );

    const newEnd = new Date(newStart.getTime() + duration);
    
    form.setValue('start', newStart, { shouldValidate: true });
    form.setValue('end', newEnd, { shouldValidate: true });
  }

  const handleTimeAdjust = (field: 'start' | 'end', unit: 'hours' | 'minutes', amount: number) => {
    const originalDate = form.getValues(field);
    let newDate;

    if (unit === 'hours') {
      newDate = addHours(originalDate, amount);
    } else { 
      newDate = addMinutes(originalDate, amount);
    }
    
    const otherField = field === 'start' ? 'end' : 'start';
    const otherDate = form.getValues(otherField);

    if ((field === 'start' && newDate >= otherDate) || (field === 'end' && newDate <= otherDate)) {
    } else {
        form.setValue(field, newDate, { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<EventFormValues> = (data) => {
    const submissionData = {
      ...data,
      id: event?.id,
      studentId,
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
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Title</FormLabel>
                  <FormControl className="col-span-3">
                    <Input {...field} required />
                  </FormControl>
                  <FormMessage className="col-start-2 col-span-3" />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 justify-end">
                    <FormLabel>All-day event</FormLabel>
                    <FormControl>
                        <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                                field.onChange(checked);
                                handleAllDayToggle(!!checked);
                            }}
                        />
                    </FormControl>
                    </FormItem>
                )}
            />
            
            {!isAllDay && (
                 <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                    <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm font-medium">Date &amp; Time</AccordionTrigger>
                    <AccordionContent>
                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                            <FormField control={form.control} name="start" render={({ field }) => (
                                <FormItem className='space-y-2'>
                                    <FormLabel>Start Date & Time</FormLabel>
                                    <FormControl>
                                      <ShadCalendar mode="single" selected={field.value} onSelect={handleStartDateSelect} className="rounded-md border"/>
                                    </FormControl>
                                    <div className="flex items-center justify-center gap-1 p-2 rounded-md border bg-background">
                                        <div className="flex flex-col items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('start', 'hours', 1)}><ChevronUp className="h-4 w-4" /></Button>
                                            <span className="text-xl font-mono w-10 text-center">{format(field.value, 'HH')}</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('start', 'hours', -1)}><ChevronDown className="h-4 w-4" /></Button>
                                        </div>
                                        <span className="text-2xl font-bold pb-2">:</span>
                                        <div className="flex flex-col items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('start', 'minutes', 5)}><ChevronUp className="h-4 w-4" /></Button>
                                            <span className="text-xl font-mono w-10 text-center">{format(field.value, 'mm')}</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('start', 'minutes', -5)}><ChevronDown className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    <FormMessage/>
                                </FormItem>
                            )}/>

                            <FormField control={form.control} name="end" render={({ field }) => (
                                <FormItem className='space-y-2'>
                                    <FormLabel>End Date & Time</FormLabel>
                                    <FormControl>
                                      <ShadCalendar mode="single" selected={field.value} onSelect={field.onChange} className="rounded-md border"/>
                                    </FormControl>
                                    <div className="flex items-center justify-center gap-1 p-2 rounded-md border bg-background">
                                        <div className="flex flex-col items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('end', 'hours', 1)}><ChevronUp className="h-4 w-4" /></Button>
                                            <span className="text-xl font-mono w-10 text-center">{format(field.value, 'HH')}</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('end', 'hours', -1)}><ChevronDown className="h-4 w-4" /></Button>
                                        </div>
                                        <span className="text-2xl font-bold pb-2">:</span>
                                        <div className="flex flex-col items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('end', 'minutes', 5)}><ChevronUp className="h-4 w-4" /></Button>
                                            <span className="text-xl font-mono w-10 text-center">{format(field.value, 'mm')}</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTimeAdjust('end', 'minutes', -5)}><ChevronDown className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            <FormField
              control={form.control}
              name="tutorName"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Tutor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl className="col-span-3">
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tutor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tutorList.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      <SelectItem value="N/A">N/A / Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="col-start-2 col-span-3"/>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Cost</FormLabel>
                  <div className="relative col-span-3">
                    <span className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">{getCurrencySymbol(currency)}</span>
                    <FormControl>
                        <Input type="number" className="pl-8" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage className="col-start-2 col-span-3"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Meeting Link</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage className="col-start-2 col-span-3"/>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-start gap-4">
                  <FormLabel className="text-right pt-2">Description</FormLabel>
                  <FormControl className="col-span-3">
                    <Textarea className="min-h-[80px]" {...field} />
                  </FormControl>
                   <FormMessage className="col-start-2 col-span-3"/>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Event</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
