
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  allDay: z.boolean().default(false),
  start: z.date(),
  end: z.date(),
  tutorName: z.string().optional(),
  cost: z.coerce.number().optional(),
  meetingLink: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  description: z.string().optional(),
  color: z.string().optional(),
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

const PRIMARY_COLORS = [
  '#64B5F6', '#81C784', '#FFB74D', '#BA68C8',
  '#FF8A65', '#4DD0E1', '#F06292', '#FFD54F',
];

const SECONDARY_COLORS = [
  '#E57373', '#7986CB', '#4DB6AC', '#AED581',
  '#90A4AE', '#A1887F', '#FFF176', '#DCE775',
];

export function EventDialog({ event, studentId, isOpen, onOpenChange, onSave, onDelete }: EventDialogProps) {
  const { currency } = useAuth();
  const [tutorList, setTutorList] = useState<string[]>([]);
  const [showMoreColors, setShowMoreColors] = useState(false);

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
          color: event.color || undefined,
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
            color: undefined,
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
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Color</FormLabel>
                  <FormControl>
                    <div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {PRIMARY_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              field.value === color
                                ? 'border-ring ring-2 ring-ring ring-offset-2'
                                : 'border-transparent hover:border-muted-foreground/50'
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                            aria-label={`Select color ${color}`}
                          />
                        ))}
                        <button
                            type="button"
                            className={cn(
                              "h-8 w-8 rounded-full border-2 flex items-center justify-center bg-muted",
                              !field.value
                                ? 'border-ring ring-2 ring-ring ring-offset-2'
                                : 'border-transparent hover:border-muted-foreground/50'
                            )}
                            onClick={() => field.onChange(undefined)}
                            aria-label="Reset color"
                          >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowMoreColors(!showMoreColors)}>
                            {showMoreColors ? 'Show less' : 'Show more...'}
                        </Button>
                      </div>
                      {showMoreColors && (
                        <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in-0 duration-300">
                          {SECONDARY_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={cn(
                                "h-8 w-8 rounded-full border-2 transition-all",
                                field.value === color
                                  ? 'border-ring ring-2 ring-ring ring-offset-2'
                                  : 'border-transparent hover:border-muted-foreground/50'
                              )}
                              style={{ backgroundColor: color }}
                              onClick={() => field.onChange(color)}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
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
