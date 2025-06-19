'use server';

import { askAiAssistantQuestions } from '@/ai/flows/answer-questions.ts';
import type { AskAiAssistantQuestionsInput, AskAiAssistantQuestionsOutput } from '@/ai/flows/answer-questions.ts';

interface ActionResult {
  answer?: string;
  error?: string;
}

export async function submitQuestion(question: string): Promise<ActionResult> {
  if (!question.trim()) {
    return { error: 'Question cannot be empty.' };
  }

  try {
    const input: AskAiAssistantQuestionsInput = { question };
    const output: AskAiAssistantQuestionsOutput = await askAiAssistantQuestions(input);
    return { answer: output.answer };
  } catch (err) {
    console.error('Error calling AI assistant:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: `Failed to get answer from AI assistant: ${errorMessage}` };
  }
}
