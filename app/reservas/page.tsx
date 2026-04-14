'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search,
  Calendar,
  Clock,
  CheckCircle,
  X,
  Save,
  AlertCircle
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
}

export default function ReservasPage() {
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [operatorId, setOperatorId] = useState<string | null>(null);
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
    if (reservationsRes.data) setReservations(reservationsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    getCurrentOperatorId(supabase).then(setOperatorId);
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
    await supabase.from('reservations').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const filtered = reservations.filter(r => {
    const matchSearch = !search || 
      r.areaNome.toLowerCase().includes(search.toLowerCase()) ||
      r.unidadeDesc.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'TODOS' || r.status === filter;
    return matchSearch && matchFilter;
  });

  const pending = reservations.filter(r => r.status === 'PENDENTE').length;
  const today = new Date().toISOString().split('T')[0];
  const todayReservations = reservations.filter(r => r.dataReserva === today).length;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Reservas</h2>
          <p className="text-slate-500 mt-1 text-sm">Áreas comuns e reservas</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-lg">
            <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">{pending} pendentes</span>
          </div>
          <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-lg">
            <span className="text-green-700 dark:text-green-400 font-bold text-sm">{todayReservations} hoje</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Nova Reserva
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {areas.filter(a => a.status === 'ATIVO').map(area => {
          const todayCount = reservations.filter(r => 
            r.areaNome === area.nome && r.dataReserva === today && r.status !== 'CANCELADA'
          ).length;
          const isFull = area.capacidade ? todayCount >= area.capacidade : false;
          
          return (
            <motion.div
              key={area.id}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Building size={24} />
                </div>
                {isFull && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Lotado</span>
                )}
              </div>
              <h4 className="font-bold text-lg">{area.nome}</h4>
              {area.capacidade && (
                <p className="text-sm text-slate-500">Capacidade: {area.capacidade} pessoas</p>
              )}
              {area.horarioFuncionamento && (
                <p className="text-xs text-slate-400 mt-1">{area.horarioFuncionamento}</p>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  {todayCount} reservas hoje
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar reservas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
        >
          <option value="TODOS">Todos</option>
          <option value="PENDENTE">Pendente</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Nenhuma reserva</div>
        ) : filtered.map((res) => (
          <motion.div 
            key={res.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{res.areaNome}</h4>
                  <p className="text-sm text-slate-500">{res.unidadeDesc} - {res.responsavelNome}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(res.dataReserva).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {res.horaInicio} - {res.horaFim}
                    </span>
                  </div>
                  {res.finalidade && (
                    <p className="text-xs text-slate-400 mt-1">Finalidade: {res.finalidade}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  res.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' :
                  res.status === 'CONFIRMADA' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {res.status === 'PENDENTE' ? 'Pendente' :
                   res.status === 'CONFIRMADA' ? 'Confirmada' : 'Cancelada'}
                </span>
                
                {res.status === 'PENDENTE' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleStatusChange(res.id, 'CONFIRMADA')}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleStatusChange(res.id, 'CANCELADA')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
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
                <h3 className="text-xl font-bold">Nova Reserva</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Área Comum *</label>
                  <select 
                    value={formData.areaId}
                    onChange={(e) => setFormData({...formData, areaId: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {areas.filter(a => a.status === 'ATIVO').map(area => (
                      <option key={area.id} value={area.id}>{area.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Unidade *</label>
                  <input 
                    type="text"
                    value={formData.unidadeDesc}
                    onChange={(e) => setFormData({...formData, unidadeDesc: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Bloco/Apto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Responsável *</label>
                  <input 
                    type="text"
                    value={formData.responsavelNome}
                    onChange={(e) => setFormData({...formData, responsavelNome: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Nome do responsável"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Telefone</label>
                  <input 
                    type="text"
                    value={formData.responsavelTelefone}
                    onChange={(e) => setFormData({...formData, responsavelTelefone: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Data *</label>
                    <input 
                      type="date"
                      value={formData.dataReserva}
                      onChange={(e) => setFormData({...formData, dataReserva: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Início *</label>
                    <input 
                      type="time"
                      value={formData.horaInicio}
                      onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Fim *</label>
                    <input 
                      type="time"
                      value={formData.horaFim}
                      onChange={(e) => setFormData({...formData, horaFim: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Finalidade</label>
                  <input 
                    type="text"
                    value={formData.finalidade}
                    onChange={(e) => setFormData({...formData, finalidade: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Ex: Aniversário, Reunião..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Observações</label>
                  <textarea 
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-20 resize-none"
                    placeholder="Observações..."
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
                  Reservar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}