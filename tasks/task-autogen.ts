/*
  Autogen Tasks & Ranking w/one-function
*/
import { ResponseInput } from "openai/resources/responses/responses.js";
import { models } from "../lib/models";
import { AutogenPrompt } from "./prompt";

/*
  One of our tasks which leverages an LLM-as-a-judge
*/
export async function Autojudge() {
  let messages: ResponseInput = [];
  messages.push({
    role: "system",
    content: "You may now begin with the question.",
  });
  const question = (
    await models[1].provider.responses.create({
      model: models[1].modelID,
      instructions: AutogenPrompt,
      input: messages,
    })
  ).output_text;
}
