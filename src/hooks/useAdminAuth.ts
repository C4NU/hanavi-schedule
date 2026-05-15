"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export interface AdminAuthState {
  isAuthenticated: boolean;
  role: string;
  session: Session | null;
  id: string;
  password: string;
  setId: (v: string) => void;
  setPassword: (v: string) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  handleLogout: () => Promise<void>;
}

export function useAdminAuth(): AdminAuthState {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);

  const fetchUserRole = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();

      if (data) {
        setRole(data.role);
        return true;
      } else if (error) {
        return false;
      }
    } catch {
      return false;
    }
    return false;
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (activeSession) {
        setSession(activeSession);
        const success = await fetchUserRole(activeSession.user.id);
        if (success) setIsAuthenticated(true);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const success = await fetchUserRole(newSession.user.id);
        if (success) setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setRole('');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const { toast } = await import('sonner');
    try {
      const email = `${id}@hanavi.internal`;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error('로그인 실패: 아이디 또는 비밀번호를 확인하세요.');
      } else if (data.session) {
        setSession(data.session);
        const success = await fetchUserRole(data.session.user.id);
        if (success) {
          setIsAuthenticated(true);
          setPassword('');
        } else {
          window.location.reload();
        }
      }
    } catch (err) {
      toast.error('로그인 에러: ' + err);
    }
  }, [id, password, fetchUserRole]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole('');
    setId('');
    setPassword('');
  }, []);

  return {
    isAuthenticated,
    role,
    session,
    id,
    password,
    setId,
    setPassword,
    handleLogin,
    handleLogout,
  };
}
