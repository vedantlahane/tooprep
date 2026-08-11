import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth } from './middleware/auth.js';
import profileRoutes from './routes/profile.js';
import topicsRoutes from './routes/topics.js';
import questionsRoutes from './routes/questions.js';
import confidenceRoutes from './routes/confidence.js';
import practiceRoutes from './routes/practice.js';
import evaluationsRoutes from './routes/evaluations.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes — all require auth
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/topics', requireAuth, topicsRoutes);
app.use('/api/questions', requireAuth, questionsRoutes);
app.use('/api/topics', requireAuth, confidenceRoutes);  // Mounts under /api/topics/:id/confidence
app.use('/api/practice-sessions', requireAuth, practiceRoutes);
app.use('/api/evaluations', requireAuth, evaluationsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`TooPrep API running on port ${PORT}`);
});
