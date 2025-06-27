
'use server';

import { dbAdmin } from '@/lib/firebase-admin';
import type { TodoItem } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function getTodos(studentId: string): Promise<{ todos?: TodoItem[]; error?: string }> {
  if (!studentId) {
    return { error: 'A student must be selected.' };
  }

  try {
    const snapshot = await dbAdmin
      .collection('todos')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const todos = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text,
        completed: data.completed,
        studentId: data.studentId,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as TodoItem;
    });

    return { todos };
  } catch (error: any) {
    console.error('[getTodos] Error:', error);
    return { error: `Failed to fetch todos: ${error.message}` };
  }
}

export async function addTodo(studentId: string, text: string): Promise<{ success: boolean, todo?: TodoItem, error?: string }> {
  if (!studentId || !text.trim()) {
    return { success: false, error: 'Student ID and text are required.' };
  }

  try {
    const newTodoRef = dbAdmin.collection('todos').doc();
    const newTodoData = {
      studentId,
      text: text.trim(),
      completed: false,
      createdAt: Timestamp.now(),
    };
    await newTodoRef.set(newTodoData);
    
    revalidatePath('/dashboard');

    const createdTodo: TodoItem = {
        id: newTodoRef.id,
        text: newTodoData.text,
        completed: newTodoData.completed,
        studentId: newTodoData.studentId,
        createdAt: newTodoData.createdAt.toDate().toISOString(),
    };

    return { success: true, todo: createdTodo };
  } catch (error: any) {
    console.error('[addTodo] Error:', error);
    return { success: false, error: 'Failed to add todo.' };
  }
}

export async function toggleTodo(todoId: string, completed: boolean): Promise<{ success: boolean, error?: string }> {
  if (!todoId) {
    return { success: false, error: 'Todo ID is required.' };
  }

  try {
    const todoRef = dbAdmin.collection('todos').doc(todoId);
    await todoRef.update({ completed });
    
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('[toggleTodo] Error:', error);
    return { success: false, error: 'Failed to update todo.' };
  }
}
