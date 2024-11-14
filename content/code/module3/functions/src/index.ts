/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onFlow, noAuth } from "@genkit-ai/firebase/functions";
import { gpt4o, openAI } from "genkitx-openai";
import { genkit, z } from "genkit";
import { logger } from 'genkit/logging';

const ai = genkit({
  model: gpt4o,
  plugins: [
    openAI(
    {
      apiKey: process.env.OPENAI_API_KEY!,
    }
  )],
});
logger.setLogLevel('debug');

const getJoke = ai.defineTool(
  {
    name: "getJoke",
    description:
      "Get a randome joke about a specific topic",
    inputSchema: z.object({ jokeTopic: z.string() }),
    outputSchema: z.object({ joke: z.string() }),
  },
  async ({ jokeTopic }) => {
    const response = await fetch(`https://v2.jokeapi.dev/joke/Any?contains=${jokeTopic}`);
    const joke = await response.json();
    return {"joke": joke.joke};
  },
);

export const myFlow = onFlow(
  ai,
  {
    name: "myFlow",
    inputSchema: z.object({ text: z.string() }),
    outputSchema: z.string(),
    authPolicy: noAuth(), // Not requiring authentication, but you can change this. It is highly recommended to require authentication for production use cases.
  },
  async (toProcess) => {

    const prompt =
    `Tell me a joke about ${toProcess.text}`;

    const result = await ai.generate({
      prompt,
      tools: [getJoke]
    });

    return result.text;
  },
);