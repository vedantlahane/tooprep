import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { authService } from '../services/authService';
import { profileService } from '@/features/profile/services/profileService';

const DEMO_MODE = String(import.meta.env.VITE_DEMO_AUTH ?? '').toLowerCase() === 'true';

export const ADMIN_EMAILS = [
  'vedantlahane38591@gmail.com',
  'anillahane91142@gmail.com',
  'vedantanillahane@gmail.com'
];

export function isUserAdmin(user, profile) {
  if (!user) return false;
  if (profile?.is_admin === true) return true;
  const email = (user.email || '').toLowerCase();
  if (
    ADMIN_EMAILS.includes(email) ||
    email.includes('vedant') ||
    email.includes('lahane') ||
    email.endsWith('@tooprep.dev') ||
    user.user_metadata?.is_admin === true ||
    user.app_metadata?.is_admin === true
  ) {
    return true;
  }
  return false;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId, userEmail) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    const email = (userEmail || '').toLowerCase();
    const isAdminByEmail =
      ADMIN_EMAILS.includes(email) ||
      email.includes('vedant') ||
      email.includes('lahane') ||
      email.endsWith('@tooprep.dev');

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
        const resolvedProfile = {
          ...data,
          is_admin: Boolean(data.is_admin || isAdminByEmail)
        };
        if (isAdminByEmail && !data.is_admin) {
          supabase.from('profiles').update({ is_admin: true }).eq('id', userId).then();
        }
        setProfile(resolvedProfile);
        return resolvedProfile;
      }

      // Second attempt: call profileService /api/profile endpoint
      const apiProfile = await profileService.getProfile().catch(() => null);
      if (apiProfile) {
        const resolvedProfile = {
          ...apiProfile,
          is_admin: Boolean(apiProfile.is_admin || isAdminByEmail)
        };
        setProfile(resolvedProfile);
        return resolvedProfile;
      }

      const fallbackProfile = { id: userId, is_admin: isAdminByEmail };
      setProfile(fallbackProfile);
      return fallbackProfile;
    } catch (err) {
      console.warn('Failed to fetch user profile, using fallback:', err);
      const fallbackProfile = { id: userId, is_admin: isAdminByEmail };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return null;
    }
    return await fetchProfile(user.id, user.email);
  }, [user?.id, user?.email, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    if (DEMO_MODE) {
      authService.getSession().then(async (sess) => {
        if (!isMounted) return;
        const currentUser = sess?.user ?? null;
        setUser(currentUser);
        setSession(sess);
        if (currentUser) {
          await fetchProfile(currentUser.id, currentUser.email);
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
        await fetchProfile(currentUser.id, currentUser.email);
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
        await fetchProfile(currentUser.id, currentUser.email);
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

  const isAdmin = isUserAdmin(user, profile);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
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


