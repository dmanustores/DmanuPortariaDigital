'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  Plus, 
  Search,
  Calendar,
  Clock,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  History as HistoryLog,
  LogIn,
  LogOut,
  Box,
  Trash2,
  Archive,
  Edit3,
  UserCheck,
  RotateCcw,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { lookupUnitId, formatPhone, formatPlate } from '@/lib/utils';

interface Resident {
  id: string;
  nome: string;
  bloco?: string;
  apto?: string;
  celular?: string;
  tipo?: string;
}

interface Move {
  id: string;
  unidadeDesc: string;
  responsavelNome: string;
  responsavelTelefone?: string;
  dataMovimentacao: string;
  horaInicio: string;
  horaFim: string;
  observacoes?: string;
  elevadorServico: boolean;
  veiculoPlaca?: string;
  veiculoModelo?: string;
  status: string;
  tipo: string;
  prioridade: string;
  created_at: string;
}

const tipos = [
  { value: 'ENTRADA', label: 'Entrada', icon: LogIn },
  { value: 'SAIDA', label: 'Saída', icon: LogOut },
  { value: 'TRANSPORTE', label: 'Transporte', icon: Box },
];

const prioridades = [
  { value: 'Normal', label: 'Normal', color: 'amber' },
  { value: 'Emergência', label: 'Emergência', color: 'red' },
];

