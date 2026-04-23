'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Search,
  Wrench,
  Shield,
  MessageSquare,
  Info,
  Clock,
  Calendar,
  X,
  Save,
  FileText,
  History as HistoryLog,
  LogIn,
  Trash2,
  Archive,
  Edit3,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  RotateCcw,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { lookupUnitId, getCurrentOperatorId } from '@/lib/utils';

interface Occurrence {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  unidade_id?: string;
  unidade_desc?: string;
  prioridade: string;
  status: string;
  operador_id?: string;
  operador_resolucao_id?: string;
  atendimento_obs?: string;
  atendido_em?: string;
  resolvida_em?: string;
  created_at: string;
  // Joined fields
  operador?: { nome: string; role: string };
  operador_resolucao?: { nome: string; role: string };
  resident?: { nome: string; bloco: string; apto: string };
}

interface Interaction {
  id: string;
  occurrence_id: string;
  operador_id: string;
  mensagem: string;
  tipo: string;
  created_at: string;
  operador?: { nome: string; role: string };
}

const tipos = [
  { value: 'MANUTENCAO', label: 'Manutenção', icon: Wrench },
  { value: 'SEGURANCA', label: 'Segurança', icon: Shield },
  { value: 'RECLAMACAO', label: 'Reclamação', icon: MessageSquare },
  { value: 'INFORMATIVO', label: 'Informativo', icon: Info },
  { value: 'PASSAGEM', label: 'Passagem Plantão', icon: Clock },
];

const prioridades = [
  { value: 'Baixa', label: 'Baixa', color: 'blue' },
  { value: 'Normal', label: 'Normal', color: 'amber' },
  { value: 'Urgente', label: 'Urgente', color: 'red' },
];

