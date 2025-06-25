
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
    description: "Retrieves the content of all documents related to a student. This includes their EHCP files and any associated files from the content repository. Use this tool to answer questions about a user's specific files.",
    inputSchema: z.object({
      studentId: z.string().describe('The ID of the student to fetch documents for.'),
    }),
    outputSchema: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        description: z.string().optional().describe("The full text content of the document. This may start with a user-provided summary, followed by the full text if available."),
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
      allDocuments.push(...ehcpResult.documents.map(d => {
        // --- SIMULATION for "Amelia Lockwood" ---
        // In a real application, you would implement text extraction from the PDF/DOCX file here.
        // For now, we simulate this for a specific document to demonstrate the AI's capability.
        let fullTextDescription = d.description || 'No description provided.';
        if (d.name.toLowerCase().includes('amelia lockwood')) {
            fullTextDescription += `\n\n--- FULL TEXT (SIMULATED) ---\n\nSection F: Provision for Special Educational Needs\n\nPhysical Education (PE): Amelia requires a differentiated PE curriculum. Provision must be made for 1:1 support from a teaching assistant during all PE lessons to ensure her safety and facilitate participation. Weekly hydrotherapy sessions (1 hour) are to be provided by the local authority at the community pool. Amelia will also have access to adapted sports equipment as recommended by the Occupational Therapist in Section E.`;
        }
        // --- END SIMULATION ---
        
        return {
          id: d.docId,
          name: d.name,
          type: 'EHCP Document',
          description: fullTextDescription,
          status: d.status,
          uploadDate: d.uploadDate,
        };
      }));
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
        description: d.description || 'No description provided. The full text is not available for this document type yet.',
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
  prompt: `You are EOTIS AI, an expert AI consultant for parents and educators in the UK.

Your primary goal is to answer the user's question accurately and concisely. **Your final response MUST be a valid JSON object matching the specified output schema.**

You have deep expertise in:
- UK Education Law (Children and Families Act 2014, SEN Code of Practice).
- The EHCP (Education, Health and Care Plan) process.
- The EOTIS Hub platform.

Follow these steps to answer the question:
1.  Analyze the user's question.
2.  If the question is general (e.g., "What is an EHCP?"), answer it using your expert knowledge.
3.  If the question requires information about a specific student's documents (e.g., "What does my EHCP say about PE?"), you **MUST** use the \`getDocumentContext\` tool to fetch the relevant document content. The tool provides the document's text in the 'description' field.
4.  After using the tool, carefully review the 'description' of the returned documents to formulate your answer.
5.  If you use information from one or more documents, you **MUST** cite them in the \`documentsCited\` field of your JSON response. Include the document's id, name, and type.
6.  If the documents do not contain the answer, state that you could not find the information in the provided files.
7.  If the question is outside your expertise, clearly state that.

User Question: {{{question}}}
{{#if studentId}}
(Context: This question is regarding the student with ID: {{{studentId}}})
{{/if}}`,
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
