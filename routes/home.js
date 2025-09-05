const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const { requireAuth } = require('../middleware/auth');
const { formatTimestamp } = require('../utils/helpers');

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .select('-password')
      .populate('following', '_id username name avatar');
   
    if (!user) {
      console.error('User not found for session:', req.session.userId);
      req.session.destroy();
      return res.redirect('/signin');
    }
   
    // Get posts only from users that the current user is following
    const followingIds = user.following.map(f => f._id);
    
    let posts = [];
    if (followingIds.length > 0) {
      posts = await Post.find({ user: { $in: followingIds } })
        .populate('user', 'name username avatar')
        .populate('comments.user', 'username name avatar')
        .populate('comments.replies.user', 'username name avatar')
        .populate('likes', 'username name avatar')
        .sort({ createdAt: -1 })
        .limit(20);
    }

    // Smart suggestions: Only show followers and mutual connections
    let suggestions = [];

    // 1. Get users who follow the current user
    const followers = await User.find({
      following: req.session.userId,
      _id: { $nin: followingIds } // Exclude users already being followed
    })
    .select('username name avatar followers following')
    .limit(10);

    // 2. Get mutual connections - multiple patterns:
    let mutualConnections = [];
    if (followingIds.length > 0) {
      // Pattern 1: A follows B, B follows C, suggest C to A
      const pattern1 = await User.find({
        followers: { $in: followingIds },
        _id: { 
          $ne: req.session.userId, 
          $nin: [...followingIds, ...followers.map(f => f._id)] 
        },
        following: { $ne: req.session.userId } // Exclude users who already follow current user
      })
      .select('username name avatar followers following')
      .limit(10);

      // Pattern 2: A follows B, C also follows B, suggest C to A and A to C
      const pattern2 = await User.find({
        following: { $in: followingIds }, // Users who follow the same people as current user
        _id: { 
          $ne: req.session.userId, 
          $nin: [...followingIds, ...followers.map(f => f._id)] 
        },
        followers: { $ne: req.session.userId } // Exclude users who already follow current user
      })
      .select('username name avatar followers following')
      .limit(10);

      // Combine both patterns and deduplicate
      const allMutual = [...pattern1, ...pattern2];
      mutualConnections = allMutual.filter((suggestion, index, self) => 
        index === self.findIndex(s => s._id.toString() === suggestion._id.toString())
      );
    }

    // Combine suggestions
    suggestions = [...followers, ...mutualConnections].slice(0, 8);

    res.render('index', {
      user,
      posts: posts.map(post => ({
        ...post.toObject(),
        likesCount: post.likes.length,
        liked: post.likes.some(like => like._id.toString() === req.session.userId.toString()),
        commentsCount: post.comments.length,
        timestamp: formatTimestamp(post.createdAt)
      })),
      suggestions: suggestions.map(suggestion => ({
        ...suggestion.toObject(),
        note: getNote(suggestion, user, followingIds)
      })),
      isFollowingAny: followingIds.length > 0
    });
  } catch (error) {
    console.error('Error loading home:', error);
    res.status(500).send('Server error');
  }
});

// Helper function to generate suggestion notes
function getNote(suggestion, currentUser, followingIds) {
  // Check if this user follows the current user
  if (suggestion.following && suggestion.following.some(id => id.toString() === currentUser._id.toString())) {
    return 'Follows you';
  }
  
  // For mutual connections, show "Suggested for you"
  const mutualFollowers = suggestion.followers ? suggestion.followers.filter(id => 
    followingIds.some(followId => followId.toString() === id.toString())
  ).length : 0;
  
  if (mutualFollowers > 0) {
    return 'Suggested for you';
  }
  
  // Fallback (shouldn't reach here with the new logic)
  return 'Suggested for you';
}
module.exports = router;