const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve the built Vite client
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

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

// SPA fallback — serve index.html for any non-file route
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
