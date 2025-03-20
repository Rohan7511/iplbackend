// backend/models/Prediction.js
const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  teamSelected: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one prediction per user per game
PredictionSchema.index({ user: 1, game: 1 }, { unique: true });

module.exports = mongoose.model('Prediction', PredictionSchema);