// backend/routes/games.js
const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const Team = require('../models/Team');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const mongoose = require('mongoose');
const WebSocket = require('ws');

// @route   POST /api/games
// @desc    Create a new game
// @access  Private/Admin
router.post('/', auth, admin, async (req, res) => {
  try {
    const { team1, team2, gameTime } = req.body;
    
    // Validate teams
    if (team1 === team2) {
      return res.status(400).json({ message: 'Teams must be different' });
    }
    
    // Check if teams exist
    const team1Doc = await Team.findById(team1);
    const team2Doc = await Team.findById(team2);
    
    if (!team1Doc || !team2Doc) {
      return res.status(400).json({ message: 'One or both teams not found' });
    }
    
    // Check if game time is in the future
    if (new Date(gameTime) <= new Date()) {
      return res.status(400).json({ message: 'Game time must be in the future' });
    }
    
    // Check if there's an active game already
    const activeGame = await Game.findOne({ active: true });
    if (activeGame) {
      activeGame.active = false;
      await activeGame.save();
    }
    
    // Create new game
    const game = new Game({
      team1,
      team2,
      gameTime
    });
    
    await game.save();
    
    res.status(201).json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/games/current
// @desc    Get current active game
// @access  Public
router.get('/current', async (req, res) => {
  try {
    const game = await Game.findOne({ active: true })
      .populate('team1')
      .populate('team2');
    
    if (!game) {
      return res.status(404).json({ message: 'No active game found' });
    }
    
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/games/:id
// @desc    Get game by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('team1')
      .populate('team2');
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/games/:id/winner
// @desc    Declare winner of a game
// @access  Private/Admin
router.put('/:id/winner', auth, admin, async (req, res) => {
  try {
    const { winner } = req.body;
    
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if winner is one of the teams
    if (!winner || (winner.toString() !== game.team1.toString() && winner.toString() !== game.team2.toString())) {
      return res.status(400).json({ message: 'Invalid winner' });
    }
    
    // Update game with winner
    game.winner = winner;
    game.active = false;
    
    await game.save();
    
    // Update predictions for this game
    const predictions = await Prediction.find({ game: game._id });
    
    for (const prediction of predictions) {
      const isCorrect = prediction.teamSelected.toString() === winner.toString();
      prediction.isCorrect = isCorrect;
      await prediction.save();
      
      // Update user stats
      const user = await User.findById(prediction.user);
      if (user) {
        if (isCorrect) {
          user.totalPoints += 10;
          user.correctPredictions += 1;
        } else {
          user.wrongPredictions += 1;
        }
        await user.save();
      }
    }
    
    // Broadcast updates to connected clients
    const wss = req.app.get('wss');
    if (wss) {
      // Update leaderboard
      const leaderboard = await User.find({})
        .sort({ totalPoints: -1 })
        .select('name totalPoints correctPredictions wrongPredictions');
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'LEADERBOARD_UPDATE',
            leaderboard
          }));
        }
      });
      
      // Update individual histories
      for (const prediction of predictions) {
        const userPredictions = await Prediction.find({ user: prediction.user })
          .sort({ createdAt: -1 })
          .populate({
            path: 'game',
            populate: [
              { path: 'team1' },
              { path: 'team2' }
            ]
          });
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client.userId === prediction.user.toString()) {
            client.send(JSON.stringify({
              type: 'HISTORY_UPDATE',
              userId: prediction.user.toString(),
              predictions: userPredictions
            }));
          }
        });
      }
    }
    
    res.json(game);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/games
// @desc    Get all games
// @access  Public
router.get('/', async (req, res) => {
  try {
    const games = await Game.find()
      .populate('team1')
      .populate('team2')
      .sort({ gameTime: -1 });
    
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/teams
// @desc    Get all teams
// @access  Public
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find().sort({ name: 1 });
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;