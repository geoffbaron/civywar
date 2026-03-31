const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Shared game state placeholder
let gameState = {
  bases: [],
  units: [],
  players: {}
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Send current state to new player
  socket.emit('gameStateUpdate', gameState);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete gameState.players[socket.id];
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
