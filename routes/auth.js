const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/user');
const { redirectIfAuthenticated } = require('../middleware/auth');

// Sign in routes
router.get('/signin', redirectIfAuthenticated, (req, res) => {
  res.render('signin');
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
   
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }
   
    const isMatch = await bcrypt.compare(password, user.password);
   
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }
   
    // Save session and wait for it to be saved
    req.session.userId = user._id;
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ success: false, error: 'Session error' });
      }
      res.json({ success: true, redirect: '/' });
    });
    
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Sign up route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, username } = req.body; // Add username here
    
    // Check if user already exists (email or username)
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already exists' });
      } else {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user with provided username
    const user = new User({
      name,
      email,
      password: hashedPassword,
      username // Use the username from the form
    });
    
    await user.save();
    
    req.session.userId = user._id;
    res.json({ success: true, redirect: '/' });
  } catch (error) {
    console.error('Sign up error:', error);
    if (error.code === 11000) {
      // Handle duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        error: `${field === 'email' ? 'Email' : 'Username'} already exists` 
      });
    }
    res.status(500).json({ error: 'Server error' });
  }
});
// Sign out route
router.post('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not sign out' });
    }
    res.json({ success: true, redirect: '/signin' });
  });
});

module.exports = router;