
'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PLACEHOLDER_LESSONS, PLACEHOLDER_INVOICES, PLACEHOLDER_MEETINGS, PLACEHOLDER_TODOS } from '@/lib/constants';
import type { UpcomingLesson, UnpaidInvoice, ScheduledMeeting, TodoItem, Student } from '@/types';
import { CalendarClock, FileText, Users2, ListChecks, PlusCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useStudent } from '@/hooks/use-student';
import { AddStudentDialog } from '@/components/students/add-student-dialog';

export default function DashboardPage() {
  const { user } = useAuth();
  const { addAndSelectStudent } = useStudent();
  const [todos, setTodos] = useState<TodoItem[]>(PLACEHOLDER_TODOS);
  const [newTodo, setNewTodo] = useState('');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  const handleToggleTodo = (id: string) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim() === '') return;
    setTodos(prevTodos => [
      ...prevTodos,
      { id: Date.now().toString(), text: newTodo.trim(), completed: false },
    ]);
    setNewTodo('');
  };

  const handleStudentAdded = (newStudent: Student) => {
    addAndSelectStudent(newStudent);
  };

  const upcomingLessons: UpcomingLesson[] = PLACEHOLDER_LESSONS;
  const unpaidInvoices: UnpaidInvoice[] = PLACEHOLDER_INVOICES;
  const scheduledMeetings: ScheduledMeeting[] = PLACEHOLDER_MEETINGS;

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your EOTIS Hub activities." />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Upcoming Lessons" value={upcomingLessons.length} icon={CalendarClock} description="Next 7 days" />
        <StatCard title="Unpaid Invoices" value={unpaidInvoices.length} icon={FileText} description={`Total: $${unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0)}`} />
        <StatCard title="Scheduled Meetings" value={scheduledMeetings.length} icon={Users2} description="Next 7 days" />
        <StatCard title="Pending Todos" value={todos.filter(t => !t.completed).length} icon={ListChecks} />
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
            <CardDescription>Your scheduled lessons for the upcoming week.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
              {upcomingLessons.length > 0 ? (
                <ul className="space-y-3">
                  {upcomingLessons.map(lesson => (
                    <li key={lesson.id} className="p-3 bg-secondary/50 rounded-md shadow-sm hover:bg-secondary transition-colors">
                      <h4 className="font-semibold font-body">{lesson.subject}</h4>
                      <p className="text-sm text-muted-foreground">Tutor: {lesson.tutor}</p>
                      <p className="text-sm text-muted-foreground">Date: {lesson.date}, Time: {lesson.time}</p>
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
              <Button variant="ghost" size="sm" onClick={handleAddTodo}><PlusCircle className="mr-2 h-4 w-4" />Add</Button>
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
                        onCheckedChange={() => handleToggleTodo(todo.id)}
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
