import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';

const DEMO_MODE = import.meta.env.DEV || String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';
const DEMO_STORAGE_KEY = 'tooprep-demo-user';

function getStoredDemoUser() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      const demoUser = getStoredDemoUser();
      setUser(demoUser);
      setSession(demoUser ? { user: demoUser, access_token: 'demo-token' } : null);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    if (DEMO_MODE) {
      const nextUser = {
        id: 'demo-user',
        email: email.trim() || 'demo@tooprep.dev',
        user_metadata: { name: 'Demo Student' },
      };

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      setSession({ user: nextUser, access_token: 'demo-token' });
      return { user: nextUser, session: { user: nextUser, access_token: 'demo-token' } };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
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
      setUser(nextUser);
      setSession({ user: nextUser, access_token: 'demo-token' });
      return { user: nextUser, session: { user: nextUser, access_token: 'demo-token' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (DEMO_MODE) {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUser(null);
      setSession(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
