import { models, modelSchema } from "./models";
import { MasterAgentPrompt } from "./prompts";
import { ResponseOutputItem } from "openai/resources/responses/responses.js";
import HandleTools, { MasterAgentTools } from "./tools";
import { CommunicationClient, CommunicationServer } from "./communication.ts";
import { Worker } from "worker_threads";
import { Evolution } from "./evolution/evolution.ts";
import { OutputMetrics } from "./struct.ts";
import { config } from "../config.ts";
import { db } from "./db/db.ts";
import { tokenUsage } from "./db/schema.ts";

/*
    So this is how Lark Begins...
    Maybe use Completions route?
*/
export class MasterAgent {
  private model: modelSchema;
  private socket?: CommunicationClient;
  private instructions: string;
  private messages: any[];
  private previousID: string | undefined;
  private stakeholders: Worker[];
  private evolution: Evolution | undefined;

  constructor(model: modelSchema, prompt: string = MasterAgentPrompt) {
    this.model = model;
    this.instructions = prompt;
    this.messages = [];
    this.stakeholders = [];
  }

  // Running the AI
  public async run(prompt: string) {
    let running = true;
    // Start server upon running
    const socketServer = new CommunicationServer();
    socketServer.start();
    // Logic for the client to connect.
    this.socket = new CommunicationClient("MasterAgent");
    await this.socket.connect();
    // Push the message to array
    this.messages.push({
      type: "message",
      content: prompt,
      role: "user",
    });

    /*
            The code below is the complicated procedure to run a task. I am not going to be thinking about this anymore.
            For other agent types, we shall just reuse this...
        */
    while (running) {
      /*
                Sync messages and pass em onto the AI
      */
      if (this.socket.messages.length > this.socket.lastMessageReadIndex) {
        const newMessages = this.socket.messages.slice(
          this.socket.lastMessageReadIndex,
        );
        this.messages.push({
          type: "message",
          role: "system",
          content: `NEW_MESSAGES_FROM_CHANNEL:${newMessages.join("\n")}`,
        });
        this.socket.lastMessageReadIndex = this.socket.messages.length;
      }

      const interaction = await this.model.provider?.responses.create({
        model: this.model.modelID,
        instructions: this.instructions,
        input: this.messages,
        // @ts-expect-error Expect this error since we're leveraging a master agent.
        tools: MasterAgentTools,
        previous_response_id:
          this.previousID !== undefined ? this.previousID : undefined,
        reasoning: {
          effort: "medium",
        },
      });
      this.previousID = interaction?.id;
      interaction?.output.forEach((item: ResponseOutputItem) => {
        this.messages.push(item);
      });
      if (config.storeUsage) {
        await db.insert(tokenUsage).values({
          cost: interaction?.usage?.cost,
          inputTokens: interaction?.usage?.input_tokens,
          totalTokens: interaction?.usage?.total_tokens,
        });
      }
      let madeFunctionCall = false;
      for (const message of interaction?.output || []) {
        if (message.type == "function_call") {
          madeFunctionCall = true;
          const call_id = message.call_id; // What type is message/..
          // However if name is start_evolution, we must pass more stuff...
          let toolResponse = await HandleTools(message);
          // Handle specific cases
          if (toolResponse.return) {
            running = false;
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
            // Stop all other agents
            await Promise.all(
              this.stakeholders.map((agent: Worker) => agent.terminate()),
            );
            // Upon the end, we stop the server
            setInterval(() => {
              socketServer.stop();
            }, 1000);
            // Return output
            return final?.output_text;
            // For special tools that interact with the communication protocol
          } else if (toolResponse.programPauseIntent) {
            // Send message to the server
            if (toolResponse.programInstructions == "SEND_MESSAGE") {
              this.socket.io.emit("message", toolResponse);
              toolResponse.output = "Message sent to the channel successfully.";
              // Send super customized one
              this.messages.push({
                call_id: call_id,
                type: "function_call_output",
                output: `Sent desired message successfully.`,
              });
            } else if (
              toolResponse.programInstructions == "SUMMON_STAKEHOLDERS"
            ) {
              const worker = new Worker("./lib/stakeholders/worker.ts");
              worker.postMessage({
                data: {
                  name: toolResponse.output.name,
                  description: toolResponse.output.description,
                  influenceWeight: toolResponse.output.influenceWeight,
                },
                type: "INIT",
              });
              this.stakeholders.push(worker);
              // Send super customized one
              this.messages.push({
                call_id: call_id,
                type: "function_call_output",
                output: `Summoned ${toolResponse.output.name} successfully.`,
              });
            } else if (toolResponse.programInstructions == "START_EVOLUTION") {
              this.evolution = new Evolution(
                toolResponse.output?.context,
                toolResponse.output?.strategies,
                this.stakeholders,
              );
              await this.evolution.start();
            } else if (toolResponse.programInstructions == "RESUME_EVOLUTION") {
              // Work on this
              await this.evolution?.start(); // it doesnt matter this will work
            } else if (
              toolResponse.programInstructions == "UPDATE_EVOLUTION_CONTEXT" // Work on this
            ) {
              this.evolution?.updateContext(toolResponse?.output.content);
            }
          } else {
            this.messages.push({
              call_id: call_id,
              type: "function_call_output",
              output: toolResponse.output,
            });
          }
        } else {
          // Check if there are NO tool calls at all
          if (
            !interaction?.output.some(
              (output: any) => output.type === "function_call",
            )
          ) {
            // Return final message
            return interaction?.output_text;
          }
        }
      }

      if (!madeFunctionCall && interaction?.output_text) {
        this.socket?.io.emit("message", interaction.output_text);
        // Sleep using wait implicitly so it doesn't spin infinitely
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }
}

// const agent = new MasterAgent(models[0]);
// await agent.run("Say hi!");
