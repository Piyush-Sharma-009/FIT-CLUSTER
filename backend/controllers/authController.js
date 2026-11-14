// ==========================================
// 1. DEPENDENCIES & IMPORTS
// ==========================================
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ==========================================
// 2. JWT TOKEN GENERATOR HELPER
// ==========================================
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token remains valid for 7 days
  });
};

// ==========================================
// 3. SIGNUP / REGISTER CONTROLLER
// ==========================================
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields',
      });
    }

    // Check if user already exists in database
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create new user (password is automatically hashed by User model pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
    });

    // Respond with user profile and JWT
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. LOGIN CONTROLLER (WITH UNREGISTERED CHECK)
// ==========================================
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide both email and password');
    }

    // Find user by email and explicitly include the password field for comparison
    const user = await User.findOne({ email }).select('+password');

    // SPECIFIC REQUIREMENT: If user does not exist, send flag for frontend redirect + alert
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Account not found. Please sign up/register first to continue.',
      });
    }

    // Verify entered password against stored hash
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    // Respond with user profile and JWT
    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        profile: user.profile || {},
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded,
        fitnessMetrics: user.fitnessMetrics || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. GET CURRENT SESSION USER CONTROLLER
// ==========================================
export const getCurrentUser = async (req, res, next) => {
  try {
    // req.user is attached by the 'protect' middleware
    res.status(200).json({
      success: true,
      user: {
        profile: req.user.profile || {},
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        isOnboarded: req.user.isOnboarded,
        fitnessMetrics: req.user.fitnessMetrics || null,
      },
    });
  } catch (error) {
    next(error);
  }
};