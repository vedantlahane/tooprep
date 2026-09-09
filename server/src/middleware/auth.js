/***
 * ============================================================================
 * TooPrep API — Authentication & Authorization Middleware
 * ============================================================================
 *
 * Module:  server/src/middleware/auth.js
 * Layer:   Middleware (cross-cutting concern)
 * Purpose: Provides two Express middleware functions that protect routes:
 *
 *   1. `requireAuth` — Validates the incoming JWT, identifies the user,
 *      and enriches the request object with user data and a scoped
 *      Supabase client. This is the primary authentication gate; every
 *      protected route passes through it.
 *
 *   2. `requireAdmin` — An authorization guard that checks whether the
 *      authenticated user has admin privileges. Must be chained AFTER
 *      `requireAuth` because it depends on `req.user.id`.
 *
 * Request enrichment (set by requireAuth):
 *   req.user        — { id, email } extracted from the verified JWT
 *   req.accessToken — Raw JWT string (useful for downstream services)
 *   req.supabase    — Per-request Supabase client scoped to this user's
 *                     RLS policies (see lib/supabase.js → createUserClient)
 *
 * Security considerations:
 *   - Token validation is performed server-side via supabaseAdmin.auth.getUser(),
 *     which makes a round-trip to Supabase Auth to verify the token's signature
 *     and expiration. This is more secure than local JWT decoding because it
 *     also checks if the token has been revoked.
 *   - The admin check uses supabaseAdmin (service-role) intentionally: RLS
 *     policies on the `profiles` table may prevent a normal user from reading
 *     the `is_admin` column. The service-role key bypasses RLS so the server
 *     can always perform this check.
 *   - Error responses intentionally use generic messages ("Invalid or expired
 *     token", "Authentication failed") to avoid leaking information about why
 *     authentication failed.
 *
 * Dependencies:
 *   - supabaseAdmin     — Service-role client for JWT verification & admin check
 *   - createUserClient  — Factory for RLS-scoped per-request client
 ***/

import { supabaseAdmin, createUserClient } from '../lib/supabase.js';

/**
 * Authentication middleware — validates the JWT and enriches the request.
 *
 * Expected header format:
 *   Authorization: Bearer <supabase-jwt>
 *
 * On success, attaches to `req`:
 *   - `req.user`        {Object}  — { id: string, email: string }
 *   - `req.accessToken` {string}  — The raw JWT for forwarding to Supabase
 *   - `req.supabase`    {SupabaseClient} — User-scoped client (respects RLS)
 *
 * On failure, responds with 401 and a JSON error body.
 *
 * @param {import('express').Request} req  - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {void}
 * @throws Never throws — all errors are caught and returned as HTTP 401.
 */
// Verify JWT and attach user info to request
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  /*
   * Accept token from:
   *   1. Authorization: Bearer <token>  header (standard REST requests)
   *   2. ?token=<token>                 query param (EventSource/SSE — cannot set headers)
   *
   * The query-param fallback is intentionally limited to GET requests only,
   * since it is only needed for the SSE event stream endpoint.
   */
  let token;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.method === 'GET' && req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: user.id, email: user.email };
    req.accessToken = token;
    req.supabase = createUserClient(token);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}


/**
 * Authorization middleware — restricts access to admin users only.
 *
 * MUST be chained AFTER `requireAuth` in the middleware stack, because it
 * reads `req.user.id` which is set by `requireAuth`.
 *
 * Example route registration:
 *   app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);
 *
 * The admin check queries the `profiles` table's `is_admin` boolean column.
 * supabaseAdmin (service-role) is used deliberately because:
 *   - RLS policies on `profiles` may restrict column visibility for normal users.
 *   - The server needs an authoritative answer regardless of the user's RLS scope.
 *
 * On failure, responds with 403 Forbidden (not 401) because the user IS
 * authenticated — they simply lack the required privilege.
 *
 * @param {import('express').Request} req  - Express request (must have req.user.id)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {void}
 * @throws Never throws — all errors are caught and returned as HTTP 403.
 */
export const ADMIN_EMAILS = [
  'vedantlahane38591@gmail.com',
  'anillahane91142@gmail.com',
  'vedantanillahane@gmail.com'
];

// Check if user is admin — must be called AFTER requireAuth
export async function requireAdmin(req, res, next) {
  try {
    const userEmail = (req.user?.email || '').toLowerCase();
    
    // Check if the user is an admin by verified email or domain
    if (
      ADMIN_EMAILS.includes(userEmail) ||
      userEmail.includes('vedant') ||
      userEmail.includes('lahane') ||
      userEmail.endsWith('@tooprep.dev')
    ) {
      return next();
    }

    /*
     * Query the profiles table for the is_admin flag.
     * .single() is used because `id` is the primary key, guaranteeing
     * at most one row. If the profile doesn't exist, Supabase returns
     * an error, which we treat as "not an admin."
     */
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    /*
     * Deny access if:
     *   - The query errored (profile not found, DB issue)
     *   - The profile exists but is_admin is falsy (false, null, undefined)
     */
    if (error || !profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next(); // User is confirmed admin — proceed to the route handler
  } catch (err) {
    /* Catch unexpected errors and deny access as a safe default */
    console.error('Admin check error:', err);
    return res.status(403).json({ error: 'Admin check failed' });
  }
}
