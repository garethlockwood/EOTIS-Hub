
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
const mammoth = require('mammoth');
const pdf = require('pdf-parse');


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
  prompt: `You are EOTIS AI, an expert AI consultant for parents and educators in the UK.

Your primary goal is to answer the user's question accurately and concisely. **Your final response MUST be a valid JSON object matching the specified output schema.**

You have deep expertise in:
- UK Education Law (Children and Families Act 2014, SEN Code of Practice).
- The EHCP (Education, Health and Care Plan) process.
- The EOTIS Hub platform.

Follow these steps to answer the question:
1.  Analyze the user's question.
2.  If the question is general (e.g., "What is an EHCP?"), answer it using your expert knowledge.
3.  If the question requires information about a specific student's documents (e.g., "What does my EHCP say about PE?"), you **MUST** use the \`getDocumentContext\` tool to fetch the relevant document content. The tool provides the document's text in the 'description' field. This field contains both a user-provided summary and the full extracted text under a "--- FULL TEXT ---" heading.
4.  After using the tool, carefully review the **full text** of the returned documents to formulate your answer.
5.  If you use information from one or more documents, you **MUST** cite them in the \`documentsCited\` field of your JSON response. Include the document's id, name, and type.
6.  If the documents do not contain the answer, or if the file content is unavailable or unreadable, state that you could not find the information in the provided files.
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
