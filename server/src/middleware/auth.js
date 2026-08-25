import { supabaseAdmin, createUserClient } from '../lib/supabase.js';

// Verify JWT and attach user info to request
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

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

// Check if user is admin — must be called AFTER requireAuth
export async function requireAdmin(req, res, next) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (error || !profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('Admin check error:', err);
    return res.status(403).json({ error: 'Admin check failed' });
  }
}
