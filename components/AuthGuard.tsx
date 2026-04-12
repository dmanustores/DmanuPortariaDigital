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
    const checkAuth = async () => {
      const localAuth = localStorage.getItem('portaria_auth');
      if (localAuth) {
        try {
          const parsed = JSON.parse(localAuth);
          if (parsed.sessionExpiry && new Date(parsed.sessionExpiry) > new Date()) {
            setIsAuthenticated(true);
            setIsLoading(false);
            return true; // Use return true to indicate local auth is valid
          }
        } catch {
          localStorage.removeItem('portaria_auth');
        }
      }
      return false;
    };

    const checkAuth = async () => {
      const isLocalValid = verifyLocalAuth();
      if (isLocalValid) return;

      // Fallback to Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
