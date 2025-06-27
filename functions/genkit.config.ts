import { configureGenkit } from "@genkit-ai/core";
import { openAI } from "genkitx-openai";

export default defineConfig({
  plugins: [openai()],
  flows: ["./src/flows"]
});
