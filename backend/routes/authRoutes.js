// ==========================================
// 1. DEPENDENCIES & IMPORTS
// ==========================================
import express from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

// ==========================================
// 2. ROUTER INITIALIZATION
// ==========================================
const router = express.Router();

// ==========================================
// 3. PUBLIC AUTHENTICATION ROUTES
// ==========================================
// @route   POST /api/auth/signup
// @desc    Register a new user & return JWT
router.post('/signup', registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user & return JWT (or USER_NOT_FOUND flag)
router.post('/login', loginUser);

// ==========================================
// 4. PROTECTED SESSION ROUTES
// ==========================================
// @route   GET /api/auth/me
// @desc    Verify token & fetch logged-in user profile
router.get('/me', protect, getCurrentUser);

// ==========================================
// 5. ROUTER EXPORT
// ==========================================
export default router;