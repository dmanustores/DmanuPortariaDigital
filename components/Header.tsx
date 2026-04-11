'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  onMenuOpen: () => void;
  title?: string;
  subtitle?: string;
}

export const Header = ({ onMenuOpen, title, subtitle }: HeaderProps) => {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuOpen} className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <Menu size={20} />
        </button>
        {title ? (
          <div className="flex items-center gap-2 text-primary">
            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest">{title}</span>
          </div>
        ) : (
          <div className="relative w-full max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Buscar..."
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 sm:gap-6">
        <ThemeToggle />
        <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {mounted && (
            <>
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">{formatDate(time)}</span>
              <span className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-2 sm:px-3 py-1 rounded-full">{formatTime(time)}</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
