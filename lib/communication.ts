/*
    Why am I making a communication system for agents when they already exist? I don't even know...
    Eh, prolly works better for the purposes of our implementation.
    An In-Memory Communication Protocol for Agents.
*/
import {Server, Socket} from "socket.io"
import { io } from "socket.io-client";

/*
    Clickbait class name actually
*/
export class CommunicationServer {
    private io: Server;
    private messages: string[];

    constructor(port: number = 7775) {
        this.io = new Server(port, {
            cors: {origin: "*"}
        });
        this.messages = [];
    }

    public start() {
        // Connection Loop
        this.io.on('connection', (socket: Socket) => {
            let name = socket.handshake.query.t;
            let roomID = 'main_room';
            // this.messages.push(`${name} has joined the room.`);
            // socket.to(roomID).emit('message', `${name} has joined the room.`);
            socket.join(roomID)

            // Room Functions
            socket.on('set_name', (newName: string) => {
                name = newName;
                socket.emit('confirmation', "Name set to " + newName);
            });

            socket.on('message', (msg: string) => {
                this.messages.push(`${name}:"${msg}"`);
                socket.to(roomID).emit('message', `${name}:"${msg}"`);
            });

            // Socket to readMessages
            socket.on('readMessages', () => {
                socket.emit('bulkMessage', this.messages);
            });

            // Disconnection Handler
            socket.on('disconnect', () => {
                this.messages.push(`${name} has left the room.`);
                socket.emit('message', `${name} has left the room.`);
            }) 
        })
    }

    public stop() {
        this.io.close();
    }
} 

/*
    Client to connect and interact with the server.
*/
export class CommunicationClient {
    public io: any;
    public messages: string[];
    private name: string;
    public lastMessageReadIndex: number;

    constructor(name: string) {
        // Check if port is open, if so, start server
        // new CommunicationProtocol().start();
        
        // Client connection to the socket server
        this.io = io('http://localhost:7775');
        this.messages = [];
        this.name = name;
        this.lastMessageReadIndex = 0;
    }
    
    public async connect(): Promise<void> {
        this.io.connect();
        this.io.on('connect', async () => {
            this.io.emit('set_name', this.name);
            this.io.emit('joinRoom', "main_room");
            this.readAllMessages();
        })
        // Event Listeners
        this.io.on('confirmation', (msg: string) => {
        });

        this.io.on('message', (message: string) => {
            this.messages.push(message);
        });
        
        // Read bulk messages
        this.io.on('bulkMessage', (messageStore: string[]) => {
            let localMessages: string[] = [];
            let unsyncedMessages: string[] = [];
            localMessages = messageStore;
            // Sync to see the differences
            localMessages.forEach((message: string) => {
                if (!this.messages.includes(message)) {
                    unsyncedMessages.push(message);
                }
            })
            // Now to sync them
            unsyncedMessages.forEach((message: string) => {
                this.messages.push(message);
            })
        })
    }

    public async readAllMessages() {
        await this.io.emit('readMessages');
        // Return this
        return this.messages;
    }

    public disconnect() {
        this.io.disconnect();
    }

    public sendMessage(msg: string) {
        this.messages.push(`You:"${msg}"`);
        this.io.emit('message', msg);
    }
}