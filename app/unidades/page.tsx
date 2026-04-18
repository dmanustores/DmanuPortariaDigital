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
  Wrench,
  Home,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { formatPhone, lookupUnitId, formatPlate } from '@/lib/utils';
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
  primaryResident?: string;
  // Runtime-computed fields populated in fetchUnits()
  allResidents?: { nome: string; label: string }[];
  totalMoradores?: number;
  totalVehicles?: number;
  vagas?: any[];
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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'planta' | 'panorama'>('panorama');
  const [selectedBloco, setSelectedBloco] = useState<string>('01');
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    bloco: '01',
    numero: '',
    tipo: 'RESIDENCIAL',
    status: 'VAGA',
    vagasGaragem: 0,
    observacoes: ''
  });

  // Estados para o Gerador Flexível
  const [configBlocks, setConfigBlocks] = useState(22);
  const [configFloors, setConfigFloors] = useState(5);
  const [configAptsPerFloor, setConfigAptsPerFloor] = useState(4);
  const [numberingPattern, setNumberingPattern] = useState<'FLOOR_BASED' | 'SEQUENTIAL'>('FLOOR_BASED');
  const [blockPrefix, setBlockPrefix] = useState('0'); // Prefixo para padding do bloco

  useEffect(() => {
    fetchUnits();
    fetchRole();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowDetailModal(false);
        setShowWizard(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    const { data: unitsData } = await supabase
      .from('units')
      .select('*')
      .order('bloco', { ascending: true })
      .order('numero', { ascending: true });
    
    // Fetch residents to show basic info
    const { data: residentsData } = await supabase
      .from('residents')
      .select('id, nome, bloco, apto');

    // Busca dependentes / familiares
    const { data: dependentsData } = await supabase
      .from('household_members')
      .select('nome, parentesco, resident_id');

    // Busca veículos
    const { data: vehiclesData } = await supabase
      .from('vehicles_registry')
      .select('moradorid');

    // Busca vagas da nova tabela
    const { data: vagasData } = await supabase
      .from('vagas')
      .select('id, codigo, status, unidade_id, veiculo_id, alugada_para_morador_id, vehicles(modelo, placa), alugado_para:residents!vagas_alugada_para_morador_id_fkey(nome)');

    if (unitsData) {
      const unitsWithResidents = unitsData.map((u: any) => {
        const unitVagas = vagasData?.filter((v: any) => v.unidade_id === u.id) || [];
        const primaryResidents = residentsData?.filter((r: any) => {
          // Normaliza blocos para comparação (remove zeros à esquerda)
          const rBloco = String(r.bloco || '').replace(/^0+/, '');
          const uBloco = String(u.bloco || '').replace(/^0+/, '');
          return rBloco === uBloco && String(r.apto) === String(u.numero);
        }).map((r: any) => ({ ...r, label: 'TITULAR RESPONSÁVEL' })) || [];
        
        let allResidents: any[] = [...primaryResidents];
        let totalVehicles = 0;
        
        primaryResidents.forEach((pr: any) => {
          const deps = dependentsData?.filter((d: any) => d.resident_id === pr.id).map((d: any) => ({ nome: d.nome, label: (d.parentesco || 'Dependente').toUpperCase() })) || [];
          allResidents = [...allResidents, ...deps];
          
          const veiculos = vehiclesData?.filter((v: any) => v.moradorid === pr.id) || [];
          totalVehicles += veiculos.length;
        });

        return {
          ...u,
          vagasGaragem: u.vagasgaragem ?? u.vagasGaragem ?? 0,
          vagas: unitVagas,
          totalMoradores: allResidents.length,
          totalVehicles: totalVehicles,
          primaryResident: allResidents.length > 0 ? allResidents[0].nome : undefined,
          allResidents: allResidents
        };
      });
      setUnits(unitsWithResidents);
    }
    setLoading(false);
  };

  const generateUnits = async () => {
    setGenerating(true);
    setGeneratedCount(0);
    const newUnits = [];
    
    for (let b = 1; b <= configBlocks; b++) {
      let sequentialCounter = 1;
      for (let f = 1; f <= configFloors; f++) {
        for (let a = 1; a <= configAptsPerFloor; a++) {
          const blocoStr = String(b).padStart(2, blockPrefix === '0' ? '0' : '');
          const numeroStr = numberingPattern === 'FLOOR_BASED' 
            ? `${f}${a.toString().padStart(2, '0')}`
            : String(sequentialCounter++).padStart(2, '0');

          newUnits.push({
            bloco: blocoStr,
            numero: numeroStr,
            tipo: 'RESIDENCIAL',
            status: 'VAGA',
            vagasgaragem: 1,
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
      const { data: insertedUnits } = await supabase.from('units').insert(chunk).select();
      if (insertedUnits && insertedUnits.length > 0) {
        const vagasToInsert = [];
        for (const unit of insertedUnits) {
          for (let i = 1; i <= unit.vagasgaragem; i++) {
            vagasToInsert.push({
              unidade_id: unit.id,
              codigo: `B${unit.bloco}-${unit.numero}-${String.fromCharCode(64 + i)}`,
              tipo: 'PADRAO',
              status: 'LIVRE'
            });
          }
        }
        if (vagasToInsert.length > 0) {
          await supabase.from('vagas').insert(vagasToInsert);
        }
      }
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
          vagasgaragem: formData.vagasGaragem,
          observacoes: formData.observacoes || null
        }).eq('id', selectedUnit.id);
        
        // Sync vagas logic (only creating missing ones up to formData.vagasGaragem)
        const { data: existingVagas } = await supabase.from('vagas').select('id, codigo').eq('unidade_id', selectedUnit.id);
        const currentCount = existingVagas?.length || 0;
        
        if (formData.vagasGaragem > currentCount) {
           const missing = formData.vagasGaragem - currentCount;
           const vagasToInsert = [];
           for(let i=1; i<=missing; i++) {
              vagasToInsert.push({
                unidade_id: selectedUnit.id,
                codigo: `B${formData.bloco}-${formData.numero}-${String.fromCharCode(64 + currentCount + i)}`,
                status: 'LIVRE'
              });
           }
           if (vagasToInsert.length > 0) await supabase.from('vagas').insert(vagasToInsert);
        }

      } else {
        const { data: newUnitRow } = await supabase.from('units').insert({
          bloco: formData.bloco,
          numero: formData.numero,
          tipo: formData.tipo,
          status: formData.status,
          vagasgaragem: formData.vagasGaragem,
          observacoes: formData.observacoes || null
        }).select().single();

        if (newUnitRow && formData.vagasGaragem > 0) {
          const vagasToInsert = [];
          for(let i=1; i<=formData.vagasGaragem; i++) {
             vagasToInsert.push({
               unidade_id: newUnitRow.id,
               codigo: `B${formData.bloco}-${formData.numero}-${String.fromCharCode(64 + i)}`,
               status: 'LIVRE'
             });
          }
           await supabase.from('vagas').insert(vagasToInsert);
        }
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

  const normalizeSearch = (text: string) => {
    return text.toLowerCase()
      .replace(/bloco|unidade|apto|unid|apt|u\./g, '')
      .trim();
  };

  const filtered = units.filter(u => {
    const cleanSearch = normalizeSearch(search);
    const matchSearch = !search || 
      u.numero.toLowerCase().includes(cleanSearch) ||
      u.bloco.toLowerCase().includes(cleanSearch) ||
      (search.toLowerCase().includes('bloco') && u.bloco === cleanSearch) ||
      u.primaryResident?.toLowerCase().includes(search.toLowerCase()) ||
      u.allResidents?.some((r: any) => r.nome.toLowerCase().includes(search.toLowerCase()));

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

  const isAdmin = operatorRole === 'Admin' || operatorRole === 'Owner';

  return (
    <DashboardLayout suppressHydrationWarning>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-4 sm:mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
            <Building2 className="text-primary" size={24} />
            Unidades
          </h2>
          <p className="text-slate-500 mt-0.5 sm:mt-1 text-xs sm:text-sm">
            {isAdmin ? 'Gerencie as unidades do condomínio' : 'Visualize as unidades'}
          </p>
        </motion.div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {isAdmin && units.length === 0 && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWizard(true)}
              className="flex-none flex items-center gap-2 bg-amber-500 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-amber-600 shadow-lg shadow-amber-500/20"
            >
              <Wand2 size={16} />
              Gerar Todas
            </motion.button>
          )}
          
          <span className="flex-none text-[10px] sm:text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
            {units.length} unidades
          </span>

          {isAdmin && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex-none flex items-center gap-2 bg-primary text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              Nova
            </motion.button>
          )}
        </div>
      </div>

      {units.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {/* Total */}
          <div 
            onClick={() => setFilterStatus('')}
            className={`cursor-pointer transition-all duration-300 rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center ${!filterStatus ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}
          >
            <p className={`text-xl sm:text-3xl font-black ${!filterStatus ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{stats.total}</p>
            <p className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${!filterStatus ? 'text-slate-400' : 'text-slate-500'}`}>Total</p>
          </div>

          {/* Ocupadas */}
          <div 
            onClick={() => setFilterStatus('OCUPADA')}
            className={`cursor-pointer transition-all duration-300 rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center ${filterStatus === 'OCUPADA' ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 hover:border-green-400'}`}
          >
            <p className={`text-xl sm:text-3xl font-black ${filterStatus === 'OCUPADA' ? 'text-white' : 'text-green-600 dark:text-green-400'}`}>{stats.occupied}</p>
            <p className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${filterStatus === 'OCUPADA' ? 'text-green-100' : 'text-green-600 dark:text-green-400'}`}>Ocupadas</p>
          </div>

          {/* Vagas */}
          <div 
            onClick={() => setFilterStatus('VAGA')}
            className={`cursor-pointer transition-all duration-300 rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center ${filterStatus === 'VAGA' ? 'bg-slate-700 border-slate-700 text-white shadow-lg shadow-slate-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
          >
            <p className={`text-xl sm:text-3xl font-black ${filterStatus === 'VAGA' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>{stats.vacant}</p>
            <p className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${filterStatus === 'VAGA' ? 'text-slate-300' : 'text-slate-500'}`}>Vagas</p>
          </div>

          {/* Em Obras */}
          <div 
            onClick={() => setFilterStatus('OBRAS')}
            className={`cursor-pointer transition-all duration-300 rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center ${filterStatus === 'OBRAS' ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 hover:border-amber-400'}`}
          >
            <p className={`text-xl sm:text-3xl font-black ${filterStatus === 'OBRAS' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`}>{stats.obras}</p>
            <p className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${filterStatus === 'OBRAS' ? 'text-amber-100' : 'text-amber-600'}`}>Em Obras</p>
          </div>

          {/* Manutenção */}
          <div 
            onClick={() => setFilterStatus('MANUTENCAO')}
            className={`cursor-pointer transition-all duration-300 rounded-lg sm:rounded-xl border p-3 sm:p-4 text-center ${filterStatus === 'MANUTENCAO' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 hover:border-red-400'}`}
          >
            <p className={`text-xl sm:text-3xl font-black ${filterStatus === 'MANUTENCAO' ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>{stats.manutencao}</p>
            <p className={`text-[10px] sm:text-xs uppercase font-bold tracking-wider ${filterStatus === 'MANUTENCAO' ? 'text-red-100' : 'text-red-600'}`}>Manutenção</p>
          </div>
        </div>
      )}

       <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Buscar unidade, bloco ou morador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <select
              value={filterBloco}
              onChange={(e) => setFilterBloco(e.target.value)}
              className="flex-1 sm:flex-none min-w-[110px] px-3 py-2 sm:py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium outline-none"
            >
              <option value="">Todos Blocos</option>
              {blocos.map(b => <option key={b} value={b}>Bloco {b}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 sm:flex-none min-w-[110px] px-3 py-2 sm:py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium outline-none"
            >
              <option value="">Todos Status</option>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="flex-1 sm:flex-none min-w-[110px] px-3 py-2 sm:py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium outline-none"
            >
              <option value="">Todos Tipos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-800 ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('planta')}
                className={`p-1.5 sm:p-2 rounded transition-all ${viewMode === 'planta' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
                title="Planta do Bloco (Grade Inteira)"
              >
                <Home size={16} />
              </button>
              <button
                onClick={() => setViewMode('panorama')}
                className={`p-1.5 sm:p-2 rounded transition-all ${viewMode === 'panorama' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
                title="Panorama Resumido"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 sm:p-2 rounded transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700'}`}
                title="Lista Vertical"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'panorama' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {blocos
            .filter(bloco => filtered.some(u => u.bloco === bloco))
            .map((bloco) => {
              const blocoUnitsFiltered = filtered.filter(u => u.bloco === bloco);
              const occupied = blocoUnitsFiltered.filter(u => u.status === 'OCUPADA').length;
              const totalInFilter = blocoUnitsFiltered.length;
              const percentage = (occupied / Math.max(totalInFilter, 1)) * 100;

            return (
              <motion.div
                key={bloco}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all p-4 flex flex-col border-slate-200 dark:border-slate-800 hover:border-primary/30"
              >
                  <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Building2 className="text-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg">Bloco {bloco}</h3>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        {occupied}/{totalInFilter} unidades listadas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedBloco(bloco); setViewMode('planta'); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-1"
                  >
                    Ver Planta <ChevronRight size={14} />
                  </button>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mb-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="bg-primary h-full"
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {blocoUnitsFiltered.map(unit => {
                    const statusConfig = getStatusConfig(unit.status);
                    return (
                      <button
                        key={unit.numero}
                        onClick={() => openDetail(unit)}
                        className="h-14 rounded-lg border flex flex-col items-center justify-center text-[10px] font-black transition-all relative group/item overflow-hidden border-l-4"
                        style={{ 
                          borderLeftColor: statusConfig.color,
                          backgroundColor: statusConfig.bgColor,
                          color: statusConfig.textColor
                        }}
                      >
                        <span className="text-xs">{unit.numero}</span>
                        {unit.primaryResident ? (
                          <span className="text-[6px] truncate max-w-[90%] opacity-80 uppercase leading-tight">
                            {unit.primaryResident.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-[7px] font-bold opacity-70" style={{ color: statusConfig.textColor }}>
                            {statusConfig.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {viewMode === 'planta' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 mb-6 shadow-sm overflow-x-auto scollbar-hide">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 min-w-max sm:min-w-0">
            <button 
              onClick={() => setViewMode('panorama')}
              className="px-3 py-1.5 flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs sm:text-sm font-black text-slate-600 dark:text-slate-400"
            >
              <span>← Voltar</span>
            </button>
            <div className="flex items-center gap-3">
              <label className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400">Bloco:</label>
              <select
                value={selectedBloco}
                onChange={(e) => setSelectedBloco(e.target.value)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm font-black outline-none"
              >
                {blocos.map(b => <option key={b} value={b}>Bloco {b}</option>)}
              </select>
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Bloco {selectedBloco}</h3>
          </div>

          <div className="flex flex-col gap-4">
            {[5, 4, 3, 2, 1].map(andar => (
              <div key={andar} className="flex items-center gap-2 min-w-max sm:min-w-0 justify-center">
                <div className="w-10 sm:w-16 text-[10px] sm:text-xs font-black text-slate-400 text-right uppercase tracking-tighter">Andar {andar}</div>
                <div className="flex gap-2 sm:gap-4 justify-center">
                  {[1, 2, 3, 4].map(apt => {
                    const numero = `${andar}${apt.toString().padStart(2, '0')}`;
                    const unit = units.find(u => u.bloco === selectedBloco && u.numero === numero);
                    const statusConfig = unit ? getStatusConfig(unit.status) : getStatusConfig('VAGA');
                    return (
                      <button
                        key={numero}
                        onClick={() => {
                          if (unit) {
                            openDetail(unit);
                          } else {
                            setFormData({ bloco: selectedBloco, numero, tipo: 'RESIDENCIAL', status: 'VAGA', vagasGaragem: 1, observacoes: '' });
                            setSelectedUnit(null);
                            setShowModal(true);
                          }
                        }}
                        className={`w-14 h-12 sm:w-20 sm:h-18 rounded-md sm:rounded-xl border-2 flex flex-col items-center justify-center transition-all hover:scale-105 shadow-sm ${
                          unit 
                            ? `border-l-4` 
                            : 'border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                        }`}
                        style={{ 
                          borderLeftColor: unit ? statusConfig.color : undefined,
                          backgroundColor: unit ? statusConfig.bgColor : undefined,
                          color: unit ? statusConfig.textColor : undefined,
                        }}
                      >
                        <span className="text-sm sm:text-lg font-black leading-none">{numero}</span>
                        {unit && (
                          <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-tighter opacity-70 mt-0.5">
                            {statusConfig.label}
                          </span>
                        )}
                        {!unit && (
                          <span className="text-[6px] sm:text-[8px] text-slate-400 font-bold uppercase mt-0.5">+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
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
                initial={{ opacity: 0 }}
                animate={{ opacity: unit.status === 'MANUTENCAO' ? 0.3 : 1 }}
                className={`relative bg-white dark:bg-slate-900 rounded-xl border-2 overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                  unit.status === 'VAGA' ? 'border-dashed border-slate-300 dark:border-slate-600' : ''
                }`}
                style={{ borderLeftColor: statusConfig.color, borderLeftWidth: '4px' }}
                onClick={() => openDetail(unit)}
              >
                <div className="p-4 text-center">
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{unit.numero}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Bloco {unit.bloco}</p>
                  
                  <div className="mt-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold`} style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor }}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 p-3 flex items-center justify-center gap-4 text-xs text-slate-500 font-bold">
                  <span className="flex items-center gap-1" title="Moradores"><Users size={12} className="text-primary" /> {unit.totalMoradores || 0}</span>
                  <span className={`flex items-center gap-1 ${((unit.totalVehicles || 0) > (unit.vagasGaragem || 0)) ? 'text-red-500' : ''}`} title={`Veículos: ${unit.totalVehicles || 0} cadastrados de ${unit.vagasGaragem || 0} vagas`}>
                    <Car size={12} className={(unit.totalVehicles || 0) > (unit.vagasGaragem || 0) ? 'text-red-500' : 'text-amber-500'} /> 
                    {unit.totalVehicles || 0} / {unit.vagasGaragem || 0}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-3 font-bold text-slate-500">Bloco</th>
                <th className="text-left p-3 font-bold text-slate-500 text-lg uppercase">Unidade</th>
                <th className="text-left p-3 font-bold text-slate-500">Status</th>
                <th className="text-center p-3 font-bold text-primary">Moradores</th>
                <th className="text-center p-3 font-bold text-amber-500">Veículos</th>
                {isAdmin && <th className="text-right p-3 font-bold text-slate-500">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((unit, index) => {
                const statusConfig = getStatusConfig(unit.status);
                const isNewBlock = index === 0 || filtered[index - 1].bloco !== unit.bloco;
                
                return (
                  <React.Fragment key={unit.id}>
                    {isNewBlock && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                        <td colSpan={isAdmin ? 6 : 5} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Bloco {unit.bloco}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors" onClick={() => openDetail(unit)}>
                      <td className="p-3 font-semibold text-slate-400 dark:text-slate-500 text-xs italic">Bloco {unit.bloco}</td>
                      <td className="p-3 font-black text-xl text-slate-900 dark:text-white">{unit.numero}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold`} style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor }}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-primary">{unit.totalMoradores || 0}</td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold ${(unit.totalVehicles || 0) > (unit.vagasGaragem || 0) ? 'text-red-500' : 'text-amber-500'}`}>
                            {unit.totalVehicles || 0}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase opacity-80 mt-0.5">
                            de {unit.vagasGaragem || 0} vaga{(unit.vagasGaragem || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(unit); }} className="text-primary text-xs font-bold mr-2 hover:underline">Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(unit.id); }} className="text-red-500 text-xs font-bold hover:underline">Excluir</button>
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="text-center mt-6 text-slate-400 text-sm">
        Total: {filtered.length} unidades mostradas
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
                
                {/* INFO GRID */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{selectedUnit.tipo}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center border ${
                    (selectedUnit.vagasGaragem ?? 0) > 0
                      ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1" title="Lotação máxima da garagem">Capacidade</p>
                    <div className="flex items-center justify-center gap-1">
                      <Car size={14} className={(selectedUnit.vagasGaragem ?? 0) > 0 ? 'text-blue-500' : 'text-slate-400'} />
                      <p className={`text-xl font-black ${(selectedUnit.vagasGaragem ?? 0) > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                        {selectedUnit.vagasGaragem ?? 0}
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5" title="Vagas que pertencem a esta unidade">
                      {(selectedUnit.vagasGaragem ?? 0) === 1 ? 'vaga total' : 'vagas totais'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Veículos</p>
                    <p className={`text-xl font-black ${(selectedUnit.totalVehicles ?? 0) > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                      {selectedUnit.totalVehicles ?? 0}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">cadastrado{(selectedUnit.totalVehicles ?? 0) !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* SLOTS DA UNIDADE */}
                {selectedUnit.vagas && selectedUnit.vagas.length > 0 && (
                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Slots de Garagem Gerados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedUnit.vagas.map((vaga: any) => (
                        <div key={vaga.id} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm">{vaga.codigo}</span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                              vaga.status === 'LIVRE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                              vaga.status === 'OCUPADA' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                              'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
                            }`}>
                              {vaga.status}
                            </span>
                          </div>
                          {vaga.vehicles && (
                            <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase truncate">
                              🚗 {vaga.vehicles.modelo} — <span className="p-0.5 px-1 bg-primary/10 text-primary border border-primary/20 rounded">{formatPlate(vaga.vehicles.placa)}</span>
                            </div>
                          )}
                          {vaga.status === 'ALUGADA' && vaga.alugado_para && (
                            <div className="mt-2 text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase truncate flex items-center gap-1.5">
                              <Building2 size={12} />
                              Locatário: {vaga.alugado_para.nome}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUnit.observacoes && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4">
                    <h4 className="font-black text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Observações</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedUnit.observacoes}</p>
                  </div>
                )}

                {selectedUnit.allResidents && selectedUnit.allResidents.length > 0 ? (
                  <div>
                    <p className="text-xs font-black tracking-wider text-slate-500 uppercase mb-3">
                      Moradores Vinculados ({selectedUnit.allResidents.length})
                    </p>
                    <div className="flex flex-col gap-2">
                      {selectedUnit.allResidents.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg flex-none">
                            {r.nome.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white uppercase">{r.nome}</p>
                            <p className="text-[10px] text-slate-500 font-bold tracking-wider">{r.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Users size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Unidade sem moradores vinculados no momento</p>
                  </div>
                )}
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
                    <p className="text-slate-500 text-sm">Configure a estrutura base do condomínio</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Qtd. Blocos</label>
                      <input 
                        type="number" 
                        value={configBlocks}
                        onChange={(e) => setConfigBlocks(Number(e.target.value))}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Andares</label>
                      <input 
                        type="number" 
                        value={configFloors}
                        onChange={(e) => setConfigFloors(Number(e.target.value))}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Aptos/Andar</label>
                      <input 
                        type="number" 
                        value={configAptsPerFloor}
                        onChange={(e) => setConfigAptsPerFloor(Number(e.target.value))}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Padrão de Numeração</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setNumberingPattern('FLOOR_BASED')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${numberingPattern === 'FLOOR_BASED' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                      >
                        Hoteleiro (101, 102...)
                      </button>
                      <button 
                        onClick={() => setNumberingPattern('SEQUENTIAL')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${numberingPattern === 'SEQUENTIAL' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                      >
                        Sequencial (1, 2, 3...)
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Resumo da Geração</p>
                    <div className="flex justify-between items-center">
                      <div className="text-white">
                        <span className="text-2xl font-black">{configBlocks * configFloors * configAptsPerFloor}</span>
                        <span className="text-xs ml-2 text-slate-400">unidades totais</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-primary font-black uppercase">Exemplo de Unidade:</p>
                        <p className="text-sm font-bold text-white">
                          Bloco {String(1).padStart(2, blockPrefix === '0' ? '0' : '')} - {numberingPattern === 'FLOOR_BASED' ? '101' : '01'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                  <button 
                    onClick={() => setShowWizard(false)}
                    className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={generateUnits}
                    disabled={generating}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>Gerando ({generatedCount})...</>
                    ) : (
                      <>
                        <Wand2 size={18} />
                        Gerar Todas
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}