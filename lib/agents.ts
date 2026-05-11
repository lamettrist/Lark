import { models, modelSchema } from "./models";
import { io } from "socket.io-client";
import { MasterAgentPrompt } from "./prompts";
import { Response, ResponseOutputItem } from "openai/resources/responses/responses.js";
import {z} from 'zod';
import HandleTools, { END_TURN } from "./tools";
import { HandleToolsResponse } from "./struct";

/*
    So this is how Lark Begins...
    Maybe use Completions route?
*/
export class MasterAgent {
    private model: modelSchema;
    private socket: any;
    private instructions: string;
    private messages: any[];
    private previousID: string | undefined;
    
    constructor(model: modelSchema, prompt: string = MasterAgentPrompt) {
        this.model = model;
        this.socket = io('http://localhost:7775')
        this.instructions = prompt;
        this.messages = [];
    }
    /*
        The way this'd work is we'd have a private room, right?
        Sockets...
    */
    private communicate() {    
    }

    // Running the AI
    public async run(prompt: string) {
        let running = true;
        // The code below is the complicated procedure to run a task. I am not going to be thinking about this anymore.
        while (running) {
            this.messages.push(
                {
                    'type': 'message',
                    'content': prompt,
                    'role': 'user'
                }
            )
            const interaction = await this.model.provider?.responses.create({
                'model': this.model.modelID,
                'instructions': this.instructions,
                'input': this.messages,
                'tools': [END_TURN],
                'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
            })
            this.previousID = interaction?.id;
            interaction?.output.forEach((item: ResponseOutputItem) => {
                this.messages.push(item);
            })

            for (const message of this.messages) {
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
                            console.log(this.messages)
                            const final = await this.model.provider?.responses.create({
                                'model': this.model.modelID,
                                'instructions': this.instructions,
                                'input': this.messages,
                                'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
                            })
                            console.log(final)
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

            // How do we get the previous interaction ID of the tool? Sort them?

            // if (interaction?.tools.length != 0) {
            //     // @ts-expect-error This'd be expected
            //     for (let i = 0; i < interaction?.tools.length; i++) {
            //         const tool = interaction?.tools[i]
            //         HandleTools(tool).then(async (toolResponse: HandleToolsResponse) => {
            //             if (toolResponse.return) {
            //                 const final = await this.model.provider?.responses.create({
            //                     'model': this.model.modelID,
            //                     'instructions': this.instructions,
            //                     'input': [{
            //                         'call_id': this.messages[this.messages.length-1].call_id,
            //                         'type': 'function_call_output',
            //                         'output': toolResponse.output
            //                     }],
            //                     'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
            //                 })
            //                 console.log(final)
            //                 // Return output
            //                 return toolResponse.output;
            //             }
            //         })
            //     }
            // }


            // Recognize tool calls
            // if (interaction?.tools.length != 0) {
            //     // Execute the tools
            //     for (const tool of interaction.tools) {
            //         const toolResponse = HandleTools(tool)
            //         if (toolResponse.return) {
            //             this.messages.push(toolInput)
            //             console.log(this.messages)
            //             const final = await this.model.provider?.responses.create({
            //                 'model': this.model.modelID,
            //                 'instructions': this.instructions,
            //                 'input': [{
            //                     'call_id': this.messages[this.messages.length-1].call_id,
            //                     'type': 'function_call_output',
            //                     'output': toolResponse.output
            //                 }],
            //                 'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
            //             })
            //             return final?.output_text //Provide the final response
            //         }
            //     }
            // }
        }        
    }
}

const agent = new MasterAgent(models[0])
console.log(await agent.run('Hello, respond with 1+1, then try calling the end tool'))