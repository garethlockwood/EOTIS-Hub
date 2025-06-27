
'use server';

/**
 * @fileOverview An AI assistant for answering questions about the EOTIS platform, EHCP process, and educational law (UK).
 * It can also access user-specific documents from the repository and EHCP sections by reading their content from Firebase Storage.
 *
 * - askAiAssistantQuestions - A function that handles the question answering process.
 * - AskAiAssistantQuestionsInput - The input type for the askAiAssistantQuestions function.
 * - AskAiAssistantQuestionsOutput - The return type for the askAiAssistantQuestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getEhcpDocuments } from '@/app/(app)/ehcp/actions';
import { getContentDocuments } from '@/app/(app)/repository/actions';
import { storageAdmin } from '@/lib/firebase-admin';
import * as xlsx from 'xlsx';
import { tmpdir } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

// Using require for these packages to work around a Next.js/Turbopack bundling issue
// that causes an ENOENT error when using standard imports.
// Moving these inside the function to further isolate them for the bundler.


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
        description: z.string().optional().describe("The user-provided summary of the document, followed by the full extracted text content of the document if available."),
        status: z.string().optional(),
        uploadDate: z.string(),
      })
    ),
  },
  async ({ studentId }) => {
    const allDocuments: any[] = [];
    
    const [ehcpResult, contentResult] = await Promise.all([
        getEhcpDocuments(studentId),
        getContentDocuments()
    ]);

    const processDocument = async (doc: any, docType: string) => {
        let fullTextDescription = doc.description || 'No description provided.';
        const filePath = doc.storagePath;
        const fileType = doc.fileType || '';

        // Check for a valid file path and a supported file type
        if (filePath && (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('spreadsheetml'))) {
            const tempFilePath = path.join(tmpdir(), path.basename(filePath));
            try {
                // To work around a Next.js/Turbopack bundling issue, we scope the require calls
                // for these specific libraries to inside this function.
                const mammoth = require('mammoth');
                const pdf = require('pdf-parse');

                // Download the file from Firebase Storage to a temporary local path
                await storageAdmin.bucket().file(filePath).download({ destination: tempFilePath });
                
                const buffer = await fs.readFile(tempFilePath);
                let extractedText = 'Unsupported file type for text extraction.';

                if (fileType.includes('pdf')) {
                    const data = await pdf(buffer);
                    extractedText = data.text;
                } else if (fileType.includes('word')) { // .doc, .docx
                    const { value } = await mammoth.extractRawText({ buffer });
                    extractedText = value;
                } else if (fileType.includes('spreadsheetml')) { // .xlsx
                    const workbook = xlsx.read(buffer, { type: 'buffer' });
                    let fullText = '';
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const csv = xlsx.utils.sheet_to_csv(sheet);
                        fullText += `Sheet: ${sheetName}\n${csv}\n\n`;
                    });
                    extractedText = fullText;
                }
                
                fullTextDescription += `\n\n--- FULL TEXT ---\n\n${extractedText}`;

            } catch (e: any) {
                console.warn(`Could not read file content for "${doc.name}" from ${filePath}:`, e);
                fullTextDescription += `\n\n--- FILE CONTENT UNAVAILABLE ---`;
            } finally {
                // Clean up the temporary file
                try { await fs.unlink(tempFilePath); } catch (e) { /* ignore if already deleted */ }
            }
        }

        return {
            id: doc.id || doc.docId,
            name: doc.name,
            type: docType,
            description: fullTextDescription,
            status: doc.status || 'N/A',
            uploadDate: doc.uploadDate,
        };
    };

    const docProcessingPromises: Promise<any>[] = [];

    // Process EHCP documents
    if (ehcpResult.documents) {
        ehcpResult.documents.forEach(d => docProcessingPromises.push(processDocument(d, 'EHCP Document')));
    }

    // Process Content Repository documents
    if (contentResult.documents) {
        const relevantContentDocs = contentResult.documents.filter(
            (doc) => !doc.associatedUserId || doc.associatedUserId === studentId
        );
        relevantContentDocs.forEach(d => docProcessingPromises.push(processDocument(d, d.type)));
    }

    const processedDocuments = await Promise.all(docProcessingPromises);
    allDocuments.push(...processedDocuments);

    return allDocuments;
  }
);

const searchWeb = ai.defineTool(
  {
    name: 'searchWeb',
    description: 'Searches the web for up-to-date information on general knowledge topics, current events, or educational law. Do not use this for information specific to the user or their documents.',
    inputSchema: z.object({
      query: z.string().describe('The search query.'),
    }),
    outputSchema: z.string().describe('A summary of the web search results.'),
  },
  async ({ query }) => {
    // DEVELOPER_TODO: Implement a real web search API call here.
    // This requires an API key for a service like Google Custom Search or Brave Search.
    // Example:
    // const searchResults = await braveSearch.search(query);
    // return searchResults.summary;
    console.log(`[Web Search Tool] Searched for: "${query}". Returning placeholder response.`);
    return "Web search is not fully implemented. To enable this, a developer must integrate a search API (e.g., Google Custom Search, Brave Search) and add the corresponding API key to the environment variables.";
  }
);


const prompt = ai.definePrompt({
  name: 'askAiAssistantQuestionsPrompt',
  input: { schema: AskAiAssistantQuestionsInputSchema },
  output: { schema: AskAiAssistantQuestionsOutputSchema },
  tools: [getDocumentContext, searchWeb],
  // Relax safety settings to reduce the chance of the model returning null on valid documents.
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
  prompt: `You are an expert AI assistant for the EOTIS Hub. You have two primary capabilities:
1.  **Document Analysis**: You can read the user's uploaded documents (EHCPs, reports, etc.) to answer specific questions about their content.
2.  **Web Search**: You can search the web for general knowledge questions, information about educational law, or current events.

**Your primary instruction is to ALWAYS respond with a valid JSON object that adheres to the output schema.**

**Tool Usage Guide:**
-   If the user's question is about their own files, student data, or specific documents (like an EHCP), you MUST use the \`getDocumentContext\` tool.
-   If the user's question is about general knowledge, laws, or topics that require up-to-date information, you MUST use the \`searchWeb\` tool.

After you get information from a tool, your ONLY job is to analyze that information and formulate a direct answer.

**CRITICAL RULES:**
1.  **DO NOT** talk about your process.
2.  **DO NOT** say you need to use a tool. Just use it.
3.  **DO NOT** say you cannot analyze documents or search the web. You can.
4.  **DO** base your answer on the information you receive from the tool.
5.  **DO** cite any documents you used in the \`documentsCited\` field.
6.  **DO** state that the information was not found in the document or on the web if you cannot find it after looking.

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
    // Call the prompt object directly. It returns the full GenerateResponse.
    const llmResponse = await prompt(input);
    const output = llmResponse.output;

    if (!output) {
      // Log the full response for diagnostics, including any finish reasons.
      console.error(
        'AI assistant returned a null/undefined output. Full response:',
        JSON.stringify(llmResponse.toJSON(), null, 2)
      );

      // Provide a more specific error if we know why it failed (e.g., safety).
      const finishReason = llmResponse.candidates[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('The AI assistant could not process the document due to its safety filters. This can sometimes happen with complex legal or medical documents.');
      }
      
      throw new Error('The AI assistant failed to generate a valid response. This might be a temporary issue. Please try rephrasing your question.');
    }
    
    return output;
  }
);
    
