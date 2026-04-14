'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Car, 
  Plus, 
  Search,
  LogIn,
  LogOut,
  X,
  Save,
  Key,
  Clock,
  AlertTriangle,
  User,
  FileText,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { getCurrentOperatorId } from '@/lib/utils';

interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  unidadeDesc?: string;
  unidadeId?: string;
  tipo: string;
  nomeProprietario?: string;
  telefone?: string;
  moradorId?: string;
  status: string;
  created_at: string;
}

interface Resident {
  id: string;
  nome: string;
  bloco?: string;
  apto?: string;
  celular?: string;
  foto?: string;
  tipo?: string; // PROPRIETARIO | LOCATARIO
}

export default function VeiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Por padrão, todos os filtros vêm marcados
  const [activeFilters, setActiveFilters] = useState<string[]>(['PROPRIETARIO', 'LOCATARIO', 'VISITANTE', 'PRESTADOR']);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [moradorSearch, setMoradorSearch] = useState('');
  const [showMoradorDropdown, setShowMoradorDropdown] = useState(false);
  const [selectedMorador, setSelectedMorador] = useState<Resident | null>(null);
  const moradorRef = useRef<HTMLDivElement>(null);
  const unidadeRef = useRef<HTMLDivElement>(null);
  const [blocoSearch, setBlocoSearch] = useState('');
  const [apartamentoSearch, setApartamentoSearch] = useState('');
  const [showUnidadeDropdown, setShowUnidadeDropdown] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<Resident | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    tipoDocumento: 'CPF',
    placa: '',
    modelo: '',
    cor: '',
    unidadeDesc: '',
    tipo: 'VISITANTE',
    nomeProprietario: '',
    telefone: '',
    moradorId: ''
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moradorRef.current && !moradorRef.current.contains(event.target as Node)) {
        setShowMoradorDropdown(false);
      }
      if (unidadeRef.current && !unidadeRef.current.contains(event.target as Node)) {
        setShowUnidadeDropdown(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResidents = async () => {
    const { data, error } = await supabase
      .from('residents')
      .select('id, nome, bloco, apto, celular, foto, tipo')
      .order('nome');
    if (error) {
      console.error('❌ Erro ao buscar moradores:', error);
    }
    if (data) {
      console.log('✅ Moradores carregados:', data.length, 'total');
      setResidents(data);
    } else {
      console.log('⚠️ Nenhum morador retornado do banco');
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles_registry')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setVehicles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
    fetchResidents();
    getCurrentOperatorId(supabase).then(setOperatorId);
  }, []);

  const filteredResidents = residents.filter(r => 
    r.nome.toLowerCase().includes(moradorSearch.toLowerCase())
  ).slice(0, 10);

  // Lista de unidades com bloco e apto preenchidos
  const unidadesDisponiveis = residents.filter(r => r.bloco && r.apto);
  
  useEffect(() => {
    console.log('📊 Debug Info:');
    console.log('- Total residents:', residents.length);
    console.log('- Residents com bloco/apto:', unidadesDisponiveis.length);
    if (residents.length > 0 && unidadesDisponiveis.length === 0) {
      console.warn('⚠️ ATENÇÃO: Moradores foram carregados mas NENHUM tem bloco/apto preenchido!');
      console.log('Sample resident sem bloco/apto:', residents[0]);
    }
  }, [residents]);

  const filteredUnidades = unidadesDisponiveis.filter(r => {
    // Converte para string e remove espaços
    const blocoStr = String(r.bloco).trim().padStart(2, '0');
    const numeroStr = String(r.apto).trim();
    const searchBloco = blocoSearch.trim().padStart(2, '0');
    const searchApartamento = apartamentoSearch.trim();

    // Se nenhum campo foi preenchido, mostra todas as unidades disponíveis
    if (!searchBloco && !searchApartamento) return true;

    // Filtra por bloco se preenchido
    if (searchBloco && !searchApartamento) {
      return blocoStr.includes(searchBloco);
    }

    // Filtra por apartamento se preenchido
    if (searchApartamento && !searchBloco) {
      return numeroStr.includes(searchApartamento);
    }

    // Filtra por ambos se preenchidos
    if (searchBloco && searchApartamento) {
      return blocoStr.includes(searchBloco) && numeroStr.includes(searchApartamento);
    }

    return false;
  }).slice(0, 15);

  const handleSelectMorador = (resident: Resident) => {
    setSelectedMorador(resident);
    setMoradorSearch(resident.nome);
    // Auto-set tipo based on resident type (PROPRIETARIO or LOCATARIO)
    const tipoResidente = resident.tipo === 'PROPRIETARIO' ? 'PROPRIETARIO' : 'LOCATARIO';
    setFormData({
      ...formData,
      nomeProprietario: resident.nome,
      telefone: resident.celular || '',
      moradorId: resident.id,
      tipo: tipoResidente,
      unidadeDesc: resident.bloco && resident.apto 
        ? `Bloco ${resident.bloco}, Apt ${resident.apto}` 
        : ''
    });
    setShowMoradorDropdown(false);
  };

  const handleSelectUnidade = (resident: Resident) => {
    setSelectedUnidade(resident);
    const unidadeDesc = resident.bloco && resident.apto 
      ? `Bloco ${resident.bloco}, Apt ${resident.apto}` 
      : '';
    setBlocoSearch(resident.bloco || '');
    setApartamentoSearch(resident.apto || '');
    setFormData({
      ...formData,
      unidadeDesc,
      moradorId: resident.id,
      telefone: resident.celular || ''
    });
    setShowUnidadeDropdown(false);
  };

  const clearMoradorSelection = () => {
    setSelectedMorador(null);
    setMoradorSearch('');
    setFormData({
      ...formData,
      nomeProprietario: '',
      telefone: '',
      moradorId: '',
      unidadeDesc: ''
    });
  };

  const clearUnidadeSelection = () => {
    setSelectedUnidade(null);
    setBlocoSearch('');
    setApartamentoSearch('');
    setFormData({
      ...formData,
      unidadeDesc: '',
      moradorId: ''
    });
  };

  const handleSubmit = async () => {
    try {
      // Validação básica
      if (!formData.nome.trim() || !formData.documento.trim() || !formData.placa.trim() || !formData.unidadeDesc.trim()) {
        alert('Por favor, preencha todos os campos obrigatórios (Nome, Documento, Placa, Unidade)');
        return;
      }

      // Validar se moradorId está preenchido (referência à unidade)
      if (!formData.moradorId) {
        alert('Por favor, selecione uma unidade válida');
        return;
      }

      // Para visitantes/prestadores, nome do condutor é obrigatório
      if (formData.tipo !== 'MORADOR' && !formData.nomeProprietario.trim()) {
        alert('Por favor, preencha o nome do condutor');
        return;
      }

      const nomeProprietario = formData.tipo === 'MORADOR' 
        ? formData.nome 
        : formData.nomeProprietario;

      // Lookup real unit ID
      let unitId: string | null = null;
      if (formData.unidadeDesc) {
        const blocoMatch = formData.unidadeDesc.match(/bloco\s*([0-9a-z]+)/i);
        const aptoMatch  = formData.unidadeDesc.match(/apt[o]?\s*([0-9a-z]+)/i);
        if (blocoMatch && aptoMatch) {
          const { data: unitData } = await supabase
            .from('units')
            .select('id')
            .eq('bloco', blocoMatch[1].padStart(2, '0'))
            .eq('numero', aptoMatch[1])
            .maybeSingle();
          unitId = unitData?.id ?? null;
        }
      }

      await supabase.from('vehicles_registry').insert({
        placa: formData.placa.toUpperCase(),
        modelo: formData.modelo || null,
        cor: formData.cor || null,
        unidadeId: unitId,
        unidadeDesc: formData.unidadeDesc || null,
        tipo: formData.tipo,
        nomeProprietario: nomeProprietario || null,
        telefone: formData.telefone || null,
        moradorId: formData.moradorId || null,
        status: 'ATIVO'
      });
      
      setShowModal(false);
      setFormData({
        nome: '',
        documento: '',
        tipoDocumento: 'CPF',
        placa: '',
        modelo: '',
        cor: '',
        unidadeDesc: '',
        tipo: 'VISITANTE',
        nomeProprietario: '',
        telefone: '',
        moradorId: ''
      });
      setSelectedMorador(null);
      setMoradorSearch('');
      setSelectedUnidade(null);
      setBlocoSearch('');
      setApartamentoSearch('');
      fetchVehicles();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar veículo');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await supabase.from('vehicles_registry').delete().eq('id', id);
      fetchVehicles();
    }
  };

  const filtered = vehicles.filter(v => {
    const nameToSearch = v.nomeProprietario || '';
    const unitToSearch = v.unidadeDesc || '';
    const matchSearch = !search || 
      v.placa.toLowerCase().includes(search.toLowerCase()) ||
      (v.modelo?.toLowerCase().includes(search.toLowerCase())) ||
      (nameToSearch.toLowerCase().includes(search.toLowerCase())) ||
      (unitToSearch.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = activeFilters.length === 0 || activeFilters.includes(v.tipo);
    return matchSearch && matchFilter;
  });

  const toggleFilter = (filterCategory: string) => {
    // Lógica especial: quando clica "MORADORES", adiciona PROPRIETARIO e LOCATARIO
    let newFilters: string[];
    
    if (filterCategory === 'MORADORES') {
      // Verifica se já tem moradores selecionados
      const hasBothResident = activeFilters.includes('PROPRIETARIO') && activeFilters.includes('LOCATARIO');
      
      if (hasBothResident) {
        // Remove ambos
        newFilters = activeFilters.filter(t => t !== 'PROPRIETARIO' && t !== 'LOCATARIO');
      } else {
        // Remove se existir um parcial, depois adiciona os dois
        newFilters = activeFilters.filter(t => t !== 'PROPRIETARIO' && t !== 'LOCATARIO');
        newFilters = [...newFilters, 'PROPRIETARIO', 'LOCATARIO'];
      }
    } else {
      // Para outros filtros, comportamento normal
      if (activeFilters.includes(filterCategory)) {
        newFilters = activeFilters.filter(t => t !== filterCategory);
      } else {
        newFilters = [...activeFilters, filterCategory];
      }
    }
    
    setActiveFilters(newFilters);
  };

  // Contar moradores: PROPRIETARIO + LOCATARIO
  const moradorCount = vehicles.filter(v => v.tipo === 'PROPRIETARIO' || v.tipo === 'LOCATARIO').length;
  const visitanteCount = vehicles.filter(v => v.tipo === 'VISITANTE').length;
  const prestadorCount = vehicles.filter(v => v.tipo === 'PRESTADOR').length;
  
  // Verificar se moradores estão filtrados (ambos PROPRIETARIO e LOCATARIO selecionados)
  const moradoresAtivos = activeFilters.includes('PROPRIETARIO') && activeFilters.includes('LOCATARIO');

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Veículos</h2>
          <p className="text-slate-500 mt-1 text-sm">Controle de veículos do condomínio</p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-3">
          {/* MORADORES: Proprietários + Locatários */}
          <button 
            onClick={() => toggleFilter('MORADORES')}
            className={`px-4 py-2 rounded-lg transition-all border-2 ${moradoresAtivos ? 'bg-blue-500 text-white border-blue-600 shadow-md transform scale-105' : 'bg-blue-100 dark:bg-blue-900/30 border-transparent hover:bg-blue-200 cursor-pointer'}`}
            title="Proprietários e Locatários"
          >
            <span className={`font-bold text-sm ${moradoresAtivos ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`}>{moradorCount} Moradores</span>
          </button>

          {/* VISITANTES */}
          <button 
            onClick={() => toggleFilter('VISITANTE')}
            className={`px-4 py-2 rounded-lg transition-all border-2 ${activeFilters.includes('VISITANTE') ? 'bg-green-500 text-white border-green-600 shadow-md transform scale-105' : 'bg-green-100 dark:bg-green-900/30 border-transparent hover:bg-green-200 cursor-pointer'}`}
            title="Visitantes do condomínio"
          >
            <span className={`font-bold text-sm ${activeFilters.includes('VISITANTE') ? 'text-white' : 'text-green-700 dark:text-green-400'}`}>{visitanteCount} Visitantes</span>
          </button>

          {/* PRESTADORES */}
          {prestadorCount > 0 && (
            <button 
              onClick={() => toggleFilter('PRESTADOR')}
              className={`px-4 py-2 rounded-lg transition-all border-2 ${activeFilters.includes('PRESTADOR') ? 'bg-amber-500 text-white border-amber-600 shadow-md transform scale-105' : 'bg-amber-100 dark:bg-amber-900/30 border-transparent hover:bg-amber-200 cursor-pointer'}`}
              title="Prestadores de serviço"
            >
              <span className={`font-bold text-sm ${activeFilters.includes('PRESTADOR') ? 'text-white' : 'text-amber-700 dark:text-amber-400'}`}>{prestadorCount} Prestadores</span>
            </button>
          )}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Novo Veículo
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por placa, modelo, proprietário ou unidade (bloco/apt)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>

        {/* Dropdown Filtro */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Filtros ▼
          </button>

          {showFilterMenu && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 p-4">
              <div className="space-y-3">
                {/* Proprietários */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes('PROPRIETARIO')}
                    onChange={() => {
                      if (activeFilters.includes('PROPRIETARIO')) {
                        setActiveFilters(activeFilters.filter(f => f !== 'PROPRIETARIO'));
                      } else {
                        setActiveFilters([...activeFilters, 'PROPRIETARIO']);
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Proprietários</span>
                </label>

                {/* Locatários */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes('LOCATARIO')}
                    onChange={() => {
                      if (activeFilters.includes('LOCATARIO')) {
                        setActiveFilters(activeFilters.filter(f => f !== 'LOCATARIO'));
                      } else {
                        setActiveFilters([...activeFilters, 'LOCATARIO']);
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Locatários</span>
                </label>

                {/* Visitantes */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes('VISITANTE')}
                    onChange={() => {
                      if (activeFilters.includes('VISITANTE')) {
                        setActiveFilters(activeFilters.filter(f => f !== 'VISITANTE'));
                      } else {
                        setActiveFilters([...activeFilters, 'VISITANTE']);
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Visitantes</span>
                </label>

                {/* Prestadores */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeFilters.includes('PRESTADOR')}
                    onChange={() => {
                      if (activeFilters.includes('PRESTADOR')) {
                        setActiveFilters(activeFilters.filter(f => f !== 'PRESTADOR'));
                      } else {
                        setActiveFilters([...activeFilters, 'PRESTADOR']);
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium">Prestadores</span>
                </label>

                {/* Separador */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                  <button
                    onClick={() => setActiveFilters(['PROPRIETARIO', 'LOCATARIO', 'VISITANTE', 'PRESTADOR'])}
                    className="w-full px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Selecionar Todos
                  </button>
                  <button
                    onClick={() => setActiveFilters([])}
                    className="w-full px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mt-2"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Placa</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Veículo</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Proprietário</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Unidade</th>
                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhum veículo</td></tr>
              ) : filtered.map((vehicle) => (
                <tr key={vehicle.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Key size={16} className="text-slate-400" />
                      <span className="font-mono font-bold text-sm">{vehicle.placa}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-semibold">{vehicle.modelo || '-'}</p>
                      {vehicle.cor && <p className="text-xs text-slate-400">{vehicle.cor}</p>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-bold">{vehicle.nomeProprietario || '-'}</p>
                      {vehicle.telefone && <p className="text-xs text-slate-400">{vehicle.telefone}</p>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1.5 font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
                      {vehicle.unidadeDesc || 'Sem destino'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                      vehicle.tipo === 'PROPRIETARIO' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : vehicle.tipo === 'LOCATARIO'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : vehicle.tipo === 'VISITANTE'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : vehicle.tipo === 'PRESTADOR'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
                    }`}>
                      {vehicle.tipo}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 flex justify-between items-center">
                <h3 className="text-xl font-bold">Novo Cadastro de Veículo</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* SEÇÃO 1: DADOS PESSOAIS */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <User size={16} />
                    DADOS PESSOAIS / CONDUTOR
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 text-primary">Nome Completo *</label>
                      <input 
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                        placeholder="Ex: João da Silva"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2 text-primary">Tipo *</label>
                        <select 
                          value={formData.tipoDocumento}
                          onChange={(e) => setFormData({...formData, tipoDocumento: e.target.value})}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                        >
                          <option value="CPF">CPF</option>
                          <option value="RG">RG</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-bold mb-2 text-primary">{formData.tipoDocumento} *</label>
                        <input 
                          type="text"
                          value={formData.documento}
                          onChange={(e) => setFormData({...formData, documento: e.target.value})}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                          placeholder={formData.tipoDocumento === 'CPF' ? '000.000.000-00' : '00.000.000-0'}
                          maxLength={formData.tipoDocumento === 'CPF' ? 14 : 12}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: DADOS DO VEÍCULO */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Car size={16} />
                    DADOS DO VEÍCULO
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 text-primary">Placa *</label>
                      <input 
                        type="text"
                        value={formData.placa}
                        onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-lg"
                        placeholder="AAA-0000"
                        maxLength={8}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">Modelo</label>
                        <input 
                          type="text"
                          value={formData.modelo}
                          onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                          placeholder="Ex: Honda Civic"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Cor</label>
                        <input 
                          type="text"
                          value={formData.cor}
                          onChange={(e) => setFormData({...formData, cor: e.target.value})}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                          placeholder="Ex: Prata"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2 text-primary">Tipo de Veículo *</label>
                      <select 
                        value={formData.tipo}
                        onChange={(e) => {
                          const newTipo = e.target.value;
                          setFormData({
                            ...formData, 
                            tipo: newTipo
                          });
                        }}
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value="VISITANTE">Veículo de Visitante</option>
                        <option value="PROPRIETARIO">Veículo de Proprietário</option>
                        <option value="LOCATARIO">Veículo de Locatário</option>
                        <option value="PRESTADOR">Veículo de Prestador</option>
                        <option value="MUDANCA">Veículo de Mudança</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 3: UNIDADE DE DESTINO */}
                <div ref={unidadeRef} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 relative">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Building size={16} />
                    UNIDADE DE DESTINO
                  </h4>
                  <div className="space-y-4">
                    {/* Campos Bloco e Apartamento */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-sm font-bold mb-2 text-primary">Bloco (Número) *</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={blocoSearch}
                          onChange={(e) => {
                            setBlocoSearch(e.target.value);
                            setShowUnidadeDropdown(true);
                          }}
                          onFocus={() => setShowUnidadeDropdown(true)}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                          placeholder="1, 2, A, B..."
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-bold mb-2 text-primary">Apartamento (Número) *</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={apartamentoSearch}
                          onChange={(e) => {
                            setApartamentoSearch(e.target.value);
                            setShowUnidadeDropdown(true);
                          }}
                          onFocus={() => setShowUnidadeDropdown(true)}
                          className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                          placeholder="101, 201, 302..."
                        />
                      </div>
                    </div>

                    {/* Dropdown de Resultados */}
                    {showUnidadeDropdown && filteredUnidades.length > 0 && (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2">
                          {!blocoSearch && !apartamentoSearch && (
                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700">
                              📋 SUGESTÕES DISPONÍVEIS:
                            </div>
                          )}
                          {filteredUnidades.map((resident) => (
                            <button
                              key={resident.id}
                              onClick={() => handleSelectUnidade(resident)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 rounded transition-colors"
                            >
                              <p className="font-semibold text-sm">
                                Bloco {resident.bloco}, Apt {resident.apto}
                              </p>
                              <p className="text-xs text-slate-500">👤 {resident.nome}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mensagem quando não há resultados */}
                    {showUnidadeDropdown && (blocoSearch || apartamentoSearch) && filteredUnidades.length === 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 text-center">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 font-semibold mb-2">
                          ❌ Nenhuma unidade encontrada
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-3">
                          Bloco {blocoSearch || '?'} Apt {apartamentoSearch || '?'} - Verifique se está cadastrado
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setBlocoSearch('');
                            setApartamentoSearch('');
                          }}
                          className="text-xs px-3 py-1.5 bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 rounded hover:bg-yellow-300 transition-colors"
                        >
                          Ver Sugestões
                        </button>
                      </div>
                    )}

                    {/* Mensagem se nenhuma unidade está cadastrada no sistema */}
                    {showUnidadeDropdown && unidadesDisponiveis.length === 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
                        <p className="text-sm text-red-700 dark:text-red-400 font-semibold">
                          ⚠️ Nenhuma unidade cadastrada no sistema
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                          Cadastre moradores com informações de Bloco e Apartamento em Moradores
                        </p>
                      </div>
                    )}

                    {/* Confirmação da Unidade Selecionada */}
                    {formData.unidadeDesc && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Unidade Selecionada:</p>
                          <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{formData.unidadeDesc}</p>
                        </div>
                        <button 
                          onClick={clearUnidadeSelection}
                          className="text-blue-600 hover:text-red-600 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.nome || !formData.documento || !formData.placa || !formData.moradorId}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar Veículo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}