export default function OcorrenciasPage() {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAtenderModal, setShowAtenderModal] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [selectedOcc, setSelectedOcc] = useState<Occurrence | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [atenderObs, setAtenderObs] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ATIVAS' | 'HISTORICO'>('ATIVAS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Aberta' | 'Andamento' | 'URGENTES'>('ALL');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'MANUTENCAO',
    titulo: '',
    descricao: '',
    localTipo: 'UNIDADE',
    unidade_desc: '',
    areaComum: '',
    prioridade: 'Normal'
  });

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

  const fetchOccurrences = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('occurrences')
      .select('*, operador:operador_id(nome, role), operador_resolucao:operador_resolucao_id(nome, role)')
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (data) setOccurrences(data);
    setLoading(false);
  };

  const fetchInteractions = async (occId: string) => {
    const { data } = await supabase
      .from('occurrence_interactions')
      .select('*, operador:operador_id(nome, role)')
      .eq('occurrence_id', occId)
      .order('created_at', { ascending: true });
    
    if (data) setInteractions(data);
  };


  useEffect(() => {
    fetchOccurrences();
    getCurrentOperatorId(supabase).then(id => {
      setOperatorId(id);
      if (id) {
        supabase.from('operators').select('role').eq('id', id).single()
          .then(({ data }: { data: { role: string } | null }) => setUserRole(data?.role || null));
      }
    });

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowAtenderModal(false);
        setIsViewingDetails(false);
        setIsResolving(false);
        setIsArchiving(false);
        setIsReopening(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSubmit = async () => {
    try {
      const isCondo = formData.localTipo === 'CONDOMINIO';
      const finalDesc = isCondo 
         ? (formData.areaComum ? `Área Comum: ${formData.areaComum}` : 'Condomínio Geral') 
         : formData.unidade_desc;

      const unitId = !isCondo && formData.unidade_desc 
         ? await lookupUnitId(supabase, formData.unidade_desc) 
         : null;

      await supabase.from('occurrences').insert({
        tipo: formData.tipo,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        unidade_id: unitId,
        unidade_desc: finalDesc || null,
        prioridade: formData.prioridade,
        operador_id: operatorId,
        status: 'Aberta'
      });
      
      setShowModal(false);
      setFormData({
        tipo: 'MANUTENCAO',
        titulo: '',
        descricao: '',
        localTipo: 'UNIDADE',
        areaComum: '',
        unidade_desc: '',
        prioridade: 'Normal'
      });
      fetchOccurrences();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, obs?: string) => {
    const updateData: any = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'Andamento') {
       updateData.atendido_em = new Date().toISOString();
    }

    if (newStatus === 'Resolvida' || newStatus === 'Arquivada') {
       updateData.resolvida_em = new Date().toISOString();
       updateData.operador_resolucao_id = operatorId;
    } else if (newStatus === 'Aberta' || newStatus === 'Andamento') {
       updateData.resolvida_em = null;
       updateData.operador_resolucao_id = null;
    }

    const { error } = await supabase.from('occurrences').update(updateData).eq('id', id);

    if (!error) {
       let prefix = '';
       if (newStatus === 'Arquivada') prefix = '[ARQUIVADA] ';
       else if (newStatus === 'Resolvida') prefix = '[RESOLVIDA] ';
       else if (newStatus === 'Aberta') prefix = '[REABERTA] ';
       else if (newStatus === 'Andamento') prefix = '[EM ANDAMENTO] ';

       // Create interaction for status change
       await supabase.from('occurrence_interactions').insert({
         occurrence_id: id,
         operador_id: operatorId,
         mensagem: obs ? `${prefix}${obs}` : `${prefix}Ação realizada sem detalhes.`,
         tipo: 'StatusChange'
       });
    }

    setShowAtenderModal(false);
    fetchOccurrences();
  };

  const handleAddInteraction = async () => {
    if (!selectedOcc || !atenderObs.trim()) return;

    const { error } = await supabase.from('occurrence_interactions').insert({
      occurrence_id: selectedOcc.id,
      operador_id: operatorId,
      mensagem: atenderObs.trim(),
      tipo: 'Update'
    });

    if (!error) {
       setAtenderObs('');
       fetchInteractions(selectedOcc.id);
    }
  };

  const openAtender = (o: Occurrence) => {
    setSelectedOcc(o);
    setIsResolving(false);
    setIsArchiving(false);
    setIsReopening(false);
    setIsViewingDetails(false);
    setInteractions([]);
    fetchInteractions(o.id);
    setAtenderObs('');
    setShowAtenderModal(true);
  };

  const openResolve = (o: Occurrence) => {
    setSelectedOcc(o);
    setIsResolving(true);
    setIsArchiving(false);
    setIsReopening(false);
    setIsViewingDetails(false);
    setInteractions([]);
    fetchInteractions(o.id);
    setAtenderObs('');
    setShowAtenderModal(true);
  };

  const openDetails = (o: Occurrence) => {
    setSelectedOcc(o);
    setIsResolving(false);
    setIsArchiving(false);
    setIsReopening(false);
    setIsViewingDetails(true);
    setInteractions([]);
    fetchInteractions(o.id);
    setAtenderObs('');
    setShowAtenderModal(true);
  };

  const openArchive = (o: Occurrence) => {
    setSelectedOcc(o);
    setIsResolving(false);
    setIsArchiving(true);
    setIsReopening(false);
    setIsViewingDetails(false);
    setInteractions([]);
    fetchInteractions(o.id);
    setAtenderObs('');
    setShowAtenderModal(true);
  };

  const openReopen = (o: Occurrence) => {
    setSelectedOcc(o);
    setIsResolving(false);
    setIsArchiving(false);
    setIsReopening(true);
    setIsViewingDetails(false);
    setInteractions([]);
    fetchInteractions(o.id);
    setAtenderObs('');
    setShowAtenderModal(true);
  };

  const handleDeleteOccurrence = async (occId: string) => {
    if (!occId || userRole !== 'Owner') return;
    
    openConfirm(
      'Excluir Ocorrência',
      '⚠️ ATENÇÃO: Deseja excluir permanentemente esta ocorrência? Esta ação não pode ser desfeita e removerá todo o histórico associado.',
      async () => {
        try {
          const { error } = await supabase.from('occurrences').delete().eq('id', occId);
          if (error) throw error;
          setOccurrences(prev => prev.filter(o => o.id !== occId));
        } catch (err) {
          alert('Erro ao excluir ocorrência.');
          console.error(err);
        }
      },
      'danger',
      'Excluir Permanentemente'
    );
  };

  const getTipoIcon = (tipo: string) => {
    const t = tipos.find(x => x.value === tipo);
    return t ? t.icon : Info;
  };

  const totalAtivas = occurrences.filter(o => o.status !== 'Resolvida' && o.status !== 'Arquivada').length;
  const abertasCount = occurrences.filter(o => o.status === 'Aberta').length;
  const andamentoCount = occurrences.filter(o => o.status === 'Andamento').length;
  const urgentesCount = occurrences.filter(o => o.prioridade === 'Urgente' && o.status !== 'Resolvida' && o.status !== 'Arquivada').length;

  const filtered = occurrences.filter(o => {
    const matchSearch = !search || 
      o.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      o.unidade_desc?.toLowerCase().includes(search.toLowerCase()) ||
      o.descricao?.toLowerCase().includes(search.toLowerCase());
    
    // Tab logic
    if (activeTab === 'ATIVAS') {
      const matchAtiva = o.status !== 'Resolvida' && o.status !== 'Arquivada';
      const matchStatus = statusFilter === 'ALL' ? matchAtiva : o.status === statusFilter;
      const matchUrgent = statusFilter === 'URGENTES' ? (o.prioridade === 'Urgente' && matchAtiva) : true;
      return matchSearch && matchStatus && matchUrgent;
    }
    
    const isInHistory = activeTab === 'HISTORICO' && (o.status === 'Resolvida' || o.status === 'Arquivada');
    return isInHistory && matchSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20">
                <AlertTriangle size={24} />
              </span>
              Ocorrências
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
              Livro de Registro da Portaria e Ocorrências
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchOccurrences} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors uppercase">
              Atualizar
            </button>
            <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => setShowModal(true)} 
               className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all uppercase text-sm"
            >
               <Plus size={18} /> Nova Ocorrência
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
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'ALL' ? 'text-slate-400' : 'text-slate-400'}`}>Total Ativas</p>
             <p className={`text-2xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loading ? '-' : totalAtivas}</p>
           </div>
           
           {/* Abertas */}
           <div 
             onClick={() => { setActiveTab('ATIVAS'); setStatusFilter(statusFilter === 'Aberta' ? 'ALL' : 'Aberta'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'Aberta' && activeTab === 'ATIVAS' ? 'bg-amber-500 border-amber-500 scale-[1.02]' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 hover:border-amber-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'Aberta' ? 'text-amber-100' : 'text-amber-600'}`}>Abertas</p>
             <p className={`text-2xl font-black ${statusFilter === 'Aberta' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>{loading ? '-' : abertasCount}</p>
           </div>
           
           {/* Em Andamento */}
           <div 
             onClick={() => { setActiveTab('ATIVAS'); setStatusFilter(statusFilter === 'Andamento' ? 'ALL' : 'Andamento'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'Andamento' && activeTab === 'ATIVAS' ? 'bg-blue-500 border-blue-500 scale-[1.02]' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30 hover:border-blue-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'Andamento' ? 'text-blue-100' : 'text-blue-600'}`}>Em Andamento</p>
             <p className={`text-2xl font-black ${statusFilter === 'Andamento' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>{loading ? '-' : andamentoCount}</p>
           </div>

           {/* Urgentes */}
           <div 
             onClick={() => { setActiveTab('ATIVAS'); setStatusFilter(statusFilter === 'URGENTES' ? 'ALL' : 'URGENTES'); }}
             className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${statusFilter === 'URGENTES' && activeTab === 'ATIVAS' ? 'bg-red-500 border-red-500 scale-[1.02]' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 hover:border-red-400'}`}
           >
             <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusFilter === 'URGENTES' ? 'text-red-100' : 'text-red-600'}`}>Urgentes</p>
             <p className={`text-2xl font-black ${statusFilter === 'URGENTES' ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>{loading ? '-' : urgentesCount}</p>
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
                 placeholder="Buscar ocorrência, local ou descrição..."
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
             <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">Nenhuma ocorrência encontrada</div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ocorrência / Tipo</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Localização</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">{activeTab === 'HISTORICO' ? 'Abertura / Resolução' : 'Data de Abertura'}</th>
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status / Priorid.</th>
                         {activeTab !== 'HISTORICO' ? (
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ação Portaria</th>
                         ) : (
                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Responsáveis</th>
                         )}
                         <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">ADMIN</th>
                      </tr>
                   </thead>
                   <tbody>
                      {filtered.map(occ => {
                         const IconComp = getTipoIcon(occ.tipo);
                         return (
                            <tr key={occ.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                               <td className="p-4">
                                  <div className="flex items-start gap-3">
                                     <div className={`p-2 rounded-lg ${
                                       occ.tipo === 'SEGURANCA' ? 'bg-red-100 text-red-600' :
                                       occ.tipo === 'MANUTENCAO' ? 'bg-blue-100 text-blue-600' :
                                       occ.tipo === 'RECLAMACAO' ? 'bg-orange-100 text-orange-600' :
                                       occ.tipo === 'PASSAGEM' ? 'bg-purple-100 text-purple-600' :
                                       'bg-slate-100 text-slate-600'
                                     }`}>
                                        <IconComp size={16} />
                                     </div>
                                     <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{occ.titulo}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">{occ.tipo}</p>
                                        {occ.descricao && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 max-w-[200px]">{occ.descricao}</p>}
                                     </div>
                                  </div>
                               </td>
                               <td className="p-4">
                                   <div className="flex flex-col gap-1">
                                      <span className="inline-block px-2 py-0.5 max-w-fit bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                                        {(occ.resident as any)?.bloco && (occ.resident as any)?.apto
                                          ? `BLOCO ${String((occ.resident as any).bloco).padStart(2, '0')}, APT ${(occ.resident as any).apto}`
                                          : (occ.unidade_desc || 'Condomínio')}
                                      </span>
                                      {(occ.resident as any)?.nome && (
                                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{(occ.resident as any).nome}</p>
                                      )}
                                   </div>
                               </td>
                               <td className="p-4">
                                   <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-500">
                                      <div className="flex items-center gap-1.5" title="Data de Abertura">
                                         <Calendar size={12} className="text-blue-500" /> 
                                         <span className="uppercase tracking-widest">{new Date(occ.created_at).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                         <Clock size={12} className="text-amber-500" />
                                         <span className="tracking-widest uppercase">{new Date(occ.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                   </div>
                                </td>
                               <td className="p-4">
                                  <div className="flex flex-col gap-2 items-start">
                                     <button 
                                       onClick={() => {
                                         if (occ.status === 'Resolvida') openDetails(occ);
                                         else if (occ.status === 'Andamento') openAtender(occ);
                                       }}
                                       className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
                                       occ.status === 'Aberta' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                       occ.status === 'Andamento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200' :
                                       occ.status === 'Resolvida' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200' :
                                       'bg-slate-100 text-slate-500'
                                     }`}>
                                       {(occ.status === 'Andamento' || occ.status === 'Resolvida') && <Edit3 size={10} />}
                                       {occ.status}
                                     </button>
                                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                       occ.prioridade === 'Urgente' ? 'bg-red-50 text-red-600 border border-red-100' :
                                       occ.prioridade === 'Normal' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                       'bg-blue-50 text-blue-600 border border-blue-100'
                                     }`}>
                                       {occ.prioridade}
                                     </span>
                                  </div>
                               </td>
                               {activeTab !== 'HISTORICO' ? (
                                  <td className="p-4 text-center">
                                     <div className="flex flex-col gap-2">
                                        {occ.status === 'Aberta' && (
                                          <button 
                                            onClick={() => openAtender(occ)}
                                            className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl text-[10px] font-black border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all uppercase flex items-center gap-2 shadow-sm"
                                          >
                                            <Wrench size={16} /> Atender
                                          </button>
                                        )}
                                        {occ.status !== 'Resolvida' && occ.status !== 'Arquivada' && (
                                          <button 
                                            onClick={() => openResolve(occ)}
                                            className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all uppercase flex items-center gap-2 shadow-sm"
                                          >
                                            <CheckCircle2 size={16} /> Resolver
                                          </button>
                                        )}
                                        {occ.status === 'Arquivada' && (
                                          <button 
                                            onClick={() => openDetails(occ)}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-all uppercase flex items-center gap-2 shadow-sm"
                                          >
                                            <Search size={16} /> Detalhes
                                          </button>
                                        )}
                                     </div>
                                  </td>
                               ) : (
                                  <td className="p-4">
                                     <div className="flex flex-col gap-1 text-[10px] font-bold uppercase text-slate-500">
                                        <div className="flex flex-col gap-1.5">
                                          <span className="flex items-center gap-1.5" title="Aberto por">
                                            <div className="size-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                              <Plus size={10} className="text-slate-500" />
                                            </div>
                                            <span className="truncate max-w-[120px]">{occ.operador?.nome?.split(' ')[0] || 'Sistema'}</span>
                                          </span>
                                          {(occ.status === 'Resolvida' || occ.status === 'Arquivada') && (
                                            <span className={`flex items-center gap-1.5 ${occ.status === 'Resolvida' ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`} title="Finalizado por">
                                              <div className={`size-4 rounded-full flex items-center justify-center shrink-0 ${occ.status === 'Resolvida' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                {occ.status === 'Resolvida' ? <CheckCircle2 size={10} /> : <Archive size={10} />}
                                              </div>
                                              <span className="truncate max-w-[120px]">{occ.operador_resolucao?.nome?.split(' ')[0] || '-'}</span>
                                            </span>
                                          )}
                                        </div>
                                     </div>
                                  </td>
                               )}
                               <td className="p-4 text-right">
                                  <div className="flex justify-end gap-2">
                                     {/* 1) LUPA (Sempre Primeiro) */}
                                     <button 
                                        onClick={() => openDetails(occ)}
                                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                        title="Ver Detalhes"
                                     >
                                        <Search size={16} />
                                     </button>

                                     {/* 2) REABRIR / ARQUIVAR */}
                                     {activeTab === "HISTORICO" ? (
                                         <button 
                                            onClick={() => openReopen(occ)}
                                            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                            title="Reabrir OcorrÃªncia"
                                         >
                                            <RotateCcw size={16} />
                                         </button>
                                     ) : (
                                       <button 
                                         onClick={() => openArchive(occ)}
                                         className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                                         title="Arquivar OcorrÃªncia"
                                       >
                                         <Archive size={16} />
                                       </button>
                                     )}

                                     {/* 3) EXCLUIR (Owner Apenas) */}
                                     {userRole === 'Owner' && (
                                       <button 
                                         onClick={() => handleDeleteOccurrence(occ.id)}
                                         className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-700/50 hover:bg-red-100 dark:hover:bg-red-800 transition-all font-black text-[10px]"
                                         title="Excluir Permanentemente"
                                       >
                                         <Trash2 size={14} />
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

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">Registrar Nova OcorrÃªncia</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Tipo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tipos.map(tipo => (
                      <button
                        key={tipo.value}
                        onClick={() => setFormData({...formData, tipo: tipo.value})}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.tipo === tipo.value
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <tipo.icon size={20} className="mx-auto mb-1" />
                        <span className="text-xs font-bold">{tipo.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">TÃ­tulo *</label>
                  <label className="block text-sm font-bold mb-2">Título *</label>
                  <input 
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Breve descrição"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Descrição Detalhada</label>
                  <textarea 
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-24 resize-none"
                    placeholder="Detalhes da ocorrência..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Local da Ocorrência *</label>
                  <div className="flex gap-2 mb-3">
                    <button 
                      onClick={() => setFormData({...formData, localTipo: 'UNIDADE'})}
                      className={`flex-1 flex justify-center py-2 text-xs font-bold rounded-lg border-2 transition-all ${formData.localTipo === 'UNIDADE' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                    >
                      Unidade/Bloco
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, localTipo: 'CONDOMINIO'})}
                      className={`flex-1 flex justify-center py-2 text-xs font-bold rounded-lg border-2 transition-all ${formData.localTipo === 'CONDOMINIO' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                    >
                      Área Comum
                    </button>
                  </div>

                  {formData.localTipo === 'UNIDADE' ? (
                      <input 
                        type="text"
                        value={formData.unidade_desc}
                        onChange={(e) => setFormData({...formData, unidade_desc: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="Ex: Vazamento no corredor, Barulho excessivo..."
                      />
                  ) : (
                      <select 
                        value={formData.areaComum}
                        onChange={(e) => setFormData({...formData, areaComum: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      >
                         <option value="">Selecione a área (opcional)...</option>
                         <option value="Portaria">Portaria</option>
                         <option value="Garagem">Garagem</option>
                         <option value="Salão de Festas">Salão de Festas</option>
                         <option value="Churrasqueira">Churrasqueira</option>
                         <option value="Academia">Academia</option>
                         <option value="Piscina">Piscina</option>
                         <option value="Hall de Entrada">Hall de Entrada</option>
                         <option value="Elevador">Elevador</option>
                         <option value="Fachada ou Muros">Fachada / Muros</option>
                         <option value="Caixa D'Água ou Bombas">Caixa D'Água / Bombas</option>
                         <option value="Outros / Estrutural">Outros (Estrutural)</option>
                      </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Prioridade</label>
                  <div className="flex gap-2">
                    {prioridades.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setFormData({...formData, prioridade: p.value})}
                        className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                          formData.prioridade === p.value
                            ? p.value === 'Urgente' ? 'border-red-500 bg-red-50' :
                              p.value === 'Normal' ? 'border-amber-500 bg-amber-50' :
                              'border-blue-500 bg-blue-50'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span className={`text-sm font-bold ${
                          p.value === 'Urgente' ? 'text-red-600' :
                          p.value === 'Normal' ? 'text-amber-600' :
                          'text-blue-600'
                        }`}>
                          {p.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.titulo}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Registrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ATENDIMENTO EXTREME / TIMELINE */}
      <AnimatePresence>
        {showAtenderModal && selectedOcc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowAtenderModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                 <div>
                    <h2 className="text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      <HistoryLog size={20} className="text-blue-500" />
                      Detalhes da Movimentação - Ocorrências
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="inline-block px-2 py-0.5 bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                         {selectedOcc?.unidade_desc || 'CONDOMÍNIO'}
                       </span>
                       <span className="size-1 rounded-full bg-slate-400" />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${
                         selectedOcc?.status === 'Aberta' ? 'text-amber-500' :
                         selectedOcc?.status === 'Andamento' ? 'text-blue-500' :
                         selectedOcc?.status === 'Resolvida' ? 'text-rose-500' :
                         'text-slate-500'
                       }`}>
                         • {selectedOcc?.status}
                       </span>
                    </div>
                 </div>
                 <button onClick={() => setShowAtenderModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                   <X size={20} className="text-slate-400" />
                 </button>
               </div>

              {/* Timeline Content */}
              {true && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-4 relative">
                    <div className="absolute top-4 bottom-4 left-[21px] w-[2px] bg-slate-200 dark:bg-slate-700"></div>
                    
                    {/* Passo 1: Criação */}
                    <div className="relative flex items-start gap-4">
                      <div className="p-2 rounded-full ring-4 ring-emerald-50 dark:ring-emerald-900/10 relative z-10 bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/50">
                        <LogIn size={16} />
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">1) Abertura</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {selectedOcc.operador?.nome?.split(' ')[0] || 'SISTEMA'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase">{selectedOcc.operador?.role || 'Admin'}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest whitespace-nowrap">
                            <Clock size={10} /> {new Date(selectedOcc.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                          Ocorrência registrada no sistema.
                        </div>
                      </div>
                    </div>

                    {/* Passo 2: Dados da Ocorrência */}
                    <div className="flex gap-4 group relative z-10">
                      <div className="flex flex-col items-center">
                        <div className="size-8 rounded-full flex items-center justify-center shrink-0 border-2 bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400">
                          <Info size={14} />
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between gap-2 mb-1">
                           <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">2) Dados da Ocorrência</p>
                        </div>
                        <div className="text-sm p-4 rounded-2xl bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/30 shadow-sm transition-all">
                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                               <div>
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Tipo / Categoria</span>
                                  <span className="text-blue-900 dark:text-blue-100">{selectedOcc.tipo}</span>
                               </div>
                               <div>
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Prioridade</span>
                                  <span className={selectedOcc.prioridade === 'Urgente' ? 'text-red-500' : 'text-blue-900 dark:text-blue-100'}>{selectedOcc.prioridade}</span>
                               </div>
                               <div className="col-span-2">
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Localização</span>
                                  <span className="text-blue-900 dark:text-blue-100">{selectedOcc.unidade_desc || 'Condomínio'}</span>
                               </div>
                               {selectedOcc.descricao && (
                                 <div className="col-span-2 mt-2 pt-2 border-t border-blue-100/50">
                                    <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Relato Inicial</span>
                                    <p className="text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap">"{selectedOcc.descricao}"</p>
                                 </div>
                               )}
                            </div>
                        </div>
                      </div>
                    </div>
                    {interactions.map((it, idx) => {
                      const isStatusChange = it.tipo === 'StatusChange';
                      const match = it.mensagem.match(/^\[(.*?)\] ([\s\S]*)$/);
                      
                      let Icon = UserCheck;
                      let iconColor = 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700';
                      let bgColor = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300';
                      let badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

                      if (isStatusChange) {
                         if (it.mensagem.startsWith('[ARQUIVADA]')) {
                            Icon = Archive;
                            iconColor = 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800/50 dark:text-red-400';
                            bgColor = 'bg-red-50/50 border border-red-100 text-red-700 font-bold italic dark:bg-red-900/10 dark:border-red-800/30 dark:text-red-300';
                            badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
                         } else if (it.mensagem.startsWith('[REABERTA]')) {
                            Icon = RotateCcw;
                            iconColor = 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400';
                            bgColor = 'bg-blue-50/50 border border-blue-100 text-blue-700 font-bold italic dark:bg-blue-900/10 dark:border-blue-800/30 dark:text-blue-300';
                            badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
                         } else if (it.mensagem.startsWith('[EM ANDAMENTO]')) {
                            Icon = Wrench;
                            iconColor = 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/30 dark:border-amber-800/50 dark:text-amber-400';
                            bgColor = 'bg-amber-50/50 border border-amber-100 text-amber-700 font-bold italic dark:bg-amber-900/10 dark:border-amber-800/30 dark:text-amber-300';
                            badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
                         } else if (it.mensagem.startsWith('[RESOLVIDA]') || it.mensagem.startsWith('[ARQUIVADA]')) {
                            Icon = CheckCircle2;
                            iconColor = 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/50 dark:text-rose-400';
                            bgColor = 'bg-rose-50/50 border border-rose-100 text-rose-700 font-bold italic dark:bg-rose-900/10 dark:border-rose-800/30 dark:text-rose-300';
                            badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300';
                         } else {
                            Icon = CheckCircle2;
                            iconColor = 'bg-slate-100 border-slate-200 text-slate-600';
                            bgColor = 'bg-white border-slate-200 text-slate-600';
                            badgeColor = 'bg-slate-100 text-slate-600';
                         }
                      }

                      return (
                      <div key={it.id} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                           <div className={`size-8 rounded-full flex items-center justify-center shrink-0 border-2 ${iconColor}`}>
                              <Icon size={14} />
                           </div>
                           {idx < interactions.length - 1 && <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-800 mt-1" />}
                        </div>
                        <div className="flex-1 pb-4">
                           <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                {it.operador?.nome || 'Sistema'} 
                                <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 rounded uppercase">
                                  {it.operador?.role || 'Admin'}
                                </span>
                              </p>
                              <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{new Date(it.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                           <div className={`text-sm p-3 rounded-2xl ${bgColor}`}>
                             {match ? (
                               <div className="flex flex-col items-start gap-1">
                                 <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded ${badgeColor}`}>{match[1]}</span>
                                 <span>{match[2]}</span>
                               </div>
                             ) : (
                               it.mensagem
                             )}
                           </div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              )}

              {/* Input Area */}
               <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                 {!isViewingDetails && ((selectedOcc?.status !== 'Resolvida' && selectedOcc?.status !== 'Arquivada') || isResolving || isArchiving || isReopening) ? (
                   <>
                     <div className="relative group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-blue-500 transition-colors">
                           {isArchiving ? 'Motivo do Arquivamento (Obrigatório)' : isReopening ? 'Motivo da Reabertura (Obrigatório)' : isResolving ? 'Resumo da Solução / Feedback Final' : 'Nova Interação / Relato'}
                        </label>
                        <textarea 
                          rows={3}
                          value={atenderObs}
                          onChange={(e) => setAtenderObs(e.target.value)}
                          placeholder={isArchiving ? "Justifique por qual motivo esta ocorrência está sendo arquivada..." : isReopening ? "Justifique por qual motivo o status desta ocorrência está sendo restaurado..." : isResolving ? "Descreva como o problema foi resolvido..." : "Descreva o que está ocorrendo cirurgicamente..."}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none dark:text-white"
                        />
                     </div>

                     <div className="mt-4 flex gap-3">
                        <button 
                          onClick={() => setShowAtenderModal(false)}
                          className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all uppercase tracking-widest"
                        >
                          Voltar
                        </button>

                        {isArchiving ? (
                          <button 
                            disabled={!atenderObs.trim()}
                            onClick={() => selectedOcc && handleStatusChange(selectedOcc.id, 'Arquivada', atenderObs)}
                            className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-lg shadow-red-600/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Archive size={16} /> Confirmar Arquivamento
                          </button>
                        ) : isReopening ? (
                          <button 
                            disabled={!atenderObs.trim()}
                            onClick={() => selectedOcc && handleStatusChange(selectedOcc.id, 'Aberta', atenderObs)}
                            className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <RotateCcw size={16} /> Confirmar Reabertura
                          </button>
                        ) : isResolving ? (
                          <button 
                            disabled={!atenderObs.trim()}
                            onClick={() => selectedOcc && handleStatusChange(selectedOcc.id, 'Resolvida', atenderObs)}
                            className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                             <CheckCircle2 size={16} /> Confirmar Solução
                          </button>
                        ) : selectedOcc?.status === 'Aberta' ? (
                          <button 
                            disabled={!atenderObs.trim()}
                            onClick={() => selectedOcc && handleStatusChange(selectedOcc.id, 'Andamento', atenderObs)}
                            className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Wrench size={16} /> Iniciar Atendimento
                          </button>
                        ) : (
                          <button 
                            disabled={!atenderObs.trim()}
                            onClick={handleAddInteraction}
                            className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                             <Save size={16} /> Registrar Interação
                          </button>
                        )}
                     </div>
                   </>
                 ) : (
                    <div className="flex flex-col items-center">
                        <button 
                           onClick={() => { setShowAtenderModal(false); setIsViewingDetails(false); setIsArchiving(false); setIsReopening(false); setIsResolving(false); }}
                           className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                        >
                           <ChevronLeft size={16} /> Voltar
                        </button>
                    </div>
                 )}
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
