// backend/middleware/admin.js
const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    // Get user from auth middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
