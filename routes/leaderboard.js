// backend/routes/leaderboard.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   GET /api/leaderboard
// @desc    Get leaderboard
// @access  Public
router.get('/', async (req, res) => {
  try {
    const leaderboard = await User.find({})
      .sort({ totalPoints: -1 })
      .select('name totalPoints correctPredictions wrongPredictions');
    
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;