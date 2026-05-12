import { models, modelSchema } from "./models";
import { MasterAgentPrompt } from "./prompts";
import { ResponseOutputItem } from "openai/resources/responses/responses.js";
import HandleTools, { END_TURN, MasterAgentTools } from "./tools";
import {CommunicationClient, CommunicationProtocol} from './communication.ts'

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
    
    constructor(model: modelSchema, prompt: string = MasterAgentPrompt) {
        this.model = model;
        this.instructions = prompt;
        this.messages = [];
    }

    // Running the AI
    public async run(prompt: string) {
        let running = true;
        // Start server upon running
        const socketServer = new CommunicationProtocol()
        socketServer.start();
        // Logic for the client to connect.        
        this.socket = new CommunicationClient("MasterAgent");
        await this.socket.connect();
        // Logic for reading and syncing on master agent
        this.socket.io.on('message', (message: string) => {

        });

        // Push the message to array
        this.messages.push(
            {
                'type': 'message',
                'content': prompt,
                'role': 'user'
            }
        )

        /* 
            The code below is the complicated procedure to run a task. I am not going to be thinking about this anymore.
            For other agent types, we shall just reuse this...
        */
        while (running) {
            /*
                Sync messages and pass em onto the AI
            */
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
                'tools': MasterAgentTools,
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
                            running = false;
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
                            // Upon the end of the task, we stop the server
                            socketServer.stop();
                            
                            // Return output
                            return final?.output_text;
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
    }
}

const agent = new MasterAgent(models[0])
console.log(await agent.run('Hello, research about the investments into france (CALL THE RESEARCH TOOL ONLY ONCE, OR ELSE YOU LOSE POINTS IN SCORING), then try calling the end tool'))