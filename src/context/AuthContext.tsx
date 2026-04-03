import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('AuthContext: getSession error:', error);
        // If the refresh token is invalid or not found, sign out to clear local storage
        if (error.message?.includes('Refresh Token Not Found') || error.message?.includes('invalid_refresh_token')) {
          supabase.auth.signOut();
        }
        setLoading(false);
        return;
      }
      
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
      } else if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile is missing (PGRST116), try to create a default one
        if (error.code === 'PGRST116') {
          console.warn('Profile not found, attempting to create default profile...');
          const { data: userData } = await supabase.auth.getUser();
          const email = userData.user?.email;
          
          // Determine role based on email
          const isAdmin = email === 'ershad6732@gmail.com' || email === 'admin@school.com';
          const role = isAdmin ? 'admin' : 'teacher';
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{ 
              id: userId, 
              full_name: email?.split('@')[0] || 'User',
              role: role
            }])
            .select()
            .single();
          
          if (insertError) {
            console.error('Failed to create fallback profile:', insertError);
            throw insertError;
          }
          setProfile(newProfile);
          return;
        }
        throw error;
      }
      setProfile(data);
    } catch (error: any) {
      console.error('AuthContext: fetchProfile failed:', error);
      // If the profile fetch fails because of a token error, sign out to clear local storage
      if (error.message?.includes('Refresh Token Not Found') || error.message?.includes('invalid_refresh_token')) {
        supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
