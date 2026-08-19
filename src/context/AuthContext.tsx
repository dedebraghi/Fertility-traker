import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseCredentials, saveSupabaseCredentials } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateCredentials: (url: string, anonKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const initAuth = () => {
    const creds = getSupabaseCredentials();
    const configured = Boolean(creds.url && creds.anonKey && creds.url.startsWith('https://'));
    setIsConfigured(configured);

    if (!configured) {
      setUser(null);
      setSession(null);
      setLoading(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.error('Error getting session:', err);
      setLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  useEffect(() => {
    const cleanup = initAuth();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const updateCredentials = (url: string, anonKey: string): boolean => {
    try {
      saveSupabaseCredentials(url, anonKey);
      initAuth();
      return true;
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase non configurato. Inserisci URL e Anon Key nelle Impostazioni.' };
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Errore durante il login' };
    }
  };

  const signup = async (email: string, password: string): Promise<{ error: string | null }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase non configurato. Inserisci URL e Anon Key nelle Impostazioni.' };
    try {
      const { error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Errore durante la registrazione' };
    }
  };

  const logout = async (): Promise<void> => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase non configurato.' };
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim());
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Errore invio reset password' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isConfigured,
      login,
      signup,
      logout,
      resetPassword,
      updateCredentials
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
