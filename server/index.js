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

// Normalize allowed origins (strip pathnames, trailing slashes, handle Vercel origins)
function isOriginAllowed(origin) {
  if (!origin) return true; // Allow non-browser or server-to-server requests

  const defaultAllowed = ['http://localhost:5173', 'http://localhost:3000', 'https://tooprep.vercel.app'];
  
  if (defaultAllowed.includes(origin)) return true;

  if (process.env.CLIENT_URL) {
    const rawUrls = process.env.CLIENT_URL.split(',').map(u => u.trim());
    for (const rawUrl of rawUrls) {
      try {
        const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
        if (parsed.origin === origin) return true;
      } catch {
        if (rawUrl.replace(/\/+$/, '') === origin) return true;
      }
    }
  }

  // Allow all Vercel deployment preview/production subdomains
  if (origin.endsWith('.vercel.app')) return true;

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
