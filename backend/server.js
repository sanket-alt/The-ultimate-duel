require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const P1 = process.env.PLAYER1_USERNAME || 'player1';
const P2 = process.env.PLAYER2_USERNAME || 'player2';

// State memory
let currentStats = {
  player1: { followers: 100000 },
  player2: { followers: 100000 }
};

const fetchInstagramData = async (username) => {
  if (!process.env.RAPIDAPI_KEY) {
    // Fallback simulation for local testing if API key is not set
    console.warn('API Key missing. Simulating data for:', username);
    return { follower_count: Math.floor(Math.random() * 50000) + 50000 };
  }

  try {
    const options = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/v1/info`,
      params: { username_or_id_or_url: username },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      }
    };
    const response = await axios.request(options);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching ${username}:`, error.message);
    throw error;
  }
};

const runTracker = async () => {
  try {
    const p1Data = await fetchInstagramData(P1);
    const p2Data = await fetchInstagramData(P2);

    currentStats = {
      player1: { followers: p1Data.follower_count },
      player2: { followers: p2Data.follower_count }
    };

    io.emit('statsUpdate', currentStats);
    console.log('Broadcasted update:', currentStats);
  } catch (err) {
    console.log('Polling skipped this cycle due to error.');
  }
};

// Initial run and interval (15 seconds to respect rate limits)
runTracker();
setInterval(runTracker, 15000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('statsUpdate', currentStats); // Send current state on load
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Fight Engine running on port ${PORT}`);
});
