// // import { io } from "socket.io-client";
// // import { CommunicationClient, CommunicationProtocol } from "./lib/communication";


// // const client = new CommunicationClient("MasterAgent");
// // await client.connect();

// // await client.sendMessage("Hello, this is the Master Agent!");

// // setTimeout(async () => {
// //     console.log(await client.readAllMessages());
// // });

// const messages = ['sigmund', 'apple', 'banana'];

// let lastMessageReadIndex = 0;

// while (true) {
//     if (messages.length > (lastMessageReadIndex)) {
//         const newMessages = messages.slice(lastMessageReadIndex);
//         console.log(newMessages);
//         lastMessageReadIndex = messages.length;
//     }
//     messages.push('new message');
//     await new Promise(resolve => setTimeout(resolve, 1000));
// }