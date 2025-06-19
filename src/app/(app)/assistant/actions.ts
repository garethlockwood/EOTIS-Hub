
'use server';

interface ActionResult {
  answer?: string;
  error?: string;
}

const CLOUD_FUNCTION_URL = 'https://us-central1-eotis-hub.cloudfunctions.net/chatWithGPT';

export async function submitQuestion(question: string): Promise<ActionResult> {
  if (!question.trim()) {
    return { error: 'Question cannot be empty.' };
  }

  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      let errorBody = 'An unknown error occurred with the AI assistant.';
      try {
        const errorData = await response.json();
        errorBody = errorData.message || errorData.error || `Request failed with status ${response.status}`;
      } catch (e) {
        // Failed to parse error JSON, use status text or default
        errorBody = response.statusText || `Request failed with status ${response.status}`;
      }
      console.error('Error from AI assistant Cloud Function:', response.status, errorBody);
      return { error: `AI Assistant Error: ${errorBody}` };
    }

    const data = await response.json();
    
    if (data && data.answer) {
      return { answer: data.answer };
    } else {
      console.error('Unexpected response format from AI assistant:', data);
      return { error: 'Received an unexpected response format from the AI assistant.' };
    }

  } catch (err) {
    console.error('Error calling AI assistant Cloud Function:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected network or client-side error occurred.';
    return { error: `Failed to get answer from AI assistant: ${errorMessage}` };
  }
}
