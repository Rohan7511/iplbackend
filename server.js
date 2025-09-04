
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');


dotenv.config();

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

app.set('wss', wss);

wss.on('connection', (ws, req) => {
  console.log('Client connected');
  
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ws.userId = decoded.user.id;
    } catch (err) {
      console.error('Invalid token');
    }
  }
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});


app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
    // useFindAndModify: false
  })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
      console.error('MongoDB Connection Error:', err);
      process.exit(1);
    });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/teams', require('./routes/teams'));


if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
