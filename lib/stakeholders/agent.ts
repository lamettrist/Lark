import { ResponseOutputItem } from "openai/resources/responses/responses.mjs";
import { CommunicationClient } from "../communication";
import { modelSchema } from "../models";
import { StakeholderPrompt } from "../prompts";
import HandleTools, { SubagentTools } from "../tools";

/*
    Stakeholder Agent Class.
    Reimplementation of a Reimplementation 
*/
export class StakeholderAgent {
    private static globalRunning = false;
    
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


    constructor(model: modelSchema, name: string, description: string) {
        this.model = model;
        this.instructions = StakeholderPrompt + `
        <identity>Your name is ${name}, and your description is ${description}.</identity>
        `;
        this.systemStop = false;
        this.name = name;
        this.description = description;
        this.messages = [];
        this.socket = new CommunicationClient(`StakeholderAgent_${this.name}`);
        this.previousID = undefined;
        this.toolRunning = true;
    }

    /*
        Custom run loop
    */
    public run(): void {
        const io = this.socket.io;
        // connect client
        this.socket.connect();
        this.socket.io.on('connect', async () => {
            this.socket.readAllMessages();
        })
        io.on('message', (message: string) => {
            this.socket.readAllMessages();
            if (StakeholderAgent.globalRunning) {
                this.messageQueue.push(message);
            } else {
                // why is this a condition
                StakeholderAgent.globalRunning = true;
                this.triggerAgent();
                this.toolRunning = true;
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
            while (this.toolRunning && !this.systemStop) {
                if (this.socket.messages.length > (this.socket.lastMessageReadIndex)) {
                    const newMessages = this.socket.messages.slice(this.socket.lastMessageReadIndex);                                
                    this.messages.push({
                            'type': 'message',
                            'role': 'system',
                            'content': `NEW_MESSAGES_FROM_CHANNEL:${newMessages.join('\n')}`
                    })
                    this.socket.lastMessageReadIndex = this.socket.messages.length;
                }
                const interaction = await this.model.provider?.responses.create({
                    'model': this.model.modelID,
                    'instructions': this.instructions,
                    'input': this.messages,
                    // @ts-expect-error Expect this error since we're leveraging a master agent.
                    'tools': SubagentTools,
                    'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
                })
                this.previousID = interaction?.id;
                interaction?.output.forEach((item: ResponseOutputItem) => {
                    this.messages.push(item);
                })
                for (const message of interaction?.output || []) {
                    if (message.type == 'function_call') {                    
                        const call_id = message.call_id;
                        const toolResponse = await HandleTools(message)
                        if (toolResponse.return) {
                            this.messages.push({
                                'call_id': call_id,
                                'type': 'function_call_output',
                                'output': toolResponse.output
                            })
                            // We call the AI again for the final response
                            const final = await this.model.provider?.responses.create({
                                'model': this.model.modelID,
                                'instructions': this.instructions,
                                'input': this.messages,
                                'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
                            })
                            // Emit final response
                            this.toolRunning = false;
                            this.socket?.sendMessage(final?.output_text + ". I will be signing off now, good day!");
                            // Return nothing
                            return;
            
                        // For special tools that interact with the communication protocol
                        } else if (toolResponse.programPauseIntent) {
                            // Send message to the server
                            if (toolResponse.programInstructions == 'SEND_MESSAGE') {
                                this.socket?.io.emit('message', toolResponse.output);
                                this.messages.push({
                                    'call_id': call_id,
                                    'type': 'function_call_output',
                                    'output': 'Message sent to the channel successfully.'
                                });                                
                                this.toolRunning = false;                                
                            }
                        } else {
                            this.messages.push({
                                'call_id': call_id,
                                'type': 'function_call_output',
                                'output': toolResponse.output
                            })
                        }
                    }
                }
            }
        StakeholderAgent.globalRunning = false;
        // process queue
        if (this.messageQueue.length > 0) {
            this.messageQueue.shift();
            await this.triggerAgent();
        }
    }
}