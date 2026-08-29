/***
 * ============================================================================
 * TooPrep API — Centralized Configuration Module
 * ============================================================================
 *
 * Module:  server/src/config/index.js
 * Layer:   Infrastructure / Configuration
 * Purpose: Single source of truth for all environment-driven configuration.
 *          Every module that needs an env variable should import from here
 *          rather than reading process.env directly, ensuring consistency
 *          and making it easy to audit what the server depends on.
 *
 * Usage:
 *   import { config } from '../config/index.js';
 *   console.log(config.supabase.url);
 *
 * Environment variables consumed:
 *   PORT                       — HTTP listen port (default: 3001)
 *   CLIENT_URL                 — Allowed CORS origin(s), comma-separated
 *   SUPABASE_URL               — Supabase project REST API base URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Service-role key (full DB access, bypasses RLS)
 *   SUPABASE_ANON_KEY          — Anon/public key (respects RLS policies)
 *
 * Security notes:
 *   - SUPABASE_SERVICE_ROLE_KEY grants unrestricted access to all tables and
 *     bypasses Row Level Security. It must NEVER be exposed to the client.
 *   - SUPABASE_ANON_KEY is safe to use in client-scoped contexts because
 *     it is paired with the user's JWT and bound by RLS policies.
 *   - The .env file lives at the repo root (one level above server/), hence
 *     the relative path '../.env'.
 ***/

import dotenv from 'dotenv';

/*
 * Load the .env file before exporting config so that process.env is
 * populated by the time any importing module reads the config object.
 */
dotenv.config({ path: '../.env' });

/**
 * Application configuration object.
 *
 * All values are resolved at module load time (import-time) from
 * process.env. Changes to environment variables after the process
 * starts will NOT be reflected here.
 *
 * @type {{
 *   port: number|string,
 *   clientUrl: string,
 *   supabase: {
 *     url: string|undefined,
 *     serviceRoleKey: string|undefined,
 *     anonKey: string|undefined
 *   }
 * }}
 */
export const config = {
  port: process.env.PORT || 3001,          // HTTP listen port; Render/Heroku inject PORT at runtime
  clientUrl: process.env.CLIENT_URL || '', // Comma-separated allowed origins for CORS

  supabase: {
    url: process.env.SUPABASE_URL,                       // e.g. https://<project>.supabase.co
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Full-privilege key — server-side only
    anonKey: process.env.SUPABASE_ANON_KEY                // Public key — used with user JWTs for RLS
  }
};
