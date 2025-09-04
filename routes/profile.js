const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const { formatTimestamp } = require('../utils/helpers');

// Profile routes
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    const posts = await Post.find({ user: req.session.userId })
      .populate('user', 'name username avatar')
      .sort({ createdAt: -1 });
   
    res.render('profile', {
      user,
      posts: posts.map(post => ({
        ...post.toObject(),
        timestamp: formatTimestamp(post.createdAt)
      }))
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Server error');
  }
});

router.post('/profile/update', requireAuth, async (req, res) => {
  try {
    const { name, bio, location } = req.body;
    await User.findByIdAndUpdate(req.session.userId, {
      name,
      bio,
      location: location.replace('📍 ', '')
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/profile/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    await User.findByIdAndUpdate(req.session.userId, { avatar });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add this route to handle fetching followers/following
router.get('/users/:userId/:type', async (req, res) => {
    try {
        const { userId, type } = req.params;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }
        
        if (!['followers', 'following'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid type' });
        }
        
        const user = await User.findById(userId).populate(type, 'name username avatar');
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, users: user[type] });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;