
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
import { z } from 'genkit';
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

const prompt = ai.definePrompt({
  name: 'askAiAssistantQuestionsPrompt',
  input: { schema: AskAiAssistantQuestionsInputSchema },
  output: { schema: AskAiAssistantQuestionsOutputSchema },
  tools: [getDocumentContext],
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
  prompt: `You are a highly capable AI assistant for EOTIS Hub. Your primary function is to analyze documents and answer user questions based on their content.

**Your most important instruction is to always provide your answer in a valid JSON object matching the output schema.**

When a user asks a question, follow this process:
1.  Determine if the question can be answered from general knowledge (e.g., "What is EOTIS?") or if it requires looking at specific files (e.g., "What does the EHCP say about therapy?").
2.  If files are needed, you **must** use the \`getDocumentContext\` tool. This is the only way you can access file content.
3.  The \`getDocumentContext\` tool will return the full text of the relevant documents. You **must** then analyze this text to find the specific information needed to answer the user's question.
4.  Formulate a direct answer to the user's question based on the text you have analyzed.
5.  If you use information from a document, you **must** cite it in the \`documentsCited\` array.
6.  If after analyzing the full text, you cannot find the answer, then state that the information is not present in the available documents. **Do not state that you lack the ability to analyze documents.** You are capable of analysis; the information may simply be missing.

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
    
