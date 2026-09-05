import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { authService } from '../services/authService';
import { profileService } from '@/features/profile/services/profileService';

const DEMO_MODE = String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    if (DEMO_MODE) {
      const demoProfile = {
        id: userId,
        display_name: 'Demo Admin',
        target_exam_year: 2026,
        is_admin: true,
      };
      setProfile(demoProfile);
      return demoProfile;
    }

    try {
      // First attempt: query Supabase profiles table directly
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        return data;
      }

      // Second attempt: call profileService /api/profile endpoint
      const apiProfile = await profileService.getProfile();
      if (apiProfile) {
        setProfile(apiProfile);
        return apiProfile;
      }

      setProfile({ id: userId, is_admin: false });
      return null;
    } catch (err) {
      console.warn('Failed to fetch user profile, using fallback:', err);
      setProfile({ id: userId, is_admin: false });
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return null;
    }
    return await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    if (DEMO_MODE) {
      authService.getSession().then(async (sess) => {
        if (!isMounted) return;
        const currentUser = sess?.user ?? null;
        setUser(currentUser);
        setSession(sess);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        if (isMounted) setLoading(false);
      });
      return;
    }

    // Get initial session
    authService.getSession().then(async (sess) => {
      if (!isMounted) return;
      const currentUser = sess?.user ?? null;
      setSession(sess);
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!isMounted) return;
      const currentUser = sess?.user ?? null;
      setSession(sess);
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email, password) => {
    const data = await authService.signUp(email, password);
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      await fetchProfile(data.user.id);
    }
    return data;
  };

  const signIn = async (email, password) => {
    const data = await authService.signIn(email, password);
    if (data?.user) {
      setUser(data.user);
      setSession(data.session);
      await fetchProfile(data.user.id);
    }
    return data;
  };

  const signInWithGoogle = async () => {
    const data = await authService.signInWithGoogle();
    return data;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        refreshProfile,
        signUp,
        signIn,
        signInWithGoogle,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}


