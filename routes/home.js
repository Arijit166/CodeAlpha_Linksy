const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const { requireAuth } = require('../middleware/auth');
const { formatTimestamp } = require('../utils/helpers');

// Home route (protected)
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    
    // Check if user exists
    if (!user) {
      console.error('User not found for session:', req.session.userId);
      req.session.destroy(); // Clear invalid session
      return res.redirect('/signin');
    }
    
    const posts = await Post.find()
      .populate('user', 'name username avatar')
      .populate('comments.user', 'username')
      .sort({ createdAt: -1 })
      .limit(20);

    const suggestions = await User.find({
      _id: { $ne: req.session.userId, $nin: user.following || [] } // Handle case where following might be undefined
    })
    .select('username avatar')
    .limit(8);

    res.render('index', {
      user,
      posts: posts.map(post => ({
        ...post.toObject(),
        likes: post.likes.length,
        liked: post.likes.includes(req.session.userId),
        timestamp: formatTimestamp(post.createdAt)
      })),
      suggestions
    });
  } catch (error) {
    console.error('Error loading home:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;