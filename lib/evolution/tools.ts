import { FunctionTool, Tool } from "openai/resources/responses/responses.js";
import { HandleToolsResponse } from "../struct";
import { END_TURN } from "../tools";

export const OVERWRITE_IDEA = {
  type: "function",
  name: "overwrite_strategy",
  description: "Overwrites a specific strategy (for Plasticity and Mutation)",
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "The new content that will replace the old content in the strategy file",
      },
      id: {
        type: "number",
        description: "The ID of the strategy to be overwritten",
      },
    },
    required: ["content", "id"],
  },
};

export default async function HandleTools(
  tool: FunctionTool,
  optionalParameters?: any,
): Promise<HandleToolsResponse> {
  if (tool.name == "end_turn") {
    return {
      return: true,
      output: "The simulation has terminated successfully.",
    };
  } else if (tool.name == "overwrite_strategy") {
    return {
      return: false,
      programPauseIntent: true,
      programInstructions: "OVERWRITE_STRATEGY",
    };
  }

  // Other return response
  return {
    return: false,
    output: "Continue on with your procedures.",
  };
}

export const PLASTICITY_TOOLS: Tool[] = [OVERWRITE_IDEA, END_TURN];
