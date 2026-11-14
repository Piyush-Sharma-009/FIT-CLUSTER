// for mongodb connection work
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);


// ==========================================
// 1. DEPENDENCIES & IMPORTS
// ==========================================
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

// ==========================================
// 2. ENVIRONMENT & APP INITIALIZATION
// ==========================================
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 3. GLOBAL MIDDLEWARE
// ==========================================
// Enable CORS so the React/Vite frontend can communicate with this API
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse incoming JSON payloads (req.body)
app.use(express.json());

// Parse URL-encoded payloads (form submissions)
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 4. DATABASE CONNECTION (MONGODB)
// ==========================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

// ==========================================
// 5. API ROUTES MOUNTING
// ==========================================
// Health check route to verify server status
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'FITCLUSTER API is running' });
});

// Mount authentication routes under /api/auth
app.use('/api/auth', authRoutes);

// Mount user profile & onboarding routes
app.use('/api/users', userRoutes);

//mounts the dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// ==========================================
// 6. GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================
// Catch 404 routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Central error handler to prevent server crashes and return clean JSON
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// ==========================================
// 7. SERVER STARTUP
// ==========================================
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});