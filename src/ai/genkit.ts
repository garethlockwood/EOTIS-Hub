import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The googleAI() plugin automatically looks for a `GEMINI_API_KEY` or `GOOGLE_API_KEY`
// in your environment. This check is to provide a helpful warning if it's missing.
if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  console.warn(
    'WARNING: The GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set. AI features may not work.'
  );
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
