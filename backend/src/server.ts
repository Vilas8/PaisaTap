import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import taskRoutes from './routes/task.routes';
import referralRoutes from './routes/referral.routes';
import walletRoutes from './routes/wallet.routes';
import adminRoutes from './routes/admin.routes';

// Import models for seeding
import { Task } from './models/task.model';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/paisatap';

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // For TG mini-apps, allowing requests from any web view is standard
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data', 'x-admin-password', 'x-dev-user-id', 'x-dev-username', 'x-dev-first-name', 'x-dev-last-name']
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Seed default tasks if empty
async function seedDefaultTasks() {
  try {
    const count = await Task.countDocuments();
    if (count === 0) {
      console.log('Seeding default tasks...');
      const defaultTasks = [
        {
          title: 'Join PaisaTap Telegram Channel',
          description: 'Subscribe to our official Telegram channel for updates and announcements.',
          rewardAmount: 15,
          type: 'social',
          link: 'https://t.me/PaisaTapOfficial',
          verificationMethod: 'instant',
          isActive: true
        },
        {
          title: 'Solve Daily Code Word',
          description: 'Find the hidden secret word inside the bot announcement and submit it here. Hint: the secret code is "GEMINI".',
          rewardAmount: 25,
          type: 'quiz',
          link: 'https://t.me/PaisaTapOfficial',
          verificationMethod: 'code',
          verificationCode: 'GEMINI',
          isActive: true
        },
        {
          title: 'Post PaisaTap on Twitter/X',
          description: 'Share a tweet showing off your PaisaTap balance with the hashtag #PaisaTap. Submit your tweet link for manual verification.',
          rewardAmount: 50,
          type: 'social',
          link: 'https://x.com',
          verificationMethod: 'manual',
          isActive: true
        },
        {
          title: 'Watch Earning Secrets video',
          description: 'Watch our complete guide on how to maximize your PaisaTap daily streak and tapping bonus.',
          rewardAmount: 10,
          type: 'daily',
          link: 'https://youtube.com',
          verificationMethod: 'instant',
          isActive: true
        }
      ];

      await Task.insertMany(defaultTasks);
      console.log('Successfully seeded default tasks!');
    }
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
}

// Database Connection and Server Boot
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB.');
    await seedDefaultTasks();
    
    // Launch Telegram bot concurrently inside the same process
    require('./bot');

    app.listen(PORT, () => {
      console.log(`PaisaTap backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });
