import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { authService } from '../services/authService';

const DEMO_MODE = import.meta.env.DEV || String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_MODE) {
      authService.getSession().then(session => {
        setUser(session?.user ?? null);
        setSession(session);
        setLoading(false);
      });
      return;
    }

    // Get initial session
    authService.getSession().then((session) => {
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
    const data = await authService.signUp(email, password);
    if (DEMO_MODE && data.user) {
      setUser(data.user);
      setSession(data.session);
    }
    return data;
  };

  const signIn = async (email, password) => {
    const data = await authService.signIn(email, password);
    if (DEMO_MODE && data.user) {
      setUser(data.user);
      setSession(data.session);
    }
    return data;
  };

  const signInWithGoogle = async () => {
    const data = await authService.signInWithGoogle();
    return data;
  };

  const signOut = async () => {
    await authService.signOut();
    if (DEMO_MODE) {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

