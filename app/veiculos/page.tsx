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
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  unidadeDesc?: string;
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
  numero?: string;
  celular?: string;
  foto?: string;
}

export default function VeiculosPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [moradorSearch, setMoradorSearch] = useState('');
  const [showMoradorDropdown, setShowMoradorDropdown] = useState(false);
  const [selectedMorador, setSelectedMorador] = useState<Resident | null>(null);
  const moradorRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    placa: '',
    modelo: '',
    cor: '',
    unidadeDesc: '',
    tipo: 'MORADOR',
    nomeProprietario: '',
    telefone: '',
    moradorId: ''
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moradorRef.current && !moradorRef.current.contains(event.target as Node)) {
        setShowMoradorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('residents')
      .select('id, nome, bloco, numero, celular, foto')
      .order('nome');
    if (data) setResidents(data);
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
  }, []);

  const filteredResidents = residents.filter(r => 
    r.nome.toLowerCase().includes(moradorSearch.toLowerCase())
  ).slice(0, 10);

  const handleSelectMorador = (resident: Resident) => {
    setSelectedMorador(resident);
    setMoradorSearch(resident.nome);
    setFormData({
      ...formData,
      nomeProprietario: formData.tipo === 'MORADOR' ? resident.nome : formData.nomeProprietario,
      telefone: formData.tipo === 'MORADOR' ? (resident.celular || '') : formData.telefone,
      moradorId: resident.id,
      unidadeDesc: resident.bloco && resident.numero 
        ? `Bloco ${resident.bloco}, Apt ${resident.numero}` 
        : ''
    });
    setShowMoradorDropdown(false);
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

  const handleSubmit = async () => {
    try {
      await supabase.from('vehicles_registry').insert({
        placa: formData.placa.toUpperCase(),
        modelo: formData.modelo || null,
        cor: formData.cor || null,
        unidadeDesc: formData.unidadeDesc || null,
        tipo: formData.tipo,
        nomeProprietario: formData.nomeProprietario || null,
        telefone: formData.telefone || null,
        moradorId: formData.moradorId || null,
        status: 'ATIVO'
      });
      
      setShowModal(false);
      setFormData({
        placa: '',
        modelo: '',
        cor: '',
        unidadeDesc: '',
        tipo: 'MORADOR',
        nomeProprietario: '',
        telefone: '',
        moradorId: ''
      });
      setSelectedMorador(null);
      setMoradorSearch('');
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
    const nameToSearch = v.nomeProprietario || v.nomeproprietario || '';
    const unitToSearch = v.unidadeDesc || v.unidadedesc || '';
    const matchSearch = !search || 
      v.placa.toLowerCase().includes(search.toLowerCase()) ||
      (v.modelo?.toLowerCase().includes(search.toLowerCase())) ||
      (nameToSearch.toLowerCase().includes(search.toLowerCase())) ||
      (unitToSearch.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'TODOS' || v.tipo === filter;
    return matchSearch && matchFilter;
  });

  const moradorCount = vehicles.filter(v => v.tipo === 'MORADOR').length;
  const visitanteCount = vehicles.filter(v => v.tipo === 'VISITANTE').length;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Veículos</h2>
          <p className="text-slate-500 mt-1 text-sm">Controle de veículos do condomínio</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setFilter(filter === 'MORADOR' ? 'TODOS' : 'MORADOR')}
            className={`px-4 py-2 rounded-lg transition-all border-2 ${filter === 'MORADOR' ? 'bg-blue-500 text-white border-blue-600 shadow-md transform scale-105' : 'bg-blue-100 dark:bg-blue-900/30 border-transparent hover:bg-blue-200 cursor-pointer'}`}
          >
            <span className={`font-bold text-sm ${filter === 'MORADOR' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`}>{moradorCount} moradores</span>
          </button>
          <button 
            onClick={() => setFilter(filter === 'VISITANTE' ? 'TODOS' : 'VISITANTE')}
            className={`px-4 py-2 rounded-lg transition-all border-2 ${filter === 'VISITANTE' ? 'bg-green-500 text-white border-green-600 shadow-md transform scale-105' : 'bg-green-100 dark:bg-green-900/30 border-transparent hover:bg-green-200 cursor-pointer'}`}
          >
            <span className={`font-bold text-sm ${filter === 'VISITANTE' ? 'text-white' : 'text-green-700 dark:text-green-400'}`}>{visitanteCount} visitantes</span>
          </button>
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
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
        >
          <option value="TODOS">Todos</option>
          <option value="MORADOR">Morador</option>
          <option value="VISITANTE">Visitante</option>
          <option value="PRESTADOR">Prestador</option>
          <option value="MUDANCA">Mudança</option>
        </select>
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
                      <p className="text-sm font-bold">{vehicle.nomeProprietario || vehicle.nomeproprietario || '-'}</p>
                      {vehicle.telefone && <p className="text-xs text-slate-400">{vehicle.telefone}</p>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-3 py-1.5 font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 shadow-[inset_0_1px_rgba(255,255,255,0.1)]">
                      {vehicle.unidadeDesc || vehicle.unidadedesc || 'Sem destino'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                      vehicle.tipo === 'MORADOR' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : vehicle.tipo === 'VISITANTE'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
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
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold">Novo Veículo</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Placa *</label>
                  <input 
                    type="text"
                    value={formData.placa}
                    onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    placeholder="AAA-0000"
                    maxLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Modelo</label>
                  <input 
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Ex: Honda Civic, Chevrolet Onix"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Cor</label>
                  <input 
                    type="text"
                    value={formData.cor}
                    onChange={(e) => setFormData({...formData, cor: e.target.value})}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                    placeholder="Ex: Prata, Preto, Branco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Tipo</label>
                  <select 
                    value={formData.tipo}
                    onChange={(e) => {
                      const newTipo = e.target.value;
                      setFormData({
                        ...formData, 
                        tipo: newTipo,
                        nomeProprietario: newTipo === 'MORADOR' && selectedMorador ? selectedMorador.nome : ''
                      });
                    }}
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="MORADOR">Veículo de Morador</option>
                    <option value="VISITANTE">Veículo de Visitante</option>
                    <option value="PRESTADOR">Veículo de Prestador</option>
                    <option value="MUDANCA">Veículo de Mudança</option>
                  </select>
                </div>

                <div ref={moradorRef} className="relative">
                  <label className="block text-sm font-bold mb-2">
                    Morador Vinculado (Destino) *
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      value={moradorSearch}
                      onChange={(e) => {
                        setMoradorSearch(e.target.value);
                        setShowMoradorDropdown(true);
                      }}
                      onFocus={() => setShowMoradorDropdown(true)}
                      className="w-full pl-10 pr-10 p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="Buscar morador responsável da unidade..."
                    />
                    {selectedMorador && (
                      <button 
                        onClick={clearMoradorSelection}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  {showMoradorDropdown && filteredResidents.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredResidents.map((resident) => (
                        <button
                          key={resident.id}
                          onClick={() => handleSelectMorador(resident)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <p className="font-semibold text-sm">{resident.nome}</p>
                          <p className="text-xs text-slate-500">
                            {resident.bloco && resident.numero 
                              ? `Bloco ${resident.bloco}, Apt ${resident.numero}` 
                              : 'Sem unidade cadastrada'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formData.tipo !== 'MORADOR' && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-primary">Nome do Condutor *</label>
                    <input 
                      type="text"
                      value={formData.nomeProprietario}
                      onChange={(e) => setFormData({...formData, nomeProprietario: e.target.value})}
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      placeholder="Nome do Visitante/Prestador..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold mb-2">Unidade Vinculada</label>
                  <input 
                    type="text"
                    value={formData.unidadeDesc}
                    readOnly
                    className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold"
                    placeholder="Selecione um morador responsável"
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
                  disabled={!formData.placa || !formData.moradorId || (formData.tipo !== 'MORADOR' && !formData.nomeProprietario)}
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
    </DashboardLayout>
  );
}