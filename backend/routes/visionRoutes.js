import express from 'express';
import multer from 'multer';
import {
  analyzeMealPhoto,
  logScannedMealAndFeedback,
  sendPortionFeedbackToML,
} from '../controllers/visionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max image size
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
    }
  },
});

const uploadMealImage = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();

    const status =
      error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 413
        : 400;
    res.status(status).json({ success: false, message: error.message });
  });
};

router.use(protect);

router.post('/analyze', uploadMealImage, analyzeMealPhoto);
router.post('/log-meal', logScannedMealAndFeedback);
router.post('/submit-feedback', uploadMealImage, sendPortionFeedbackToML);

export default router;