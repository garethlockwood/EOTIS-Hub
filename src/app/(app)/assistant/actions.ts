'use server';

import { askAiAssistantQuestions, type AskAiAssistantQuestionsInput, type AskAiAssistantQuestionsOutput } from '@/ai/flows/answer-questions';

// Updated to include documentsCited
interface ActionResult {
  answer?: string;
  documentsCited?: AskAiAssistantQuestionsOutput['documentsCited'];
  error?: string;
}

export async function submitQuestion(question: string, studentId: string | null): Promise<ActionResult> {
  if (!question.trim()) {
    return { error: 'Question cannot be empty.' };
  }

  try {
    // Pass studentId to the flow
    const input: AskAiAssistantQuestionsInput = { 
      question,
      ...(studentId && { studentId }), // Conditionally add studentId
    };
    const result = await askAiAssistantQuestions(input);
    
    if (result && result.answer) {
      return { 
        answer: result.answer,
        documentsCited: result.documentsCited,
      };
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
