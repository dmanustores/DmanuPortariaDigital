'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { motion } from 'motion/react';
import { 
  Users, UserPlus, Clock, Search, Briefcase, 
  MapPin, LogIn, LogOut, FileText, AlertTriangle 
} from 'lucide-react';
import { Colaborador, RegistroColaborador } from '@/types/colaborador';
import { getColaboradores, getRegistrosColaboradores, saveColaborador, deleteColaborador } from '@/lib/colaboradores-store';
import { ColaboradorForm } from '@/components/ColaboradorForm';
import { RegistroColaboradorModal } from '@/components/RegistroColaboradorModal';
import { supabase } from '@/lib/supabase';

export default function ColaboradoresPage() {
  const [activeTab, setActiveTab] = useState<'ativos' | 'pendencias' | 'historico'>('ativos');
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [registros, setRegistros] = useState<RegistroColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedColab, setSelectedColab] = useState<Colaborador | null>(null);
  const [showRegistroModal, setShowRegistroModal] = useState<'ENTRADA' | 'SAIDA' | null>(null);
  
  // Realtime badge logic
  const [currentTime, setCurrentTime] = useState(new Date());

  // Role based UI (true if Admin)
  const [isAdmin, setIsAdmin] = useState(false);
  const [faltasIds, setFaltasIds] = useState<Set<string>>(new Set());
  const [atrasosIds, setAtrasosIds] = useState<Set<string>>(new Set());
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DENTRO' | 'ATRASOS' | 'FALTAS'>('ALL');

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('operators')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile) {
           setIsAdmin(profile.role === 'Admin' || profile.role === 'Owner');
        }
      }
    };
    fetchRole();
    const interval = setInterval(() => setCurrentTime(new Date()), 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [colabs, regs] = await Promise.all([
      getColaboradores(),
      getRegistrosColaboradores() // fetch recent 
    ]);
    setColaboradores(colabs);
    setRegistros(regs);
    
    // Check missing / late
    const newMissing = new Set<string>();
    const newLate = new Set<string>();
    const now = new Date();
    const dayNames = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
    const currentDay = dayNames[now.getDay()];

    colabs.forEach(c => {
       if (c.status !== 'ATIVO') return;
       const todayRegs = regs.filter(r => r.colaborador_id === c.id && r.hora_entrada && new Date(r.hora_entrada).getDate() === now.getDate());
       const isInside = todayRegs.some(r => r.status === 'DENTRO');

       const horarioHoje = c.horarios_customizados?.[currentDay];

       if (c.dias_semana?.includes(currentDay) && horarioHoje?.entrada) {
           const [h, m] = horarioHoje.entrada.split(':');
           const expectedTime = new Date();
           expectedTime.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
           
           if (!isInside && now.getTime() > expectedTime.getTime() + (2 * 60 * 60 * 1000) && todayRegs.length === 0) {
              newMissing.add(c.id);
           }
           
           if (todayRegs.length > 0) {
              const entradaFirst = new Date(todayRegs[todayRegs.length - 1].hora_entrada!); // since it's ordered desc, last in array is first of day
              if (entradaFirst.getTime() > expectedTime.getTime() + (30 * 60000)) {
                 newLate.add(c.id);
              }
           }
       }
    });
    setFaltasIds(newMissing);
    setAtrasosIds(newLate);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics
  const totalAtivos = colaboradores.filter(c => c.status === 'ATIVO').length;
  // A colaborador is "Inside" if their most recent record for today has status DENTRO
  // The simplest way to map this is to check the registros
  const dentroAgoraIds = new Set(registros.filter(r => r.status === 'DENTRO').map(r => r.colaborador_id));
  const dentroAgoraCount = dentroAgoraIds.size;

  // Filter lists based on tab
  const getDisplayList = () => {
    if (activeTab === 'ativos') {
        let list = colaboradores;
        
        if (statusFilter === 'DENTRO') {
            list = list.filter(c => dentroAgoraIds.has(c.id));
        } else if (statusFilter === 'ATRASOS') {
            list = list.filter(c => atrasosIds.has(c.id));
        } else if (statusFilter === 'FALTAS') {
            list = list.filter(c => faltasIds.has(c.id));
        }

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(c => c.nome.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q) || c.cargo.toLowerCase().includes(q));
        }
        return list;
    }
    return [];
  };

  const handleCreateNew = () => {
    setSelectedColab(null);
    setShowFormModal(true);
  };

  const handleEdit = (c: Colaborador) => {
    setSelectedColab(c);
    setShowFormModal(true);
  };

  const saveColab = async (data: Partial<Colaborador>) => {
     await saveColaborador(data);
     setShowFormModal(false);
     fetchData();
  };

  const handleRegisterAcesso = (c: Colaborador, isInside: boolean) => {
     setSelectedColab(c);
     setShowRegistroModal(isInside ? 'SAIDA' : 'ENTRADA');
  };

  const getUltimoRegistro = (colabId: string) => {
     // Get the most recent open record
     return registros.find(r => r.colaborador_id === colabId && r.status === 'DENTRO');
  };

  const parseTime = (timeStr?: string | null) => {
     if (!timeStr) return null;
     const [h, m] = timeStr.split(':');
     const d = new Date();
     d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
     return d;
  };

  // Funcao para formatar diff
  const formatDiff = (dateStr: string) => {
      const ms = currentTime.getTime() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
  };

  const handleExportCSV = () => {
      const rows = registros.map(r => ({
          'Data/Entrada': r.hora_entrada ? new Date(r.hora_entrada).toLocaleString('pt-BR') : '',
          'Saída': r.hora_saida ? new Date(r.hora_saida).toLocaleString('pt-BR') : '',
          'Nome': r.colaborador?.nome || '',
          'Cargo': r.colaborador?.cargo || '',
          'Status': r.status,
          'Perminencia(m)': r.permanencia_min || '',
          'Porteiro': r.porteiro_nome || '',
          'Anotações': r.observacoes || ''
      }));

      const headers = Object.keys(rows[0] || {}).join(',');
      const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historico_colaboradores_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                <Users size={24} />
              </span>
              Colaboradores
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
              Gestão de prestadores fixos e manutenção
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors uppercase">
              Atualizar
            </button>
            {isAdmin && (
              <button onClick={handleCreateNew} className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                <UserPlus size={18} /> Novo Colaborador
              </button>
            )}
          </div>
        </div>

        {/* Panel Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
           <div 
             onClick={() => setStatusFilter(statusFilter === 'ALL' ? 'ALL' : 'ALL')}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'ALL' ? 'bg-slate-900 border-slate-900 text-white scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'ALL' ? 'text-slate-400' : 'text-slate-400'}`}>Total Ativos</p>
             <p className={`text-2xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loading ? '-' : totalAtivos}</p>
           </div>
           
           <div 
             onClick={() => setStatusFilter(statusFilter === 'DENTRO' ? 'ALL' : 'DENTRO')}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'DENTRO' ? 'bg-emerald-500 border-emerald-500 scale-[1.02]' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 hover:border-emerald-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'DENTRO' ? 'text-emerald-100' : 'text-emerald-600'}`}>Dentro Agora</p>
             <p className={`text-2xl font-black ${statusFilter === 'DENTRO' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>{loading ? '-' : dentroAgoraCount}</p>
           </div>
           
           <div 
             onClick={() => setStatusFilter(statusFilter === 'ATRASOS' ? 'ALL' : 'ATRASOS')}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'ATRASOS' ? 'bg-amber-500 border-amber-500 scale-[1.02]' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 hover:border-amber-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'ATRASOS' ? 'text-amber-100' : 'text-amber-600'}`}>Atrasados Hoje</p>
             <p className={`text-2xl font-black ${statusFilter === 'ATRASOS' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>{loading ? '-' : atrasosIds.size}</p>
           </div>
           
           <div 
             onClick={() => setStatusFilter(statusFilter === 'FALTAS' ? 'ALL' : 'FALTAS')}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'FALTAS' ? 'bg-red-500 border-red-500 scale-[1.02]' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 hover:border-red-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'FALTAS' ? 'text-red-100' : 'text-red-600'}`}>Faltas Hoje</p>
             <p className={`text-2xl font-black ${statusFilter === 'FALTAS' ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>{loading ? '-' : faltasIds.size}</p>
           </div>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl self-stretch md:self-auto overflow-x-auto">
            <button onClick={() => setActiveTab('ativos')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'ativos' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 scale-95'}`}>
              Lista Geral
            </button>
            <button onClick={() => setActiveTab('pendencias')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'pendencias' ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 scale-95'}`}>
              ⚠️ Pendências
            </button>
            <button onClick={() => setActiveTab('historico')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'historico' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm scale-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 scale-95'}`}>
              <Clock size={14} className="inline mr-1" /> Histórico
            </button>
          </div>
          
          {activeTab === 'ativos' && (
            <div className="relative w-full md:w-72 mt-2 md:mt-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Busca por nome, cargo ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold"
              />
            </div>
          )}
        </div>

        {/* Main List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
           {activeTab === 'ativos' && (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[200px]">Colaborador</th>
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Atuação</th>
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Horário Previsto</th>
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status / Tempo</th>
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ação Portaria</th>
                     {isAdmin && <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right w-20">Admin</th>}
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-bold uppercase text-xs animate-pulse">Carregando dados...</td></tr>}
                   {!loading && getDisplayList().length === 0 && (
                     <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase text-xs">Nenhum colaborador encontrado.</td></tr>
                   )}
                   {getDisplayList().map(colab => {
                       const isInside = dentroAgoraIds.has(colab.id);
                       const regOpen = isInside ? getUltimoRegistro(colab.id) : null;
                       
                       return (
                       <tr key={colab.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                         <td className="p-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black uppercase border border-slate-200 dark:border-slate-700">
                               {colab.nome.charAt(0)}
                             </div>
                             <div>
                               <p className="font-black text-sm text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{colab.nome}</p>
                               {colab.status === 'SUSPENSO' && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">Bloqueado</span>}
                             </div>
                           </div>
                         </td>
                         <td className="p-4">
                           <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5"><Briefcase size={12} className="text-blue-500" /> {colab.cargo.replace('_', ' ')}</p>
                           <p className="text-[10px] text-slate-500 uppercase mt-0.5 max-w-[150px] truncate">{colab.empresa || 'Contratação Direta'}</p>
                         </td>
                         <td className="p-4 text-center">
                           <div className="inline-block px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap">
                             {colab.horarios_customizados && Object.keys(colab.horarios_customizados).length > 0 
                               ? 'ESCALA DINÂMICA' 
                               : '--:--'}
                           </div>
                           <p className="text-[9px] text-slate-400 font-bold tracking-widest mt-1 uppercase">
                              {colab.dias_semana ? colab.dias_semana.substring(0, 15) + (colab.dias_semana.length > 15 ? '...' : '') : 'SEM DIAS FIXOS'}
                           </p>
                         </td>
                         <td className="p-4 text-center align-middle">
                            {isInside && regOpen ? (
                               <div className="inline-flex flex-col items-center">
                                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-md text-[10px] font-black uppercase shadow-sm flex items-center gap-1.5">
                                    DENTRO
                                  </span>
                                  {regOpen.hora_entrada && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 mt-1 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded">
                                      <Clock size={10} /> {formatDiff(regOpen.hora_entrada)}
                                    </span>
                                  )}
                               </div>
                            ) : (
                               <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase shadow-sm">
                                  {colab.status === 'SUSPENSO' ? 'SEM ACESSO' : 'FORA'}
                               </span>
                            )}
                         </td>
                         <td className="p-4 text-right">
                           {colab.status === 'ATIVO' && (
                             <button
                               onClick={() => handleRegisterAcesso(colab, isInside)}
                               className={`px-4 py-2 rounded-xl text-xs font-black uppercase text-white shadow-lg transition-all flex items-center gap-2 ml-auto ${
                                 isInside ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                               }`}
                             >
                               {isInside ? <LogOut size={14} /> : <LogIn size={14} />}
                               {isInside ? 'Saída' : 'Entrada'}
                             </button>
                           )}
                           {colab.status === 'SUSPENSO' && (
                             <button disabled className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-500 rounded-xl text-xs font-black uppercase cursor-not-allowed ml-auto flex items-center gap-1">
                               <AlertTriangle size={14} /> Bloqueado
                             </button>
                           )}
                         </td>
                         {isAdmin && (
                           <td className="p-4 text-right">
                             <button onClick={() => handleEdit(colab)} className="text-blue-500 hover:text-blue-600 font-bold text-xs uppercase underline">Editar</button>
                           </td>
                         )}
                       </tr>
                     )})}
                 </tbody>
               </table>
             </div>
           )}

           {activeTab === 'pendencias' && (
             <div className="p-8 text-center bg-red-50/50 dark:bg-red-900/5">
                <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
                <h3 className="font-black text-red-600 dark:text-red-400 uppercase text-lg">Sem Pendências Alarmantes</h3>
                <p className="text-slate-500 text-sm mt-1">O sistema está monitorando os horários automaticamente.</p>
             </div>
           )}

           {activeTab === 'historico' && (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaborador / Cargo</th>
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrada/Saída (Registro)</th>
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Perm.</th>
                     <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Porteiro</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {registros.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold text-xs">Nenhum registro ainda.</td></tr>}
                   {registros.map(reg => (
                     <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                           <p className="font-bold text-sm text-slate-900 dark:text-white uppercase truncate max-w-[200px]">{reg.colaborador?.nome}</p>
                           <p className="text-[10px] font-bold text-slate-500 uppercase">{reg.colaborador?.cargo?.replace('_', ' ')}</p>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1"><LogIn size={12} className="text-emerald-500" /> {reg.hora_entrada ? new Date(reg.hora_entrada).toLocaleString('pt-BR') : '-'}</span>
                              <span className="flex items-center gap-1"><LogOut size={12} className="text-red-500" /> {reg.hora_saida ? new Date(reg.hora_saida).toLocaleString('pt-BR') : '-'}</span>
                           </div>
                        </td>
                        <td className="p-4 text-center">
                           {reg.permanencia_min !== null ? (
                              <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-[10px] px-2 py-1 rounded uppercase">
                                 {Math.floor(reg.permanencia_min / 60)}h {reg.permanencia_min % 60}m
                              </span>
                           ) : (
                              <span className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 font-black text-[10px] px-2 py-1 rounded uppercase">DENTRO</span>
                           )}
                        </td>
                        <td className="p-4 text-xs font-bold uppercase text-slate-500">{reg.porteiro_nome || 'N/A'}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>

      </div>

      {/* Modals */}
      {showFormModal && (
         <ColaboradorForm
           initialData={selectedColab || undefined}
           onSave={saveColab}
           onClose={() => setShowFormModal(false)}
         />
      )}

      {showRegistroModal && selectedColab && (
         <RegistroColaboradorModal
           colaborador={selectedColab}
           ultimoRegistro={selectedColab ? getUltimoRegistro(selectedColab.id) : null}
           acao={showRegistroModal}
           onClose={() => setShowRegistroModal(null)}
           onSuccess={() => {
              setShowRegistroModal(null);
              fetchData();
           }}
         />
      )}

    </DashboardLayout>
  );
}
