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

    // Smart suggestions: Get followers of people the user follows + users who follow the same people
    let suggestions = [];
    
    if (followingIds.length > 0) {
      // Get users who are followed by people the current user follows (mutual connections)
      const mutualSuggestions = await User.find({
        followers: { $in: followingIds },
        _id: { $ne: req.session.userId, $nin: [...followingIds, ...user.followers || []] }
      })
      .select('username name avatar followers')
      .limit(5);

      // Get users who follow people the current user follows (common interests)
      const commonInterestSuggestions = await User.find({
        following: { $in: followingIds },
        _id: { $ne: req.session.userId, $nin: [...followingIds, ...user.followers || []] }
      })
      .select('username name avatar following')
      .limit(3);

      // Combine and deduplicate suggestions
      const allSuggestions = [...mutualSuggestions, ...commonInterestSuggestions];
      const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s._id.toString() === suggestion._id.toString())
      );

      suggestions = uniqueSuggestions.slice(0, 8);
    } else {
      // If user follows no one, get popular users
      suggestions = await User.find({
        _id: { $ne: req.session.userId }
      })
      .select('username name avatar followers')
      .sort({ 'followers.length': -1 })
      .limit(8);
    }

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
        note: getNote(suggestion, user.following, followingIds)
      })),
      isFollowingAny: followingIds.length > 0
    });
  } catch (error) {
    console.error('Error loading home:', error);
    res.status(500).send('Server error');
  }
});

// Helper function to generate suggestion notes
function getNote(suggestion, userFollowing, followingIds) {
  const mutualFollowers = suggestion.followers ? suggestion.followers.filter(id => 
    followingIds.some(followId => followId.toString() === id.toString())
  ).length : 0;
  
  const mutualFollowing = suggestion.following ? suggestion.following.filter(id => 
    followingIds.some(followId => followId.toString() === id.toString())
  ).length : 0;

  if (mutualFollowers > 0) {
    return mutualFollowers === 1 ? 'Followed by 1 person you follow' : `Followed by ${mutualFollowers} people you follow`;
  } else if (mutualFollowing > 0) {
    return mutualFollowing === 1 ? 'Follows 1 person you follow' : `Follows ${mutualFollowing} people you follow`;
  } else if (suggestion.followers && suggestion.followers.length > 10) {
    return 'Popular on Linksy';
  } else {
    return 'Suggested for you';
  }
}

module.exports = router;