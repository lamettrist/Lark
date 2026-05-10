import { modelSchema } from "./models";
import { io } from "socket.io-client";

/*
    So this is how Lark Begins...
    Maybe use Completions route?
*/
export class MasterAgent {
    private model: modelSchema;
    private socket: any;

    constructor(model: modelSchema, prompt: ) {
        this.model = model;
        this.socket = io('http://localhost:7775')
    }
    /*
        The way this'd work is we'd have a private room, right?
        Sockets...
    */
    private communicate() {    
    }
}

const agent = new MasterAgent()