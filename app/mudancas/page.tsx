'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Search,
  Calendar,
  Clock,
  Car,
  X,
  Save,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { lookupUnitId } from '@/lib/utils';

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
  status: string;
  created_at: string;
}

export default function MudancasPage() {
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TODOS');
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
    veiculoModelo: ''
  });

  useEffect(() => {
    fetchMoves();
  }, []);

  const fetchMoves = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('moves')
      .select('*')
      .order('dataMovimentacao', { ascending: true });
    
    if (data) setMoves(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      const unitId = await lookupUnitId(supabase, formData.unidadeDesc);

      await supabase.from('moves').insert({
        unidadeId: unitId,
        unidadeDesc: formData.unidadeDesc,
        responsavelNome: formData.responsavelNome,
        responsavelTelefone: formData.responsavelTelefone || null,
        dataMovimentacao: formData.dataMovimentacao,
        horaInicio: formData.horaInicio,
        horaFim: formData.horaFim,
        observacoes: formData.observacoes || null,
        elevadorServico: formData.elevadorServico,
        veiculoPlaca: formData.veiculoPlaca || null,
        veiculoModelo: formData.veiculoModelo || null,
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
        veiculoModelo: ''
      });
      fetchMoves();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('moves').update({ status: newStatus }).eq('id', id);
    fetchMoves();
  };

  const filtered = moves.filter(m => {
    const matchSearch = !search || 
      m.unidadeDesc.toLowerCase().includes(search.toLowerCase()) ||
      m.responsavelNome.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'TODOS' || m.status === filter;
    return matchSearch && matchFilter;
  });

  const upcoming = moves.filter(m => m.status === 'AGENDADA').length;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Mudanças</h2>
          <p className="text-slate-500 mt-1 text-sm">Controle de mudanças e mudanças</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg">
            <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">{upcoming} agendadas</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Nova Mudança
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por unidade ou responsável..."
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
          <option value="AGENDADA">Agendadas</option>
          <option value="EM_ANDAMENTO">Em Andamento</option>
          <option value="CONCLUIDA">Concluídas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Nenhuma mudança agendada</div>
        ) : filtered.map((move) => (
          <motion.div 
            key={move.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{move.unidadeDesc}</h4>
                  <p className="text-sm text-slate-500">{move.responsavelNome}</p>
                  {move.responsavelTelefone && (
                    <p className="text-xs text-slate-400">{move.responsavelTelefone}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(move.dataMovimentacao).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {move.horaInicio} - {move.horaFim}
                    </span>
                    {move.elevadorServico && (
                      <span className="text-amber-600 font-bold">Elevador</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  move.status === 'AGENDADA' ? 'bg-blue-100 text-blue-700' :
                  move.status === 'EM_ANDAMENTO' ? 'bg-amber-100 text-amber-700' :
                  move.status === 'CONCLUIDA' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {move.status === 'AGENDADA' ? 'Agendada' :
                   move.status === 'EM_ANDAMENTO' ? 'Em Andamento' :
                   move.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
                </span>
                
                {move.status === 'AGENDADA' && (
                  <button
                    onClick={() => handleStatusChange(move.id, 'EM_ANDAMENTO')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Iniciar
                  </button>
                )}
                {move.status === 'EM_ANDAMENTO' && (
                  <button
                    onClick={() => handleStatusChange(move.id, 'CONCLUIDA')}
                    className="text-xs text-green-600 hover:underline"
                  >
                    Concluir
                  </button>
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
                <h3 className="text-xl font-bold">Nova Mudança</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
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
                      value={formData.dataMovimentacao}
                      onChange={(e) => setFormData({...formData, dataMovimentacao: e.target.value})}
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

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="elevador"
                    checked={formData.elevadorServico}
                    onChange={(e) => setFormData({...formData, elevadorServico: e.target.checked})}
                    className="size-4"
                  />
                  <label htmlFor="elevador" className="text-sm">Solicitar elevador de serviço</label>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Veículo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text"
                      value={formData.veiculoPlaca}
                      onChange={(e) => setFormData({...formData, veiculoPlaca: e.target.value.toUpperCase()})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                      placeholder="Placa"
                    />
                    <input 
                      type="text"
                      value={formData.veiculoModelo}
                      onChange={(e) => setFormData({...formData, veiculoModelo: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="Modelo"
                    />
                  </div>
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
                  disabled={!formData.unidadeDesc || !formData.responsavelNome || !formData.dataMovimentacao}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Agendar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}