const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const app = express();

// MongoDB connection
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  avatar: { type: String, default: 'https://images.unsplash.com/photo-1494790108755-2616c9ca8a66?w=150&h=150&fit=crop&crop=face' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Post Schema
const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, required: true },
  image: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE_URL
  }),
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/signin');
  }
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    res.redirect('/');
  } else {
    next();
  }
};

// Routes

// Home route (protected)
app.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    const posts = await Post.find()
      .populate('user', 'name username avatar')
      .populate('comments.user', 'username')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const suggestions = await User.find({ 
      _id: { $ne: req.session.userId, $nin: user.following } 
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

// Sign in routes
app.get('/signin', redirectIfAuthenticated, (req, res) => {
  res.render('signin');
});

app.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user._id;
    res.json({ success: true, redirect: '/' });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sign up route
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Generate username from email
    const username = email.split('@')[0].toLowerCase();
    
    // Check if username is taken, if so, add numbers
    let finalUsername = username;
    let counter = 1;
    while (await User.findOne({ username: finalUsername })) {
      finalUsername = `${username}${counter}`;
      counter++;
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      username: finalUsername
    });
    
    await user.save();
    
    req.session.userId = user._id;
    res.json({ success: true, redirect: '/' });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sign out route
app.post('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not sign out' });
    }
    res.json({ success: true, redirect: '/signin' });
  });
});

// Profile routes
app.get('/profile', requireAuth, async (req, res) => {
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

app.post('/profile/update', requireAuth, async (req, res) => {
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

// Create post routes
app.get('/create-post', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.render('create-post', { user });
  } catch (error) {
    console.error('Error loading create post:', error);
    res.status(500).send('Server error');
  }
});

app.post('/create-post', requireAuth, async (req, res) => {
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
app.post('/posts/:id/like', requireAuth, async (req, res) => {
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

app.post('/posts/:id/comment', requireAuth, async (req, res) => {
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

// Follow/unfollow route
app.post('/users/:id/follow', requireAuth, async (req, res) => {
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

// Utility function to format timestamps
function formatTimestamp(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return minutes <= 1 ? 'now' : `${minutes}m`;
  } else if (hours < 24) {
    return `${hours}h`;
  } else {
    return `${days}d`;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});