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
import { openAI } from "genkitx-openai";
import { dotprompt, promptRef } from "@genkit-ai/dotprompt";

configureGenkit({
  plugins: [firebase(), dotprompt(), openAI(
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

    const nluPrompt = promptRef("joke");

    const result = await nluPrompt.generate({
      input: {
        text: toProcess.text,
      },
    });

    return result.output();
  },
);