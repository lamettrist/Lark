/*
    This file is so modular it can just be reused for any future AI project I work on, lol
*/
import OpenAI from "openai";
// import { config } from "@dotenvx/dotenvx";
// config();

export interface modelSchema {
  name: string;
  id: string;
  modelID: string;
  provider?: OpenAI;
  maxTokens?: number;
}

// const digitalOceanProvider = new OpenAI({
//   apiKey: process?.env.DIGITALOCEAN_KEY,
//   baseURL: "https://inference.do-ai.run/v1",
// });

export const hackClubProvider = new OpenAI({
  baseURL: "https://ai.hackclub.com/proxy/v1",
  apiKey: process.env.HACKCLUB_KEY,
});

export const models: modelSchema[] = [
  {
    name: "large",
    id: "large",
    modelID: "~anthropic/claude-haiku-latest",
    provider: hackClubProvider,
  },
  {
    name: "judge",
    id: "judge",
    modelID: "qwen/qwen3.7-max",
    provider: hackClubProvider,
  },
];
