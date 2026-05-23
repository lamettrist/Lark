import { Evolution } from "./evolution/evolution";
import { hackClubProvider } from "./models";
import { HandleToolsResponse } from "./struct";

// Definitions
export const END_TURN = {
  type: "function",
  name: "end_turn",
  description:
    "End the simulation & turn, providing a final response to the user (only use this if you are ready)",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
};

export const SEARCH = {
  type: "function",
  name: "search",
  description:
    "Search tool for our models to conduct searches on the web. Use this tool to both gather information and potential stakeholders for a project",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The query for your search",
      },
    },
    required: ["query"],
  },
};

export const SEND_MESSAGE = {
  type: "function",
  name: "send_message",
  description:
    "Send a message to the other agents/stakeholders/the master agent in the main communication channel.",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to send",
      },
    },
    required: ["message"],
  },
};

export const SUMMON_STAKEHOLDERS = {
  type: "function",
  name: "summon_stakeholders",
  description:
    "Summon stakeholders to respond to your ideas and provide their perspective.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The name of the stakeholder to summon",
      },
      description: {
        type: "string",
        description: "The purpose of the stakeholder/its description.",
      },
      influenceWeight: {
        type: "number",
        description:
          "The weight of the stakeholder's influence throughout the decision-making process (only during the evolution process)",
      },
    },
    required: ["name", "description", "influenceWeight"],
  },
};

export const WAIT = {
  type: "function",
  name: "wait",
  description:
    "Wait for a specified duration before proceeding (letting previous tasks process).",
  parameters: {
    type: "object",
    properties: {
      duration: {
        type: "number",
        description: "The duration to wait for in milliseconds",
      },
    },
    required: ["duration"],
  },
};

export const START_EVOLUTION = {
  type: "function",
  name: "start_evolution",
  description:
    "Begin the evolution process with the strategies and context you provide (strategies must be different and context includes stakeholder attitudes). The stakeholders will also automatically be passed to run and interact with the evolution process (MAKE SURE TO CREATE THEM).",
  parameters: {
    type: "object",
    properties: {
      context: {
        type: "string",
        description: "The context for the evolution process",
      },
      strategies: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    required: ["context", "strategies"],
  },
};

export const RESUME_EVOLUTION = {
  type: "function",
  name: "resume_evolution",
  description:
    "Continue the evolutionary process by moving onto the next generation.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
};

export const UPDATE_EVOLUTION_CONTEXT = {
  type: "function",
  name: "update_evolution_context",
  description:
    "Append to the context that the evolutionary process has access to",
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "The content to be appended",
      },
    },
    required: ["content"],
  },
};

/*
    This is probably the shortest way I could've made the search tool, but it works.
    I could use Exa but need proxy access on HackClub, so sonar works better
*/
async function Search(query: string) {
  // Spin up a silly research agent for this
  const researchResult = await hackClubProvider.responses.create({
    model: "perplexity/sonar-pro-search",
    input: `tell me more about ${query}`,
  });
  return researchResult.output_text;
}

// async function Search(query: string) {
//     return `Search results for query: ${query}
//     1.) Jimmy Vacations, a leading company in the travel industry, has recently announced a significant investment in France. The company plans to invest $500 million over the next five years to expand its operations in the country. This investment will focus on developing new travel packages, enhancing customer service, and creating job opportunities for local communities.

//     2.) The French government has welcomed the investment from Jimmy Vacations, stating that it will contribute to the growth of the tourism sector in France. The government has also expressed its commitment to supporting foreign investments that create jobs and boost the economy.

//     3.) Industry experts believe that Jimmy Vacations' investment in France will have a positive impact on the country's tourism industry. It is expected to attract more tourists to France, increase competition among travel companies, and drive innovation in the sector.`;
// }

// Tool Handler
export default async function HandleTools(
  tool: any,
): Promise<HandleToolsResponse> {
  if (tool.name == "end_turn") {
    return {
      return: true,
      output: "The simulation has terminated successfully.",
    };
  } else if (tool.name == "search") {
    const query = JSON.parse(tool.arguments).query;
    const researchResult = await Search(query);
    return {
      return: false,
      output: `${researchResult}`,
    };
  } else if (tool.name == "send_message") {
    const message = JSON.parse(tool.arguments).message;
    // Sending messages is a special thing, so we need to send it back to the agent so the program will autosend it.
    return {
      return: false,
      output: message,
      programPauseIntent: true,
      programInstructions: "SEND_MESSAGE",
    };
    // Summons stakeholders and then just returns them
  } else if (tool.name == "summon_stakeholders") {
    const toolArguments = JSON.parse(tool.arguments);
    return {
      return: false,
      output: toolArguments,
      programPauseIntent: true,
      programInstructions: "SUMMON_STAKEHOLDERS",
    };
    // Wait
  } else if (tool.name == "wait") {
    const duration = JSON.parse(tool.arguments).duration;
    await new Promise((resolve) => setTimeout(resolve, duration));
    return {
      return: false,
      output: `Successfully waited for ${duration} ms.`,
    };
  } else if (tool.name == "start_evolution") {
    const data = JSON.parse(tool.arguments);
    return {
      return: false,
      programPauseIntent: true,
      programInstructions: "START_EVOLUTION",
      output: {
        context: data?.context,
        strategies: data?.strategies,
      },
    };
  } else if (tool.name == "resume_evolution") {
    return {
      return: false,
      programPauseIntent: true,
      programInstructions: "RESUME_EVOLUTION",
    };
  } else if (tool.name == "update_evolution_context") {
    const data = JSON.parse(tool.arguments);
    return {
      return: false,
      programPauseIntent: true,
      programInstructions: "UPDATE_EVOLUTION_CONTEXT",
      output: {
        content: data.content,
      },
    };
  }

  return {
    return: false,
  };
}

// Master Agent Tools
export const MasterAgentTools = [
  END_TURN,
  SEARCH,
  SEND_MESSAGE,
  SUMMON_STAKEHOLDERS,
  WAIT,
  START_EVOLUTION,
  RESUME_EVOLUTION,
  UPDATE_EVOLUTION_CONTEXT,
];

export const SubagentTools = [END_TURN, SEND_MESSAGE, WAIT];

export const PlasticityTools = [END_TURN, SEARCH];

export const EvaluationTools = [END_TURN, SEARCH];
