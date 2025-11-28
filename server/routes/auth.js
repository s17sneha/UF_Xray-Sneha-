const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js'); // Make sure this matches the filename

const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, userId: newUser._id });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '7d' });
    res.json({ 
      token, 
      userId: user._id,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization;
    
    if (!token) {
      console.log('[auth] No token provided in profile request');
      return res.status(401).json({ message: "No token provided" });
    }

    const parts = token.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      console.log('[auth] Malformed Authorization header:', token);
      return res.status(401).json({ message: "Malformed Authorization header" });
    }

    const decoded = jwt.verify(parts[1], jwtSecret);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('[auth] User not found for ID:', decoded.userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log('[auth] Profile request successful for user:', user.username);
    res.json({
      id: user._id,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    console.log('[auth] Token verification failed:', error.message);
    res.status(401).json({ message: "Invalid token", error: error.message });
  }
});

module.exports = router;