'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Users, 
  BadgeCheck, 
  Brush, 
  Construction, 
  Plus,
  StickyNote,
  CheckCircle2,
  PlusCircle,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import Image from 'next/image';

// --- Components ---

const AccessForm = () => {
  return (
    <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-2 mb-6 text-primary">
        <ShieldCheck size={24} />
        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Autorização de Entrada na Portaria</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Visitante / Profissional</label>
          <input 
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary/20"
            placeholder="Nome completo"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Liberado por:</label>
          <select className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary/20">
            <option>Unidade 101 - Sr. Marcos</option>
            <option>Unidade 202 - Sra. Ana</option>
            <option>Unidade 305 - Dr. Paulo</option>
            <option>Administração</option>
          </select>
        </div>
        
        <div className="md:col-span-2 flex justify-end">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-8 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-slate-900/10"
          >
            Registrar Entrada
          </motion.button>
        </div>
      </div>
    </section>
  );
};

const AccessCategories = () => {
  const categories = [
    { icon: Users, label: 'Convidados Unidades', count: '8 ativos', color: 'blue' },
    { icon: BadgeCheck, label: 'Colaboradores Cond.', count: '12 ativos', color: 'green' },
    { icon: Brush, label: 'Empregada Doméstica', count: '5 ativas', color: 'purple' },
    { icon: Package, label: 'Profissionais Mudanças', count: '2 equipes', color: 'orange' },
    { icon: Construction, label: 'Obras Profissionais', count: '4 prestadores', color: 'red' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30',
  };

  return (
    <section>
      <h3 className="font-bold text-lg mb-4">Acessos em Tempo Real</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <motion.div 
            key={cat.label}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all cursor-pointer group shadow-sm"
          >
            <div className={`size-10 rounded-lg ${colorMap[cat.color]} mb-3 flex items-center justify-center`}>
              <cat.icon size={20} />
            </div>
            <p className="text-sm font-bold">{cat.label}</p>
            <p className="text-xs text-slate-500">{cat.count}</p>
          </motion.div>
        ))}
        
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Plus size={20} className="mb-1" />
          <p className="text-xs font-bold">Novo Tipo</p>
        </div>
      </div>
    </section>
  );
};

const NoticeBoard = () => {
  const notices = [
    { time: 'HOJE, 09:00', title: 'Manutenção dos elevadores - Bloco A', desc: 'Interrupção prevista das 14h às 16h.', highlight: true },
    { time: '13 MAI, 2024', title: 'Nova regra de visitantes', desc: 'Apresentação de documento oficial é obrigatória.' },
    { time: '10 MAI, 2024', title: 'Dedetização áreas comuns', desc: 'Evitar circulação de pets no jardim.' },
  ];

  return (
    <section className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg">Quadro de Avisos</h3>
        <button className="text-xs font-bold text-primary hover:underline">Ver todos</button>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        {notices.map((notice, idx) => (
          <div 
            key={idx}
            className={`p-3 rounded-lg border-l-4 transition-all ${
              notice.highlight 
                ? 'bg-blue-50 dark:bg-blue-900/10 border-primary' 
                : 'bg-slate-50 dark:bg-slate-800 border-transparent'
            }`}
          >
            <p className="text-xs font-bold text-slate-400 mb-1">{notice.time}</p>
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className="text-xs text-slate-500 mt-1">{notice.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const Reminders = () => {
  const [items, setItems] = React.useState([
    { id: 1, text: 'Entregar chave reserva para Unidade 402 às 16h.', completed: false },
    { id: 2, text: 'Conferir lacre do hidrante - Bloco C.', completed: false },
    { id: 3, text: 'Avisar síndico sobre lâmpada queimada na garagem.', completed: false },
  ]);

  const toggleItem = (id: number) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  return (
    <section className="bg-primary/5 dark:bg-primary/10 p-6 rounded-xl border border-primary/20 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-primary">
        <StickyNote size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wider">Lembretes da Portaria</h3>
      </div>
      
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 items-start group cursor-pointer" onClick={() => toggleItem(item.id)}>
            <div className={`mt-1 size-4 rounded border flex items-center justify-center transition-colors ${
              item.completed ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
              {item.completed && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <p className={`text-sm transition-all ${
              item.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-6 py-2 border-2 border-dashed border-primary/30 rounded-lg text-primary text-xs font-bold hover:bg-primary/10 transition-all flex items-center justify-center gap-2">
        <Plus size={16} />
        Adicionar Lembrete
      </button>
    </section>
  );
};

const QuickStats = () => {
  return (
    <div className="bg-slate-900 dark:bg-primary text-white p-6 rounded-xl shadow-lg">
      <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-4">Fluxo do Dia</p>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-3xl font-black">42</p>
          <p className="text-[10px] opacity-70">ENTRADAS HOJE</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black">12</p>
          <p className="text-[10px] opacity-70">ENCOMENDAS PENDENTES</p>
        </div>
      </div>
    </div>
  );
};

const Reservations = () => {
  return (
    <section>
      <h3 className="font-bold text-lg mb-4">Espaços e Reservas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
        >
          <div className="h-32 bg-slate-200 relative overflow-hidden">
            <Image 
              src="https://picsum.photos/seed/ballroom/800/400" 
              alt="Salão de Festas"
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter shadow-sm">
              Reservados Hoje
            </div>
          </div>
          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Salão de Festas & Churrasqueira</p>
              <p className="text-xs text-slate-500">Locação Combinada - Unidade 204</p>
            </div>
            <button className="text-primary text-xs font-bold hover:underline">Ver Detalhes</button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// --- Main Page ---

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Painel de Controle</h2>
          <p className="text-slate-500 mt-1 text-sm lg:text-base">Gestão centralizada de acessos e monitoramento do condomínio</p>
        </motion.div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <PlusCircle size={18} />
          Novo Registro
        </motion.button>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <AccessForm />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AccessCategories />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Reservations />
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <NoticeBoard />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Reminders />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <QuickStats />
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
