/***
 * ============================================================================
 * TooPrep API — Express Server Entry Point
 * ============================================================================
 *
 * Module:  server/src/index.js
 * Layer:   Application bootstrap / HTTP server
 * Purpose: Initializes the Express application, configures global middleware
 *          (CORS, JSON parsing), mounts all feature route modules under /api/*,
 *          and starts the HTTP listener.
 *
 * Architecture:
 *   This is the top-level orchestrator. It wires together:
 *     1. Cross-origin policy (CORS) — with a custom origin validator that
 *        supports Vercel preview deployments and configurable CLIENT_URL.
 *     2. Authentication gate — every feature route passes through `requireAuth`
 *        middleware before reaching its controller.
 *     3. Feature routers — each domain feature (profile, topics, questions,
 *        confidence, practice, evaluations, dashboard) is isolated in its own
 *        module and mounted here.
 *
 * Request lifecycle:
 *   CORS check → JSON body parse → Route match → requireAuth → Controller
 *
 * Dependencies:
 *   - express       — HTTP framework
 *   - cors          — CORS middleware (handles preflight OPTIONS automatically)
 *   - dotenv        — Loads .env variables before any module reads process.env
 *   - requireAuth   — JWT validation middleware (see middleware/auth.js)
 *   - Feature routes — Domain-specific Express routers
 *
 * Environment variables:
 *   PORT        — HTTP listen port (default: 3001)
 *   CLIENT_URL  — Comma-separated allowed origins beyond the hardcoded defaults
 ***/

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth } from './middleware/auth.js';

/* Feature route modules — each encapsulates its own router with controller bindings */
import profileRoutes from './features/profile/profile.routes.js';
import topicsRoutes from './features/topics/topics.routes.js';
import questionsRoutes from './features/questions/questions.routes.js';
import confidenceRoutes from './features/confidence/confidence.routes.js';
import practiceRoutes from './features/practice/practice.routes.js';
import evaluationsRoutes from './features/evaluations/evaluations.routes.js';
import dashboardRoutes from './features/dashboard/dashboard.routes.js';

/*
 * Load environment variables early so every subsequent import/module
 * that reads process.env picks up the correct values.
 * Path points one level up because the .env file lives at the repo root,
 * not inside server/src/.
 */
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Determines whether a given request origin is allowed by the CORS policy.
 *
 * The validation strategy uses three tiers (checked in order):
 *   1. Hardcoded defaults — localhost dev servers and the primary production domain.
 *   2. CLIENT_URL env var — a comma-separated list that ops/CI can extend without
 *      code changes. Each entry is normalized via the URL constructor to compare
 *      only scheme+host+port (the "origin"), ignoring trailing paths/slashes.
 *   3. Wildcard Vercel match — any subdomain of vercel.app is accepted. This is
 *      intentionally broad to support Vercel's auto-generated preview URLs
 *      (e.g., tooprep-git-feature-xyz.vercel.app) without needing to whitelist
 *      each one. This is a deliberate security trade-off: it trusts the vercel.app
 *      TLD, which is acceptable because only authenticated requests can mutate data.
 *
 * @param {string|undefined} origin - The Origin header from the incoming request.
 *   Browsers always send this for cross-origin requests. Server-to-server calls
 *   or same-origin requests may omit it.
 * @returns {boolean} True if the origin should be allowed, false otherwise.
 */
function isOriginAllowed(origin) {
  if (!origin) return true; // Allow non-browser or server-to-server requests

  /* Tier 1: Hardcoded safe origins — dev servers + primary production domain */
  const defaultAllowed = ['http://localhost:5173', 'http://localhost:3000', 'https://tooprep.vercel.app'];
  
  if (defaultAllowed.includes(origin)) return true;

  /* Tier 2: Dynamically configured origins via CLIENT_URL env var */
  if (process.env.CLIENT_URL) {
    const rawUrls = process.env.CLIENT_URL.split(',').map(u => u.trim());
    for (const rawUrl of rawUrls) {
      try {
        /*
         * Normalize each entry through the URL constructor so that
         * "https://example.com/" and "https://example.com" both yield
         * the same .origin value for comparison.
         * If the entry lacks a scheme, default to https.
         */
        const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
        if (parsed.origin === origin) return true;
      } catch {
        /*
         * Fallback for malformed URLs that the URL constructor rejects:
         * strip trailing slashes and do a plain string comparison.
         */
        if (rawUrl.replace(/\/+$/, '') === origin) return true;
      }
    }
  }

  /* Tier 3: Allow all Vercel deployment preview/production subdomains */
  if (origin.endsWith('.vercel.app')) return true;

  return false;
}

/*
 * -------------------------------------------------------------------------
 * Global Middleware Stack
 * -------------------------------------------------------------------------
 * Order matters: CORS must run first (including preflight OPTIONS handling),
 * then body parsing, before any route handler executes.
 */

app.use(cors({
  /*
   * Dynamic origin callback — invoked for every request.
   * Delegates to isOriginAllowed() rather than using a static array
   * because we need runtime checks (env vars, wildcard matching).
   * Returning `false` does NOT block the request outright; it simply
   * omits the Access-Control-Allow-Origin header, causing the browser
   * to reject the response on the client side.
   */
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true, // Allow cookies and Authorization headers cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json()); // Parse JSON request bodies (application/json)

/*
 * -------------------------------------------------------------------------
 * Routes
 * -------------------------------------------------------------------------
 */

/**
 * Health check endpoint — unauthenticated.
 * Used by uptime monitors, load balancers, and deployment pipelines
 * to verify the server is running and responsive.
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/*
 * Protected feature routes — every route below passes through `requireAuth`
 * middleware first, which validates the JWT, attaches `req.user`, and creates
 * a per-request Supabase client scoped to the authenticated user's RLS policies.
 *
 * Note: confidenceRoutes is mounted on /api/topics (not a separate prefix)
 * because its endpoints are sub-resources of a topic:
 *   POST /api/topics/:id/confidence
 *   GET  /api/topics/:id/confidence-history
 * Express merges both routers under the same prefix without conflict.
 */
app.use('/api/profile', requireAuth, profileRoutes);
app.use('/api/topics', requireAuth, topicsRoutes);
app.use('/api/questions', requireAuth, questionsRoutes);
app.use('/api/topics', requireAuth, confidenceRoutes);  // Mounts /api/topics/:id/confidence & /api/topics/:id/confidence-history
app.use('/api/practice-sessions', requireAuth, practiceRoutes);
app.use('/api/evaluations', requireAuth, evaluationsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

/*
 * -------------------------------------------------------------------------
 * Global Error Handler
 * -------------------------------------------------------------------------
 * Express recognizes this as an error-handling middleware because it has
 * four parameters (err, req, res, next). Any uncaught error thrown or
 * passed to next(err) in route handlers will land here.
 *
 * Security note: we intentionally do NOT expose `err.message` to the client
 * to avoid leaking stack traces or internal details. The full error is
 * logged server-side for debugging.
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* Start the HTTP server */
app.listen(PORT, () => {
  console.log(`TooPrep API running on port ${PORT}`);
});
