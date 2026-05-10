import {Server} from "socket.io"

const io = new Server(7775, {
    cors: {origin: "*"}
});

io.on('connection', (socket) => {
    console.log("Guys, someone joined our session!")
})
