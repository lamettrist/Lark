import { models, modelSchema } from "./models";
import { MasterAgentPrompt, StakeholderPrompt } from "./prompts";
import { ResponseOutputItem } from "openai/resources/responses/responses.js";
import HandleTools, { MasterAgentTools, SubagentTools } from "./tools";
import {CommunicationClient, CommunicationServer} from './communication.ts'
import { EventEmitter } from "events";

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
    private stakeholders: StakeholderAgent[];
    
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
        const socketServer = new CommunicationServer()
        socketServer.start();
        // Logic for the client to connect.        
        this.socket = new CommunicationClient("MasterAgent");
        await this.socket.connect();
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
                console.log(message);
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
                        // Upon the end, we stop the server
                        setInterval(() => {
                            socketServer.stop();
                        }, 1000)
                        
                        // Return output
                        return final?.output_text;
                    // For special tools that interact with the communication protocol
                    } else if (toolResponse.programPauseIntent) {
                        // Send message to the server
                        if (toolResponse.programInstructions == 'SEND_MESSAGE') {
                            this.socket.io.emit('message', toolResponse.output);
                            toolResponse.output = 'Message sent to the channel successfully.';
                            // Send super customized one
                            this.messages.push({
                                'call_id': call_id,
                                'type': 'function_call_output',
                                'output': `Sent desired message successfully.`
                            })
                        } else if (toolResponse.programInstructions == 'SUMMON_STAKEHOLDERS') {
                            this.stakeholders.push(new StakeholderAgent(models[0], toolResponse.output.name, toolResponse.output.description));
                            this.stakeholders[this.stakeholders.length - 1].run();                            
                            // Send super customized one
                            this.messages.push({
                                'call_id': call_id,
                                'type': 'function_call_output',
                                'output': `Summoned ${toolResponse.output.name} successfully.`
                            })
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
    }
}

export class StakeholderAgent {
    private model: modelSchema;
    private instructions: string;
    private name: string;
    private socket: CommunicationClient;
    private description: string;
    private messages: any[];


    constructor(model: modelSchema, name: string, description: string) {
        this.model = model;
        this.instructions = StakeholderPrompt + `
        <identity>Your name is ${name}, and your description is ${description}.</identity>
        `;
        this.name = name;
        this.description = description;
        this.messages = [];
        this.socket = new CommunicationClient('StakeholderAgent_${name}');
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
            this.triggerAgent();
        })
        io.on('message', (message: string) => {
            this.triggerAgent();
        }); // Gonna work on ts tmr. Good night!

    }
}

/*
    Reuses everything from the master agent, but with a custom system prompt and everything.
    I give up on this until tomorrow guys... good day!

    NOTE TO SELF: THE REASON THIS KEEPS CAUSING A TERMINATION IS BECAUSE ITS SYNCED with the Master Agent due to the run() function, so we needa figure out how to desync.
    Actually the potential way to fix the desync is to basically become him, yknow?
    its not that, it js terminates, but I need to figure out how to engineer it so stakeholders aint chopped yknow.

    It works js fine without the StakeholderAgent, so whats wrong?
*/
// export class StakeholderAgent {
//     private model: modelSchema;
//     private socket?: CommunicationClient;
//     private instructions: string;
//     private name: string;
//     private description: string;
//     private messages: any[];
//     private previousID: string | undefined;
    
//     constructor(model: modelSchema, name: string, description: string) {
//         this.model = model;
//         this.instructions = StakeholderPrompt + `
//         <identity>Your name is ${name}, and your description is ${description}.</identity>
//         `;
//         this.name = name;
//         this.description = description;
//         this.messages = [];
//     }

//     // Running the AI
//     public async run() {
//         let running = true;
//         // Logic for the client to connect.        
//         this.socket = new CommunicationClient(`StakeholderAgent_${this.name}`);
//         await this.socket.connect();        

//         // Push the message to array
//         this.messages.push(
//             {
//                 'type': 'message',
//                 'content': prompt,
//                 'role': 'system'
//             }
//         )
//         this.runInference();

//         /* 
//             The code below is the complicated procedure to run a task. I am not going to be thinking about this anymore.
//             For other agent types, we shall just reuse this...
//         */
//         while (running) {
//             /*
//                 Sync messages and pass em onto the AI
//             */
//             if (this.socket.messages.length > (this.socket.lastMessageReadIndex)) {
//                 const newMessages = this.socket.messages.slice(this.socket.lastMessageReadIndex);  
//                 if (newMessages.length == 0) {
//                     continue;
//                 }                             
//                 this.messages.push({
//                         'type': 'message',
//                         'role': 'system',
//                         'content': `NEW_MESSAGES_FROM_CHANNEL:${newMessages.join('\n')}`
//                 })
//                 console.log("New messages received, running inference...");
//                 this.socket.lastMessageReadIndex = this.socket.messages.length;
//                 this.runInference();
//             }
//             setTimeout(() => {}, 100);
//         }        
//     }

//     private async runInference() {
//         const interaction = await this.model.provider?.responses.create({
//             'model': this.model.modelID,
//             'instructions': this.instructions,
//             'input': this.messages,
//             // @ts-expect-error Expect this error since we're leveraging a master agent.
//             'tools': SubagentTools,
//             'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
//         })
//         this.previousID = interaction?.id;
//         interaction?.output.forEach((item: ResponseOutputItem) => {
//             this.messages.push(item);
//         })
//         for (const message of interaction?.output || []) {
//             if (message.type == 'function_call') {                    
//                 const call_id = message.call_id;
//                 const toolResponse = await HandleTools(message)
//                 if (toolResponse.return) {
//                     this.localEvents.emit('terminate');
//                     this.messages.push({
//                         'call_id': call_id,
//                         'type': 'function_call_output',
//                         'output': toolResponse.output
//                     })
//                     // We call the AI again for the final response
//                     const final = await this.model.provider?.responses.create({
//                         'model': this.model.modelID,
//                         'instructions': this.instructions,
//                         'input': this.messages,
//                         'previous_response_id': this.previousID !== undefined ? this.previousID : undefined,
//                     })
//                     // Emit final response
//                     this.socket?.sendMessage(final?.output_text + ". I will be signing off now, good day!");
//                     // this.socket.disconnect();
//                     // this.socket.io.close();
//                     // Return nothing
//                     return;
    
//                 // For special tools that interact with the communication protocol
//                 } else if (toolResponse.programPauseIntent) {
//                     // Send message to the server
//                     if (toolResponse.programInstructions == 'SEND_MESSAGE') {
//                         this.socket?.io.emit('message', toolResponse.output);
//                         this.messages.push({
//                             'call_id': call_id,
//                             'type': 'function_call_output',
//                             'output': 'Message sent to the channel successfully.'
//                         })
//                     }
//                 } else {
//                     this.messages.push({
//                         'call_id': call_id,
//                         'type': 'function_call_output',
//                         'output': toolResponse.output
//                     })
//                 }
//             }
//         }
//     }
// }

const agent = new MasterAgent(models[0])
console.warn(await agent.run('Hello, spawn a stakeholder and ask them what 1+1 is USING THE SEND_MESSAGE tool. Remember to call END tool once you are done.'))