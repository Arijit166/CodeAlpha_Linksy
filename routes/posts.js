const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const { requireAuth } = require('../middleware/auth');

// Create post routes
router.get('/create-post', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.render('create-post', { user });
  } catch (error) {
    console.error('Error loading create post:', error);
    res.status(500).send('Server error');
  }
});

router.post('/create-post', requireAuth, async (req, res) => {
  try {
    const { caption, image } = req.body;
   
    if (!caption && !image) {
      return res.status(400).json({ error: 'Post must have caption or image' });
    }
   
    const post = new Post({
      user: req.session.userId,
      caption: caption || '',
      image: image || ''
    });
   
    await post.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Post interaction routes
router.post('/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.session.userId;
   
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => !id.equals(userId));
    } else {
      post.likes.push(userId);
    }
   
    await post.save();
    res.json({ success: true, likes: post.likes.length, liked: post.likes.includes(userId) });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/posts/:id/comment', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
   
    post.comments.push({
      user: req.session.userId,
      text
    });
   
    await post.save();
   
    const populatedPost = await Post.findById(req.params.id)
      .populate('comments.user', 'username');
   
    res.json({
      success: true,
      comment: populatedPost.comments[populatedPost.comments.length - 1]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;