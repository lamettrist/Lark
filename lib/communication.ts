/*
    Why am I making a communication system for agents when they already exist? I don't even know...
    Eh, prolly works better for the purposes of our implementation.
    An In-Memory Communication Protocol for Agents.
*/
import {Server, Socket} from "socket.io"
import { io } from "socket.io-client";


export class CommunicationProtocol {
    private io: Server;
    private messages: string[];

    constructor() {
        this.io = new Server(7775, {
            cors: {origin: "*"}
        });
        this.messages = [];
    }

    public start() {
        // this.io.use((socket: Socket, next: any) => {
        //     const token = socket.handshake.query.t;
        //     console.log(token)
        //     if (token) {
        //         return next();
        //     }
        // });

        // Connection Loop
        this.io.on('connection', (socket: Socket) => {
            let name = socket.handshake.query.t;
            let roomID = 'main_room';
            this.messages.push(`${name} has joined the room.`);
            socket.to(roomID).emit('message', `${name} has joined the room.`);

            // Room creation and joining procedure
            if (!socket.rooms.has(roomID)) {
                socket.join(roomID)
            } else {
                socket.rooms.add(roomID)
                socket.join(roomID)
            }

            // Room Functions
            socket.on('set_name', (newName: string) => {
                name = newName;
                socket.emit('confirmation', "Name set to " + newName);
            });

            socket.on('message', (msg: string) => {
                console.log("Received message from client: ", msg);
                this.messages.push(`${name}:"${msg}"`);
                socket.to(roomID).emit('message', `${name}:"${msg}"`);
            });

            // Socket to readMessages
            socket.on('readMessages', () => {
                console.log(this.messages);
                socket.emit('bulkMessage', this.messages);
            });

            // Disconnection Handler
            socket.on('disconnect', () => {
                this.messages.push(`${name} has left the room.`);
                socket.to(roomID).emit('message', `${name} has left the room.`);
            }) 
        })
    }

    public stop() {
        this.io.close();
    }
} 

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
        await this.io.on('connect', async () => {
            console.log("Connected to the socket server! Creating room...");
            await this.io.emit('set_name', this.name);
            await this.io.emit('joinRoom', "main_room");
        })
        // Event Listeners
        this.io.on('confirmation', (msg: string) => {
            console.log("Received confirmation from server: ", msg);
        });

        this.io.on('message', (msg: string) => {
            this.messages.push(msg);
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

    public sendMessage(msg: string) {
        this.messages.push(`${this.name}: "${msg}"`);
        this.io.emit('message', msg);
    }
}