'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verifyLocalAuth = () => {
      const localAuth = localStorage.getItem('portaria_auth');
      if (localAuth) {
        try {
          const parsed = JSON.parse(localAuth);
          if (parsed.sessionExpiry && new Date(parsed.sessionExpiry) > new Date()) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return true;
          }
        } catch {
          localStorage.removeItem('portaria_auth');
        }
      }
      return false;
    };

    const checkAuth = async () => {
      // 1. Verifica LocalAuth primeiro para rapidez
      const localAuth = localStorage.getItem('portaria_auth');
      let isLocalValid = false;
      if (localAuth) {
        try {
          const parsed = JSON.parse(localAuth);
          if (parsed.sessionExpiry && new Date(parsed.sessionExpiry) > new Date()) {
            isLocalValid = true;
          }
        } catch {
          localStorage.removeItem('portaria_auth');
        }
      }

      // 2. Busca do Supabase e valida status no banco (Proteção em tempo real)
      const { data: { session } } = await supabase.auth.getSession();
      
      const userToVerify = session?.user?.id;
      if (userToVerify) {
        const { data: profile } = await supabase
          .from('operators')
          .select('status')
          .eq('id', userToVerify)
          .single();

        if (profile?.status === 'bloqueado') {
          // EXPULSÃO IMEDIATA
          await supabase.auth.signOut();
          localStorage.removeItem('portaria_auth');
          setIsAuthenticated(false);
          router.push('/login?error=blocked');
          return;
        }
      }

      if (!session && !isLocalValid) {
        if (pathname !== '/login') {
          router.push('/login');
        }
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) {
        // Only redirect if local auth is also invalid
        const isLocalValid = verifyLocalAuth();
        if (!isLocalValid && pathname !== '/login') {
          setIsAuthenticated(false);
          router.push('/login');
        }
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div 
          className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"
          suppressHydrationWarning
        ></div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
