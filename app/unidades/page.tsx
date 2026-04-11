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
  AlertCircle,
  LayoutGrid,
  List,
  Wrench
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

const blocos = Array.from({ length: 22 }, (_, i) => String(i + 1).padStart(2, '0'));
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formData, setFormData] = useState({
    bloco: '01',
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
      bloco: '01',
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
      case 'OBRAS': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'MANUTENCAO': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OCUPADA': return { color: '#6daa45', label: 'Ocupado', bgColor: '#dcfce7', textColor: '#166534' };
      case 'VAGA': return { color: '#393836', label: 'Vago', bgColor: '#f1f5f9', textColor: '#475569' };
      case 'OBRAS': return { color: '#fdab43', label: 'Em Obras', bgColor: '#fef3c7', textColor: '#92400e' };
      case 'MANUTENCAO': return { color: '#dd6974', label: 'Inativo', bgColor: '#fee2e2', textColor: '#991b1b' };
      default: return { color: '#393836', label: status, bgColor: '#f1f5f9', textColor: '#475569' };
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

  const stats = {
    total: units.length,
    occupied: units.filter(u => u.status === 'OCUPADA').length,
    vacant: units.filter(u => u.status === 'VAGA').length,
    obras: units.filter(u => u.status === 'OBRAS').length,
    manutencao: units.filter(u => u.status === 'MANUTENCAO').length
  };

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

        <div className="flex items-center gap-3">
          {isAdmin && units.length < TOTAL_BLOCOS * TOTAL_ANDARES * APARTAMENTOS_POR_ANDAR && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-amber-600 shadow-lg shadow-amber-500/20"
            >
              <Wand2 size={18} />
              Gerar Todas
            </motion.button>
          )}
          
          <span className="text-sm font-bold text-slate-500">
            {units.length} / {TOTAL_BLOCOS * TOTAL_ANDARES * APARTAMENTOS_POR_ANDAR} unidades
          </span>

          {isAdmin && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Plus size={18} />
              Nova
            </motion.button>
          )}
        </div>
      </div>

      {units.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 text-center">
            <p className="text-3xl font-black text-green-600 dark:text-green-400">{stats.occupied}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Ocupadas</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <p className="text-3xl font-black text-slate-600 dark:text-slate-400">{stats.vacant}</p>
            <p className="text-xs text-slate-500">Vagas</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4 text-center">
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.obras}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Em Obras</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4 text-center">
            <p className="text-3xl font-black text-red-600 dark:text-red-400">{stats.manutencao}</p>
            <p className="text-xs text-red-600 dark:text-red-400">Manutenção</p>
          </div>
        </div>
      )}

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

          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterStatus(filterStatus === 'OCUPADA' ? '' : 'OCUPADA')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterStatus === 'OCUPADA' 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-2 border-green-500' 
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-green-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          {stats.occupied} Ocupadas
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'VAGA' ? '' : 'VAGA')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterStatus === 'VAGA' 
              ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-2 border-slate-500' 
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          {stats.vacant} Vagas
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'OBRAS' ? '' : 'OBRAS')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterStatus === 'OBRAS' 
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-2 border-amber-500' 
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          {stats.obras} Em Obras
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'MANUTENCAO' ? '' : 'MANUTENCAO')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterStatus === 'MANUTENCAO' 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-2 border-red-500' 
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          {stats.manutencao} Manutenção
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma unidade encontrada para este filtro</p>
          <button 
            onClick={() => { setSearch(''); setFilterBloco(''); setFilterStatus(''); setFilterTipo(''); }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm"
          >
            Limpar filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((unit) => {
            const statusConfig = getStatusConfig(unit.status);
            return (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: unit.status === 'MANUTENCAO' ? 0.5 : 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className={`relative bg-white dark:bg-slate-900 rounded-xl border-2 overflow-hidden cursor-pointer hover:shadow-xl transition-all ${
                  unit.status === 'VAGA' ? 'border-dashed border-slate-300 dark:border-slate-600' : ''
                }`}
                style={{ borderLeftColor: statusConfig.color, borderLeftWidth: '4px' }}
                onClick={() => openDetail(unit)}
              >
                {unit.status === 'OBRAS' && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-full">
                    <Wrench size={12} />
                  </div>
                )}
                
                {unit.status === 'OCUPADA' && (
                  <div className="absolute top-3 right-3">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                  </div>
                )}

                <div className="p-4 text-center">
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{unit.numero}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Bloco {unit.bloco}</p>
                  
                  <div className="mt-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold`} style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor }}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 p-3 flex items-center justify-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users size={12} />0</span>
                  <span className="flex items-center gap-1"><Car size={12} />{unit.vagasGaragem || 0}</span>
                  <span className="flex items-center gap-1"><Package size={12} />0</span>
                </div>

                {isAdmin && (
                  <div className="flex border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(unit); }}
                      className="flex-1 py-2 text-xs font-bold text-primary hover:bg-primary/10"
                    >
                      <Edit size={14} className="inline mr-1" />Editar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(unit.id); }}
                      className="flex-1 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border-l border-slate-100 dark:border-slate-800"
                    >
                      <Trash2 size={14} className="inline mr-1" />Excluir
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-3 font-bold text-slate-500">Unidade</th>
                <th className="text-left p-3 font-bold text-slate-500">Bloco</th>
                <th className="text-left p-3 font-bold text-slate-500">Status</th>
                <th className="text-center p-3 font-bold text-slate-500">Moradores</th>
                <th className="text-center p-3 font-bold text-slate-500">Veículos</th>
                <th className="text-center p-3 font-bold text-slate-500">Encomendas</th>
                {isAdmin && <th className="text-right p-3 font-bold text-slate-500">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((unit) => {
                const statusConfig = getStatusConfig(unit.status);
                return (
                  <tr key={unit.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => openDetail(unit)}>
                    <td className="p-3 font-black">{unit.numero}</td>
                    <td className="p-3">Bloco {unit.bloco}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold`} style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor }}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">0</td>
                    <td className="p-3 text-center">{unit.vagasGaragem || 0}</td>
                    <td className="p-3 text-center">0</td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(unit); }} className="text-primary text-xs font-bold mr-2">Editar</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(unit.id); }} className="text-red-500 text-xs font-bold">Excluir</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
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