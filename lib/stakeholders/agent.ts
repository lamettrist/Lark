import { ResponseOutputItem } from "openai/resources/responses/responses.mjs";
import { CommunicationClient } from "../communication";
import { modelSchema } from "../models";
import { StakeholderPrompt } from "../prompts";
import HandleTools, { SubagentTools } from "../tools";
import { config } from "../../config";
import { db } from "../db/db";
import { tokenUsage } from "../db/schema";

/*
    Stakeholder Agent Class.
    Reimplementation of a Reimplementation
*/
export class StakeholderAgent {
  private model: modelSchema;
  private instructions: string;
  private name: string;
  private socket: CommunicationClient;
  private description: string;
  private messages: any[];
  private messageQueue: string[] = [];
  private systemStop: boolean;
  private previousID: string | undefined;
  private toolRunning: boolean;
  private running: boolean;
  private influenceWeight: number;

  constructor(
    model: modelSchema,
    name: string,
    description: string,
    influenceWeight: number,
  ) {
    this.model = model;
    this.instructions =
      StakeholderPrompt +
      `
        <identity>Your name is ${name}, and your description is ${description}.</identity>
        `;
    this.systemStop = false;
    this.name = name;
    this.description = description;
    this.messages = [];
    this.socket = new CommunicationClient(`StakeholderAgent_${this.name}`);
    this.previousID = undefined;
    this.influenceWeight = influenceWeight;
    this.running = false;
    this.toolRunning = true;
    if (config.enhancedLogging) {
      console.log(`[Stakeholder] Spawned ${this.name}`);
    }
  }

  /*
        Custom run loop
    */
  public run(): void {
    const io = this.socket.io;
    // connect client
    this.socket.connect();
    this.socket.io.on("connect", async () => {
      this.socket.readAllMessages();
    });
    io.on("message", (message: string) => {
      this.socket.readAllMessages();
      
      // CRITICAL: Filter out our own messages to prevent infinite loops
      if (message.startsWith(`StakeholderAgent_${this.name}:`)) return;

      this.messageQueue.push(message);
      if (!this.running) {
        this.running = true;
        // Jitter to prevent simultaneous API bursts and allow turn-taking
        const jitter = Math.floor(Math.random() * 2000) + 800;
        setTimeout(() => void this.triggerAgent(), jitter);
      }
    });
  }

  public stop() {
    this.socket.disconnect();
    this.socket.io.close();
    this.model = undefined as any;
    this.systemStop = true;
  }

  private async triggerAgent() {
    this.toolRunning = true;
    while (this.toolRunning && !this.systemStop) {
      if (this.socket.messages.length > this.socket.lastMessageReadIndex) {
        const newMessages = this.socket.messages.slice(
          this.socket.lastMessageReadIndex,
        );
        this.messages.push({
          type: "message",
          role: "user",
          content: `NEW_MESSAGES_FROM_CHANNEL:${newMessages.join("\n")}`,
        });
        this.socket.lastMessageReadIndex = this.socket.messages.length;

        // Filter out self-messages to prevent confirming our own actions
        const filtered = newMessages.filter(msg => !msg.startsWith(this.socket.name + ":"));
        
        if (filtered.length > 0) {
            this.messages.push({
              type: "message",
              role: "user",
              content: `[NEW_CHANNEL_ACTIVITY]\n${filtered.join("\n")}\n[/NEW_CHANNEL_ACTIVITY]`,
            });
        } else if (this.messageQueue.length === 0) {
            // If there's no real new content from others, break the loop
            break;
        }
      }
      const interaction = await this.model.provider?.responses.create({
        model: this.model.modelID,
        instructions: this.instructions,
        input: this.messages,
        // @ts-expect-error Expect this error since we're leveraging a master agent.
        tools: SubagentTools,
        previous_response_id:
          this.previousID !== undefined ? this.previousID : undefined,
      });
      if (config.storeUsage) {
        await db.insert(tokenUsage).values({
          cost: interaction?.usage?.cost,
          inputTokens: interaction?.usage?.input_tokens,
          totalTokens: interaction?.usage?.total_tokens,
        });
      }
      this.previousID = interaction?.id;
      interaction?.output.forEach((item: ResponseOutputItem) => {
        this.messages.push(item);
      });

      let madeFunctionCall = false;
      for (const message of interaction?.output || []) {
        if (message.type == "function_call") {
          madeFunctionCall = true;
          const call_id = message.call_id;
          const toolResponse = await HandleTools(message);
          if (toolResponse.return) {
            this.messages.push({
              call_id: call_id,
              type: "function_call_output",
              output: toolResponse.output,
            });
            // We call the AI again for the final response
            const final = await this.model.provider?.responses.create({
              model: this.model.modelID,
              instructions: this.instructions,
              input: this.messages,
              previous_response_id:
                this.previousID !== undefined ? this.previousID : undefined,
            });
            // Emit final response
            this.toolRunning = false;
            this.socket?.sendMessage(
              final?.output_text + ". I will be signing off now, good day!",
            );
            this.socket?.sendMessage(final?.output_text || "");
            // Return nothing
            return;

            // For special tools that interact with the communication protocol
          } else if (toolResponse.programPauseIntent) {
            // Send message to the server
            if (toolResponse.programInstructions == "SEND_MESSAGE") {
              this.socket?.io.emit("message", toolResponse.output);
              this.messages.push({
                call_id: call_id,
                type: "function_call_output",
                output: "Message sent to the channel successfully.",
              });
              this.toolRunning = false;
            }
          } else {
            this.messages.push({
              call_id: call_id,
              type: "function_call_output",
              output: toolResponse.output,
            });
          }
        }
      }

      if (!madeFunctionCall && interaction?.output_text) {
        this.socket?.io.emit("message", interaction.output_text);
        this.toolRunning = false;
      }

      if (
        this.messageQueue.length > 0 ||
        (madeFunctionCall && this.toolRunning)
      ) {
        this.messageQueue.length = 0;
        this.toolRunning = true;
        continue;
      }
      break;
    }
    this.running = false;
    if (!this.systemStop && this.messageQueue.length > 0) {
      this.messageQueue.length = 0;
      this.running = true;
      this.toolRunning = true;
      void this.triggerAgent();
    }
  }

  // Mass rankings
  public async rankStrategies(strategies: string[]) {
    // Lwk a part of our cost-cutting measures...
    // Could use a more expensive method but this is quicker for us...
    this.messages.push({
      type: "message",
      role: "developer",
      content: `Hello ${this.name},
                Now your task is to rank the following strategies in an array based on the first index being highest rated to last being lowest rated USING the IDs associated with the strategies: ${strategies}.
                In favor of brevity, please only respond with an array IN THE FOLLOWING FORMAT, no markdown or anything else: "ID_1, ID_2, ID_3"
                `,
    });
    const interaction = await this.model.provider?.responses.create({
      model: this.model.modelID,
      instructions: this.instructions,
      input: this.messages,
    });

    if (config.storeUsage) {
      db.insert(tokenUsage).values({
        cost: interaction?.usage?.cost,
        inputTokens: interaction?.usage?.input_tokens,
        totalTokens: interaction?.usage?.total_tokens,
      });
    }

    this.previousID = interaction?.id;
    const array = interaction?.output_text.split(", ");
    // Return the rankings
    return {
      rankings: array,
      influenceWeight: this.influenceWeight,
    };
  }
}
