
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import type { Student, FinancialDocument, CalendarEvent, TodoItem } from '@/types';
import { CalendarClock, FileText, Users2, ListChecks, PlusCircle, UserPlus, Loader2, UserX } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useStudent } from '@/hooks/use-student';
import { AddStudentDialog } from '@/components/students/add-student-dialog';
import { formatCurrency } from '@/lib/utils';
import { getFinancialDocuments } from '@/app/(app)/finances/actions';
import { getCalendarEvents } from '@/app/(app)/calendar/actions';
import { getTodos, addTodo, toggleTodo } from './actions';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, currency } = useAuth();
  const { selectedStudent, addAndSelectStudent, isLoading: studentIsLoading } = useStudent();
  const { toast } = useToast();
  
  const [newTodo, setNewTodo] = useState('');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  
  const [financialDocs, setFinancialDocs] = useState<FinancialDocument[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  const studentId = selectedStudent?.id;

  const fetchDashboardData = useCallback(async (id: string) => {
    setPageIsLoading(true);
    const [financeResult, calendarResult, todosResult] = await Promise.all([
      getFinancialDocuments(id),
      getCalendarEvents(id),
      getTodos(id),
    ]);
  
    if (financeResult.documents) setFinancialDocs(financeResult.documents);
    else console.error("Dashboard: Failed to fetch financial documents:", financeResult.error);
  
    if (calendarResult.events) setCalendarEvents(calendarResult.events as CalendarEvent[]);
    else console.error("Dashboard: Failed to fetch calendar events:", calendarResult.error);
  
    if (todosResult.todos) setTodos(todosResult.todos);
    else console.error("Dashboard: Failed to fetch todos:", todosResult.error);
  
    setPageIsLoading(false);
  }, []);

  useEffect(() => {
    if (studentId) {
      fetchDashboardData(studentId);
    } else {
      setFinancialDocs([]);
      setCalendarEvents([]);
      setTodos([]);
      setPageIsLoading(false);
    }
  }, [studentId, fetchDashboardData]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const nextSevenDays = new Date();
    nextSevenDays.setDate(now.getDate() + 7);
    return calendarEvents
        .filter(event => {
            const eventStartDate = parseISO(event.start as string);
            return eventStartDate >= now && eventStartDate <= nextSevenDays;
        })
        .sort((a,b) => parseISO(a.start as string).getTime() - parseISO(b.start as string).getTime());
  }, [calendarEvents]);

  const upcomingLessons = useMemo(() => upcomingEvents.filter(e => e.tutorName), [upcomingEvents]);
  const upcomingMeetings = useMemo(() => upcomingEvents.filter(e => !e.tutorName), [upcomingEvents]);
  
  const unpaidInvoices = useMemo(() => 
    financialDocs.filter(doc => doc.type === 'Invoice' && (doc.status === 'Unpaid' || doc.status === 'Overdue'))
  , [financialDocs]);

  const pendingTodos = useMemo(() => todos.filter(t => !t.completed), [todos]);

  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    const originalTodos = [...todos];
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
    const result = await toggleTodo(id, !currentStatus);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update task.' });
      setTodos(originalTodos);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim() === '' || !studentId) return;
    const tempText = newTodo.trim();
    setNewTodo('');
    const result = await addTodo(studentId, tempText);
    if (result.success && result.todo) {
      setTodos(prev => [result.todo!, ...prev]);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to add task.' });
      setNewTodo(tempText);
    }
  };
  
  const handleStudentAdded = (newStudent: Student) => {
    addAndSelectStudent(newStudent);
  };

  const renderContent = () => {
    if (studentIsLoading || pageIsLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    if (!selectedStudent && user?.isAdmin) {
      return (
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-col items-center justify-center h-96 text-center">
            <UserX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Student Selected</h3>
            <p className="text-muted-foreground">Please select a student from the dropdown above or add a new one.</p>
            <Button onClick={() => setIsAddStudentOpen(true)} className="mt-4">
              <UserPlus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard title="Upcoming Lessons" value={upcomingLessons.length} icon={CalendarClock} description="Next 7 days" />
          <StatCard title="Unpaid Invoices" value={unpaidInvoices.length} icon={FileText} description={`Total: ${formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0), currency)}`} />
          <StatCard title="Scheduled Meetings" value={upcomingMeetings.length} icon={Users2} description="Next 7 days" />
          <StatCard title="Pending Todos" value={pendingTodos.length} icon={ListChecks} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-headline flex items-center justify-between">
                Upcoming Lessons
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/calendar"><PlusCircle className="mr-2 h-4 w-4" />View All</Link>
                </Button>
              </CardTitle>
              <CardDescription>Scheduled lessons for the upcoming week.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                {upcomingLessons.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingLessons.map(lesson => (
                      <li key={lesson.id} className="p-3 bg-secondary/50 rounded-md shadow-sm hover:bg-secondary transition-colors">
                        <h4 className="font-semibold font-body">{lesson.title}</h4>
                        <p className="text-sm text-muted-foreground">Tutor: {lesson.tutorName}</p>
                        <p className="text-sm text-muted-foreground">Date: {format(parseISO(lesson.start as string), 'PPP, p')}</p>
                        {lesson.meetingLink && <a href={lesson.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Join Meeting</a>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No upcoming lessons.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-headline flex items-center justify-between">
                To-Do List
              </CardTitle>
              <CardDescription>Manage your tasks and stay organized.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
                <Input 
                  value={newTodo} 
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Add a new task..."
                  className="flex-grow"
                />
                <Button type="submit" variant="outline">Add</Button>
              </form>
              <ScrollArea className="h-60">
                {todos.length > 0 ? (
                  <ul className="space-y-2">
                    {todos.map(todo => (
                      <li key={todo.id} className="flex items-center space-x-3 p-2 bg-secondary/50 rounded-md">
                        <Checkbox
                          id={`todo-${todo.id}`}
                          checked={todo.completed}
                          onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                          aria-labelledby={`todo-label-${todo.id}`}
                        />
                        <label
                          htmlFor={`todo-${todo.id}`}
                          id={`todo-label-${todo.id}`}
                          className={`flex-1 text-sm font-body ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                        >
                          {todo.text}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No tasks yet. Add one above!</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-headline flex items-center justify-between">
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used actions.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button variant="outline" asChild className="w-full">
                <Link href="/calendar#add-event">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Lesson
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/finances#add-invoice">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Invoice
                </Link>
              </Button>
              <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={!user?.isAdmin}
                  title={!user?.isAdmin ? "Admin rights required" : "Add New Student"}
                  onClick={() => user?.isAdmin && setIsAddStudentOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Add Student
              </Button>
              <Button variant="outline" asChild className="w-full" disabled={!user?.isAdmin} 
                title={!user?.isAdmin ? "Admin rights required" : "Add Staff Member"}
              >
                <Link href={user?.isAdmin ? "/staff#add-member" : "#"} aria-disabled={!user?.isAdmin}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full" disabled={!user?.isAdmin}
                title={!user?.isAdmin ? "Admin rights required" : "Upload Document"}
              >
               <Link href={user?.isAdmin ? "/repository#upload-doc" : "#"} aria-disabled={!user?.isAdmin}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Upload Doc
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full" disabled>
                <Link href="#">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Meeting
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your EOTIS Hub activities." />
      {renderContent()}
      {user?.isAdmin && (
        <AddStudentDialog 
            isOpen={isAddStudentOpen} 
            onOpenChange={setIsAddStudentOpen} 
            onStudentAdded={handleStudentAdded}
        />
      )}
    </>
  );
}
