import { supabase } from '@/shared/lib/supabase';

const DEMO_MODE = String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';
const DEMO_STORAGE_KEY = 'tooprep-demo-user';

function getStoredDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const authService = {
  async signUp(email, password) {
    if (DEMO_MODE) {
      const nextUser = {
        id: 'demo-user',
        email: (email || '').trim() || 'demo@tooprep.dev',
        user_metadata: { name: 'Demo Student' },
      };

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextUser));
      return { user: nextUser, session: { user: nextUser, access_token: 'demo-token' } };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    if (DEMO_MODE) {
      const trimmedEmail = (email || '').trim();
      if (!trimmedEmail || !password) {
        throw new Error('Email and password are required');
      }

      const nextUser = {
        id: 'demo-user',
        email: trimmedEmail,
        user_metadata: { name: 'Demo Student' },
      };

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextUser));
      return { user: nextUser, session: { user: nextUser, access_token: 'demo-token' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    if (DEMO_MODE) {
      throw new Error('Google sign-in is not supported in demo mode');
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (DEMO_MODE) {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    if (DEMO_MODE) {
      return getStoredDemoUser() ? { user: getStoredDemoUser(), access_token: 'demo-token' } : null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
};

