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
  Eye
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
  const [filter, setFilter] = useState('ATIVO');
  const [operatorId, setOperatorId] = useState<string | null>(null);
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
    
    if (data) setNotices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
    getCurrentOperatorId(supabase).then(setOperatorId);
  }, []);

  const handleSubmit = async () => {
    try {
      await supabase.from('notices').insert({
        titulo: formData.titulo,
        conteudo: formData.conteudo,
        tipo: formData.tipo,
        validade: formData.validade || null,
        publicadoPor: operatorId,
        status: 'ATIVO'
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

  const handleView = (notice: Notice) => {
    setSelectedNotice(notice);
    setShowViewModal(true);
  };

  const active = notices.filter(n => n.status === 'ATIVO').length;
  const urgent = notices.filter(n => n.tipo === 'URGENTE' && n.status === 'ATIVO').length;

  const filtered = notices.filter(n => {
    const matchSearch = !search || 
      n.titulo.toLowerCase().includes(search.toLowerCase()) ||
      n.conteudo.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'TODOS' || n.status === filter;
    return matchSearch && matchFilter;
  });

  const getTipoInfo = (tipo: string) => tipos.find(t => t.value === tipo) || tipos[0];

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Avisos</h2>
          <p className="text-slate-500 mt-1 text-sm">Comunicados e avisos do condomínio</p>
        </motion.div>

        <div className="flex items-center gap-3">
          {urgent > 0 && (
            <div className="bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-lg animate-pulse">
              <span className="text-red-700 dark:text-red-400 font-bold text-sm">{urgent} urgentes</span>
            </div>
          )}
          <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-lg">
            <span className="text-green-700 dark:text-green-400 font-bold text-sm">{active} ativos</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Novo Aviso
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar avisos..."
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
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
          <option value="TODOS">Todos</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-8 text-slate-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-slate-400">Nenhum aviso</div>
        ) : filtered.map((notice) => {
          const tipoInfo = getTipoInfo(notice.tipo);
          
          return (
            <motion.div 
              key={notice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-lg flex items-center justify-center ${
                    tipoInfo.color === 'red' ? 'bg-red-100 text-red-600' :
                    tipoInfo.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                    tipoInfo.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <tipoInfo.icon size={20} />
                  </div>
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      tipoInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                      tipoInfo.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                      tipoInfo.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {tipoInfo.label}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    notice.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {notice.status}
                  </span>
                </div>
              </div>
              
              <h4 className="font-bold text-lg mb-2">{notice.titulo}</h4>
              <p className="text-sm text-slate-500 line-clamp-2">{notice.conteudo}</p>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400">
                  {new Date(notice.created_at).toLocaleDateString('pt-BR')}
                  {notice.validade && ` • Validade: ${new Date(notice.validade).toLocaleDateString('pt-BR')}`}
                </span>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleView(notice)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Eye size={14} /> Ver
                  </button>
                  {notice.status === 'ATIVO' ? (
                    <button 
                      onClick={() => handleStatusChange(notice.id, 'INATIVO')}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Desativar
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStatusChange(notice.id, 'ATIVO')}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal Novo Aviso */}
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
                <h3 className="text-xl font-bold">Novo Aviso</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Tipo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {tipos.map(tipo => (
                      <button
                        key={tipo.value}
                        onClick={() => setFormData({...formData, tipo: tipo.value})}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          formData.tipo === tipo.value
                            ? `border-${tipo.color}-500 bg-${tipo.color}-50`
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <tipo.icon size={20} className={`mx-auto mb-1 ${tipo.color === 'red' ? 'text-red-600' : tipo.color === 'amber' ? 'text-amber-600' : tipo.color === 'purple' ? 'text-purple-600' : 'text-blue-600'}`} />
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
                    placeholder="Título do aviso"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Conteúdo *</label>
                  <textarea 
                    value={formData.conteudo}
                    onChange={(e) => setFormData({...formData, conteudo: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg h-32 resize-none"
                    placeholder="Texto do aviso..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Validade (opcional)</label>
                  <input 
                    type="date"
                    value={formData.validade}
                    onChange={(e) => setFormData({...formData, validade: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
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
                  disabled={!formData.titulo || !formData.conteudo}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Publicar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Ver Aviso */}
      <AnimatePresence>
        {showViewModal && selectedNotice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">Aviso Completo</h3>
                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {(() => {
                  const tipoInfo = getTipoInfo(selectedNotice.tipo);
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 ${
                      tipoInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                      tipoInfo.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                      tipoInfo.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      <tipoInfo.icon size={16} />
                      <span className="text-sm font-bold">{tipoInfo.label}</span>
                    </div>
                  );
                })()}
                
                <h4 className="text-2xl font-bold mb-4">{selectedNotice.titulo}</h4>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedNotice.conteudo}</p>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  <p>Publicado em: {new Date(selectedNotice.created_at).toLocaleString('pt-BR')}</p>
                  {selectedNotice.validade && (
                    <p>Validade até: {new Date(selectedNotice.validade).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}