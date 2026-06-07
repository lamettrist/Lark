import { modelSchema } from "./models";
import { MasterAgentPrompt } from "./prompts";
import { ResponseOutputItem } from "openai/resources/responses/responses.js";
import HandleTools, { MasterAgentTools } from "./tools";
import { CommunicationClient, CommunicationServer } from "./communication.ts";
import { Worker } from "worker_threads";
import { Evolution } from "./evolution/evolution.ts";
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
  private socketServer: CommunicationServer;
  private messageQueue: string[] = [];

  constructor(model: modelSchema, prompt: string = MasterAgentPrompt) {
    this.model = model;
    this.instructions = prompt;
    this.messages = [];
    this.stakeholders = [];
    // Start server upon running
    this.socketServer = new CommunicationServer();
    this.socketServer.start();
    this.socket = new CommunicationClient("MasterAgent");
    this.socket.connect();

    this.socket.io.on("message", (message: string) => {
      this.socket?.readAllMessages();
      if (message.startsWith("MasterAgent:")) return;
      this.messageQueue.push(message);
    });
  }

  // Running the AI
  public async run(prompt: string) {
    let running = true;
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
      if (this.socket && this.socket.messages.length > this.socket.lastMessageReadIndex) {
        const newMessages = this.socket?.messages.slice(
          this.socket.lastMessageReadIndex,
        );
        const filtered = newMessages.filter(msg => !msg.startsWith("MasterAgent:"));
        if (filtered.length > 0) {
          this.messages.push({
            type: "message",
            role: "user",
            content: `NEW_MESSAGES_FROM_CHANNEL:${filtered.join("\n")}`,
          });
        }
        this.socket.lastMessageReadIndex = this.socket?.messages.length;
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
          const call_id = message.call_id;
          // However if name is start_evolution, we must pass more stuff...
          let toolResponse = await HandleTools(message);
          // Handle specific cases
          if (toolResponse.return) {
            running = false;
            const final = await this.model.provider?.responses.create({
              model: this.model.modelID,
              instructions: this.instructions,
              input: this.messages,
              previous_response_id: this.previousID,
            });
            await Promise.all(this.stakeholders.map((agent: Worker) => agent.terminate()));
            setTimeout(() => { this.socketServer.stop(); }, 2000);
            return final?.output_text;

          } else if (toolResponse.programPauseIntent) {
            // Send message to the server
            if (toolResponse.programInstructions == "SEND_MESSAGE") {
              this.socket?.io.emit("message", toolResponse.output);
              toolResponse.output = "Message sent to the channel successfully.";
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
              toolResponse.output = `Summoned ${toolResponse.output.name} successfully.`;
            } else if (toolResponse.programInstructions == "START_EVOLUTION") {
              this.evolution = new Evolution(
                toolResponse.output?.context,
                toolResponse.output?.strategies,
                this.stakeholders,
              );
              await this.evolution.start();
              toolResponse.output = "Evolutionary process initiated.";
            } else if (toolResponse.programInstructions == "RESUME_EVOLUTION") {
              await this.evolution?.start(); // it doesnt matter this will work
              toolResponse.output = "Evolutionary process resumed.";
            } else if (toolResponse.programInstructions == "UPDATE_EVOLUTION_CONTEXT") {
              this.evolution?.updateContext(toolResponse?.output.content);
              toolResponse.output = "Evolutionary context updated successfully.";
            }
          }

          this.messages.push({
            call_id: call_id,
            type: "function_call_output",
            output: toolResponse.output,
          });
        }
      }

      if (!madeFunctionCall) {
        if (interaction?.output_text) {
          this.socket?.io.emit("message", interaction.output_text);
        }
        
        await this.waitForActivity();
      }
    }
  }

  private async waitForActivity() {
    if (this.messageQueue.length > 0) {
        this.messageQueue = [];
        return;
    }
    let elapsed = 0;
    while (this.messageQueue.length === 0 && elapsed < 15000) {
      await new Promise(r => setTimeout(r, 1000));
      elapsed += 1000;
    }
    this.messageQueue = []; // Reset queue for next deliberation step
  }
}

// const agent = new MasterAgent(models[0]);
// await agent.run("Lark, using some stakeholders, would it be a better idea for me to use ChatGPT over Lark?");
