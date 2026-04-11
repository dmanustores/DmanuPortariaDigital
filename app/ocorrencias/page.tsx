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
  X,
  Save,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

interface Occurrence {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  unidadeDesc?: string;
  prioridade: string;
  status: string;
  created_at: string;
  operadorId?: string;
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [formData, setFormData] = useState({
    tipo: 'MANUTENCAO',
    titulo: '',
    descricao: '',
    unidadeDesc: '',
    prioridade: 'Normal'
  });

  useEffect(() => {
    fetchOccurrences();
  }, []);

  const fetchOccurrences = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('occurrences')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (data) setOccurrences(data);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      await supabase.from('occurrences').insert({
        tipo: formData.tipo,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        unidadeDesc: formData.unidadeDesc || null,
        prioridade: formData.prioridade,
        status: 'Aberta'
      });
      
      setShowModal(false);
      setFormData({
        tipo: 'MANUTENCAO',
        titulo: '',
        descricao: '',
        unidadeDesc: '',
        prioridade: 'Normal'
      });
      fetchOccurrences();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('occurrences').update({
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    fetchOccurrences();
  };

  const getTipoIcon = (tipo: string) => {
    const t = tipos.find(x => x.value === tipo);
    return t ? t.icon : Info;
  };

  const open = occurrences.filter(o => o.status === 'Aberta').length;
  const urgent = occurrences.filter(o => o.prioridade === 'Urgente' && o.status === 'Aberta').length;

  const filtered = occurrences.filter(o => {
    const matchSearch = !search || 
      o.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (o.descricao?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'TODOS' || o.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Ocorrências</h2>
          <p className="text-slate-500 mt-1 text-sm">Livro de registro da portaria</p>
        </motion.div>

        <div className="flex items-center gap-3">
          {urgent > 0 && (
            <div className="bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg animate-pulse">
              <span className="text-red-700 dark:text-red-400 font-bold text-sm">{urgent} urgentes</span>
            </div>
          )}
          <div className="bg-amber-100 dark:bg-amber-900/30 px-4 py-2 rounded-lg">
            <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">{open} abertas</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Nova Ocorrência
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar ocorrências..."
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
          <option value="Aberta">Aberta</option>
          <option value="Andamento">Em Andamento</option>
          <option value="Resolvida">Resolvida</option>
          <option value="Arquivada">Arquivada</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Nenhuma ocorrência</div>
        ) : filtered.map((occ) => {
          const IconComponent = getTipoIcon(occ.tipo);
          const priorityColor = occ.prioridade === 'Urgente' ? 'red' : occ.prioridade === 'Normal' ? 'amber' : 'blue';
          
          return (
            <motion.div 
              key={occ.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`size-12 rounded-xl flex items-center justify-center ${
                    occ.tipo === 'SEGURANCA' ? 'bg-red-100 text-red-600' :
                    occ.tipo === 'MANUTENCAO' ? 'bg-blue-100 text-blue-600' :
                    occ.tipo === 'RECLAMACAO' ? 'bg-orange-100 text-orange-600' :
                    occ.tipo === 'PASSAGEM' ? 'bg-purple-100 text-purple-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <IconComponent size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        occ.prioridade === 'Urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        occ.prioridade === 'Normal' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {occ.prioridade}
                      </span>
                      <span className="text-xs text-slate-400">{occ.tipo}</span>
                    </div>
                    <h4 className="font-bold text-lg">{occ.titulo}</h4>
                    {occ.descricao && <p className="text-sm text-slate-500 mt-1">{occ.descricao}</p>}
                    {occ.unidadeDesc && <p className="text-xs text-slate-400 mt-1">Unidade: {occ.unidadeDesc}</p>}
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(occ.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    occ.status === 'Aberta' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    occ.status === 'Andamento' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    occ.status === 'Resolvida' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {occ.status}
                  </span>
                  
                  {occ.status !== 'Arquivada' && (
                    <select
                      value={occ.status}
                      onChange={(e) => handleStatusChange(occ.id, e.target.value)}
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1 mt-2"
                    >
                      <option value="Aberta">Aberta</option>
                      <option value="Andamento">Em Andamento</option>
                      <option value="Resolvida">Resolvida</option>
                      <option value="Arquivada">Arquivar</option>
                    </select>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
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
                <h3 className="text-xl font-bold">Nova Ocorrência</h3>
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
                  <label className="block text-sm font-bold mb-2">Descrição</label>
                  <textarea 
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-24 resize-none"
                    placeholder="Detalhes da ocorrência..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Unidade (opcional)</label>
                  <input 
                    type="text"
                    value={formData.unidadeDesc}
                    onChange={(e) => setFormData({...formData, unidadeDesc: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Bloco/Apto"
                  />
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
    </DashboardLayout>
  );
}