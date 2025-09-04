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
router.post('/signup', async (req, res) => {
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
router.post('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not sign out' });
    }
    res.json({ success: true, redirect: '/signin' });
  });
});

module.exports = router;