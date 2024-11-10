/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { configureGenkit } from "@genkit-ai/core";
import { onFlow, noAuth } from "@genkit-ai/firebase/functions";

import * as z from "zod";
import { firebase } from "@genkit-ai/firebase";
import { gpt4o, openAI } from "genkitx-openai";
import { generate } from "@genkit-ai/ai";

configureGenkit({
  plugins: [firebase(), openAI(
    {
      apiKey: process.env.OPENAI_API_KEY!,
    }
  )],
  logLevel: "debug",
});

export const myFlow = onFlow(
  {
    name: "myFlow",
    inputSchema: z.object({ text: z.string() }),
    outputSchema: z.string(),
    authPolicy: noAuth(), // Not requiring authentication, but you can change this. It is highly recommended to require authentication for production use cases.
  },
  async (toProcess) => {
    const prompt =
    `Tell me ajoke about ${toProcess.text}`;

    const llmResponse = await generate({
        model:  gpt4o,
        prompt: prompt,
        config: {
        temperature: 1,
        },
    });

    return llmResponse.text();
  },
);