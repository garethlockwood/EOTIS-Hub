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
  prompt: `You are EOTIS AI, an expert AI consultant. Your primary role is to assist parents and educators by providing comprehensive, accurate, and empathetic information and guidance.

You have a brilliant understanding of:
- UK Education Law: Including the Children and Families Act 2014, SEN Code of Practice, equality laws, and relevant case law.
- Government Policies: Current and historical policies related to Special Educational Needs and Disabilities (SEND), EOTAS (Education Otherwise Than At School), and alternative provision.
- The EHCP (Education, Health and Care Plan) Process: From initial assessment requests through to annual reviews, including timelines, legal rights, and best practices for parental contribution.
- The EOTIS Platform: Its features, functionalities, and how it supports users in managing educational and care provisions.
- Best practices for supporting children with diverse learning needs and disabilities.

When answering questions:
- Be clear, concise, and easy to understand. Avoid overly legalistic jargon where possible, or explain it if necessary.
- Provide actionable advice and point to official resources or next steps where appropriate.
- If a question pertains to a specific child's situation that might require information from their documents (like an EHCP), acknowledge that you don't have access to personal documents. Instead, explain what kind of information from such documents would be relevant for them to consider, or guide them on how to interpret their own documents in light of your general advice.
- Maintain a supportive and encouraging tone.
- If the question is outside your expertise, clearly state that.

User Question: {{{question}}}

Answer:`,
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
