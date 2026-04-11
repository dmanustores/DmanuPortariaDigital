'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Car, 
  Package, 
  Users,
  X,
  Save,
  Edit,
  Trash2,
  Filter,
  Wand2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

interface Unit {
  id: string;
  bloco: string;
  numero: string;
  tipo: string;
  status: string;
  vagasGaragem?: number;
  observacoes?: string;
  created_at: string;
  moradores?: any[];
  veiculos?: any[];
  encomendas?: any[];
}

const blocos = ['A', 'B', 'C', 'D'];
const tipos = ['RESIDENCIAL', 'COMERCIAL', 'GARAGE'];
const statusOptions = ['OCUPADA', 'VAGA', 'OBRAS', 'MANUTENCAO'];

const TOTAL_BLOCOS = 22;
const TOTAL_ANDARES = 5;
const APARTAMENTOS_POR_ANDAR = 4;

export default function UnidadesPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [search, setSearch] = useState('');
  const [filterBloco, setFilterBloco] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [operatorRole, setOperatorRole] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [formData, setFormData] = useState({
    bloco: 'A',
    numero: '',
    tipo: 'RESIDENCIAL',
    status: 'VAGA',
    vagasGaragem: 0,
    observacoes: ''
  });

  useEffect(() => {
    fetchUnits();
    fetchRole();
  }, []);

  const fetchRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('operators')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (profile) setOperatorRole(profile.role);
    }
  };

  const fetchUnits = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('units')
      .select('*')
      .order('bloco', { ascending: true })
      .order('numero', { ascending: true });
    
    if (data) setUnits(data);
    setLoading(false);
  };

  const generateUnits = async () => {
    setGenerating(true);
    const newUnits = [];
    
    for (let bloco = 1; bloco <= TOTAL_BLOCOS; bloco++) {
      for (let andar = 1; andar <= TOTAL_ANDARES; andar++) {
        for (let apt = 1; apt <= APARTAMENTOS_POR_ANDAR; apt++) {
          newUnits.push({
            bloco: String(bloco).padStart(2, '0'),
            numero: `${andar}${apt.toString().padStart(2, '0')}`,
            tipo: 'RESIDENCIAL',
            status: 'VAGA',
            vagasGaragem: 1,
            observacoes: null
          });
        }
      }
    }

    const chunks = [];
    for (let i = 0; i < newUnits.length; i += 50) {
      chunks.push(newUnits.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      await supabase.from('units').insert(chunk);
      setGeneratedCount(prev => prev + chunk.length);
    }

    setGenerating(false);
    setShowWizard(false);
    fetchUnits();
  };

  const handleSubmit = async () => {
    if (!formData.numero) return;
    
    try {
      if (selectedUnit) {
        await supabase.from('units').update({
          bloco: formData.bloco,
          numero: formData.numero,
          tipo: formData.tipo,
          status: formData.status,
          vagasGaragem: formData.vagasGaragem,
          observacoes: formData.observacoes || null
        }).eq('id', selectedUnit.id);
      } else {
        await supabase.from('units').insert({
          bloco: formData.bloco,
          numero: formData.numero,
          tipo: formData.tipo,
          status: formData.status,
          vagasGaragem: formData.vagasGaragem,
          observacoes: formData.observacoes || null
        });
      }
      
      setShowModal(false);
      resetForm();
      fetchUnits();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta unidade?')) return;
    
    await supabase.from('units').delete().eq('id', id);
    fetchUnits();
  };

  const openEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      bloco: unit.bloco,
      numero: unit.numero,
      tipo: unit.tipo,
      status: unit.status,
      vagasGaragem: unit.vagasGaragem || 0,
      observacoes: unit.observacoes || ''
    });
    setShowModal(true);
  };

  const openDetail = (unit: Unit) => {
    setSelectedUnit(unit);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setSelectedUnit(null);
    setFormData({
      bloco: 'A',
      numero: '',
      tipo: 'RESIDENCIAL',
      status: 'VAGA',
      vagasGaragem: 0,
      observacoes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OCUPADA': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'VAGA': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'OBRAS': return 'amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'MANUTENCAO': return 'red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filtered = units.filter(u => {
    const matchSearch = !search || 
      u.numero.toLowerCase().includes(search.toLowerCase()) ||
      u.bloco.toLowerCase().includes(search.toLowerCase());
    const matchBloco = !filterBloco || u.bloco === filterBloco;
    const matchStatus = !filterStatus || u.status === filterStatus;
    const matchTipo = !filterTipo || u.tipo === filterTipo;
    return matchSearch && matchBloco && matchStatus && matchTipo;
  });

  const isAdmin = operatorRole === 'Admin';

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Building2 className="text-primary" />
            Unidades
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            {isAdmin ? 'Gerencie as unidades do condomínio' : 'Visualize as unidades'}
          </p>
        </motion.div>

        {isAdmin && units.length === 0 && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-amber-600 shadow-lg shadow-amber-500/20"
          >
            <Wand2 size={18} />
            Gerar Todas as {TOTAL_BLOCOS * TOTAL_ANDARES * APARTAMENTOS_POR_ANDAR} Unidades
          </motion.button>
        )}

        {isAdmin && units.length > 0 && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Nova Unidade
          </motion.button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por bloco ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
            />
          </div>
          
          <select
            value={filterBloco}
            onChange={(e) => setFilterBloco(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Todos os Blocos</option>
            {blocos.map(b => <option key={b} value={b}>Bloco {b}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Todos os Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">Todos os Tipos</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma unidade encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((unit) => (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openDetail(unit)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Bloco {unit.bloco} - {unit.numero}
                  </h3>
                  <p className="text-xs text-slate-500">{unit.tipo}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(unit.status)}`}>
                  {unit.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                {unit.vagasGaragem && unit.vagasGaragem > 0 && (
                  <span className="flex items-center gap-1">
                    <Car size={14} />
                    {unit.vagasGaragem} vagas
                  </span>
                )}
              </div>

              {isAdmin && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(unit); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg"
                  >
                    <Edit size={14} />
                    Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(unit.id); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="text-center mt-6 text-slate-400 text-sm">
        Total: {filtered.length} unidades
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {selectedUnit ? 'Editar Unidade' : 'Nova Unidade'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Bloco *</label>
                    <select
                      value={formData.bloco}
                      onChange={(e) => setFormData({...formData, bloco: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    >
                      {blocos.map(b => <option key={b} value={b}>Bloco {b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Número/Ap *</label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => setFormData({...formData, numero: e.target.value})}
                      placeholder="101, 102, A1..."
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Tipo *</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    >
                      {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    >
                      {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Vagas de Garagem</label>
                  <input
                    type="number"
                    value={formData.vagasGaragem}
                    onChange={(e) => setFormData({...formData, vagasGaragem: parseInt(e.target.value) || 0})}
                    min="0"
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                    rows={3}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm resize-none"
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
                  disabled={!formData.numero}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailModal && selectedUnit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Bloco {selectedUnit.bloco} - {selectedUnit.numero}
                  </h3>
                  <p className="text-slate-500">{selectedUnit.tipo}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedUnit.status)}`}>
                    {selectedUnit.status}
                  </span>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {selectedUnit.vagasGaragem && selectedUnit.vagasGaragem > 0 && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Car size={20} />
                    <span>{selectedUnit.vagasGaragem} vagas de garagem</span>
                  </div>
                )}

                {selectedUnit.observacoes && (
                  <div>
                    <h4 className="font-bold text-sm text-slate-500 mb-2">Observações</h4>
                    <p className="text-slate-700 dark:text-slate-300">{selectedUnit.observacoes}</p>
                  </div>
                )}

                <div className="text-center py-8 text-slate-400">
                  <Users size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Moradores e outros detalhes serão mostrados aqui</p>
                  <p className="text-xs mt-2">Configure a integração com moradores para ver detalhes</p>
                </div>
              </div>

              {isAdmin && (
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                  <button 
                    onClick={() => { setShowDetailModal(false); openEdit(selectedUnit); }}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Edit size={18} />
                    Editar
                  </button>
                  <button 
                    onClick={() => { setShowDetailModal(false); handleDelete(selectedUnit.id); }}
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Excluir
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWizard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <Wand2 className="text-primary" size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      Gerador de Unidades
                    </h3>
                    <p className="text-slate-500 text-sm">Crie todas as {TOTAL_BLOCOS * TOTAL_ANDARES * APARTAMENTOS_POR_ANDAR} unidades do condomínio</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Blocos:</span>
                    <span className="font-bold">{TOTAL_BLOCOS}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Andares por bloco:</span>
                    <span className="font-bold">{TOTAL_ANDARES}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Apartamentos por andar:</span>
                    <span className="font-bold">{APARTAMENTOS_POR_ANDAR}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Total de unidades:</span>
                      <span className="font-black text-primary text-lg">{TOTAL_BLOCOS * TOTAL_ANDARES * APARTAMENTOS_POR_ANDAR}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-4">
                  Padrão: Bloco 01-22, Apartamentos 101-504 (andar + número)
                </p>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <button 
                  onClick={() => setShowWizard(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={generateUnits}
                  disabled={generating}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Gerando... ({generatedCount}/{TOTAL_BLOCOS * TOTAL_ANDARES * APARTAMENTOS_POR_ANDAR})
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} />
                      Gerar Todas
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}