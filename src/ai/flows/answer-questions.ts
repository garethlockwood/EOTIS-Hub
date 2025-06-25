
'use server';

/**
 * @fileOverview An AI assistant for answering questions about the EOTIS platform, EHCP process, and educational law (UK).
 * It can also access user-specific documents from the repository and EHCP sections.
 *
 * - askAiAssistantQuestions - A function that handles the question answering process.
 * - AskAiAssistantQuestionsInput - The input type for the askAiAssistantQuestions function.
 * - AskAiAssistantQuestionsOutput - The return type for the askAiAssistantQuestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getEhcpDocuments } from '@/app/(app)/ehcp/actions';
import { getContentDocuments } from '@/app/(app)/repository/actions';

const AskAiAssistantQuestionsInputSchema = z.object({
  question: z.string().describe('The question to ask the AI assistant.'),
  studentId: z.string().optional().describe('The ID of the student context for the question, if applicable.'),
});
export type AskAiAssistantQuestionsInput = z.infer<typeof AskAiAssistantQuestionsInputSchema>;

const AskAiAssistantQuestionsOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
  documentsCited: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
  })).optional().describe('A list of documents the AI used to formulate the answer.'),
});
export type AskAiAssistantQuestionsOutput = z.infer<typeof AskAiAssistantQuestionsOutputSchema>;

export async function askAiAssistantQuestions(input: AskAiAssistantQuestionsInput): Promise<AskAiAssistantQuestionsOutput> {
  return askAiAssistantQuestionsFlow(input);
}

const getDocumentContext = ai.defineTool(
  {
    name: 'getDocumentContext',
    description: "Retrieves metadata and user-provided summaries for all documents related to a student. This includes their EHCP files and any associated files from the content repository. Use this tool to answer questions about a user's specific files.",
    inputSchema: z.object({
      studentId: z.string().describe('The ID of the student to fetch documents for.'),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string().optional().describe("A user-provided summary of the document's content. This is NOT the full text."),
        status: z.string().optional(),
        uploadDate: z.string(),
      })
    ),
  },
  async ({ studentId }) => {
    const allDocuments: any[] = [];
    
    // Fetch and map EHCP documents
    const ehcpResult = await getEhcpDocuments(studentId);
    if (ehcpResult.documents) {
      allDocuments.push(...ehcpResult.documents.map(d => ({
        id: d.docId,
        name: d.name,
        type: 'EHCP Document',
        description: d.description || 'No description provided.',
        status: d.status,
        uploadDate: d.uploadDate,
      })));
    }
    
    // Fetch and map Content Repository documents
    const contentResult = await getContentDocuments();
    if (contentResult.documents) {
      const relevantContentDocs = contentResult.documents.filter(
        (doc) => !doc.associatedUserId || doc.associatedUserId === studentId
      );
      allDocuments.push(...relevantContentDocs.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        description: d.description || 'No description provided.',
        status: 'N/A', // Content docs don't have a status field like EHCP
        uploadDate: d.uploadDate,
      })));
    }

    return allDocuments;
  }
);

const prompt = ai.definePrompt({
  name: 'askAiAssistantQuestionsPrompt',
  input: { schema: AskAiAssistantQuestionsInputSchema },
  output: { schema: AskAiAssistantQuestionsOutputSchema },
  tools: [getDocumentContext],
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
- **IMPORTANT**: If a user's question requires information from their specific documents (e.g., "What does my EHCP say about X?"), you MUST use the \`getDocumentContext\` tool to fetch their documents. The tool provides a user-written summary in the 'description' field, NOT the full text. You must base your answer on this summary.
- If the 'description' field is empty, "No description provided.", or does not contain enough information to answer the question, you MUST inform the user that you cannot access the full content of the document and can only provide information from its title and summary. Do not invent information.
- If you use information from a document's 'description' field to answer the question, you MUST cite that document in the \`documentsCited\` field of your response.
- If the question is outside your expertise, clearly state that.

User Question: {{{question}}}
{{#if studentId}}
(Context: This question is regarding the student with ID: {{{studentId}}})
{{/if}}

Please provide your answer in the required JSON format.`,
});

const askAiAssistantQuestionsFlow = ai.defineFlow(
  {
    name: 'askAiAssistantQuestionsFlow',
    inputSchema: AskAiAssistantQuestionsInputSchema,
    outputSchema: AskAiAssistantQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    
    if (!output) {
      console.error("AI assistant returned a null output. Input was:", JSON.stringify(input));
      throw new Error('The AI assistant failed to generate a valid response. This might be a temporary issue. Please try rephrasing your question.');
    }
    
    return output;
  }
);
