"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { resolveLoginCredentials } from '@/utils/adminLogin';

export interface AdminAuthState {
  isAuthenticated: boolean;
  isCheckingSession: boolean;
  role: string;
  session: Session | null;
  id: string;
  password: string;
  setId: (v: string) => void;
  setPassword: (v: string) => void;
  handleLogin: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleLogout: () => Promise<void>;
}

export function useAdminAuth(): AdminAuthState {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<string>('');
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const sessionGeneration = useRef(0);
  const currentUserId = useRef<string | null>(null);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const generation = ++sessionGeneration.current;
    const sameUser = Boolean(nextSession) && currentUserId.current === nextSession?.user.id;
    currentUserId.current = nextSession?.user.id || null;
    setSession(nextSession);
    if (!sameUser) {
      setIsAuthenticated(false);
      setRole('');
      setIsCheckingSession(Boolean(nextSession));
    }
    if (!nextSession) return;
    try {
      const { data, error } = await supabase.from('user_roles')
        .select('role').eq('id', nextSession.user.id).single();
      if (generation !== sessionGeneration.current) return;
      const allowed = !error && typeof data?.role === 'string' && data.role.length > 0;
      setRole(allowed ? data.role : '');
      setIsAuthenticated(allowed);
    } catch {
      if (generation === sessionGeneration.current) {
        setIsAuthenticated(false);
        setRole('');
      }
    } finally {
      if (generation === sessionGeneration.current) setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialGeneration = sessionGeneration.current;
    void supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      if (active && sessionGeneration.current === initialGeneration) void applySession(activeSession);
    }).catch(() => {
      if (active && sessionGeneration.current === initialGeneration) setIsCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer the role query until Supabase releases its auth callback lock.
      const eventGeneration = ++sessionGeneration.current;
      if (!nextSession || currentUserId.current !== nextSession.user.id) {
        setIsAuthenticated(false);
        setRole('');
        setIsCheckingSession(Boolean(nextSession));
      }
      setSession(nextSession);
      setTimeout(() => {
        if (active && eventGeneration === sessionGeneration.current) void applySession(nextSession);
      }, 0);
    });
    return () => {
      active = false;
      sessionGeneration.current += 1;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const credentials = resolveLoginCredentials(e.currentTarget, { id, password });
    const { toast } = await import('sonner');
    try {
      const email = `${credentials.id}@hanavi.internal`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: credentials.password,
      });

      if (error) {
        toast.error('로그인 실패: 아이디 또는 비밀번호를 확인하세요.');
      } else if (data.session) {
        await applySession(data.session);
        setPassword('');
      }
    } catch (err) {
      toast.error('로그인 에러: ' + err);
    }
  }, [id, password, applySession]);

  const handleLogout = useCallback(async () => {
    await applySession(null);
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setRole('');
    setId('');
    setPassword('');
  }, [applySession]);

  return {
    isAuthenticated,
    isCheckingSession,
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
