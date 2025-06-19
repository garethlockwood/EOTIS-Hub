'use server';

/**
 * @fileOverview An AI assistant for answering questions about the EOTIS platform, EHCP process, and educational law (UK).
 *
 * - askAiAssistantQuestions - A function that handles the question answering process.
 * - AskAiAssistantQuestionsInput - The input type for the askAiAssistantQuestions function.
 * - AskAiAssistantQuestionsOutput - The return type for the askAiAssistantQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskAiAssistantQuestionsInputSchema = z.object({
  question: z.string().describe('The question to ask the AI assistant.'),
});
export type AskAiAssistantQuestionsInput = z.infer<typeof AskAiAssistantQuestionsInputSchema>;

const AskAiAssistantQuestionsOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type AskAiAssistantQuestionsOutput = z.infer<typeof AskAiAssistantQuestionsOutputSchema>;

export async function askAiAssistantQuestions(input: AskAiAssistantQuestionsInput): Promise<AskAiAssistantQuestionsOutput> {
  return askAiAssistantQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askAiAssistantQuestionsPrompt',
  input: {schema: AskAiAssistantQuestionsInputSchema},
  output: {schema: AskAiAssistantQuestionsOutputSchema},
  prompt: `You are an AI assistant specialized in providing information about the EOTIS platform, the EHCP (Education, Health and Care Plan) process, and educational law in the UK.\n\nUser Question: {{{question}}}\n\nAnswer: `,
});

const askAiAssistantQuestionsFlow = ai.defineFlow(
  {
    name: 'askAiAssistantQuestionsFlow',
    inputSchema: AskAiAssistantQuestionsInputSchema,
    outputSchema: AskAiAssistantQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
