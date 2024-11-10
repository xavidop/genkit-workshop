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
import { dotprompt } from "@genkit-ai/dotprompt";
import { defineTool, generate } from "@genkit-ai/ai";

configureGenkit({
  plugins: [firebase(), dotprompt(), openAI(
    {
      apiKey: process.env.OPENAI_API_KEY!,
    }
  )],
  logLevel: "debug",
});

const getJoke = defineTool(
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
  {
    name: "myFlow",
    inputSchema: z.object({ text: z.string() }),
    outputSchema: z.string(),
    authPolicy: noAuth(), // Not requiring authentication, but you can change this. It is highly recommended to require authentication for production use cases.
  },
  async (toProcess) => {

    const prompt =
    `Tell me a joke about ${toProcess.text}`;

    const result = await generate({
      model:  gpt4o,
      prompt,
      tools: [getJoke]
    });

    return result.text();
  },
);