// backend/routes/predictions.js
const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

// @route   POST /api/predictions
// @desc    Make a prediction
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { gameId, teamSelected } = req.body;
    
    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if game is active
    if (!game.isCurrent) {
      return res.status(400).json({ message: 'Game is no longer active' });
    }
    
    
    // Check if game has started
    if (new Date(game.gameTime) <= new Date()) {
      return res.status(400).json({ message: 'Game has already started' });
    }
    
    // Check if team is part of the game
    if (teamSelected.toString() !== game.team1.toString() && teamSelected.toString() !== game.team2.toString()) {
      return res.status(400).json({ message: 'Selected team is not part of this game' });
    }
    
    // Check if user already made a prediction for this game
    const existingPrediction = await Prediction.findOne({
      user: req.user.id,
      game: gameId
    });
    
    if (existingPrediction) {
      return res.status(400).json({ message: 'You have already made a prediction for this game' });
    }
    
    // Create new prediction
    const prediction = new Prediction({
      user: req.user.id,
      game: gameId,
      teamSelected
    });
    
    await prediction.save();
    
    res.status(201).json(prediction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/predictions/user
// @desc    Get all predictions for current user
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const predictions = await Prediction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'game',
        populate: [
          { path: 'team1' },
          { path: 'team2' }
        ]
      });
    
    res.json(predictions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/predictions/game/:gameId
// @desc    Get prediction for a specific game for current user
// @access  Private
router.get('/game/:gameId', auth, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({
      user: req.user.id,
      game: req.params.gameId
    });
    
    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found' });
    }
    
    res.json(prediction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;