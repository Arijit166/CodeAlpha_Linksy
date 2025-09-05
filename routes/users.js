const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const { requireAuth } = require('../middleware/auth');
const { formatTimestamp } = require('../utils/helpers');

// Search route
router.get('/api/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
   
    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }
   
    const searchTerm = q.trim();
   
    // Search for users by username or name (case-insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { name: { $regex: searchTerm, $options: 'i' } }
      ],
      _id: { $ne: req.session.userId } // Exclude current user
    })
    .select('username name avatar bio')
    .limit(10);
   
    res.json({ users });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User profile route
router.get('/user/:username', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
   
    if (!user) {
      return res.status(404).send('User not found');
    }
   
    const posts = await Post.find({ user: user._id })
      .populate('user', 'name username avatar')
      .populate('likes', '_id') // Add this line
      .sort({ createdAt: -1 });
   
    const currentUser = await User.findById(req.session.userId).select('-password');
    const isFollowing = currentUser.following.includes(user._id);
   
    res.render('user-profile', {
      profileUser: user,
      currentUser,
      isFollowing,
      posts: posts.map(post => ({
        ...post.toObject(),
        liked: post.likes.some(like => like._id.toString() === req.session.userId.toString()),
        timestamp: formatTimestamp(post.createdAt)
      }))
    });
  } catch (error) {
    console.error('Error loading user profile:', error);
    res.status(500).send('Server error');
  }
});

// Follow/unfollow route
router.post('/users/:id/follow', requireAuth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.session.userId;
   
    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
   
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);
   
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
   
    const isFollowing = currentUser.following.includes(targetUserId);
   
    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => !id.equals(targetUserId));
      targetUser.followers = targetUser.followers.filter(id => !id.equals(currentUserId));
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }
   
    await Promise.all([currentUser.save(), targetUser.save()]);
   
    res.json({ success: true, following: !isFollowing });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;