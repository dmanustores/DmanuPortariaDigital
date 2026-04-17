'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users,
  Package, 
  Car, 
  Building2, 
  Truck, 
  UserPlus, 
  Settings, 
  Users as UsersIcon,
  LogOut,
  X as CloseIcon,
  Shield,
  AlertTriangle,
  FileText,
  Calendar,
  Bell,
  BarChart3
} from 'lucide-react';
import { ShiftHandoverModal } from './ShiftHandover';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, KeySquare } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activePath?: string;
}

export const Sidebar = ({ isOpen, onClose, activePath = '/' }: SidebarProps) => {
  const router = useRouter();
  const [operator, setOperator] = useState<{ nome: string; role: string; turno: string } | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ veiculos: false });

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      // 1. Tenta buscar direto do banco de dados (Sempre a fonte da verdade)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('operators')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setOperator({
            nome: profile.nome,
            role: profile.role,
            turno: profile.turno
          });
          return;
        }
      }

      // 2. Fallback para localStorage (apenas se não houver sessão Supabase)
      const localAuth = localStorage.getItem('portaria_auth');
      if (localAuth) {
        const parsed = JSON.parse(localAuth);
        setOperator({
          nome: parsed.user,
          role: parsed.role,
          turno: parsed.turno
        });
      }
    };

    fetchProfile();
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
    { icon: Users, label: 'Acessos', href: '/acessos' },
    { icon: Package, label: 'Encomendas', href: '/encomendas' },
    { icon: Car, label: 'Veículos', href: '/veiculos' },
    { icon: KeySquare, label: 'Gestão de Vagas', href: '/vagas' },
    { icon: FileText, label: 'Ocorrências', href: '/ocorrencias' },
    { icon: Truck, label: 'Mudanças', href: '/mudancas' },
    { icon: Calendar, label: 'Reservas', href: '/reservas' },
    { icon: Bell, label: 'Avisos', href: '/avisos' },
    { icon: Building2, label: 'Unidades', href: '/unidades' },
    { icon: UsersIcon, label: 'Colaboradores', href: '/colaboradores' },
    { icon: UserPlus, label: 'Moradores', href: '/moradores' },
  ];

  const adminItems = operator?.role === 'Admin' ? [
    { icon: Shield, label: 'Admin', href: '/admin' },
  ] : [];

  const handleLogout = () => {
    setShowShiftModal(true);
  };

  const handleConfirmShift = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('portaria_auth');
    router.push('/login');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside 
        suppressHydrationWarning
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-screen
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">Portaria Digital</h1>
              <p className="text-xs text-slate-500 mt-1">Condomínio Moderno</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500">
            <CloseIcon size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
            if (item.subItems) {
              const isActiveSub = item.subItems.some(sub => activePath === sub.href);
              const isOpen = openMenus[item.id as string] || isActiveSub;
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.id as string)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                      isActiveSub 
                        ? 'bg-primary/5 text-primary font-bold' 
                        : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={isActiveSub ? 'text-primary' : 'text-slate-500 dark:text-slate-400'} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {isOpen ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pl-6 space-y-1 overflow-hidden"
                      >
                        {item.subItems.map((sub) => {
                          const isSubActive = activePath === sub.href;
                          return (
                            <Link
                              key={sub.label}
                              href={sub.href}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                                isSubActive
                                  ? 'bg-primary text-white font-bold shadow-md shadow-primary/20'
                                  : 'text-slate-600 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <sub.icon size={14} className={isSubActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                              <span className="text-[13px] font-medium">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            const isActive = activePath === item.href;
            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' 
                    : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 space-y-2 sm:space-y-3">
          <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="bg-primary/10 text-primary size-8 rounded-full flex items-center justify-center flex-none">
              <Users size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{operator?.nome || 'Operador'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {operator ? (
                  `${operator.role} - ${operator.turno === 'ADM' ? 'Horário Livre' : `Turno ${operator.turno}`}`
                ) : 'Carregando...'}
              </p>
            </div>
            <Settings size={16} className="text-slate-500 dark:text-slate-400 cursor-pointer hover:text-primary transition-colors flex-none" onClick={() => router.push('/admin')} />
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all text-xs font-black uppercase tracking-wider"
          >
            <LogOut size={16} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      <ShiftHandoverModal 
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onConfirm={handleConfirmShift}
      />
    </>
  );
};
