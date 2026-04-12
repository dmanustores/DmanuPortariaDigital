'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Prevent flash loop - check auth on mount only
    const auth = localStorage.getItem('portaria_auth');
    if (auth) {
      try {
        const parsed = JSON.parse(auth);
        if (parsed.sessionExpiry && new Date(parsed.sessionExpiry) > new Date()) {
          window.location.href = '/';
          return;
        }
      } catch {
        localStorage.removeItem('portaria_auth');
      }
    }
  }, []);

  const MASTER_PASSWORD = 'portaria2024';
  const MASTER_USER = 'owner';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (password === MASTER_PASSWORD && username.toLowerCase() === MASTER_USER) {
        setIsLoading(false);
        const sessionExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        localStorage.setItem('portaria_auth', JSON.stringify({
          user: 'OWNER',
          role: 'Owner',
          turno: null,
          loginTime: new Date().toISOString(),
          sessionExpiry
        }));
        window.location.href = '/';
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Fetch operator profile
        let profile = await supabase
          .from('operators')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // Auto-cria perfil se não existir (fallback)
        if (!profile) {
          const email = data.user.email || username;
          const nome = username.includes('@') ? username.split('@')[0] : username;
          
          await supabase.from('operators').insert({
            id: data.user.id,
            nome: nome,
            role: 'Porteiro',
            turno: 'A'
          });
          
          profile = { nome, role: 'Porteiro', turno: 'A' };
        }

        // Session timeout: 4 horas
        const sessionExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        
        localStorage.setItem('portaria_auth', JSON.stringify({
          user: profile?.nome || data.user.email,
          role: profile?.role || 'Porteiro',
          turno: profile?.turno || 'A',
          loginTime: new Date().toISOString(),
          sessionExpiry
        }));
        
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="p-8 bg-primary text-white text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/10">
                <Building2 size={32} />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Portaria Digital</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">Acesso Restrito a Funcionários</p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 rounded-full blur-3xl"></div>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input 
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="Seu usuário"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2"
                >
                  <ShieldCheck size={14} />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Entrar no Sistema
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Esqueceu sua senha? Contate o administrador do condomínio.
              </p>
            </div>
          </div>
        </motion.div>
        
        <p className="text-center text-slate-400 dark:text-slate-600 text-[10px] mt-6 uppercase tracking-widest font-bold">
          &copy; 2024 Condomínio Moderno - Portaria Digital
        </p>
      </div>
    </div>
  );
}