export default function MudancasPage() {
  const [moves, setMoves] = useState<Move[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [unitsConfig, setUnitsConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [concludeObservation, setConcludeObservation] = useState('');
  const [moveToConclude, setMoveToConclude] = useState<Move | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenObservation, setReopenObservation] = useState('');
  const [moveToReopen, setMoveToReopen] = useState<Move | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveObservation, setArchiveObservation] = useState('');
  const [moveToArchive, setMoveToArchive] = useState<Move | null>(null);
  const [selectedMove, setSelectedMove] = useState<Move | null>(null);
  const [search, setSearch] = useState('');
  const [currentOperator, setCurrentOperator] = useState<{ nome: string; role: string } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    type: 'danger' | 'info' | 'success';
    confirmText?: string;
  }>({ isOpen: false, title: '', description: '', onConfirm: () => {}, type: 'info' });

  const openConfirm = (title: string, description: string, onConfirm: () => void, type: 'danger' | 'info' | 'success' = 'info', confirmText?: string) => {
    setConfirmModal({ isOpen: true, title, description, onConfirm, type, confirmText });
  };
  
  useEffect(() => {
    const fetchOperator = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('operators')
          .select('nome, role')
          .eq('id', session.user.id)
          .single();
        if (profile) setCurrentOperator(profile);
      }
    };
    fetchOperator();
  }, []);

  const [activeTab, setActiveTab] = useState<'ATIVAS' | 'HISTORICO'>('ATIVAS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AGENDADA' | 'EM_ANDAMENTO' | 'URGENTES'>('ALL');

  const [blocoSearch, setBlocoSearch] = useState('');
  const [apartamentoSearch, setApartamentoSearch] = useState('');
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<Resident | null>(null);
  const unidadeRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    unidadeDesc: '',
    responsavelNome: '',
    responsavelTelefone: '',
    dataMovimentacao: '',
    horaInicio: '',
    horaFim: '',
    observacoes: '',
    elevadorServico: false,
    veiculoPlaca: '',
    veiculoModelo: '',
    tipo: 'ENTRADA',
    prioridade: 'Normal'
  });

  useEffect(() => {
    fetchMoves();
    fetchResidents();
    fetchUnitsConfig();

    const handleClickOutside = (event: MouseEvent) => {
      if (unidadeRef.current && !unidadeRef.current.contains(event.target as Node)) {
        setShowUnidadeDropdown(false);
      }
    };
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowDetailsModal(false);
        setShowConcludeModal(false);
        setShowReopenModal(false);
        setShowArchiveModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('residents')
      .select('id, nome, bloco, apto, celular, tipo')
      .order('nome');
    if (data) setResidents(data);
  };

  const fetchUnitsConfig = async () => {
    const { data } = await supabase.from('units').select('bloco, numero, tem_elevador');
    if (data) setUnitsConfig(data);
  };

  const fetchMoves = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('moves')
      .select('*')
      .order('dataMovimentacao', { ascending: true });
    
    if (data) setMoves(data);
    setLoading(false);
  };

  const handleDeleteMove = async (id: string) => {
    if (!id || currentOperator?.role !== 'Owner') return;
    openConfirm(
      'Excluir Mudança',
      '⚠️ ATENÇÃO: Deseja realmente excluir este registro de mudança? Esta ação é irreversível!',
      async () => {
        try {
          await supabase.from('moves').delete().eq('id', id);
          fetchMoves();
        } catch (err) {
          console.error(err);
        }
      },
      'danger',
      'Excluir Registro'
    );
  };

  const handleSubmit = async () => {
    try {
      const unitId = await lookupUnitId(supabase, formData.unidadeDesc);
      
      const cleanBloco = blocoSearch.trim().replace(/^0+/, '');
      const cleanApto = apartamentoSearch.trim();
      const unitConf = unitsConfig.find(u => String(u.bloco).replace(/^0+/, '') === cleanBloco && String(u.numero) === cleanApto);
      const isElevatorApplicable = unitConf ? unitConf.tem_elevador !== false : true;

      const roleTag = currentOperator ? ` (${currentOperator.nome})` : '';
      const creationLog = `[CRIACAO]${roleTag}: Registro criado`;
      const finalObs = formData.observacoes ? `${formData.observacoes}\n${creationLog}` : creationLog;

      await supabase.from('moves').insert({
        unidadeId: unitId,
        unidadeDesc: formData.unidadeDesc,
        responsavelNome: formData.responsavelNome,
        responsavelTelefone: formData.responsavelTelefone || null,
        dataMovimentacao: formData.dataMovimentacao,
        horaInicio: formData.horaInicio,
        horaFim: formData.horaFim,
        observacoes: finalObs,
        elevadorServico: isElevatorApplicable ? formData.elevadorServico : false,
        veiculoPlaca: formData.veiculoPlaca || null,
        veiculoModelo: formData.veiculoModelo || null,
        tipo: formData.tipo,
        prioridade: formData.prioridade,
        status: 'AGENDADA'
      });
      
      setShowModal(false);
      setFormData({
        unidadeDesc: '',
        responsavelNome: '',
        responsavelTelefone: '',
        dataMovimentacao: '',
        horaInicio: '',
        horaFim: '',
        observacoes: '',
        elevadorServico: false,
        veiculoPlaca: '',
        veiculoModelo: '',
        tipo: 'ENTRADA',
        prioridade: 'Normal'
      });
      setBlocoSearch('');
      setApartamentoSearch('');
      setSelectedUnidade(null);
      fetchMoves();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const move = moves.find(m => m.id === id);
    if (!move) return;

    let finalObs = move.observacoes || '';
    if (newStatus === 'EM_ANDAMENTO') {
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const roleTag = currentOperator ? ` (${currentOperator.nome} às ${now})` : ` (SISTEMA às ${now})`;
      const startLog = `[INICIO]${roleTag}: Iniciado`;
      finalObs = finalObs ? `${finalObs}\n${startLog}` : startLog;
    }

    try {
      await supabase.from('moves').update({ 
        status: newStatus,
        observacoes: finalObs 
      }).eq('id', id);
    } catch (err) { console.error(err); }
    fetchMoves();
  };

  const handleConfirmConclude = async () => {
    if (!moveToConclude) return;
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const roleTag = currentOperator ? ` (${currentOperator.nome} às ${now})` : ` (SISTEMA às ${now})`;
    const currentObs = moveToConclude.observacoes || '';
    const note = concludeObservation.trim() || 'Concluída pela portaria.';
    const finalObs = currentObs ? `${currentObs}\n[FECHAMENTO]${roleTag}: ${note}` : `[FECHAMENTO]${roleTag}: ${note}`;
    try {
      await supabase.from('moves').update({ status: 'CONCLUIDA', observacoes: finalObs }).eq('id', moveToConclude.id);
    } catch (err) { console.error(err); }
    setShowConcludeModal(false);
    setMoveToConclude(null);
    setConcludeObservation('');
    fetchMoves();
  };

  const handleConfirmReopen = async () => {
    if (!moveToReopen) return;
    const note = reopenObservation.trim() || 'Mudança reaberta pela portaria.';
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const roleTag = currentOperator ? ` (${currentOperator.nome} às ${now})` : ` (SISTEMA às ${now})`;
    const currentObs = moveToReopen.observacoes || '';
    const finalObs = currentObs ? `${currentObs}\n[REABERTURA]${roleTag}: ${note}` : `[REABERTURA]${roleTag}: ${note}`;
    try {
      await supabase.from('moves').update({ status: 'AGENDADA', observacoes: finalObs }).eq('id', moveToReopen.id);
    } catch (err) { console.error(err); }
    setShowReopenModal(false);
    setMoveToReopen(null);
    setReopenObservation('');
    fetchMoves();
  };

  const handleConfirmArchive = async () => {
    if (!moveToArchive) return;
    const note = archiveObservation.trim() || 'Arquivado administrativamente.';
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const roleTag = currentOperator ? ` (${currentOperator.nome} às ${now})` : ` (SISTEMA às ${now})`;
    const currentObs = moveToArchive.observacoes || '';
    const finalObs = currentObs ? `${currentObs}\n[ARQUIVAMENTO]${roleTag}: ${note}` : `[ARQUIVAMENTO]${roleTag}: ${note}`;
    try {
      await supabase.from('moves').update({ status: 'ARQUIVADA', observacoes: finalObs }).eq('id', moveToArchive.id);
    } catch (err) { console.error(err); }
    setShowArchiveModal(false);
    setMoveToArchive(null);
    setArchiveObservation('');
    fetchMoves();
  };

  const unidadesDisponiveis = residents.filter(r => r.bloco && r.apto);
  const filteredUnidades = unidadesDisponiveis.filter(r => {
    const blocoStr = String(r.bloco).trim().padStart(2, '0');
    const numeroStr = String(r.apto).trim();
    const searchBloco = blocoSearch.trim().padStart(2, '0');
    const searchApartamento = apartamentoSearch.trim();

    if (!searchBloco && !searchApartamento) return true;
    if (searchBloco && !searchApartamento) return blocoStr.includes(searchBloco);
    if (searchApartamento && !searchBloco) return numeroStr.includes(searchApartamento);
    if (searchBloco && searchApartamento) return blocoStr.includes(searchBloco) && numeroStr.includes(searchApartamento);
    return false;
  }).slice(0, 15);

  const handleSelectUnidade = (resident: Resident) => {
    setSelectedUnidade(resident);
    const unidadeDesc = `Bloco ${resident.bloco}, Apt ${resident.apto}`;
    setBlocoSearch(resident.bloco || '');
    setApartamentoSearch(resident.apto || '');
    setFormData({
      ...formData,
      unidadeDesc,
      responsavelNome: resident.nome,
      responsavelTelefone: resident.celular || formData.responsavelTelefone
    });
    setShowUnidadeDropdown(false);
  };

  const getTipoIcon = (tipo: string) => {
    const t = tipos.find(x => x.value === tipo);
    return t ? t.icon : Truck;
  };

  const totalAtivas = moves.filter(m => m.status !== 'CONCLUIDA' && m.status !== 'ARQUIVADA').length;
  const agendadasCount = moves.filter(m => m.status === 'AGENDADA').length;
  const andamentoCount = moves.filter(m => m.status === 'EM_ANDAMENTO').length;
  const urgentesCount = moves.filter(m => m.prioridade === 'Emergência' && m.status !== 'CONCLUIDA' && m.status !== 'ARQUIVADA').length;

  const filtered = moves.filter(m => {
    const matchSearch = !search || 
      m.unidadeDesc.toLowerCase().includes(search.toLowerCase()) ||
      m.responsavelNome.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'ATIVAS') {
      const matchAtiva = m.status !== 'CONCLUIDA' && m.status !== 'ARQUIVADA';
      const matchStatus = statusFilter === 'ALL' ? matchAtiva : m.status === statusFilter;
      const matchUrgent = statusFilter === 'URGENTES' ? (m.prioridade === 'Emergência' && matchAtiva) : true;
      return matchSearch && matchStatus && matchUrgent;
    }
    
    // HISTORICO
    const isInHistory = activeTab === 'HISTORICO' && (m.status === 'CONCLUIDA' || m.status === 'ARQUIVADA');
    return matchSearch && isInHistory;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-purple-500 rounded-xl text-white shadow-lg shadow-purple-500/20">
                <Truck size={24} />
              </span>
              Mudanças
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
              Controle Operacional de Mudanças e Içamentos
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchMoves} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors uppercase">
              Atualizar
            </button>
            <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setShowModal(true)} 
               className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all uppercase text-sm"
            >
               <Plus size={18} /> Nova Mudança
            </motion.button>
          </div>
        </div>

        {/* Panel Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* Total Ativas */}
           <div 
             onClick={() => { setActiveTab('ATIVAS'); setStatusFilter('ALL'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'ALL' && activeTab === 'ATIVAS' ? 'bg-slate-900 border-slate-900 text-white scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'ALL' && activeTab === 'ATIVAS' ? 'text-slate-400' : 'text-slate-400'}`}>Total Ativas</p>
             <p className={`text-2xl font-black ${statusFilter === 'ALL' && activeTab === 'ATIVAS' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loading ? '-' : totalAtivas}</p>
           </div>
           
           {/* Agendadas */}
           <div 
             onClick={() => { setActiveTab('ATIVAS'); setStatusFilter(statusFilter === 'AGENDADA' ? 'ALL' : 'AGENDADA'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'AGENDADA' && activeTab === 'ATIVAS' ? 'bg-amber-500 border-amber-500 scale-[1.02]' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 hover:border-amber-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'AGENDADA' && activeTab === 'ATIVAS'? 'text-amber-100' : 'text-amber-600'}`}>Agendadas / Abertas</p>
             <p className={`text-2xl font-black ${statusFilter === 'AGENDADA' && activeTab === 'ATIVAS'? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>{loading ? '-' : agendadasCount}</p>
           </div>
           
           {/* Em Andamento */}
           <div 
             onClick={() => { setActiveTab('ATIVAS'); setStatusFilter(statusFilter === 'EM_ANDAMENTO' ? 'ALL' : 'EM_ANDAMENTO'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'EM_ANDAMENTO' && activeTab === 'ATIVAS' ? 'bg-blue-500 border-blue-500 scale-[1.02]' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 hover:border-blue-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'EM_ANDAMENTO' && activeTab === 'ATIVAS'? 'text-blue-100' : 'text-blue-600'}`}>Em Andamento</p>
             <p className={`text-2xl font-black ${statusFilter === 'EM_ANDAMENTO' && activeTab === 'ATIVAS'? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{loading ? '-' : andamentoCount}</p>
           </div>

           {/* Urgentes */}
           <div 
             onClick={() => { setActiveTab('ATIVAS'); setStatusFilter(statusFilter === 'URGENTES' ? 'ALL' : 'URGENTES'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'URGENTES' && activeTab === 'ATIVAS' ? 'bg-red-500 border-red-500 scale-[1.02]' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 hover:border-red-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'URGENTES' && activeTab === 'ATIVAS'? 'text-red-100' : 'text-red-600'}`}>Urgências</p>
             <p className={`text-2xl font-black ${statusFilter === 'URGENTES' && activeTab === 'ATIVAS'? 'text-white' : 'text-red-600 dark:text-red-400'}`}>{loading ? '-' : urgentesCount}</p>
           </div>
        </div>

        {/* Tab & Search Control Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full md:w-auto">
              <button 
                onClick={() => { setActiveTab('ATIVAS'); setStatusFilter('ALL'); }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'ATIVAS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Lista Ativa
              </button>
              <button 
                onClick={() => { setActiveTab('HISTORICO'); setStatusFilter('ALL'); }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'HISTORICO' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <HistoryLog size={14} /> Histórico
              </button>
           </div>

           <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                 type="text"
                 placeholder="Buscar morador ou unidade..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20"
              />
           </div>
        </div>

        {/* Content Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
           {loading ? (
             <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando...</div>
           ) : filtered.length === 0 ? (
             <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">Nenhuma mudança encontrada</div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Morador / Unidade</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Veículo / Tipo</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data / Horário</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status / Prioridade</th>
                         {activeTab !== 'HISTORICO' ? (
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ação Portaria</th>
                         ) : (
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Responsável</th>
                         )}
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">ADMIN</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filtered.map(move => {
                         const IconComp = getTipoIcon(move.tipo);
                         return (
                            <tr key={move.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                               {/* COL 1: MORADOR / UNIDADE */}
                               <td className="p-4">
                                  <div className="flex gap-3 items-center">
                                     <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/30">
                                       <Home size={18} />
                                     </div>
                                     <div className="flex flex-col gap-1">
                                        <span className="inline-block px-2 py-0.5 max-w-fit bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                                          {move.unidadeDesc || 'Desconhecida'}
                                        </span>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight block uppercase tracking-tight">{move.responsavelNome}</p>
                                     </div>
                                  </div>
                               </td>

                               {/* COL 2: VEÍCULO / TIPO */}
                               <td className="p-4">
                                  <div className="flex gap-3 items-center">
                                     <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/30">
                                       <IconComp size={18} />
                                     </div>
                                     <div className="flex flex-col gap-1">
                                        {move.veiculoPlaca ? (
                                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{move.veiculoPlaca}</span>
                                        ) : (
                                          <span className="text-[10px] italic text-slate-400">Sem veículo</span>
                                        )}
                                        <span className="inline-block px-2 py-0.5 max-w-fit bg-purple-50 dark:bg-purple-900/20 rounded-md text-[10px] font-black text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30 whitespace-nowrap uppercase tracking-wider">
                                          {move.tipo}
                                        </span>
                                        {move.observacoes && (
                                          <p className="text-[10px] text-slate-400 line-clamp-1 max-w-[180px] font-bold uppercase mt-0.5">{move.observacoes}</p>
                                        )}
                                     </div>
                                  </div>
                               </td>

                               <td className="p-4">
                                  <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-500">
                                     <span className="flex items-center gap-1.5"><Calendar size={12} className="text-blue-500" /> <span className="uppercase tracking-widest">{new Date(move.dataMovimentacao).toLocaleDateString('pt-BR')}</span></span>
                                     <span className="flex items-center gap-1.5"><Clock size={12} className="text-amber-500" /> {move.horaInicio?.replace(":00", "")}–{move.horaFim?.replace(":00", "")} {move.elevadorServico && <span className="bg-amber-100 text-amber-700 px-1 font-black rounded ml-1">ELEVADOR</span>}</span>
                                  </div>
                               </td>
                               <td className="p-4">
                                  <div className="flex flex-col gap-2 items-start">
                                     <div className="flex gap-2">
                                       <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                                         move.status === 'AGENDADA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200' :
                                         move.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200' :
                                         move.status === 'CONCLUIDA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' : move.status === 'CANCELADA' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200' :
                                         'bg-slate-100 text-slate-500 border-slate-200'
                                       }`}>
                                         {move.status === 'AGENDADA' ? 'AGENDADA' : move.status === 'EM_ANDAMENTO' ? 'EM ANDAMENTO' : move.status}
                                       </span>
                                       <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400`}>
                                         {move.tipo}
                                       </span>
                                     </div>
                                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                         move.prioridade === 'Emergência' ? 'bg-red-50 text-red-600 border border-red-100' :
                                         'bg-slate-50 text-slate-600 border border-slate-100'
                                     }`}>
                                       {move.prioridade}
                                     </span>
                                  </div>
                               </td>
                               {activeTab !== 'HISTORICO' ? (
                                  <td className="p-4 text-center">
                                     <div className="flex justify-center gap-2">
                                        {move.status === 'AGENDADA' && (
                                           <button 
                                             onClick={() => handleStatusChange(move.id, 'EM_ANDAMENTO')}
                                             className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl text-[10px] font-black border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all uppercase flex items-center gap-2 shadow-sm"
                                           >
                                             <LogIn size={14} /> Iniciar
                                           </button>
                                        )}
                                        {move.status === 'EM_ANDAMENTO' && (
                                           <button 
                                             onClick={() => {
                                               setMoveToConclude(move);
                                               setConcludeObservation('');
                                               setShowConcludeModal(true);
                                             }}
                                             className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all uppercase flex items-center gap-2 shadow-sm"
                                           >
                                             <CheckCircle2 size={14} /> Concluir
                                           </button>
                                        )}
                                     </div>
                                  </td>
                               ) : (
                                <td className="p-4">
                                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold">
                                          S
                                        </div>
                                        Operador
                                     </div>
                                  </td>
                               )}
                               <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                      {/* 1) LUPA (Sempre Primeiro) */}
                                      <button 
                                         onClick={() => { setSelectedMove(move); setShowDetailsModal(true); }}
                                         className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                         title="Ver Detalhes"
                                      >
                                         <Search size={16} />
                                      </button>

                                      {/* 2) ARQUIVAR / REABRIR */}
                                      {activeTab === 'HISTORICO' ? (
                                        <button 
                                          onClick={() => { setMoveToReopen(move); setReopenObservation(''); setShowReopenModal(true); }}
                                          className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                          title="Reabrir Mudança"
                                        >
                                          <RotateCcw size={16} />
                                        </button>
                                      ) : (
                                        <button 
                                           onClick={() => {
                                             setMoveToArchive(move);
                                             setArchiveObservation('');
                                             setShowArchiveModal(true);
                                           }}
                                           className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                           title="Arquivar Mudança"
                                         >
                                           <Archive size={16} />
                                         </button>
                                      )}

                                      {/* 3) EXCLUIR (Owner Apenas, Último) */}
                                      {currentOperator?.role === 'Owner' && (
                                        <button 
                                          onClick={() => handleDeleteMove(move.id)}
                                          className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                          title="Excluir Registro (Owner)"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                  </div>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
           )}
        </div>
      </div>

      {/* FORM MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                       <Truck size={18} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Nova Mudança</h3>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <X size={20} className="text-slate-400" />
                 </button>
              </div>

              <div className="p-6 space-y-5">
                
                {/* TIPOS AND PRIORIDADES */}
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Natureza da Mudança</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tipos.map(tipo => (
                      <button
                        key={tipo.value}
                        onClick={() => setFormData({...formData, tipo: tipo.value})}
                        className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          formData.tipo === tipo.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-500'
                        }`}
                      >
                        <tipo.icon size={18} />
                        <span className="text-[10px] font-black uppercase">{tipo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Classificação</label>
                  <div className="flex gap-2">
                    {prioridades.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setFormData({...formData, prioridade: p.value})}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-all flex justify-center items-center gap-2 ${
                          formData.prioridade === p.value
                            ? p.value === 'Emergência' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          p.value === 'Emergência' ? 'text-red-600' :
                          p.value === 'Normal' ? 'text-amber-600' :
                          'text-slate-400'
                        }`}>
                          {p.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div ref={unidadeRef} className="relative z-20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Bloco *</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={blocoSearch}
                        onChange={(e) => {
                          setBlocoSearch(e.target.value);
                          setShowUnidadeDropdown(true);
                          setFormData({...formData, unidadeDesc: `Bloco ${e.target.value}, Apt ${apartamentoSearch}`});
                        }}
                        onFocus={() => setShowUnidadeDropdown(true)}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800"
                        placeholder="Ex: 01"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Apto *</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={apartamentoSearch}
                        onChange={(e) => {
                          setApartamentoSearch(e.target.value);
                          setShowUnidadeDropdown(true);
                          setFormData({...formData, unidadeDesc: `Bloco ${blocoSearch}, Apt ${e.target.value}`});
                        }}
                        onFocus={() => setShowUnidadeDropdown(true)}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800"
                        placeholder="Ex: 101"
                      />
                    </div>
                  </div>

                  {showUnidadeDropdown && filteredUnidades.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-30">
                      <div className="p-2">
                        {filteredUnidades.map((resident) => (
                          <button
                            key={resident.id}
                            onClick={(e) => { e.preventDefault(); handleSelectUnidade(resident); }}
                            className="w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 rounded-lg transition-colors flex flex-col gap-1"
                          >
                            <p className="font-black text-xs text-slate-800 dark:text-slate-200">
                              Bloco {resident.bloco}, Apt {resident.apto}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">👤 {resident.nome}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {showUnidadeDropdown && (blocoSearch || apartamentoSearch) && filteredUnidades.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 text-center z-30">
                      <p className="text-xs font-black uppercase text-slate-600 mb-1">Nenhuma unidade encontrada</p>
                      <button
                        onClick={(e) => { e.preventDefault(); setShowUnidadeDropdown(false); }}
                        className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700"
                      >
                        Manter preenchimento manual
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Responsável / Empresa *</label>
                    <input 
                      type="text"
                      value={formData.responsavelNome}
                      onChange={(e) => setFormData({...formData, responsavelNome: e.target.value.toUpperCase()})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800"
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Telefone</label>
                    <input 
                      type="text"
                      value={formatPhone(formData.responsavelTelefone || '')}
                      onChange={(e) => setFormData({...formData, responsavelTelefone: formatPhone(e.target.value)})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Data *</label>
                    <input 
                      type="date"
                      value={formData.dataMovimentacao}
                      onChange={(e) => setFormData({...formData, dataMovimentacao: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Início *</label>
                    <input 
                      type="time"
                      value={formData.horaInicio}
                      onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Fim *</label>
                    <input 
                      type="time"
                      value={formData.horaFim}
                      onChange={(e) => setFormData({...formData, horaFim: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {(() => {
                  const cleanBloco = blocoSearch.trim().replace(/^0+/, '');
                  const cleanApto = apartamentoSearch.trim();
                  const unitConf = unitsConfig.find(u => String(u.bloco).replace(/^0+/, '') === cleanBloco && String(u.numero) === cleanApto);
                  const showElevator = unitConf ? unitConf.tem_elevador !== false : true;

                  if (!showElevator) return null;

                  return (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <input 
                        type="checkbox"
                        id="elevador"
                        checked={formData.elevadorServico}
                        onChange={(e) => setFormData({...formData, elevadorServico: e.target.checked})}
                        className="size-5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="elevador" className="text-xs font-black uppercase text-amber-700 dark:text-amber-500 cursor-pointer">Requer travamento de elevador de serviço</label>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Veículo Autorizado</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text"
                      value={formatPlate(formData.veiculoPlaca || '')}
                      onChange={(e) => setFormData({...formData, veiculoPlaca: formatPlate(e.target.value)})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-black tracking-widest bg-slate-50 dark:bg-slate-800"
                      placeholder="PLACA"
                    />
                    <input 
                      type="text"
                      value={formData.veiculoModelo}
                      onChange={(e) => setFormData({...formData, veiculoModelo: e.target.value.toUpperCase()})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-slate-50 dark:bg-slate-800 uppercase"
                      placeholder="Ex: FHR / BRANCO"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Anotações / Descrição</label>
                  <textarea 
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl h-20 resize-none bg-slate-50 dark:bg-slate-800 font-medium text-sm"
                    placeholder="Normas, itens especiais, ou exigências..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row gap-3 bg-slate-50 dark:bg-slate-900 rounded-b-3xl">
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-6 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-bold text-xs uppercase transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.unidadeDesc || !formData.responsavelNome || !formData.dataMovimentacao}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETALHES EXTREME */}
      <AnimatePresence>
        {showDetailsModal && selectedMove && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                <div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                     <HistoryLog size={20} className="text-blue-500" />
                     Detalhes da Movimentação — Mudanças
                   </h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedMove.unidadeDesc}</span>
                      <span className="size-1 rounded-full bg-slate-400" />
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{selectedMove.status}</span>
                   </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Timeline Info Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                {(() => {
                  const rawObs = selectedMove.observacoes || '';
                  const baseObs = rawObs.split(/\n?\[(CRIACAO|INICIO|REABERTURA|FECHAMENTO|ARQUIVAMENTO)\]/)[0].trim();
                  
                  const occurrences: { type: string, author?: string, note: string }[] = [];
                  const eventRegex = /\[(CRIACAO|INICIO|REABERTURA|FECHAMENTO|ARQUIVAMENTO)\](?:\s*\((.*?)\))?:\s*([\s\S]*?)(?=\n\[|$)/g;
                  let match;
                  while ((match = eventRegex.exec(rawObs)) !== null) {
                    occurrences.push({ 
                      type: match[1], 
                      author: match[2],
                      note: match[3].trim() 
                    });
                  }

                  const creationEntry = occurrences.find(o => o.type === 'CRIACAO');
                  const initiationEntry = occurrences.find(o => o.type === 'INICIO');
                  const historyOccurrences = occurrences.filter(o => o.type !== 'CRIACAO' && o.type !== 'INICIO');

                  return (
                    <div className="space-y-4 relative">
                      <div className="absolute top-4 bottom-4 left-[20px] w-[0px] border-l-2 border-dashed border-slate-200 dark:border-slate-700/50"></div>

                      {/* Agendamento */}
                       <div className="relative flex items-start gap-4">
                        <div className="p-2 rounded-full ring-4 ring-white dark:ring-slate-900 relative z-10 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                            <Calendar size={16} />
                        </div>
                        <div className={`flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-all`}>
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">1) AGENDAMENTO</span>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                    {creationEntry?.author || 'SISTEMA'}
                                  </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                <Clock size={10} /> {new Date(selectedMove.created_at).toLocaleDateString('pt-BR')} · {new Date(selectedMove.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold">{selectedMove.responsavelNome} {selectedMove.responsavelTelefone ? `- ${selectedMove.responsavelTelefone}` : ''}</p>
                        </div>
                      </div>

                      {/* Dados */}
                      <div className="relative flex items-start gap-4">
                        <div className="p-2 rounded-full ring-4 ring-white dark:ring-slate-900 relative z-10 bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                            <Truck size={16} />
                        </div>
                        <div className={`flex-1 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 shadow-sm transition-all`}>
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">2) DADOS DA MUDANÇA</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm font-semibold mt-3">
                              <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Data Prevista</span>
                                {new Date(selectedMove.dataMovimentacao).toLocaleDateString('pt-BR')}
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Horário</span>
                                {selectedMove.horaInicio} às {selectedMove.horaFim}
                              </div>
                              <div className="col-span-2">
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Natureza</span>
                                {selectedMove.tipo} - Elevador: {selectedMove.elevadorServico ? 'Sim' : 'Não'}
                              </div>
                              {(selectedMove.veiculoPlaca || selectedMove.veiculoModelo) && (
                                <div className="col-span-2">
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Veículo Associado</span>
                                  {selectedMove.veiculoPlaca} {selectedMove.veiculoModelo}
                                </div>
                              )}
                              {baseObs && (
                                <div className="col-span-2">
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Observações</span>
                                  <p className="text-xs text-slate-500 italic mt-1 whitespace-pre-wrap">{baseObs}</p>
                                </div>
                              )}
                            </div>
                        </div>
                      </div>

                      {/* Status Atual info (if EM_ANDAMENTO) */}
                      {selectedMove.status === 'EM_ANDAMENTO' && (
                        <div className="relative flex items-start gap-4">
                          <div className="p-2 rounded-full ring-4 ring-white dark:ring-slate-900 relative z-10 bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                              <Clock size={16} />
                          </div>
                          <div className={`flex-1 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 shadow-sm transition-all`}>
                              <div className="flex items-center justify-between gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Acompanhamento</span>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black uppercase tracking-wider text-slate-500 truncate max-w-[150px]" title={initiationEntry?.author}>
                                      {initiationEntry?.author || 'PORTARIA'}
                                    </span>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mr-2 bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400">EM ANDAMENTO</span>
                                Movimentação autorizada e em execução.
                              </p>
                          </div>
                        </div>
                      )}

                      {/* Log de Ocorrências (Reaberturas, Fechamentos e Arquivamentos) */}
                      {historyOccurrences.map((occ, idx) => {
                        const isClosure = occ.type === 'FECHAMENTO';
                        const isReopen = occ.type === 'REABERTURA';
                        const isArchive = occ.type === 'ARQUIVAMENTO';

                        return (
                          <div key={idx} className="relative flex items-start gap-4">
                            <div className="p-2 rounded-full ring-4 ring-white dark:ring-slate-900 relative z-10 bg-red-500 text-white shadow-lg shadow-red-500/20">
                              {isClosure ? <LogOut size={16} /> : 
                               isArchive ? <Archive size={16} /> :
                               <RotateCcw size={16} />}
                            </div>
                            <div className={`flex-1 p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 shadow-md transition-all`}>
                              <div className="flex items-center justify-between gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                    {isClosure ? '3) FECHAMENTO: CONCLUÍDA' : isArchive ? '3) FECHAMENTO: ARQUIVADA' : 'REABERTURA'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                    {occ.author || 'SISTEMA'}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${
                                  isClosure || isArchive ? 'text-red-600' :
                                  'text-blue-600'
                                }`}>
                                  {isClosure ? <AlertTriangle size={10} /> : 
                                   isArchive ? <Archive size={10} /> :
                                   <RotateCcw size={10} />} 
                                  {isClosure ? 'FECHAMENTO: CONCLUÍDA' : isArchive ? 'FECHAMENTO: ARQUIVADA' : 'REABERTURA REGISTRADA'}
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 font-semibold whitespace-pre-wrap">{occ.note}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Finalização status final (if ARQUIVADA or CONCLUIDA but redundant since occurrences show it? Let's keep it simple and just use occurrences for the notes) */}
                      {selectedMove.status === 'ARQUIVADA' && (
                         <div className="relative flex items-start gap-4">
                            <div className="p-2 rounded-full ring-4 ring-white dark:ring-slate-900 relative z-10 bg-red-500 text-white shadow-lg shadow-red-500/20">
                               <Archive size={16} />
                            </div>
                            <div className="flex-1 p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 shadow-md">
                                <div className="flex items-center justify-between gap-4 mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-red-900 dark:text-white">REGISTRO ARQUIVADO</span>
                                </div>
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                                  Esta movimentação foi arquivada administrativamente.
                                </p>
                            </div>
                         </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Botão de Fechar Unificado */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest transition-all focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 outline-none"
                >
                  Voltar
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* MODAL FECHAMENTO */}
      <AnimatePresence>
        {showConcludeModal && moveToConclude && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
            onClick={() => setShowConcludeModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                   <CheckCircle2 size={24} className="text-emerald-500" />
                   Concluir Mudança
                 </h3>
                 <button onClick={() => setShowConcludeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                 </button>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                 <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-md text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                      {moveToConclude.unidadeDesc}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {moveToConclude.responsavelNome}
                    </span>
                 </div>

                 <div>
                   <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Observações de Finalização (Opcional)</label>
                   <textarea 
                     value={concludeObservation}
                     onChange={(e) => setConcludeObservation(e.target.value)}
                     className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl h-28 resize-none bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20"
                     placeholder="Aconteceu alguma anormalidade? Ex: Morador quebrou a luminária do hall..."
                   />
                 </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
                 <button 
                   onClick={() => setShowConcludeModal(false)}
                   className="flex-1 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs uppercase transition-all"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleConfirmConclude}
                   className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all"
                 >
                   Finalizar Agora
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL REABERTURA */}
      <AnimatePresence>
        {showReopenModal && moveToReopen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
            onClick={() => setShowReopenModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <RotateCcw size={22} className="text-blue-500" />
                  Reabrir Mudança
                </h3>
                <button onClick={() => setShowReopenModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-md text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    {moveToReopen.unidadeDesc}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">{moveToReopen.responsavelNome}</span>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">⚠ Atenção</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mt-1">A reabertura ficará registrada na linha do tempo desta movimentação.</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Motivo da Reabertura (Opcional)</label>
                  <textarea
                    value={reopenObservation}
                    onChange={(e) => setReopenObservation(e.target.value)}
                    className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl h-24 resize-none bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: Morador solicitou nova data. Reagendado para 25/04..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
                <button onClick={() => setShowReopenModal(false)} className="flex-1 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs uppercase transition-all">
                  Cancelar
                </button>
                <button onClick={handleConfirmReopen} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-blue-500/30 transition-all">
                  Confirmar Reabertura
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ARQUIVAMENTO */}
      <AnimatePresence>
        {showArchiveModal && moveToArchive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
            onClick={() => setShowArchiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                  <Archive size={22} className="text-red-500" />
                  Arquivar Mudança
                </h3>
                <button onClick={() => setShowArchiveModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-md text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
                    {moveToArchive.unidadeDesc}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">{moveToArchive.responsavelNome}</span>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">⚠ Atenção</p>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium mt-1">O arquivamento encerrará o processo e ficará registrado no histórico.</p>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2">Motivo do Arquivamento (Opcional)</label>
                  <textarea
                    value={archiveObservation}
                    onChange={(e) => setArchiveObservation(e.target.value)}
                    className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-2xl h-24 resize-none bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-red-500/20"
                    placeholder="Ex: Mudança cancelada pelo morador. Agendamento duplicado..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
                <button onClick={() => setShowArchiveModal(false)} className="flex-1 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs uppercase transition-all">
                  Cancelar
                </button>
                <button onClick={handleConfirmArchive} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg shadow-red-500/30 transition-all">
                  Confirmar Arquivamento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ActionConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </DashboardLayout>
  );
}
