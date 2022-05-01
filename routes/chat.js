const express = require('express');
const router = express.Router();
const http = require('http');

const server = http.createServer(router);
const { Server } = require('socket.io');
const io = new Server(server);

router.get('/chat', (req, res) => {
    res.render('chat_page')
})

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });

    socket.on('message', (msg) => {
        io.emit('message', msg)
    })
});

server.listen(5000, () => {
    console.log('listening on *:5000');
})