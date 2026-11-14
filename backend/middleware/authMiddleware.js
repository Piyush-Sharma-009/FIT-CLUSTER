// ==========================================
// 1. DEPENDENCIES & IMPORTS
// ==========================================
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ==========================================
// 2. JWT VERIFICATION MIDDLEWARE
// ==========================================
export const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token string ("Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify token signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach authenticated user document to request (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('User belonging to this token no longer exists');
      }

      next();
    } catch (error) {
      res.status(401);
      next(new Error('Not authorized, invalid or expired token'));
    }
  }

  // Reject request if no token was provided
  if (!token) {
    res.status(401);
    next(new Error('Not authorized, no token provided'));
  }
};