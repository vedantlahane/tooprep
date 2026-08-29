/***
 * ============================================================================
 * TooPrep API — Supabase Client Factory
 * ============================================================================
 *
 * Module:  server/src/lib/supabase.js
 * Layer:   Infrastructure / Database access
 * Purpose: Creates and exports two flavors of Supabase client, each serving
 *          a different security context:
 *
 *   1. `supabaseAdmin`  — Singleton client authenticated with the service-role
 *      key. This key bypasses ALL Row Level Security (RLS) policies, granting
 *      unrestricted read/write access to every table. Used for server-side
 *      admin operations (e.g., checking the `profiles.is_admin` flag in the
 *      auth middleware) where RLS would block the query.
 *
 *   2. `createUserClient(accessToken)` — Factory that returns a NEW client
 *      for each request, initialized with the calling user's JWT. Supabase
 *      injects this JWT into every query so that Postgres RLS policies can
 *      evaluate `auth.uid()` and scope results to the authenticated user.
 *      This is the preferred client for all feature-level data access.
 *
 * Why two clients?
 *   Supabase RLS is enforced at the Postgres level based on the JWT in the
 *   request. The service-role key tells Postgres "I am the server, skip RLS."
 *   The anon key + user JWT tells Postgres "I am this user, enforce RLS."
 *   Mixing these up would either leak data (using admin where user-scoped is
 *   needed) or block legitimate server operations (using anon for admin tasks).
 *
 * Dependencies:
 *   - @supabase/supabase-js  — Official Supabase JS client
 *   - dotenv                 — Environment variable loader
 *
 * Environment variables required:
 *   SUPABASE_URL              — Project REST API URL
 *   SUPABASE_SERVICE_ROLE_KEY — Server-only full-access key
 *   SUPABASE_ANON_KEY         — Public key used alongside user JWTs
 ***/

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

/* Ensure .env is loaded before reading credentials */
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

/*
 * Fail fast if critical credentials are missing.
 * Without the URL or service-role key the server cannot perform any
 * database operations, so there is no point in continuing startup.
 * The anon key is not checked here because it is only needed when
 * createUserClient() is called (i.e., after a user authenticates).
 */
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

/**
 * Service-role Supabase client — bypasses RLS.
 *
 * Use this ONLY for operations that require elevated privileges:
 *   - Verifying JWTs via `supabaseAdmin.auth.getUser(token)`
 *   - Reading admin-only columns (e.g., `profiles.is_admin`)
 *   - Background jobs or migrations
 *
 * Session management is disabled because the server is stateless;
 * there is no browser session to refresh or persist.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
// Service-role client — bypasses RLS, used for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Creates a request-scoped Supabase client bound to the authenticated user.
 *
 * The user's JWT is injected as the Authorization header on every request
 * the client makes to Supabase. This causes Postgres to evaluate RLS
 * policies with `auth.uid()` set to the user's ID, ensuring they can only
 * access rows they are authorized to see.
 *
 * A new client is created per-request (rather than reusing a singleton)
 * because each request may carry a different user's token. Supabase JS
 * clients are lightweight, so the overhead is negligible.
 *
 * @param {string} accessToken - The user's Supabase JWT (extracted from
 *   the Authorization header by the auth middleware).
 * @returns {import('@supabase/supabase-js').SupabaseClient} A Supabase
 *   client that respects RLS for the given user.
 */
// Creates a per-request client using the user's JWT — respects RLS
export function createUserClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
