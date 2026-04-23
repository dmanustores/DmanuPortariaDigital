'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Search,
  AlertTriangle,
  Info,
  MessageSquare,
  Calendar,
  X,
  Save,
  CheckCircle,
  Eye,
  History as HistoryLog,
  User,
  XCircle,
  Trash2,
  RotateCcw,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { getCurrentOperatorId } from '@/lib/utils';

interface Notice {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  validade?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  publicadoPor?: string;
  operador?: { nome: string };
}

const tipos = [
  { value: 'INFO', label: 'Informativo', icon: Info, color: 'blue' },
  { value: 'AVISO', label: 'Aviso', icon: Bell, color: 'amber' },
  { value: 'URGENTE', label: 'Urgente', icon: AlertTriangle, color: 'red' },
  { value: 'EVENTO', label: 'Evento', icon: Calendar, color: 'purple' },
];

export default function AvisosPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ATIVAS' | 'HISTORICO'>('ATIVAS');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    tipo: 'INFO',
    validade: ''
  });

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      const { data: ops } = await supabase.from('operators').select('id, nome');
      const opMap = Object.fromEntries(ops?.map(o => [o.id, o]) || []);
      
      const enriched = data.map(n => ({
        ...n,
        operador: opMap[n.publicadoPor || '']
      }));
      setNotices(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
    getCurrentOperatorId(supabase).then(id => {
      setOperatorId(id);
      if (id) {
        supabase.from('operators').select('role').eq('id', id).single()
          .then(({ data }) => setUserRole(data?.role || null));
      }
    });

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowViewModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSubmit = async () => {
    try {
      await supabase.from('notices').insert({
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        tipo: formData.tipo,
        validade: formData.validade || null,
        status: 'ATIVO',
        publicadoPor: operatorId
      });
      
      setShowModal(false);
      setFormData({
        titulo: '',
        conteudo: '',
        tipo: 'INFO',
        validade: ''
      });
      fetchNotices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('notices').update({ status: newStatus }).eq('id', id);
    fetchNotices();
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('Deseja realmente excluir este aviso?')) return;
    await supabase.from('notices').delete().eq('id', id);
    fetchNotices();
  };

  const filtered = notices.filter(n => {
    const matchSearch = !search || 
      n.titulo.toLowerCase().includes(search.toLowerCase()) ||
      n.conteudo.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'ATIVAS') {
      return matchSearch && n.status === 'ATIVO';
    } else {
      return matchSearch && n.status !== 'ATIVO';
    }
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-3">
             <span className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20">
               <Bell size={24} />
             </span>
             Avisos & Comunicados
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-bold uppercase tracking-widest">Informativos e Alertas para os Condôminos</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 uppercase transition-all"
          >
            <Plus size={18} />
            Novo Aviso
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('ATIVAS')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'ATIVAS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Avisos Ativos
          </button>
          <button 
            onClick={() => setActiveTab('HISTORICO')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'HISTORICO' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <HistoryLog size={14} /> Histórico Completo
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Buscar comunicado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Título / Tipo</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data Publicação</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Validade</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                {activeTab !== 'HISTORICO' ? (
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ação Portaria</th>
                ) : (
                  <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Responsável</th>
                )}
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">ADMIN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">Nenhum aviso encontrado</td></tr>
              ) : filtered.map((n) => {
                const tipoObj = tipos.find(t => t.value === n.tipo);
                const Icon = tipoObj?.icon || Info;
                return (
                  <tr key={n.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                          n.tipo === 'URGENTE' ? 'bg-red-100 text-red-600' :
                          n.tipo === 'AVISO' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">{n.titulo}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{tipoObj?.label}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                       {new Date(n.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                       {n.validade ? new Date(n.validade).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        n.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {n.status}
                      </span>
                    </td>
                    
                    {activeTab !== 'HISTORICO' ? (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                           <button 
                              onClick={() => handleStatusChange(n.id, n.status === 'ATIVO' ? 'INATIVO' : 'ATIVO')}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all uppercase flex items-center gap-2 shadow-sm ${
                                n.status === 'ATIVO' 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' 
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                              }`}
                           >
                              {n.status === 'ATIVO' ? <><XCircle size={14} /> Desativar</> : <><CheckCircle size={14} /> Ativar</>}
                           </button>
                        </div>
                      </td>
                    ) : (
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                          <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold">
                            {n.operador?.nome?.charAt(0) || 'S'}
                          </div>
                          {n.operador?.nome || 'Sistema'}
                        </div>
                      </td>
                    )}

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                         {/* 1) LUPA */}
                         <button 
                            onClick={() => { setSelectedNotice(n); setShowViewModal(true); }}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                            title="Ver Detalhes"
                         >
                            <Search size={16} />
                         </button>

                         {/* 2) REABRIR / ARQUIVAR */}
                         {activeTab === 'HISTORICO' && (
                           <button 
                              onClick={() => handleStatusChange(n.id, 'ATIVO')}
                              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                              title="Reativar Aviso"
                           >
                              <RotateCcw size={16} />
                           </button>
                         )}

                         {/* 3) EXCLUIR */}
                         {userRole === 'Owner' && (
                           <button 
                              onClick={() => handleDeleteNotice(n.id)}
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
      </div>

      {/* Novo Modal Aviso */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 shadow-2xl"
            onClick={() => setShowModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Comunicado</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                     <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Título do Comunicado</label>
                     <input 
                       type="text"
                       value={formData.titulo}
                       onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                       className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20"
                       placeholder="Ex: Manutenção de Elevadores"
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Tipo de Aviso</label>
                     <select 
                       value={formData.tipo}
                       onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                       className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20"
                     >
                       {tipos.map(t => (
                         <option key={t.value} value={t.value}>{t.label}</option>
                       ))}
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Data de Validade</label>
                     <input 
                       type="date"
                       value={formData.validade}
                       onChange={(e) => setFormData({...formData, validade: e.target.value})}
                       className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20"
                     />
                   </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Conteúdo da Mensagem</label>
                  <textarea 
                    value={formData.conteudo}
                    onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 h-32 resize-none"
                    placeholder="Descreva o comunicado detalhadamente..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.titulo || !formData.conteudo}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Publicar Aviso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standardized Details Modal for Avisos */}
      <AnimatePresence>
        {showViewModal && selectedNotice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                <div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                     <HistoryLog size={20} className="text-blue-500" />
                     Detalhes da Movimentação - Avisos
                   </h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedNotice.titulo}</span>
                      <span className="size-1 rounded-full bg-slate-400" />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedNotice.status === 'ATIVO' ? 'text-emerald-500' : 'text-slate-500'}`}>{selectedNotice.status}</span>
                   </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-4 relative">
                  <div className="absolute top-4 bottom-4 left-[21px] w-[2px] bg-slate-200 dark:bg-slate-700"></div>

                  {/* 1) Criação */}
                  <div className="relative flex items-start gap-4">
                    <div className="p-2 rounded-full ring-4 ring-emerald-50 dark:ring-emerald-900/10 relative z-10 bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/50">
                        <Bell size={16} />
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">1) Publicação do Comunicado</span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                {selectedNotice.operador?.nome?.split(' ')[0] || 'SISTEMA'}
                              </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                             <Clock size={10} /> {new Date(selectedNotice.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Aviso publicado e disponível para os moradores.</p>
                    </div>
                  </div>

                  {/* 2) Conteúdo */}
                  <div className="relative flex items-start gap-4">
                    <div className="p-2 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 relative z-10 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 text-blue-600">
                        <Info size={16} />
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">2) Dados do Comunicado</span>
                        </div>
                        <div className="space-y-4">
                           <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Conteúdo</span>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedNotice.conteudo}</p>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Tipo</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedNotice.tipo}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Validade</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedNotice.validade ? new Date(selectedNotice.validade).toLocaleDateString('pt-BR') : 'Indeterminada'}</span>
                              </div>
                           </div>
                        </div>
                    </div>
                  </div>

                  {/* 3) Finalização (Se Inativo) */}
                  {selectedNotice.status !== 'ATIVO' && (
                    <div className="relative flex items-start gap-4">
                      <div className="p-2 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 relative z-10 bg-red-100 border-red-200 text-red-600 dark:bg-slate-800 dark:border-slate-700">
                          <XCircle size={16} />
                      </div>
                      <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/20 shadow-sm transition-all">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-600">3) Finalização: Inativo</span>
                            {selectedNotice.updated_at && (
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                <Clock size={10} /> {new Date(selectedNotice.updated_at).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            O aviso foi desativado e não é mais exibido nos canais públicos.
                          </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}