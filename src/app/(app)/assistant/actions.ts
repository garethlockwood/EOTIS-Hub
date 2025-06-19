'use server';

import { askAiAssistantQuestions, type AskAiAssistantQuestionsInput } from '@/ai/flows/answer-questions';

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
    const result = await askAiAssistantQuestions(input);
    
    if (result && result.answer) {
      return { answer: result.answer };
    } else {
      console.error('Unexpected response format from AI assistant flow:', result);
      return { error: 'Received an unexpected response format from the AI assistant.' };
    }

  } catch (err) {
    console.error('Error calling AI assistant flow:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected network or client-side error occurred.';
    // Check if the error is a Genkit specific error and try to extract more details
    if (err && typeof err === 'object' && 'details' in err && typeof err.details === 'string') {
        return { error: `AI Assistant Error: ${err.details}` };
    }
    return { error: `Failed to get answer from AI assistant: ${errorMessage}` };
  }
}
