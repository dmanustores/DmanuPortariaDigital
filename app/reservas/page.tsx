'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search,
  Calendar,
  Clock,
  AlertCircle,
  History as HistoryLog,
  Info,
  User,
  CheckCircle2,
  XCircle,
  Save,
  X,
  Trash2,
  RotateCcw,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { lookupUnitId, getCurrentOperatorId } from '@/lib/utils';

interface CommonArea {
  id: string;
  nome: string;
  capacidade?: number;
  regras?: string;
  horarioFuncionamento?: string;
  status: string;
}

interface Reservation {
  id: string;
  areaNome: string;
  unidadeDesc: string;
  responsavelNome: string;
  responsavelTelefone?: string;
  dataReserva: string;
  horaInicio: string;
  horaFim: string;
  finalidade?: string;
  observacoes?: string;
  status: string;
  created_at: string;
  operadorId?: string;
  operador?: { nome: string };
}

export default function ReservasPage() {
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ATIVAS' | 'HISTORICO'>('ATIVAS');
  const [filter, setFilter] = useState('TODOS');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [formData, setFormData] = useState({
    areaId: '',
    areaNome: '',
    unidadeDesc: '',
    responsavelNome: '',
    responsavelTelefone: '',
    dataReserva: '',
    horaInicio: '',
    horaFim: '',
    finalidade: '',
    observacoes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const [areasRes, reservationsRes] = await Promise.all([
      supabase.from('common_areas').select('*').order('nome'),
      supabase.from('reservations').select('*').order('dataReserva', { ascending: true })
    ]);
    
    if (areasRes.data) setAreas(areasRes.data);
    if (reservationsRes.data) {
      const { data: ops } = await supabase.from('operators').select('id, nome');
      const opMap = Object.fromEntries(ops?.map(o => [o.id, o]) || []);
      
      const enriched = reservationsRes.data.map(r => ({
        ...r,
        operador: opMap[r.operadorId]
      }));
      setReservations(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
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
        setShowAreaModal(false);
        setShowDetailsModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSubmit = async () => {
    try {
      const area = areas.find(a => a.id === formData.areaId);
      const unitId = await lookupUnitId(supabase, formData.unidadeDesc);

      await supabase.from('reservations').insert({
        areaId: formData.areaId,
        areaNome: area?.nome || formData.areaNome,
        unidadeId: unitId,
        unidadeDesc: formData.unidadeDesc,
        responsavelNome: formData.responsavelNome,
        responsavelTelefone: formData.responsavelTelefone || null,
        dataReserva: formData.dataReserva,
        horaInicio: formData.horaInicio,
        horaFim: formData.horaFim,
        finalidade: formData.finalidade || null,
        observacoes: formData.observacoes || null,
        operadorId: operatorId,
        status: 'PENDENTE'
      });
      
      setShowModal(false);
      setFormData({
        areaId: '',
        areaNome: '',
        unidadeDesc: '',
        responsavelNome: '',
        responsavelTelefone: '',
        dataReserva: '',
        horaInicio: '',
        horaFim: '',
        finalidade: '',
        observacoes: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    const operator = await supabase.from('operators').select('nome').eq('id', operatorId).single();
    const opName = operator.data?.nome || 'Sistema';
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const logEntry = `[${newStatus}] (${opName} às ${now})`;
    const finalObs = res.observacoes ? `${res.observacoes}\n${logEntry}` : logEntry;

    await supabase.from('reservations').update({ 
      status: newStatus,
      observacoes: finalObs,
      operadorId: operatorId 
    }).eq('id', id);
    fetchData();
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta reserva?')) return;
    await supabase.from('reservations').delete().eq('id', id);
    fetchData();
  };

  const filtered = reservations.filter(res => {
    const matchSearch = !search || 
      res.areaNome.toLowerCase().includes(search.toLowerCase()) ||
      res.responsavelNome.toLowerCase().includes(search.toLowerCase()) ||
      res.unidadeDesc.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === 'ATIVAS') {
      return matchSearch && (res.status === 'PENDENTE' || res.status === 'CONFIRMADA');
    } else {
      return matchSearch && (res.status === 'CANCELADA' || res.status === 'CONCLUIDA' || (activeTab === 'HISTORICO' && res.status !== 'PENDENTE'));
    }
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-3">
             <span className="p-2.5 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
               <Calendar size={24} />
             </span>
             Reservas
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-bold uppercase tracking-widest">Gestão de Áreas Comuns e Agendamentos</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 uppercase transition-all"
          >
            <Plus size={18} />
            Nova Reserva
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('ATIVAS')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'ATIVAS' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Lista Ativa
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
            placeholder="Buscar reserva..."
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
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Área / Responsável</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidade</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Data / Horário</th>
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
                <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">Nenhuma reserva encontrada</td></tr>
              ) : filtered.map((res) => (
                <tr key={res.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">{res.areaNome}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Área Comum</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="inline-block px-2 py-0.5 max-w-fit bg-slate-900/5 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap uppercase tracking-wider">
                        {res.morador?.bloco && res.morador?.apto ? `BLOCO ${String(res.morador.bloco).padStart(2, '0')}, APT ${res.morador.apto}` : (res.unidadeDesc || '-')}
                      </span>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight block uppercase tracking-tight">{res.responsavelNome}</p>
                    </div>
                  </td>
                  <td className="p-4 text-[10px] font-bold text-slate-500">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5"><Calendar size={12} className="text-blue-500" /> {new Date(res.dataReserva).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} className="text-amber-500" /> {res.horaInicio} - {res.horaFim}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      res.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' :
                      res.status === 'CONFIRMADA' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  
                  {activeTab !== 'HISTORICO' ? (
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {res.status === 'PENDENTE' && (
                          <>
                            <button 
                              onClick={() => handleStatusChange(res.id, 'CONFIRMADA')}
                              className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all uppercase flex items-center gap-2 shadow-sm"
                            >
                              <CheckCircle2 size={14} /> Confirmar
                            </button>
                            <button 
                              onClick={() => handleStatusChange(res.id, 'CANCELADA')}
                              className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black border border-red-500/20 hover:bg-red-500 hover:text-white transition-all uppercase flex items-center gap-2 shadow-sm"
                            >
                              <XCircle size={14} /> Cancelar
                            </button>
                          </>
                        )}
                        {res.status === 'CONFIRMADA' && (
                          <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1.5">
                             <CheckCircle2 size={12} /> Confirmada
                          </span>
                        )}
                      </div>
                    </td>
                  ) : (
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                        <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold">
                          {res.operador?.nome?.charAt(0) || 'S'}
                        </div>
                        {res.operador?.nome || 'Sistema'}
                      </div>
                    </td>
                  )}

                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                       {/* 1) LUPA */}
                       <button 
                          onClick={() => { setSelectedReservation(res); setShowDetailsModal(true); }}
                          className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                          title="Ver Detalhes"
                       >
                          <Search size={16} />
                       </button>

                       {/* 2) REABRIR / ARQUIVAR */}
                       {activeTab === 'HISTORICO' && (
                         <button 
                            onClick={() => handleStatusChange(res.id, 'PENDENTE')}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                            title="Reabrir Reserva"
                         >
                            <RotateCcw size={16} />
                         </button>
                       )}

                       {/* 3) EXCLUIR */}
                       {userRole === 'Owner' && (
                         <button 
                            onClick={() => handleDeleteReservation(res.id)}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                            title="Excluir Registro (Owner)"
                         >
                            <Trash2 size={16} />
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals remain the same but use showModal state */}
      {/* ... (Novo Modal Reserva) ... */}
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
                <h3 className="text-xl font-bold">Nova Reserva</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Área Comum</label>
                  <select 
                    value={formData.areaId}
                    onChange={(e) => setFormData({...formData, areaId: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">Selecione uma área</option>
                    {areas.filter(a => a.status === 'Ativo').map(area => (
                      <option key={area.id} value={area.id}>{area.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Unidade Destino</label>
                  <input 
                    type="text"
                    value={formData.unidadeDesc}
                    onChange={(e) => setFormData({...formData, unidadeDesc: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Bloco 01, Apt 101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Responsável</label>
                  <input 
                    type="text"
                    value={formData.responsavelNome}
                    onChange={(e) => setFormData({...formData, responsavelNome: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Data</label>
                    <input 
                      type="date"
                      value={formData.dataReserva}
                      onChange={(e) => setFormData({...formData, dataReserva: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-bold mb-2">Início</label>
                      <input 
                        type="time"
                        value={formData.horaInicio}
                        onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Fim</label>
                      <input 
                        type="time"
                        value={formData.horaFim}
                        onChange={(e) => setFormData({...formData, horaFim: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Observações</label>
                  <textarea 
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-24 resize-none"
                  />
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
                  disabled={!formData.areaId || !formData.unidadeDesc || !formData.responsavelNome || !formData.dataReserva}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar Reserva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Modal Standardized logic */}
      <AnimatePresence>
        {showDetailsModal && selectedReservation && (
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
                     Detalhes da Movimentação - Reservas
                   </h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedReservation.areaNome}</span>
                      <span className="size-1 rounded-full bg-slate-400" />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedReservation.status === 'CONFIRMADA' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedReservation.status}</span>
                   </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Timeline Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                <div className="space-y-4 relative">
                  <div className="absolute top-4 bottom-4 left-[21px] w-[2px] bg-slate-200 dark:bg-slate-700"></div>

                  {(() => {
                    const rawObs = selectedReservation.observacoes || '';
                    const logs: { type: string, author: string, time: string }[] = [];
                    const logRegex = /\[(CONFIRMADA|CANCELADA|CONCLUIDA|REABERTA)\] \((.*?) às (.*?)\)/g;
                    let match;
                    while ((match = logRegex.exec(rawObs)) !== null) {
                      logs.push({ type: match[1], author: match[2], time: match[3] });
                    }
                    const lastLog = logs[logs.length - 1];
                    
                    return (
                      <>
                        {/* 1) Criação */}
                        <div className="relative flex items-start gap-4">
                          <div className="p-2 rounded-full ring-4 ring-emerald-50 dark:ring-emerald-900/10 relative z-10 bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/50">
                              <Calendar size={16} />
                          </div>
                          <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                              <div className="flex items-center justify-between gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">1) Criação / Agendamento</span>
                                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                      {selectedReservation.operador?.nome?.split(' ')[0] || 'SISTEMA'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                  <Clock size={10} /> {new Date(selectedReservation.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Reserva solicitada para a área comum.</p>
                          </div>
                        </div>

                        {/* 2) Dados da Reserva */}
                        <div className="relative flex items-start gap-4">
                          <div className="p-2 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 relative z-10 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 text-blue-600">
                              <Info size={16} />
                          </div>
                          <div className="flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                              <div className="flex items-center justify-between gap-4 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">2) Dados da Reserva</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Data do Evento</span>
                                  <span className="text-sm font-bold">{new Date(selectedReservation.dataReserva).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Horário</span>
                                  <span className="text-sm font-bold">{selectedReservation.horaInicio} às {selectedReservation.horaFim}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Responsável</span>
                                  <span className="text-sm font-bold">{selectedReservation.responsavelNome}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">Unidade</span>
                                  <span className="text-sm font-bold">{selectedReservation.unidadeDesc}</span>
                                </div>
                              </div>
                          </div>
                        </div>

                        {/* 3) Finalização */}
                        {selectedReservation.status !== 'PENDENTE' && (
                          <div className="relative flex items-start gap-4">
                            <div className={`p-2 rounded-full ring-4 ring-slate-50 dark:ring-slate-900 relative z-10 ${selectedReservation.status === 'CONFIRMADA' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-red-100 border-red-200 text-red-600'} dark:bg-slate-800 dark:border-slate-700`}>
                                {selectedReservation.status === 'CONFIRMADA' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            </div>
                            <div className={`flex-1 p-4 rounded-2xl bg-white dark:bg-slate-800 border ${selectedReservation.status === 'CONFIRMADA' ? 'border-emerald-200 dark:border-emerald-800/20' : 'border-red-200 dark:border-red-800/20'} shadow-sm transition-all`}>
                                <div className="flex items-center justify-between gap-4 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${selectedReservation.status === 'CONFIRMADA' ? 'text-emerald-600' : 'text-red-600'}`}>3) Finalização: {selectedReservation.status}</span>
                                    {lastLog && (
                                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black uppercase tracking-wider text-slate-500">
                                        {lastLog.author.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                  {lastLog && (
                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                      <Clock size={10} /> {lastLog.time}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                  A reserva foi {selectedReservation.status.toLowerCase()} pela administração do condomínio.
                                </p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  </div>
                </div>
              </div>

              {/* Botão de Fechar */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button 
                  onClick={() => setShowDetailsModal(false)}
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