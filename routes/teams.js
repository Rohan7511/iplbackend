const express = require('express');
const router = express.Router();
const Team = require('../models/Team'); // Ensure this file exists

// Get all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find({});
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load teams" });
  }
});

module.exports = router;
