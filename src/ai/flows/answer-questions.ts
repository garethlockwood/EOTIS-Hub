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
    description: "Retrieves the content and metadata for all documents related to a student. This includes their EHCP files and any associated files from the content repository. Use this tool to answer questions about the contents of a user's specific files. The 'description' field of each returned document contains its full text content.",
    inputSchema: z.object({
      studentId: z.string().describe('The ID of the student to fetch documents for.'),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string().optional().describe("The full text content of the document."),
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
- **IMPORTANT**: If a user's question requires information from their specific documents (e.g., "What does my EHCP say about X?"), you MUST use the \`getDocumentContext\` tool to fetch their documents. The full text of each document is available in the 'description' field of the returned objects. You must base your answer on the content found in that 'description' field. Do not just state that you are accessing the document; provide the answer based on its contents.
- If you use information from a specific document's 'description' field to answer the question, you MUST cite that document in the \`documentsCited\` field of your response.
- If no relevant documents are found after using the tool, or if the 'description' field is empty or says 'No description provided.', state that you couldn't find any specific content to reference but can provide general information.
- Do not invent information about documents you haven't seen.
- If the question is outside your expertise, clearly state that.

User Question: {{{question}}}
{{#if studentId}}
(Context: This question is regarding the student with ID: {{{studentId}}})
{{/if}}

Answer:`,
});

const askAiAssistantQuestionsFlow = ai.defineFlow(
  {
    name: 'askAiAssistantQuestionsFlow',
    inputSchema: AskAiAssistantQuestionsInputSchema,
    outputSchema: AskAiAssistantQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
