/*
  Autogen Tasks & Ranking w/one-function
*/
import { ResponseInput } from "openai/resources/responses/responses.js";
import { models } from "../../lib/models";
import { AutogenLLMPrompt, AutogenPrompt } from "../prompt";
import { evaluatedModels } from "../evaluationModels";
import { MasterAgent } from "../../lib/agents";
import HandleTools, { EvaluationTools } from "../../lib/tools";

/*
  One of our tasks which leverages an LLM-as-a-judge
*/
export default async function Autojudge() {
  let scoreSheet = []; // init here
  let messages: ResponseInput = [];
  messages.push({
    role: "system",
    content: "You may now begin with a question.",
  });
  const question = (
    await models[1].provider.responses.create({
      model: models[1].modelID,
      instructions: AutogenPrompt,
      input: messages,
      reasoning: {
        effort: "medium",
      },
    })
  ).output_text;
  for (const model of evaluatedModels) {
    let localMessages: ResponseInput = [];
    localMessages.push({
      role: "system",
      content: "Here is your question:" + question,
    });
    let previousID: string | undefined;
    let aiResponse: string | undefined = "";
    if (model.modelID == "lark") {
      aiResponse = await new MasterAgent(models[0]).run(question);
    } else {
      let isRunning = true;
      while (isRunning) {
        const interaction = await model.provider?.responses.create({
          instructions: AutogenLLMPrompt,
          input: localMessages,
          model: model.modelID,
          previous_response_id: previousID,
          tools: EvaluationTools,
          reasoning: {
            'effort': 'medium'
          }
        });
        console.log(interaction.output);
        previousID = interaction?.id;
        localMessages.push(...interaction?.output);
        for (let i = 0; i < interaction?.output.length; i++) {
          if (interaction?.output[i]?.type === "function_call") {
            const call_id = interaction?.output[i].call_id;
            const result = await HandleTools(interaction?.output[i]);
            if (result.return) {
              // Get the final Response and append
              localMessages.push({
                type: "function_call_output",
                call_id: call_id, // this is correct, ignore it
                output: result.output,
              });
              localMessages.push({
                type: "message",
                role: "system",
                content:
                  "You have reached the end of the turn. Please now respond directly to the question.",
              });
              const finalInteraction = await model.provider?.responses.create({
                instructions: AutogenLLMPrompt,
                input: localMessages,
                model: model.modelID,
                previous_response_id: previousID,
              });
              aiResponse = finalInteraction?.output_text;
              isRunning = false;
              continue;
            } else {
              messages.push({
                type: "function_call_output",
                call_id: call_id, // this is correct, ignore it
                output: result.output,
              });
            }
          }
        }
      }
    }
    // Synthesize scoring
    messages.push({
      role: "system",
      content: `We have the final response from the agent: ${aiResponse.toString()}. Please respond with a rating (and ONLY the rating) from 1-10.`,
    });
    const finalScore = (
      await models[1].provider.responses.create({
        model: models[1].modelID,
        instructions: AutogenPrompt,
        input: messages,
        reasoning: {
          effort: "medium",
        },
      }),
    ).output_text;
    scoreSheet.push({
      'model': model.modelID,
      'score': finalScore
    });
  }
  return scoreSheet;
}
