import { hackClubProvider } from "../lib/models";

export const evaluatedModels = [
  {
    modelID: "openai/gpt-5.2-chat",
    provider: hackClubProvider,
  },
  {
    modelID: "~anthropic/claude-haiku-latest",
    provider: hackClubProvider,
  },
  {
    modelID: "lark",
  },
  // Add some more models here!
];
