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
import { gpt4o, openAI, textEmbeddingAda002 } from "genkitx-openai";
import { dotprompt } from "@genkit-ai/dotprompt";
import { defineTool, generate } from "@genkit-ai/ai";

import {
  devLocalIndexerRef,
  devLocalRetrieverRef,
  devLocalVectorstore,
} from "@genkit-ai/dev-local-vectorstore";
import { Document, index, retrieve } from "@genkit-ai/ai/retriever";
import { chunk } from "llm-chunk";
import { run } from "@genkit-ai/flow";
import { readFile } from "fs/promises";
import pdf from "pdf-parse";
import * as path from "path";

configureGenkit({
  plugins: [
    firebase(),
    dotprompt(),
    openAI({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    devLocalVectorstore([
      {
        indexName: "jokes",
        embedder: textEmbeddingAda002,
      },
    ]),
  ],
  logLevel: "debug",
});

export const jokeIndexer = devLocalIndexerRef("jokes");
export const jokeRetriever = devLocalRetrieverRef('jokes');

export const ingester = onFlow(
  {
    name: "ingester",
    inputSchema: z.string(),
    outputSchema: z.void(),
    authPolicy: noAuth(), // Not requiring authentication, but you can change this. It is highly recommended to require authentication for production use cases.
  },
  async (filepath: string) => {
    const file = path.resolve(filepath);

    // Read the pdf.
    const pdfTxt = await run("extract-text", () => extractTextFromPdf(file));
    const chunkingConfig = {
      minLength: 1000,
      maxLength: 2000,
      splitter: "paragrapah",
      overlap: 100,
      delimiters: "",
    } as any;
    // Divide the pdf text into segments.
    const chunks = await run("chunk-it", async () =>
      chunk(pdfTxt, chunkingConfig),
    );

    // Convert chunks of text into documents to store in the index.
    const documents = chunks.map((text) => {
      return Document.fromText(text, { file });
    });

    // Add documents to the index.
    await index({
      indexer: jokeIndexer,
      documents,
    });
  },
);

async function extractTextFromPdf(filePath: string) {
  const pdfFile = path.resolve(filePath);
  const dataBuffer = await readFile(pdfFile);
  const data = await pdf(dataBuffer);
  return data.text;
}

const getJoke = defineTool(
  {
    name: "getJoke",
    description: "Get a randome joke about a specific topic",
    inputSchema: z.object({ jokeTopic: z.string() }),
    outputSchema: z.object({ joke: z.string() }),
  },
  async ({ jokeTopic }) => {
    const response = await fetch(
      `https://v2.jokeapi.dev/joke/Any?contains=${jokeTopic}`,
    );
    const joke = await response.json();
    return { joke: joke.joke };
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
    const prompt = `Tell me a joke about ${toProcess.text}. Create a joke structure that follows best practices and explain which ones you used.`;

    const docs = await retrieve({
      retriever: jokeRetriever,
      query: "Joke structure best practices",
      options: { k: 3 },
    });

    console.log(JSON.stringify(docs, null, 2));

    const result = await generate({
      model: gpt4o,
      prompt,
      tools: [getJoke],
      context: docs,
    });

    return result.text();
  },
);